/**
 * AI-powered codebase pattern analyzer
 * Learns architectural patterns from the codebase
 */

import { IAIProvider } from '../../domain/interfaces/IAIProvider';
import { Module, ModulePath } from '../../domain/models/types';
import { IFileSystem } from '../../domain/interfaces/IFileSystem';

export interface CodebasePattern {
  /** Type of pattern detected */
  readonly type: string;
  /** Confidence score (0-100) */
  readonly confidence: number;
  /** Description of the pattern */
  readonly description: string;
  /** Examples of where this pattern is used */
  readonly examples: readonly string[];
}

export interface ArchitectureAnalysis {
  /** Detected architectural style */
  readonly architecture: string;
  /** Common patterns found */
  readonly patterns: readonly CodebasePattern[];
  /** Dependency injection usage */
  readonly usesDependencyInjection: boolean;
  /** Coding style preferences */
  readonly codingStyle: {
    readonly prefersFunctional: boolean;
    readonly prefersClasses: boolean;
    readonly usesBarrelFiles: boolean;
  };
  /** Common naming conventions */
  readonly namingConventions: readonly string[];
}

export class CodebasePatternAnalyzer {
  constructor(
    private readonly aiProvider: IAIProvider,
    private readonly fileSystem: IFileSystem,
  ) {}

  async analyzeArchitecture(
    modules: ReadonlyMap<ModulePath, Module>,
  ): Promise<ArchitectureAnalysis> {
    if (!this.aiProvider.isAvailable()) {
      return this.createDefaultAnalysis();
    }

    // Sample representative modules
    const sampleModules = this.selectRepresentativeModules(modules);
    const codeSnippets = await this.extractCodeSnippets(sampleModules);

    const prompt = this.buildAnalysisPrompt(sampleModules, codeSnippets);

    const response = await this.aiProvider.analyze({
      prompt,
      maxTokens: 2048,
      temperature: 0.2,
      systemPrompt: `You are an expert software architect analyzing codebase patterns.
Analyze the provided code samples and identify:
1. Overall architectural style (layered, hexagonal, clean architecture, etc.)
2. Common design patterns used
3. Dependency injection usage
4. Coding style preferences (functional vs OOP, barrel files, etc.)
5. Naming conventions

Respond in JSON format with the structure:
{
  "architecture": "string",
  "patterns": [{"type": "string", "confidence": number, "description": "string", "examples": ["string"]}],
  "usesDependencyInjection": boolean,
  "codingStyle": {
    "prefersFunctional": boolean,
    "prefersClasses": boolean,
    "usesBarrelFiles": boolean
  },
  "namingConventions": ["string"]
}`,
    });

    return this.parseAnalysisResponse(response.content);
  }

  async identifyCommonPatterns(
    modules: ReadonlyMap<ModulePath, Module>,
  ): Promise<readonly CodebasePattern[]> {
    if (!this.aiProvider.isAvailable()) {
      return [];
    }

    const sampleModules = this.selectRepresentativeModules(modules, 10);
    const codeSnippets = await this.extractCodeSnippets(sampleModules);

    const prompt = `Analyze these TypeScript/JavaScript code samples and identify common patterns:

${codeSnippets}

Identify recurring patterns such as:
- Design patterns (Factory, Strategy, Observer, etc.)
- Architectural patterns (Repository, Service Layer, etc.)
- Code organization patterns
- Import/export patterns

Respond in JSON format as an array:
[
  {
    "type": "pattern name",
    "confidence": 0-100,
    "description": "detailed description",
    "examples": ["file paths where used"]
  }
]`;

    const response = await this.aiProvider.analyze({
      prompt,
      maxTokens: 1536,
      temperature: 0.2,
    });

    try {
      const patterns = JSON.parse(response.content);
      return Array.isArray(patterns) ? patterns : [];
    } catch {
      return [];
    }
  }

  private selectRepresentativeModules(
    modules: ReadonlyMap<ModulePath, Module>,
    limit: number = 15,
  ): readonly Module[] {
    const moduleArray = Array.from(modules.values());

    // Filter out test files and node_modules
    const filteredModules = moduleArray.filter(
      (m) =>
        !m.path.includes('node_modules') &&
        !m.path.includes('.test.') &&
        !m.path.includes('.spec.'),
    );

    // Prefer modules with more imports (likely more important)
    const sorted = filteredModules.sort((a, b) => b.imports.length - a.imports.length);

    return sorted.slice(0, Math.min(limit, sorted.length));
  }

  private async extractCodeSnippets(modules: readonly Module[]): Promise<string> {
    const snippets: string[] = [];

    for (const module of modules.slice(0, 10)) {
      try {
        const content = await this.fileSystem.readFile(module.path);
        // Take first 50 lines to keep token count manageable
        const lines = content.split('\n').slice(0, 50).join('\n');
        snippets.push(`// File: ${module.path}\n${lines}\n`);
      } catch {
        // Skip files we can't read
        continue;
      }
    }

    return snippets.join('\n---\n\n');
  }

  private buildAnalysisPrompt(modules: readonly Module[], codeSnippets: string): string {
    return `Analyze this TypeScript/JavaScript codebase structure and code samples:

**Project Structure:**
Total modules: ${modules.length}
Sample modules:
${modules
  .slice(0, 15)
  .map((m) => `- ${m.path} (${m.imports.length} imports)`)
  .join('\n')}

**Code Samples:**
${codeSnippets}

Analyze the architecture, patterns, and coding style.`;
  }

  private parseAnalysisResponse(content: string): ArchitectureAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fall through to default
    }

    return this.createDefaultAnalysis();
  }

  private createDefaultAnalysis(): ArchitectureAnalysis {
    return {
      architecture: 'Unknown',
      patterns: [],
      usesDependencyInjection: false,
      codingStyle: {
        prefersFunctional: false,
        prefersClasses: false,
        usesBarrelFiles: false,
      },
      namingConventions: [],
    };
  }
}
