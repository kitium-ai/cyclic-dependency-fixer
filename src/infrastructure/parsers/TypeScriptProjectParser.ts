import * as path from 'path';
import ts from 'typescript';
import type { IParser } from '../../domain/interfaces/IParser';
import {
  ImportType,
  type ImportInfo,
  type Module,
  type ModulePath,
} from '../../domain/models/types';

export type TypeScriptProjectParserOptions = {
  readonly projectRoot: string;
  readonly tsconfigPath?: string | null;
};

export class TypeScriptProjectParser implements IParser {
  private readonly compilerOptions: ts.CompilerOptions;
  private readonly host: ts.CompilerHost;
  private readonly projectRoot: string;

  private static readonly SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

  constructor(options: TypeScriptProjectParserOptions) {
    this.projectRoot = options.projectRoot;

    const { config, basePath } = this.loadTsConfig(options.tsconfigPath);
    this.compilerOptions = config.options;
    this.host = ts.createCompilerHost(this.compilerOptions);

    // Ensure module resolution honors the project root when no tsconfig is provided
    this.host.getCurrentDirectory = () => basePath;
  }

  supports(extension: string): boolean {
    return TypeScriptProjectParser.SUPPORTED_EXTENSIONS.has(extension);
  }

  async parse(filePath: ModulePath, content: string): Promise<Module> {
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier?.getText(sourceFile).replace(/['"]/g, '');
        if (moduleSpecifier) {
          const importInfo = this.createImportInfo(
            moduleSpecifier,
            node.getStart(),
            node,
            sourceFile,
            filePath
          );
          if (importInfo) {
            imports.push(importInfo);
          }
        }
      }

      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const identifier = node.expression.getText(sourceFile);
        if (identifier === 'require' && node.arguments.length) {
          const argument = node.arguments[0];
          if (ts.isStringLiteral(argument)) {
            const importInfo = this.createImportInfo(
              argument.text,
              node.getStart(),
              node,
              sourceFile,
              filePath,
              ImportType.REQUIRE
            );
            if (importInfo) {
              imports.push(importInfo);
            }
          }
        }
      }

      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) {
          const importInfo = this.createImportInfo(
            argument.text,
            node.getStart(),
            node,
            sourceFile,
            filePath,
            ImportType.DYNAMIC
          );
          if (importInfo) {
            imports.push(importInfo);
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    const extension = path.extname(filePath);
    const isTypeScript = extension === '.ts' || extension === '.tsx';

    return {
      path: filePath,
      imports,
      extension,
      isTypeScript,
    };
  }

  private createImportInfo(
    rawSpecifier: string,
    start: number,
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: ModulePath,
    type: ImportType = ImportType.STATIC
  ): ImportInfo | null {
    if (!this.isLocalImport(rawSpecifier)) {
      return null;
    }

    const resolvedPath = this.resolveImportPath(rawSpecifier, filePath);
    if (!resolvedPath) {
      return null;
    }

    const { line } = sourceFile.getLineAndCharacterOfPosition(start);
    const identifiers = this.extractIdentifiers(node);

    return {
      source: rawSpecifier,
      resolvedPath,
      line: line + 1,
      type,
      identifiers,
    };
  }

  private extractIdentifiers(node: ts.Node): string[] {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const identifiers: string[] = [];
      const { importClause } = node;

      if (importClause.name) {
        identifiers.push(importClause.name.getText());
      }

      if (importClause.namedBindings) {
        if (ts.isNamespaceImport(importClause.namedBindings)) {
          identifiers.push(importClause.namedBindings.name.getText());
        }

        if (ts.isNamedImports(importClause.namedBindings)) {
          importClause.namedBindings.elements.forEach((element) => {
            identifiers.push(element.name.getText());
          });
        }
      }

      return identifiers;
    }

    return [];
  }

  private isLocalImport(specifier: string): boolean {
    return specifier.startsWith('.') || specifier.startsWith('/');
  }

  private resolveImportPath(specifier: string, containingFile: string): ModulePath | null {
    const normalizedContaining = path.isAbsolute(containingFile)
      ? containingFile
      : path.join(this.projectRoot, containingFile);

    const resolution = ts.resolveModuleName(
      specifier,
      normalizedContaining,
      this.compilerOptions,
      this.host,
      undefined
    );

    const resolvedFile = resolution.resolvedModule?.resolvedFileName;
    if (resolvedFile) {
      return path.resolve(resolvedFile);
    }

    return null;
  }

  private loadTsConfig(tsconfigPath?: string | null): {
    config: ts.ParsedCommandLine;
    basePath: string;
  } {
    if (!tsconfigPath) {
      return {
        config: ts.parseJsonConfigFileContent({ compilerOptions: {} }, ts.sys, this.projectRoot),
        basePath: this.projectRoot,
      };
    }

    const absolute = path.isAbsolute(tsconfigPath)
      ? tsconfigPath
      : path.join(this.projectRoot, tsconfigPath);

    const configFile = ts.readConfigFile(absolute, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(absolute));

    return { config: parsed, basePath: path.dirname(absolute) };
  }
}
