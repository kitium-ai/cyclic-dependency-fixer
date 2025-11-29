/**
 * AI-powered fix strategy selector
 * Uses AI to recommend the best strategy for fixing a cycle
 */

import type { IAIProvider } from '../../domain/interfaces/IAIProvider';
import type { IFixStrategy } from '../../domain/interfaces/IFixStrategy';
import type {
  Cycle,
  Module,
  ModulePath,
  FixStrategy as FixStrategyEnum,
} from '../../domain/models/types';
import type { IFileSystem } from '../../domain/interfaces/IFileSystem';
import type { ArchitectureAnalysis } from './CodebasePatternAnalyzer';

export type StrategyRecommendation = {
  /** Recommended strategy */
  readonly strategy: FixStrategyEnum;
  /** Confidence score (0-100) */
  readonly confidence: number;
  /** Explanation of why this strategy is recommended */
  readonly reasoning: string;
  /** Specific refactoring steps */
  readonly steps: readonly string[];
  /** Potential risks */
  readonly risks: readonly string[];
  /** Alternative strategies */
  readonly alternatives: ReadonlyArray<{
    readonly strategy: FixStrategyEnum;
    readonly confidence: number;
  }>;
};

export class AIStrategySelector {
  constructor(
    private readonly aiProvider: IAIProvider,
    private readonly fileSystem: IFileSystem
  ) {}

  async recommendStrategy(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    codebaseAnalysis: ArchitectureAnalysis,
    availableStrategies: readonly IFixStrategy[]
  ): Promise<StrategyRecommendation | null> {
    if (!this.aiProvider.isAvailable()) {
      return null;
    }

    // Extract code from cycle files
    const cycleCode = await this.extractCycleCode(cycle, modules);

    const prompt = this.buildStrategyPrompt(
      cycle,
      cycleCode,
      codebaseAnalysis,
      availableStrategies
    );

    const response = await this.aiProvider.analyze({
      prompt,
      maxTokens: 2048,
      temperature: 0.3,
      systemPrompt: `You are an expert software architect specializing in refactoring circular dependencies.
Analyze the circular dependency and recommend the best fix strategy.

Consider:
1. The code context and what the modules do
2. The overall codebase architecture
3. Maintainability and readability
4. Type safety
5. Performance implications

Respond in JSON format:
{
  "strategy": "extract-shared|dynamic-import|dependency-injection|move-code|barrel-file",
  "confidence": 0-100,
  "reasoning": "detailed explanation",
  "steps": ["step 1", "step 2", ...],
  "risks": ["risk 1", "risk 2", ...],
  "alternatives": [{"strategy": "name", "confidence": 0-100}]
}`,
    });

    return this.parseRecommendation(response.content);
  }

  private async extractCycleCode(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>
  ): Promise<string> {
    const codeSnippets: string[] = [];

    // Get unique paths (excluding the duplicate last element)
    const uniquePaths = cycle.paths.slice(0, -1);

    for (const path of uniquePaths) {
      const module = modules.get(path);
      if (!module) {
        continue;
      }

      try {
        const content = await this.fileSystem.readFile(path);
        // Take first 100 lines to keep context manageable
        const lines = content.split('\n').slice(0, 100).join('\n');
        codeSnippets.push(`// File: ${path}\n${lines}`);
      } catch {
        // Skip files we can't read
        continue;
      }
    }

    return codeSnippets.join('\n\n---\n\n');
  }

  private buildStrategyPrompt(
    cycle: Cycle,
    cycleCode: string,
    codebaseAnalysis: ArchitectureAnalysis,
    availableStrategies: readonly IFixStrategy[]
  ): string {
    const cycleDescription = this.describeCycle(cycle);
    const strategyList = availableStrategies.map((s) => s.type).join(', ');

    return `Analyze this circular dependency and recommend the best fix strategy:

**Circular Dependency:**
${cycleDescription}

**Codebase Context:**
- Architecture: ${codebaseAnalysis.architecture}
- Uses Dependency Injection: ${codebaseAnalysis.usesDependencyInjection ? 'Yes' : 'No'}
- Coding Style: ${codebaseAnalysis.codingStyle.prefersClasses ? 'OOP' : 'Functional'}
- Uses Barrel Files: ${codebaseAnalysis.codingStyle.usesBarrelFiles ? 'Yes' : 'No'}

**Detected Patterns:**
${codebaseAnalysis.patterns.map((p) => `- ${p.type}: ${p.description}`).join('\n')}

**Code from Circular Dependencies:**
${cycleCode}

**Available Fix Strategies:**
${strategyList}

Strategy descriptions:
- extract-shared: Create a new shared module for common code
- dynamic-import: Convert static imports to dynamic imports
- dependency-injection: Use dependency injection to break the cycle
- move-code: Move code between files to break the cycle
- barrel-file: Create a barrel file to centralize exports

Recommend the BEST strategy with detailed steps.`;
  }

  private describeCycle(cycle: Cycle): string {
    const lines: string[] = [];

    lines.push(`Cycle involves ${cycle.paths.length - 1} modules:`);
    cycle.paths.forEach((path, i) => {
      if (i < cycle.paths.length - 1) {
        lines.push(`  ${i + 1}. ${path}`);
      }
    });

    lines.push('\nImport chain:');
    cycle.edges.forEach((edge) => {
      lines.push(`  ${edge.from} -> ${edge.to} (line ${edge.importInfo.line})`);
    });

    return lines.join('\n');
  }

  private parseRecommendation(content: string): StrategyRecommendation | null {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          strategy: parsed.strategy as FixStrategyEnum,
          confidence: parsed.confidence || 50,
          reasoning: parsed.reasoning || 'AI recommendation',
          steps: parsed.steps || [],
          risks: parsed.risks || [],
          alternatives: parsed.alternatives || [],
        };
      }
    } catch {
      // Fall through
    }

    return null;
  }
}
