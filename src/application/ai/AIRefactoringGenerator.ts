/**
 * AI-powered refactoring code generator
 * Generates specific refactoring code based on the chosen strategy
 */

import type { IAIProvider } from '../../domain/interfaces/IAIProvider';
import {
  FixStrategy,
  type Cycle,
  type Module,
  type ModulePath,
  type ManualStep,
} from '../../domain/models/types';
import type { IFileSystem } from '../../domain/interfaces/IFileSystem';

export type RefactoringCode = {
  /** File path to modify or create */
  readonly filePath: string;
  /** New or modified code content */
  readonly code: string;
  /** Description of what this code does */
  readonly description: string;
  /** Whether this is a new file */
  readonly isNewFile: boolean;
};

export type RefactoringSuggestion = {
  /** Refactoring strategy used */
  readonly strategy: FixStrategy;
  /** Generated code snippets */
  readonly codeSnippets: readonly RefactoringCode[];
  /** Step-by-step instructions */
  readonly instructions: readonly string[];
  /** Explanation of the refactoring */
  readonly explanation: string;
  /** Estimated impact level */
  readonly impact: 'low' | 'medium' | 'high';
};

export class AIRefactoringGenerator {
  constructor(
    private readonly aiProvider: IAIProvider,
    private readonly fileSystem: IFileSystem,
  ) {}

  async generateRefactoring(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    strategy: FixStrategy,
  ): Promise<RefactoringSuggestion | null> {
    if (!this.aiProvider.isAvailable()) {
      return null;
    }

    // Extract code from cycle files
    const cycleCode = await this.extractFullCycleCode(cycle, modules);

    const prompt = this.buildRefactoringPrompt(cycle, cycleCode, strategy);

    const response = await this.aiProvider.generateCode({
      prompt,
      maxTokens: 4096,
      temperature: 0.2,
      systemPrompt: `You are an expert TypeScript refactoring assistant.
Generate complete, production-ready refactoring code that:
1. Fixes the circular dependency using the specified strategy
2. Maintains type safety
3. Follows SOLID principles
4. Preserves existing functionality
5. Uses clear, descriptive naming

Respond in JSON format:
{
  "strategy": "strategy name",
  "codeSnippets": [
    {
      "filePath": "path/to/file.ts",
      "code": "complete code content",
      "description": "what this does",
      "isNewFile": boolean
    }
  ],
  "instructions": ["step 1", "step 2", ...],
  "explanation": "detailed explanation",
  "impact": "low|medium|high"
}`,
    });

    return this.parseRefactoringSuggestion(response.content);
  }

  async generateManualSteps(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    strategy: FixStrategy,
  ): Promise<readonly ManualStep[]> {
    const suggestion = await this.generateRefactoring(cycle, modules, strategy);

    if (!suggestion) {
      return [];
    }

    return suggestion.codeSnippets.map((snippet) => ({
      description: snippet.description,
      file: snippet.filePath,
      code: snippet.code,
    }));
  }

  async explainCycle(cycle: Cycle, modules: ReadonlyMap<ModulePath, Module>): Promise<string> {
    if (!this.aiProvider.isAvailable()) {
      return 'AI analysis not available. Configure an AI provider to get detailed explanations.';
    }

    const cycleCode = await this.extractFullCycleCode(cycle, modules);

    const prompt = `Analyze this circular dependency and explain:
1. Why it exists (root cause)
2. What problems it might cause
3. How to prevent similar issues in the future

**Circular Dependency:**
${this.describeCycle(cycle)}

**Code:**
${cycleCode}

Provide a clear, concise explanation for developers.`;

    const response = await this.aiProvider.analyze({
      prompt,
      maxTokens: 1024,
      temperature: 0.4,
    });

    return response.content;
  }

  private async extractFullCycleCode(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
  ): Promise<string> {
    const codeSnippets: string[] = [];
    const uniquePaths = cycle.paths.slice(0, -1);

    for (const path of uniquePaths) {
      const module = modules.get(path);
      if (!module) {
        continue;
      }

      try {
        const content = await this.fileSystem.readFile(path);
        codeSnippets.push(`// File: ${path}\n${content}`);
      } catch {
        continue;
      }
    }

    return codeSnippets.join('\n\n// ============================================\n\n');
  }

  private buildRefactoringPrompt(cycle: Cycle, cycleCode: string, strategy: FixStrategy): string {
    const strategyDescription = this.getStrategyDescription(strategy);

    return `Generate complete refactoring code to fix this circular dependency using the ${strategy} strategy.

**Strategy:** ${strategy}
${strategyDescription}

**Circular Dependency:**
${this.describeCycle(cycle)}

**Current Code:**
${cycleCode}

Generate COMPLETE, WORKING code for all files that need to be created or modified.
Include proper TypeScript types and imports.`;
  }

  private getStrategyDescription(strategy: FixStrategy): string {
    const descriptions: Record<FixStrategy, string> = {
      [FixStrategy.EXTRACT_SHARED]:
        'Extract common code into a new shared module that both files can import without creating a cycle.',
      [FixStrategy.DYNAMIC_IMPORT]:
        'Convert static imports to dynamic imports to break the cycle at runtime.',
      [FixStrategy.DEPENDENCY_INJECTION]:
        'Use dependency injection pattern to inject dependencies rather than importing them directly.',
      [FixStrategy.MOVE_CODE]:
        'Move code between files to eliminate the circular reference while maintaining functionality.',
      [FixStrategy.BARREL_FILE]:
        'Create a barrel file (index.ts) to centralize exports and break the cycle.',
    };

    return descriptions[strategy] || 'Fix the circular dependency.';
  }

  private describeCycle(cycle: Cycle): string {
    const lines: string[] = [];

    lines.push(`Files involved: ${cycle.paths.length - 1}`);
    cycle.paths.forEach((path, i) => {
      if (i < cycle.paths.length - 1) {
        lines.push(`  ${i + 1}. ${path}`);
      }
    });

    lines.push('\nImport chain:');
    cycle.edges.forEach((edge) => {
      lines.push(
        `  ${edge.from} -> ${edge.to} (line ${edge.importInfo.line}, imports: ${edge.importInfo.identifiers.join(', ')})`,
      );
    });

    return lines.join('\n');
  }

  private parseRefactoringSuggestion(content: string): RefactoringSuggestion | null {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as RefactoringSuggestion;
      }
    } catch {
      // Fall through
    }

    return null;
  }
}
