/**
 * Abstraction for cycle detection algorithms
 */

import type { Cycle, Module, ModulePath } from '../models/types';

export type ICycleDetector = {
  /**
   * Detect all cycles in the dependency graph
   */
  detectCycles(
    modules: ReadonlyMap<ModulePath, Module>,
    maxDepth: number
  ): Promise<readonly Cycle[]>;
};
