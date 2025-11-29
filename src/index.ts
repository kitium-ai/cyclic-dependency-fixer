/**
 * Public API for cyclic-dependency-fixer
 */

// Domain models and types
export {
  ModulePath,
  ImportInfo,
  ImportType,
  Module,
  Cycle,
  CycleEdge,
  AnalysisResult,
  AnalysisConfig,
  FixStrategy,
  FixResult,
  ManualStep,
  FixOptions,
} from './domain/models/types';

// Interfaces
export { IFileSystem } from './domain/interfaces/IFileSystem';
export { IParser } from './domain/interfaces/IParser';
export { ICycleDetector } from './domain/interfaces/ICycleDetector';
export { IFixStrategy } from './domain/interfaces/IFixStrategy';

// Use cases
export { DetectCyclesUseCase } from './application/DetectCyclesUseCase';
export { FixCyclesUseCase } from './application/FixCyclesUseCase';

// Infrastructure implementations
export { NodeFileSystem } from './infrastructure/filesystem/NodeFileSystem';
export { JavaScriptParser } from './infrastructure/parsers/JavaScriptParser';
export { TypeScriptProjectParser } from './infrastructure/parsers/TypeScriptProjectParser';
export { TarjanCycleDetector } from './infrastructure/graph/TarjanCycleDetector';

// Fix strategies
export { DynamicImportStrategy } from './application/fix-strategies/DynamicImportStrategy';
export { ExtractSharedStrategy } from './application/fix-strategies/ExtractSharedStrategy';

// Convenience factory
import type { Result } from '@kitiumai/types';
import { DetectCyclesUseCase } from './application/DetectCyclesUseCase';
import { FixCyclesUseCase } from './application/FixCyclesUseCase';
import { NodeFileSystem } from './infrastructure/filesystem/NodeFileSystem';
import { JavaScriptParser } from './infrastructure/parsers/JavaScriptParser';
import { TypeScriptProjectParser } from './infrastructure/parsers/TypeScriptProjectParser';
import { TarjanCycleDetector } from './infrastructure/graph/TarjanCycleDetector';
import { DynamicImportStrategy } from './application/fix-strategies/DynamicImportStrategy';
import { ExtractSharedStrategy } from './application/fix-strategies/ExtractSharedStrategy';
import type {
  AnalysisConfig,
  AnalysisResult,
  FixOptions,
  FixResult,
  Module,
} from './domain/models/types';

/**
 * Create a default instance with all dependencies configured
 */
export function createAnalyzer(rootDir: string): {
  detect: (config?: Partial<AnalysisConfig>) => Promise<Result<AnalysisResult, Error>>;
  fix: (
    config?: Partial<AnalysisConfig>,
    options?: Partial<FixOptions>,
  ) => Promise<Result<{ analysisResult: AnalysisResult; fixResults: readonly FixResult[] }, Error>>;
} {
  const fileSystem = new NodeFileSystem(rootDir);
  const cycleDetector = new TarjanCycleDetector();

  const strategies = [new DynamicImportStrategy(), new ExtractSharedStrategy()];
  const fixUseCase = new FixCyclesUseCase(fileSystem, strategies);

  return {
    async detect(config: Partial<AnalysisConfig> = {}) {
      const fullConfig: AnalysisConfig = {
        rootDir,
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        exclude: [],
        includeNodeModules: false,
        maxDepth: 50,
        tsconfigPath: null,
        enableCache: true,
        cacheDir: `${rootDir}/.cycfix-cache`,
        maxFiles: null,
        ...config,
      };

      try {
        const jsParser = new JavaScriptParser(fileSystem);
        const tsParser = new TypeScriptProjectParser({
          projectRoot: rootDir,
          tsconfigPath: fullConfig.tsconfigPath ?? null,
        });
        const detectUseCase = new DetectCyclesUseCase(fileSystem, tsParser, cycleDetector, jsParser);
        const analysisResult = await detectUseCase.execute(fullConfig);
        return { success: true, data: analysisResult };
      } catch (error) {
        return { success: false, error: error as Error };
      }
    },

    async fix(config: Partial<AnalysisConfig> = {}, options: Partial<FixOptions> = {}) {
      const detection = await this.detect(config);

      if (!detection.success) {
        return detection;
      }

      const analysisResult = detection.data;
      if (!analysisResult) {
        return {
          success: false,
          error: new Error('Failed to analyze dependencies'),
        };
      }

      if (analysisResult.cycles.length === 0) {
        return { success: true, data: { analysisResult, fixResults: [] } };
      }

      const fullOptions: FixOptions = {
        autoFix: false,
        strategies: [],
        backup: true,
        dryRun: false,
        ...options,
      };

      // Build modules map
      try {
        const extensions = config.extensions ?? ['.js', '.jsx', '.ts', '.tsx'];
        const exclude = config.exclude ?? [];
        const parser = new TypeScriptProjectParser({
          projectRoot: rootDir,
          tsconfigPath: config.tsconfigPath ?? null,
        });

        const files = await fileSystem.glob(
          extensions.map((ext) => `*${ext}`),
          exclude,
        );

        const modules = new Map<string, Module>();
        for (const file of files) {
          try {
            const content = await fileSystem.readFile(file);
            const module = await parser.parse(file, content);
            modules.set(file, module);
          } catch {
            // Skip files that fail to parse
          }
        }

        const fixResults = await fixUseCase.execute(analysisResult.cycles, modules, fullOptions);

        return { success: true, data: { analysisResult, fixResults } };
      } catch (error) {
        return { success: false, error: error as Error };
      }
    },
  };
}
