/**
 * Abstraction for parsing source code
 * Follows Interface Segregation Principle
 */

import type { Module, ModulePath } from '../models/types';

export type IParser = {
  /**
   * Parse a source file and extract imports
   */
  parse(path: ModulePath, content: string): Promise<Module>;

  /**
   * Check if file extension is supported
   */
  supports(extension: string): boolean;
};
