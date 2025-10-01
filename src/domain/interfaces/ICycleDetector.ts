/**
 * Abstraction for cycle detection algorithms
 */

import { Cycle, Module, ModulePath } from '../models/types';

export interface ICycleDetector {
  /**
   * Detect all cycles in the dependency graph
   */
  detectCycles(
    modules: ReadonlyMap<ModulePath, Module>,
    maxDepth: number,
  ): Promise<readonly Cycle[]>;
}
