/**
 * Strategy: Extract shared dependencies into a common module
 * Best for: Cycles where modules share common functionality
 */

import { IFixStrategy } from '../../domain/interfaces/IFixStrategy';
import { IFileSystem } from '../../domain/interfaces/IFileSystem';
import {
  Cycle,
  FixResult,
  FixStrategy,
  ManualStep,
  Module,
  ModulePath,
} from '../../domain/models/types';
import * as path from 'path';

export class ExtractSharedStrategy implements IFixStrategy {
  readonly type = FixStrategy.EXTRACT_SHARED;

  async canFix(cycle: Cycle): Promise<boolean> {
    // Can fix if cycle has 2-4 nodes (practical for extraction)
    const cycleLength = cycle.paths.length - 1;
    return cycleLength >= 2 && cycleLength <= 4;
  }

  score(cycle: Cycle, _modules: ReadonlyMap<ModulePath, Module>): number {
    const cycleLength = cycle.paths.length - 1;

    // Check if modules in cycle are in the same directory
    const directories = cycle.paths.slice(0, -1).map((p) => path.dirname(p));
    const sameDirectory = new Set(directories).size === 1;

    if (cycleLength === 2 && sameDirectory) {
      return 70; // Good score for simple same-directory cycles
    }

    if (cycleLength <= 3 && sameDirectory) {
      return 60;
    }

    return sameDirectory ? 40 : 20;
  }

  async fix(
    cycle: Cycle,
    _modules: ReadonlyMap<ModulePath, Module>,
    fileSystem: IFileSystem,
    _dryRun: boolean,
  ): Promise<FixResult> {
    try {
      // Determine shared module location
      const sharedModulePath = this.determineSharedModulePath(cycle);

      const manualSteps: ManualStep[] = [
        {
          description: `Create a new shared module: ${sharedModulePath}`,
          file: sharedModulePath,
          code: this.generateSharedModuleTemplate(cycle),
        },
        {
          description: 'Move shared types, interfaces, or utility functions to the new module',
          file: sharedModulePath,
        },
      ];

      // Add steps for updating each module in the cycle
      for (const modulePath of cycle.paths.slice(0, -1)) {
        const relativePath = fileSystem.getRelativePath(modulePath, sharedModulePath);
        manualSteps.push({
          description: `Update imports in ${path.basename(modulePath)} to use shared module`,
          file: modulePath,
          code: `import { /* shared items */ } from '${relativePath}';`,
        });
      }

      return {
        cycle,
        strategy: this.type,
        success: false, // This strategy requires manual intervention
        modifiedFiles: [],
        createdFiles: [],
        error: 'Extraction requires manual code movement',
        manualSteps,
      };
    } catch (error) {
      return {
        cycle,
        strategy: this.type,
        success: false,
        modifiedFiles: [],
        createdFiles: [],
        error: (error as Error).message,
      };
    }
  }

  private determineSharedModulePath(cycle: Cycle): ModulePath {
    // Get common directory
    const firstPath = cycle.paths[0];
    const dir = path.dirname(firstPath);
    const ext = path.extname(firstPath);

    // Generate shared module name
    return path.join(dir, `shared${ext}`);
  }

  private generateSharedModuleTemplate(cycle: Cycle): string {
    const ext = path.extname(cycle.paths[0]);
    const isTypeScript = ext === '.ts' || ext === '.tsx';

    if (isTypeScript) {
      return `/**
 * Shared module to break circular dependency
 * Extracted from: ${cycle.paths.slice(0, -1).map((p) => path.basename(p)).join(', ')}
 */

// Move shared types, interfaces, and utility functions here
export {};
`;
    }

    return `/**
 * Shared module to break circular dependency
 * Extracted from: ${cycle.paths.slice(0, -1).map((p) => path.basename(p)).join(', ')}
 */

// Move shared functions and constants here
module.exports = {};
`;
  }
}
