/**
 * Use case for detecting cyclic dependencies
 * Follows Clean Architecture and Single Responsibility Principle
 */

import { IFileSystem } from '../domain/interfaces/IFileSystem';
import { IParser } from '../domain/interfaces/IParser';
import { ICycleDetector } from '../domain/interfaces/ICycleDetector';
import { AnalysisConfig, AnalysisResult, Module, ModulePath } from '../domain/models/types';

export class DetectCyclesUseCase {
  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly parser: IParser,
    private readonly cycleDetector: ICycleDetector,
  ) {}

  async execute(config: AnalysisConfig): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Step 1: Find all files to analyze
    const files = await this.findFiles(config);

    // Step 2: Parse all files and build dependency graph
    const modules = await this.parseModules(files);

    // Step 3: Detect cycles
    const cycles = await this.cycleDetector.detectCycles(modules, config.maxDepth);

    // Step 4: Build result
    const affectedModules = this.getAffectedModules(cycles);
    const duration = Date.now() - startTime;

    return {
      cycles,
      totalModules: modules.size,
      affectedModules,
      duration,
    };
  }

  private async findFiles(config: AnalysisConfig): Promise<readonly ModulePath[]> {
    const patterns = config.extensions.map((ext) => `*${ext}`);
    const exclude = [
      ...config.exclude,
      'node_modules',
      'dist',
      'build',
      'coverage',
      '.git',
    ];

    if (!config.includeNodeModules) {
      exclude.push('node_modules');
    }

    return await this.fileSystem.glob(patterns, exclude);
  }

  private async parseModules(files: readonly ModulePath[]): Promise<ReadonlyMap<ModulePath, Module>> {
    const modules = new Map<ModulePath, Module>();

    await Promise.all(
      files.map(async (file) => {
        try {
          const content = await this.fileSystem.readFile(file);
          const module = await this.parser.parse(file, content);
          modules.set(file, module);
        } catch (error) {
          // Skip files that fail to parse
          console.warn(`Failed to parse ${file}:`, error);
        }
      }),
    );

    return modules;
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
