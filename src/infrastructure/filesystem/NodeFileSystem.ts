/**
 * Node.js implementation of IFileSystem
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { unique } from '@kitiumai/utils-ts';
import type { ModulePath } from '../../domain/models/types';
import type { IFileSystem } from '../../domain/interfaces/IFileSystem';

export class NodeFileSystem implements IFileSystem {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  async readFile(filePath: ModulePath): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: ModulePath, content: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async exists(filePath: ModulePath): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async glob(
    patterns: readonly string[],
    exclude: readonly string[]
  ): Promise<readonly ModulePath[]> {
    const results: ModulePath[] = [];
    const excludeSet = new Set(exclude);

    for (const pattern of patterns) {
      const files = await this.walkDirectory(this.rootDir, pattern, excludeSet);
      results.push(...files);
    }

    return unique(results);
  }

  async resolveModule(from: ModulePath, importPath: string): Promise<ModulePath | null> {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const fromDir = path.dirname(from);
      const resolved = path.resolve(fromDir, importPath);
      return await this.resolveFile(resolved);
    }

    // Handle absolute imports (within project)
    if (importPath.startsWith('/')) {
      return await this.resolveFile(path.join(this.rootDir, importPath));
    }

    // Skip node_modules and external packages
    return null;
  }

  getAbsolutePath(relativePath: string): string {
    return path.resolve(this.rootDir, relativePath);
  }

  getRelativePath(from: ModulePath, to: ModulePath): string {
    let relative = path.relative(path.dirname(from), to);

    // Ensure relative path starts with ./ or ../
    if (!relative.startsWith('.')) {
      relative = './' + relative;
    }

    // Remove extension
    const parsed = path.parse(relative);
    return path.join(parsed.dir, parsed.name);
  }

  async backup(filePath: ModulePath): Promise<void> {
    const backupPath = `${filePath}.backup`;
    const content = await this.readFile(filePath);
    await this.writeFile(backupPath, content);
  }

  private async resolveFile(basePath: string): Promise<ModulePath | null> {
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

    for (const ext of extensions) {
      const fullPath = basePath + ext;
      if (await this.exists(fullPath)) {
        return fullPath;
      }

      // Check for index files
      const indexPath = path.join(basePath, 'index' + ext);
      if (await this.exists(indexPath)) {
        return indexPath;
      }
    }

    return null;
  }

  private async walkDirectory(
    dir: string,
    pattern: string,
    exclude: Set<string>
  ): Promise<ModulePath[]> {
    const results: ModulePath[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.rootDir, fullPath);

        // Check exclusions
        if (this.shouldExclude(relativePath, exclude)) {
          continue;
        }

        if (entry.isDirectory()) {
          const subResults = await this.walkDirectory(fullPath, pattern, exclude);
          results.push(...subResults);
        } else if (entry.isFile() && this.matchesPattern(entry.name, pattern)) {
          results.push(fullPath);
        }
      }
    } catch {
      // Ignore errors (permission issues, etc.)
    }

    return results;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple pattern matching for extensions
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      return filename.endsWith(ext);
    }
    return filename.includes(pattern);
  }

  private shouldExclude(relativePath: string, exclude: Set<string>): boolean {
    const normalizedPath = relativePath.replace(/\\/g, '/');

    for (const pattern of exclude) {
      if (normalizedPath.includes(pattern)) {
        return true;
      }
    }

    return false;
  }
}
