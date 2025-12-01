/**
 * Use case for detecting cyclic dependencies
 * Follows Clean Architecture and Single Responsibility Principle
 */

import type { IFileSystem } from '../domain/interfaces/IFileSystem';
import type { IParser } from '../domain/interfaces/IParser';
import type { ICycleDetector } from '../domain/interfaces/ICycleDetector';
import type {
  AnalysisConfig,
  AnalysisMessage,
  AnalysisMetrics,
  AnalysisResult,
  Module,
  ModulePath,
} from '../domain/models/types';
import { AnalysisCache } from '../infrastructure/cache/AnalysisCache';
import { getCycfixLogger } from '../logger';
import {
  createParserError,
  createCacheOperationError,
  extractErrorMetadata,
} from '../utils/errors';

export class DetectCyclesUseCase {
  private readonly logger = getCycfixLogger('detect-cycles');

  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly parser: IParser,
    private readonly cycleDetector: ICycleDetector,
    private readonly fallbackParser: IParser | null = null
  ) {}

  async execute(config: AnalysisConfig): Promise<AnalysisResult> {
    const startTime = Date.now();
    this.logger.info('Starting cycle detection analysis', {
      rootDir: config.rootDir,
      extensions: config.extensions,
    });

    // Step 1: Find all files to analyze
    const files = await this.findFiles(config);
    const warnings: AnalysisMessage[] = [];

    const cache = config.enableCache
      ? new AnalysisCache(config.cacheDir ?? `${config.rootDir}/.cycfix-cache`)
      : null;
    const cacheState = cache ? await cache.load() : undefined;

    // Step 2: Parse all files and build dependency graph
    const { modules, cacheHits, hashes } = await this.parseModules(files, cacheState, warnings);

    // Step 3: Detect cycles
    const cycles = await this.cycleDetector.detectCycles(modules, config.maxDepth);

    // Step 4: Build result
    const affectedModules = this.getAffectedModules(cycles);
    const duration = Date.now() - startTime;

    const metrics: AnalysisMetrics = {
      filesDiscovered: files.length,
      filesAnalyzed: modules.size,
      cachedModules: cacheHits,
      parser: this.parser.constructor.name,
      duration,
    };

    const result: AnalysisResult = {
      cycles,
      totalModules: modules.size,
      affectedModules,
      duration,
      warnings,
      metrics,
      isPartial: warnings.length > 0,
    };

    if (cache) {
      try {
        await cache.save({
          modules: Object.fromEntries(
            [...modules.entries()].map(([key, module]) => {
              const hash = hashes.get(key) ?? AnalysisCache.hashContent(JSON.stringify(module));
              return [key, { hash, module }];
            })
          ),
        });
      } catch (error) {
        const cacheError = createCacheOperationError(
          'save',
          error instanceof Error ? error.message : String(error),
          { config: config.cacheDir }
        );
        const errorMetadata = extractErrorMetadata(cacheError);
        this.logger.warn('Failed to save analysis cache', { ...errorMetadata, duration });
      }
    }

    this.logger.info('Cycle detection analysis completed', {
      cycles: result.cycles.length,
      totalModules: result.totalModules,
      affectedModules: result.affectedModules.length,
      duration,
      isPartial: result.isPartial,
    });

    return result;
  }

  private async findFiles(config: AnalysisConfig): Promise<readonly ModulePath[]> {
    const patterns = config.extensions.map((ext) => `*${ext}`);
    const exclude = [...config.exclude, 'node_modules', 'dist', 'build', 'coverage', '.git'];

    if (!config.includeNodeModules) {
      exclude.push('node_modules');
    }

    const files = await this.fileSystem.glob(patterns, exclude);

    if (config.maxFiles && files.length > config.maxFiles) {
      return files.slice(0, config.maxFiles);
    }

    return files;
  }

  private async parseModules(
    files: readonly ModulePath[],
    cacheState: Awaited<ReturnType<AnalysisCache['load']>> | undefined,
    warnings: AnalysisMessage[]
  ): Promise<{
    modules: ReadonlyMap<ModulePath, Module>;
    cacheHits: number;
    hashes: Map<string, string>;
  }> {
    const modules = new Map<ModulePath, Module>();
    let cacheHits = 0;
    const hashes = new Map<string, string>();
    const parseStartTime = Date.now();

    await Promise.all(
      files.map(async (file) => {
        try {
          const content = await this.fileSystem.readFile(file);
          const hash = AnalysisCache.hashContent(content);
          const cachedModule = cacheState?.modules[file];

          if (cachedModule && cachedModule.hash === hash) {
            modules.set(file, cachedModule.module);
            hashes.set(file, hash);
            cacheHits += 1;
            return;
          }

          const extension = file.split('.').pop() ? `.${file.split('.').pop()}` : '';
          const parser =
            this.parser.supports(extension) || !this.fallbackParser
              ? this.parser
              : this.fallbackParser;

          const module = await parser.parse(file, content);
          modules.set(file, { ...module, path: file });
          hashes.set(file, hash);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const parserError = createParserError(this.parser.constructor.name, file, errorMsg, {
            fallbackAvailable: this.fallbackParser !== null,
          });
          const errorMetadata = extractErrorMetadata(parserError);
          this.logger.warn('Failed to parse file', { ...errorMetadata, file });
          warnings.push({
            message: `Failed to parse ${file}`,
            file,
            stack: errorMsg,
          });
        }
      })
    );

    const parseDuration = Date.now() - parseStartTime;
    this.logger.debug('Module parsing completed', {
      filesCount: files.length,
      modulesCount: modules.size,
      cacheHits,
      duration: parseDuration,
    });

    return { modules, cacheHits, hashes };
  }

  private getAffectedModules(cycles: readonly any[]): readonly ModulePath[] {
    const affected = new Set<ModulePath>();

    for (const cycle of cycles) {
      for (const path of cycle.paths) {
        affected.add(path);
      }
    }

    return Array.from(affected);
  }
}
