/**
 * Abstraction for parsing source code
 * Follows Interface Segregation Principle
 */

import { Module, ModulePath } from '../models/types';

export interface IParser {
  /**
   * Parse a source file and extract imports
   */
  parse(path: ModulePath, content: string): Promise<Module>;

  /**
   * Check if file extension is supported
   */
  supports(extension: string): boolean;
}
