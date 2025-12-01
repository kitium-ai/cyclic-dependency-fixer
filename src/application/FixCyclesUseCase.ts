/**
 * Use case for fixing cyclic dependencies
 * Applies fix strategies and falls back to manual suggestions
 */

import type { IFileSystem } from '../domain/interfaces/IFileSystem';
import type { IFixStrategy } from '../domain/interfaces/IFixStrategy';
import type { Cycle, FixOptions, FixResult, Module, ModulePath } from '../domain/models/types';
import { getCycfixLogger } from '../logger';
import { createFixStrategyError, extractErrorMetadata } from '../utils/errors';

export class FixCyclesUseCase {
  private readonly logger = getCycfixLogger('fix-cycles');

  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly strategies: readonly IFixStrategy[]
  ) {}

  async execute(
    cycles: readonly Cycle[],
    modules: ReadonlyMap<ModulePath, Module>,
    options: FixOptions
  ): Promise<readonly FixResult[]> {
    const startTime = Date.now();
    this.logger.info('Starting cycle fix process', {
      cycleCount: cycles.length,
      strategyCount: this.strategies.length,
      dryRun: options.dryRun,
      backup: options.backup,
    });

    const results: FixResult[] = [];

    for (const cycle of cycles) {
      const result = await this.fixCycle(cycle, modules, options);
      results.push(result);
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;
    this.logger.info('Cycle fix process completed', {
      cycleCount: cycles.length,
      successCount,
      failureCount: cycles.length - successCount,
      duration,
    });

    return results;
  }

  private async fixCycle(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    options: FixOptions
  ): Promise<FixResult> {
    const cycleId = cycle.id;
    const cyclePathStr = cycle.paths.join(' -> ');

    // Find applicable strategies
    const applicableStrategies = await this.findApplicableStrategies(cycle, modules, options);

    if (applicableStrategies.length === 0) {
      this.logger.debug('No applicable fix strategies for cycle', {
        cycleId,
        cycleLength: cycle.paths.length,
      });
      return this.createNoStrategyResult(cycle);
    }

    this.logger.debug('Found applicable fix strategies for cycle', {
      cycleId,
      strategyCount: applicableStrategies.length,
      strategies: applicableStrategies.map((s) => s.strategy.type),
    });

    // Sort strategies by score
    applicableStrategies.sort((a, b) => b.score - a.score);

    // Try strategies in order
    for (const { strategy, score } of applicableStrategies) {
      try {
        const strategyStartTime = Date.now();
        const result = await strategy.fix(cycle, modules, this.fileSystem, options.dryRun);
        const strategyDuration = Date.now() - strategyStartTime;

        // If successful or has manual steps, return
        if (result.success) {
          this.logger.info('Cycle fixed successfully', {
            cycleId,
            strategy: strategy.type,
            score,
            duration: strategyDuration,
            modifiedFiles: result.modifiedFiles.length,
            createdFiles: result.createdFiles.length,
          });
          return result;
        }

        if (result.manualSteps) {
          this.logger.info('Cycle requires manual steps', {
            cycleId,
            strategy: strategy.type,
            duration: strategyDuration,
            manualStepCount: result.manualSteps.length,
          });
          return result;
        }

        this.logger.debug('Strategy failed for cycle', {
          cycleId,
          strategy: strategy.type,
          duration: strategyDuration,
          error: result.error,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const strategyError = createFixStrategyError(strategy.type, cyclePathStr, errorMsg, {
          cycleId,
        });
        const errorMetadata = extractErrorMetadata(strategyError);
        this.logger.warn('Strategy threw error', {
          ...errorMetadata,
          cycleId,
          strategy: strategy.type,
        });
        // Continue to next strategy
        continue;
      }
    }

    // All strategies failed
    this.logger.warn('All fix strategies failed for cycle', {
      cycleId,
      cycleLength: cycle.paths.length,
      attemptedStrategies: applicableStrategies.map((s) => s.strategy.type),
    });
    return this.createFailureResult(cycle, applicableStrategies);
  }

  private async findApplicableStrategies(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    options: FixOptions
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
      strategy: cycle.paths.length === 2 ? (cycle.paths[0] as any) : (null as any),
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
    attemptedStrategies: Array<{ strategy: IFixStrategy; score: number }>
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
