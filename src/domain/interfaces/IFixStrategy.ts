/**
 * Abstraction for fix strategies
 * Follows Strategy Pattern and Open/Closed Principle
 */

import { Cycle, FixResult, FixStrategy, Module, ModulePath } from '../models/types';
import { IFileSystem } from './IFileSystem';

export interface IFixStrategy {
  /**
   * Get the strategy type
   */
  readonly type: FixStrategy;

  /**
   * Check if this strategy can fix the given cycle
   */
  canFix(cycle: Cycle, modules: ReadonlyMap<ModulePath, Module>): Promise<boolean>;

  /**
   * Calculate a score for how well this strategy fits the cycle (higher is better)
   */
  score(cycle: Cycle, modules: ReadonlyMap<ModulePath, Module>): number;

  /**
   * Apply the fix
   */
  fix(
    cycle: Cycle,
    modules: ReadonlyMap<ModulePath, Module>,
    fileSystem: IFileSystem,
    dryRun: boolean,
  ): Promise<FixResult>;
}
