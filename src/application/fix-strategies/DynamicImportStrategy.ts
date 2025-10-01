/**
 * Strategy: Convert static imports to dynamic imports to break cycles
 * Best for: Simple cycles where lazy loading is acceptable
 */

import { IFixStrategy } from '../../domain/interfaces/IFixStrategy';
import { IFileSystem } from '../../domain/interfaces/IFileSystem';
import {
  Cycle,
  FixResult,
  FixStrategy,
  ImportType,
  ManualStep,
  Module,
  ModulePath,
} from '../../domain/models/types';

export class DynamicImportStrategy implements IFixStrategy {
  readonly type = FixStrategy.DYNAMIC_IMPORT;

  async canFix(cycle: Cycle): Promise<boolean> {
    // Can fix if cycle has at least one static import
    return cycle.edges.some((edge) => edge.importInfo.type === ImportType.STATIC);
  }

  score(cycle: Cycle): number {
    // Prefer this strategy for simple 2-node cycles
    const staticImports = cycle.edges.filter((e) => e.importInfo.type === ImportType.STATIC).length;
    const cycleLength = cycle.paths.length - 1; // -1 because last node repeats first

    if (cycleLength === 2 && staticImports > 0) {
      return 80; // High score for simple cycles
    }

    return staticImports > 0 ? 50 : 0;
  }

  async fix(
    cycle: Cycle,
    _modules: ReadonlyMap<ModulePath, Module>,
    fileSystem: IFileSystem,
    dryRun: boolean,
  ): Promise<FixResult> {
    try {
      // Find the best edge to convert to dynamic import
      const targetEdge = this.selectEdgeToConvert(cycle);

      if (!targetEdge) {
        return this.createManualResult(cycle);
      }

      const modifiedFiles: ModulePath[] = [];

      if (!dryRun) {
        await fileSystem.backup(targetEdge.from);
        const content = await fileSystem.readFile(targetEdge.from);
        const newContent = await this.convertToDynamicImport(content, targetEdge.importInfo);
        await fileSystem.writeFile(targetEdge.from, newContent);
        modifiedFiles.push(targetEdge.from);
      }

      return {
        cycle,
        strategy: this.type,
        success: true,
        modifiedFiles,
        createdFiles: [],
      };
    } catch (error) {
      return this.createManualResult(cycle, (error as Error).message);
    }
  }

  private selectEdgeToConvert(cycle: Cycle): any {
    // Select the edge with the fewest imported identifiers
    const staticEdges = cycle.edges.filter((e) => e.importInfo.type === ImportType.STATIC);

    if (staticEdges.length === 0) {
      return null;
    }

    return staticEdges.reduce((best, current) => {
      const bestCount = best.importInfo.identifiers.length;
      const currentCount = current.importInfo.identifiers.length;
      return currentCount < bestCount ? current : best;
    });
  }

  private async convertToDynamicImport(content: string, importInfo: any): Promise<string> {
    const lines = content.split('\n');
    const importLine = lines[importInfo.line - 1];

    // Extract what's being imported
    const defaultMatch = /import\s+(\w+)\s+from/.exec(importLine);
    const namedMatch = /import\s+\{([^}]+)\}\s+from/.exec(importLine);

    let replacement: string;

    if (defaultMatch) {
      const identifier = defaultMatch[1];
      // Comment out the original import
      lines[importInfo.line - 1] = `// ${importLine}`;

      // Add dynamic import where the identifier is first used
      replacement = this.addDynamicImportUsage(lines, identifier, importInfo.source);
    } else if (namedMatch) {
      const identifiers = namedMatch[1].split(',').map((id) => id.trim());
      lines[importInfo.line - 1] = `// ${importLine}`;
      replacement = this.addDynamicNamedImportUsage(lines, identifiers, importInfo.source);
    } else {
      // Fallback: just comment out
      lines[importInfo.line - 1] = `// ${importLine}`;
      replacement = lines.join('\n');
    }

    return replacement;
  }

  private addDynamicImportUsage(lines: string[], identifier: string, source: string): string {
    // Find first usage of the identifier
    for (let i = 0; i < lines.length; i++) {
      if (i !== 0 && lines[i].includes(identifier)) {
        // Add dynamic import before usage
        const indent = lines[i].match(/^\s*/)?.[0] || '';
        lines.splice(
          i,
          0,
          `${indent}const ${identifier} = await import('${source}').then(m => m.default || m);`,
        );
        break;
      }
    }

    return lines.join('\n');
  }

  private addDynamicNamedImportUsage(
    lines: string[],
    identifiers: string[],
    source: string,
  ): string {
    // Similar to above but for named imports
    const firstUsageLine = this.findFirstUsage(lines, identifiers);

    if (firstUsageLine !== -1) {
      const indent = lines[firstUsageLine].match(/^\s*/)?.[0] || '';
      const imports = identifiers.map((id) => id.split(/\s+as\s+/)[0].trim());
      lines.splice(
        firstUsageLine,
        0,
        `${indent}const { ${imports.join(', ')} } = await import('${source}');`,
      );
    }

    return lines.join('\n');
  }

  private findFirstUsage(lines: string[], identifiers: string[]): number {
    for (let i = 0; i < lines.length; i++) {
      for (const identifier of identifiers) {
        const id = identifier.split(/\s+as\s+/).pop()?.trim() || identifier;
        if (lines[i].includes(id)) {
          return i;
        }
      }
    }
    return -1;
  }

  private createManualResult(cycle: Cycle, error?: string): FixResult {
    const manualSteps: ManualStep[] = [];

    // Provide manual steps for converting to dynamic import
    const staticEdge = cycle.edges.find((e) => e.importInfo.type === ImportType.STATIC);

    if (staticEdge) {
      manualSteps.push({
        description: `Convert static import to dynamic import in ${staticEdge.from}`,
        file: staticEdge.from,
        line: staticEdge.importInfo.line,
        code: `// Replace:\n// import x from '${staticEdge.importInfo.source}'\n\n// With:\nconst x = await import('${staticEdge.importInfo.source}').then(m => m.default || m);`,
      });

      manualSteps.push({
        description: 'Make the parent function async if needed',
        file: staticEdge.from,
      });
    }

    return {
      cycle,
      strategy: this.type,
      success: false,
      modifiedFiles: [],
      createdFiles: [],
      error: error || 'Could not automatically apply dynamic import fix',
      manualSteps,
    };
  }
}
