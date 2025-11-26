/**
 * AI-Enhanced use case for fixing cyclic dependencies
 * Integrates AI-powered analysis and refactoring generation
 */

import type { IFileSystem } from '../domain/interfaces/IFileSystem';
import type { IFixStrategy } from '../domain/interfaces/IFixStrategy';
import type { IAIProvider } from '../domain/interfaces/IAIProvider';
import type { Cycle, FixOptions, FixResult, Module, ModulePath } from '../domain/models/types';
import { CodebasePatternAnalyzer } from './ai/CodebasePatternAnalyzer';
import { AIStrategySelector } from './ai/AIStrategySelector';
import { AIRefactoringGenerator } from './ai/AIRefactoringGenerator';

export type AIFixOptions = {
  /** Whether to use AI for strategy selection */
  readonly useAI: boolean;
  /** Whether to generate AI-powered explanations */
  readonly explainWithAI: boolean;
  /** Whether to generate AI code suggestions */
  readonly generateCode: boolean;
} & FixOptions;

export class AIEnhancedFixCyclesUseCase {
  private readonly patternAnalyzer: CodebasePatternAnalyzer;
  private readonly strategySelector: AIStrategySelector;
  private readonly refactoringGenerator: AIRefactoringGenerator;

  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly strategies: readonly IFixStrategy[],
    private readonly aiProvider: IAIProvider
  ) {
    this.patternAnalyzer = new CodebasePatternAnalyzer(aiProvider, fileSystem);
    this.strategySelector = new AIStrategySelector(aiProvider, fileSystem);
    this.refactoringGenerator = new AIRefactoringGenerator(aiProvider, fileSystem);
  }

  async execute(
    cycles: readonly Cycle[],
    modules: ReadonlyMap<ModulePath, Module>,
    options: AIFixOptions
  ): Promise<readonly FixResult[]> {
    const results: FixResult[] = [];

    // Analyze codebase patterns if AI is enabled
    let codebaseAnalysis;
    if (options.useAI && this.aiProvider.isAvailable()) {
      console.log('🤖 Analyzing codebase patterns with AI...');
      codebaseAnalysis = await this.patternAnalyzer.analyzeArchitecture(modules);
      console.log(`   Architecture: ${codebaseAnalysis.architecture}`);
      console.log(`   Patterns found: ${codebaseAnalysis.patterns.length}`);
    }

    for (const cycle of cycles) {
      const result = await this.fixCycle(cycle, modules, options, codebaseAnalysis);
      results.push(result);
    }

    return results;
  }

  private async fixCycle(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    options: AIFixOptions,
    codebaseAnalysis?: any
  ): Promise<FixResult> {
    // Get AI recommendation if enabled
    let aiRecommendation;
    if (options.useAI && this.aiProvider.isAvailable() && codebaseAnalysis) {
      console.log(`🤖 Getting AI recommendation for cycle ${cycle.id}...`);
      aiRecommendation = await this.strategySelector.recommendStrategy(
        cycle,
        modules,
        codebaseAnalysis,
        this.strategies
      );

      if (aiRecommendation) {
        console.log(
          `   Recommended: ${aiRecommendation.strategy} (${aiRecommendation.confidence}% confidence)`
        );
        console.log(`   Reasoning: ${aiRecommendation.reasoning}`);
      }
    }

    // Find applicable strategies
    const applicableStrategies = await this.findApplicableStrategies(
      cycle,
      modules,
      options,
      aiRecommendation
    );

    if (applicableStrategies.length === 0) {
      return await this.createNoStrategyResult(cycle, options, modules);
    }

    // Try strategies in order
    for (const { strategy } of applicableStrategies) {
      try {
        const result = await strategy.fix(cycle, modules, this.fileSystem, options.dryRun);

        // Enhance with AI-generated explanation if requested
        if (result.success && options.explainWithAI && this.aiProvider.isAvailable()) {
          // Add AI explanation to the result (would need to extend FixResult type)
          console.log('   ✓ Fix successful');
        }

        if (!result.success && options.generateCode && this.aiProvider.isAvailable()) {
          // Generate AI-powered manual steps
          console.log('   🤖 Generating AI-powered refactoring suggestions...');
          const aiSteps = await this.refactoringGenerator.generateManualSteps(
            cycle,
            modules,
            strategy.type
          );

          if (aiSteps.length > 0) {
            return {
              ...result,
              manualSteps: aiSteps,
            };
          }
        }

        if (result.success || result.manualSteps) {
          return result;
        }
      } catch (error) {
        continue;
      }
    }

    // All strategies failed
    return await this.createFailureResult(cycle, applicableStrategies, options, modules);
  }

  private async findApplicableStrategies(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    options: AIFixOptions,
    aiRecommendation?: any
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

      let score = strategy.score(cycle, modules);

      // Boost score if AI recommends this strategy
      if (
        aiRecommendation &&
        aiRecommendation.strategy === strategy.type &&
        aiRecommendation.confidence > 70
      ) {
        score += 30; // Significant boost for high-confidence AI recommendation
      }

      applicable.push({ strategy, score });
    }

    // Sort by score (highest first)
    return applicable.sort((a, b) => b.score - a.score);
  }

  private async createNoStrategyResult(
    cycle: Cycle,
    options: AIFixOptions,
    modules: ReadonlyMap<ModulePath, Module>
  ): Promise<FixResult> {
    let manualSteps: any[] = [
      {
        description: 'Review the circular dependency and refactor manually',
        file: cycle.paths[0],
      },
      {
        description: 'Consider extracting shared code or using dependency injection',
        file: cycle.paths[0],
      },
    ];

    // Get AI-powered explanation if enabled
    if (options.explainWithAI && this.aiProvider.isAvailable()) {
      const explanation = await this.refactoringGenerator.explainCycle(cycle, modules);
      manualSteps = [
        {
          description: 'AI Analysis',
          file: cycle.paths[0],
          code: explanation,
        },
        ...manualSteps,
      ];
    }

    return {
      cycle,
      strategy: cycle.paths.length === 2 ? cycle.paths[0] : (null as any),
      success: false,
      modifiedFiles: [],
      createdFiles: [],
      error: 'No applicable fix strategy found',
      manualSteps,
    };
  }

  private async createFailureResult(
    cycle: Cycle,
    attemptedStrategies: Array<{ strategy: IFixStrategy; score: number }>,
    options: AIFixOptions,
    modules: ReadonlyMap<ModulePath, Module>
  ): Promise<FixResult> {
    const strategyNames = attemptedStrategies.map((s) => s.strategy.type).join(', ');

    let manualSteps: any[] = [
      {
        description: 'Manual intervention required to fix this cycle',
        file: cycle.paths[0],
      },
    ];

    // Get AI-powered suggestions if enabled
    if (options.generateCode && this.aiProvider.isAvailable() && attemptedStrategies.length > 0) {
      const aiSteps = await this.refactoringGenerator.generateManualSteps(
        cycle,
        modules,
        attemptedStrategies[0].strategy.type
      );

      if (aiSteps.length > 0) {
        manualSteps = [...aiSteps];
      }
    }

    return {
      cycle,
      strategy: attemptedStrategies[0]?.strategy.type || ('' as any),
      success: false,
      modifiedFiles: [],
      createdFiles: [],
      error: `All strategies failed: ${strategyNames}`,
      manualSteps,
    };
  }
}
