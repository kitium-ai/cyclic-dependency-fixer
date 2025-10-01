/**
 * Use case for fixing cyclic dependencies
 * Applies fix strategies and falls back to manual suggestions
 */

import { IFileSystem } from '../domain/interfaces/IFileSystem';
import { IFixStrategy } from '../domain/interfaces/IFixStrategy';
import {
  Cycle,
  FixOptions,
  FixResult,
  Module,
  ModulePath,
} from '../domain/models/types';

export class FixCyclesUseCase {
  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly strategies: readonly IFixStrategy[],
  ) {}

  async execute(
    cycles: readonly Cycle[],
    modules: ReadonlyMap<ModulePath, Module>,
    options: FixOptions,
  ): Promise<readonly FixResult[]> {
    const results: FixResult[] = [];

    for (const cycle of cycles) {
      const result = await this.fixCycle(cycle, modules, options);
      results.push(result);
    }

    return results;
  }

  private async fixCycle(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    options: FixOptions,
  ): Promise<FixResult> {
    // Find applicable strategies
    const applicableStrategies = await this.findApplicableStrategies(cycle, modules, options);

    if (applicableStrategies.length === 0) {
      return this.createNoStrategyResult(cycle);
    }

    // Sort strategies by score
    applicableStrategies.sort((a, b) => b.score - a.score);

    // Try strategies in order
    for (const { strategy } of applicableStrategies) {
      try {
        const result = await strategy.fix(
          cycle,
          modules,
          this.fileSystem,
          options.dryRun,
        );

        // If successful or has manual steps, return
        if (result.success || result.manualSteps) {
          return result;
        }
      } catch (error) {
        // Continue to next strategy
        continue;
      }
    }

    // All strategies failed
    return this.createFailureResult(cycle, applicableStrategies);
  }

  private async findApplicableStrategies(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    options: FixOptions,
  ): Promise<Array<{ strategy: IFixStrategy; score: number }>> {
    const applicable: Array<{ strategy: IFixStrategy; score: number }> = [];

    for (const strategy of this.strategies) {
      // Check if strategy is in preferred list
      if (options.strategies.length > 0 && !options.strategies.includes(strategy.type)) {
        continue;
      }

      // Check if strategy can fix this cycle
      const canFix = await strategy.canFix(cycle, modules);
      if (!canFix) {
        continue;
      }

      const score = strategy.score(cycle, modules);
      applicable.push({ strategy, score });
    }

    return applicable;
  }

  private createNoStrategyResult(cycle: Cycle): FixResult {
    return {
      cycle,
      strategy: cycle.paths.length === 2 ? cycle.paths[0] as any : null as any,
      success: false,
      modifiedFiles: [],
      createdFiles: [],
      error: 'No applicable fix strategy found',
      manualSteps: [
        {
          description: 'Review the circular dependency and refactor manually',
          file: cycle.paths[0],
        },
        {
          description: 'Consider extracting shared code or using dependency injection',
          file: cycle.paths[0],
        },
      ],
    };
  }

  private createFailureResult(
    cycle: Cycle,
    attemptedStrategies: Array<{ strategy: IFixStrategy; score: number }>,
  ): FixResult {
    const strategyNames = attemptedStrategies.map((s) => s.strategy.type).join(', ');

    return {
      cycle,
      strategy: attemptedStrategies[0]?.strategy.type || ('' as any),
      success: false,
      modifiedFiles: [],
      createdFiles: [],
      error: `All strategies failed: ${strategyNames}`,
      manualSteps: [
        {
          description: 'Manual intervention required to fix this cycle',
          file: cycle.paths[0],
        },
      ],
    };
  }
}
