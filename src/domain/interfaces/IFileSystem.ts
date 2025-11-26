/**
 * Abstraction for file system operations
 * Follows Dependency Inversion Principle
 */

import type { ModulePath } from '../models/types';

export type IFileSystem = {
  /**
   * Read file contents
   */
  readFile(path: ModulePath): Promise<string>;

  /**
   * Write file contents
   */
  writeFile(path: ModulePath, content: string): Promise<void>;

  /**
   * Check if file exists
   */
  exists(path: ModulePath): Promise<boolean>;

  /**
   * Get all files matching patterns
   */
  glob(patterns: readonly string[], exclude: readonly string[]): Promise<readonly ModulePath[]>;

  /**
   * Resolve module path from import statement
   */
  resolveModule(from: ModulePath, importPath: string): Promise<ModulePath | null>;

  /**
   * Get absolute path
   */
  getAbsolutePath(relativePath: string): string;

  /**
   * Get relative path between two files
   */
  getRelativePath(from: ModulePath, to: ModulePath): string;

  /**
   * Create backup of a file
   */
  backup(path: ModulePath): Promise<void>;
};
