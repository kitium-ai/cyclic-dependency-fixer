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
export { TarjanCycleDetector } from './infrastructure/graph/TarjanCycleDetector';

// Fix strategies
export { DynamicImportStrategy } from './application/fix-strategies/DynamicImportStrategy';
export { ExtractSharedStrategy } from './application/fix-strategies/ExtractSharedStrategy';

// Convenience factory
import { DetectCyclesUseCase } from './application/DetectCyclesUseCase';
import { FixCyclesUseCase } from './application/FixCyclesUseCase';
import { NodeFileSystem } from './infrastructure/filesystem/NodeFileSystem';
import { JavaScriptParser } from './infrastructure/parsers/JavaScriptParser';
import { TarjanCycleDetector } from './infrastructure/graph/TarjanCycleDetector';
import { DynamicImportStrategy } from './application/fix-strategies/DynamicImportStrategy';
import { ExtractSharedStrategy } from './application/fix-strategies/ExtractSharedStrategy';
import { AnalysisConfig, FixOptions } from './domain/models/types';

/**
 * Create a default instance with all dependencies configured
 */
export function createAnalyzer(rootDir: string): {
  detect: (config: Partial<AnalysisConfig>) => Promise<any>;
  fix: (config: Partial<AnalysisConfig>, options: Partial<FixOptions>) => Promise<any>;
} {
  const fileSystem = new NodeFileSystem(rootDir);
  const parser = new JavaScriptParser(fileSystem);
  const cycleDetector = new TarjanCycleDetector();
  const detectUseCase = new DetectCyclesUseCase(fileSystem, parser, cycleDetector);

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
        ...config,
      };

      return await detectUseCase.execute(fullConfig);
    },

    async fix(config: Partial<AnalysisConfig> = {}, options: Partial<FixOptions> = {}) {
      const analysisResult = await this.detect(config);

      if (analysisResult.cycles.length === 0) {
        return { analysisResult, fixResults: [] };
      }

      const fullOptions: FixOptions = {
        autoFix: false,
        strategies: [],
        backup: true,
        dryRun: false,
        ...options,
      };

      // Build modules map
      const files = await fileSystem.glob(
        (config.extensions || ['.js', '.jsx', '.ts', '.tsx']).map((ext) => `*${ext}`),
        config.exclude || [],
      );

      const modules = new Map();
      for (const file of files) {
        try {
          const content = await fileSystem.readFile(file);
          const module = await parser.parse(file, content);
          modules.set(file, module);
        } catch {
          // Skip files that fail to parse
        }
      }

      const fixResults = await fixUseCase.execute(
        analysisResult.cycles,
        modules,
        fullOptions,
      );

      return { analysisResult, fixResults };
    },
  };
}
