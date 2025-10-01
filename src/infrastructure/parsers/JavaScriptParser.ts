/**
 * JavaScript/TypeScript parser using regex-based approach
 * Lightweight alternative to full AST parsing for import detection
 */

import * as path from 'path';
import { IParser } from '../../domain/interfaces/IParser';
import { Module, ModulePath, ImportInfo, ImportType } from '../../domain/models/types';
import { IFileSystem } from '../../domain/interfaces/IFileSystem';

export class JavaScriptParser implements IParser {
  private readonly fileSystem: IFileSystem;

  private static readonly IMPORT_PATTERNS = {
    // import x from 'module'
    staticImport: /import\s+(?:(?:\*\s+as\s+\w+)|(?:\w+)|(?:\{[^}]*\}))\s+from\s+['"]([^'"]+)['"]/g,
    // import('module')
    dynamicImport: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // require('module')
    require: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    // export { x } from 'module'
    exportFrom: /export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
  };

  private static readonly SUPPORTED_EXTENSIONS = new Set([
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.mjs',
    '.cjs',
  ]);

  constructor(fileSystem: IFileSystem) {
    this.fileSystem = fileSystem;
  }

  async parse(filePath: ModulePath, content: string): Promise<Module> {
    const imports = await this.extractImports(filePath, content);
    const extension = path.extname(filePath);
    const isTypeScript = extension === '.ts' || extension === '.tsx';

    return {
      path: filePath,
      imports,
      extension,
      isTypeScript,
    };
  }

  supports(extension: string): boolean {
    return JavaScriptParser.SUPPORTED_EXTENSIONS.has(extension);
  }

  private async extractImports(filePath: ModulePath, content: string): Promise<ImportInfo[]> {
    const imports: ImportInfo[] = [];

    // Remove comments to avoid false positives
    const cleanContent = this.removeComments(content);

    // Extract static imports
    imports.push(...(await this.extractPattern(
      cleanContent,
      JavaScriptParser.IMPORT_PATTERNS.staticImport,
      ImportType.STATIC,
      filePath,
    )));

    // Extract dynamic imports
    imports.push(...(await this.extractPattern(
      cleanContent,
      JavaScriptParser.IMPORT_PATTERNS.dynamicImport,
      ImportType.DYNAMIC,
      filePath,
    )));

    // Extract require statements
    imports.push(...(await this.extractPattern(
      cleanContent,
      JavaScriptParser.IMPORT_PATTERNS.require,
      ImportType.REQUIRE,
      filePath,
    )));

    // Extract export-from statements
    imports.push(...(await this.extractPattern(
      cleanContent,
      JavaScriptParser.IMPORT_PATTERNS.exportFrom,
      ImportType.EXPORT_FROM,
      filePath,
    )));

    return imports;
  }

  private async extractPattern(
    content: string,
    pattern: RegExp,
    type: ImportType,
    filePath: ModulePath,
  ): Promise<ImportInfo[]> {
    const imports: ImportInfo[] = [];
    const lines = content.split('\n');
    let match: RegExpExecArray | null;

    // Reset regex state
    pattern.lastIndex = 0;

    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];

      // Skip non-relative and non-absolute imports (node_modules)
      if (!this.isLocalImport(importPath)) {
        continue;
      }

      const resolvedPath = await this.fileSystem.resolveModule(filePath, importPath);

      if (resolvedPath) {
        const line = this.getLineNumber(content, match.index, lines);
        const identifiers = this.extractIdentifiers(match[0], type);

        imports.push({
          source: importPath,
          resolvedPath,
          line,
          type,
          identifiers,
        });
      }
    }

    return imports;
  }

  private isLocalImport(importPath: string): boolean {
    return importPath.startsWith('.') || importPath.startsWith('/');
  }

  private getLineNumber(_content: string, index: number, lines: string[]): number {
    let currentIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      currentIndex += lines[i].length + 1; // +1 for newline
      if (currentIndex > index) {
        return i + 1;
      }
    }
    return lines.length;
  }

  private extractIdentifiers(importStatement: string, type: ImportType): string[] {
    if (type === ImportType.DYNAMIC) {
      return [];
    }

    // Extract identifiers from import statement
    const identifiers: string[] = [];

    // Default import: import x from 'y'
    const defaultMatch = /import\s+(\w+)\s+from/.exec(importStatement);
    if (defaultMatch) {
      identifiers.push(defaultMatch[1]);
    }

    // Named imports: import { a, b } from 'y'
    const namedMatch = /\{([^}]+)\}/.exec(importStatement);
    if (namedMatch) {
      const names = namedMatch[1]
        .split(',')
        .map((name) => name.trim().split(/\s+as\s+/)[0].trim());
      identifiers.push(...names);
    }

    // Namespace import: import * as x from 'y'
    const namespaceMatch = /\*\s+as\s+(\w+)/.exec(importStatement);
    if (namespaceMatch) {
      identifiers.push(namespaceMatch[1]);
    }

    return identifiers;
  }

  private removeComments(content: string): string {
    // Remove single-line comments
    let result = content.replace(/\/\/.*$/gm, '');

    // Remove multi-line comments
    result = result.replace(/\/\*[\s\S]*?\*\//g, '');

    return result;
  }
}
