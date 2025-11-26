/**
 * Tarjan's strongly connected components algorithm for cycle detection
 * Efficient O(V + E) time complexity
 */

import type { ICycleDetector } from '../../domain/interfaces/ICycleDetector';
import type { Cycle, CycleEdge, Module, ModulePath } from '../../domain/models/types';
import * as crypto from 'crypto';

export class TarjanCycleDetector implements ICycleDetector {
  async detectCycles(
    modules: ReadonlyMap<ModulePath, Module>,
    maxDepth: number
  ): Promise<readonly Cycle[]> {
    const detector = new TarjanAlgorithm(modules, maxDepth);
    return detector.findCycles();
  }
}

class TarjanAlgorithm {
  private readonly modules: ReadonlyMap<ModulePath, Module>;
  private index = 0;
  private readonly stack: ModulePath[] = [];
  private readonly indexMap = new Map<ModulePath, number>();
  private readonly lowLinkMap = new Map<ModulePath, number>();
  private readonly onStack = new Set<ModulePath>();
  private readonly sccs: ModulePath[][] = [];

  constructor(modules: ReadonlyMap<ModulePath, Module>, _maxDepth: number) {
    this.modules = modules;
    // maxDepth parameter kept for interface compatibility but not used in Tarjan's algorithm
  }

  findCycles(): Cycle[] {
    // Run Tarjan's algorithm on all unvisited nodes
    for (const modulePath of this.modules.keys()) {
      if (!this.indexMap.has(modulePath)) {
        this.strongConnect(modulePath);
      }
    }

    // Convert SCCs to Cycles (only components with more than 1 node or self-loops)
    return this.sccs
      .filter((scc) => scc.length > 1 || this.hasSelfLoop(scc[0]))
      .map((scc) => this.createCycle(scc));
  }

  private strongConnect(modulePath: ModulePath): void {
    // Set depth index for this node
    this.indexMap.set(modulePath, this.index);
    this.lowLinkMap.set(modulePath, this.index);
    this.index++;
    this.stack.push(modulePath);
    this.onStack.add(modulePath);

    // Consider successors (dependencies)
    const module = this.modules.get(modulePath);
    if (!module) {
      return;
    }

    for (const importInfo of module.imports) {
      const successor = importInfo.resolvedPath;

      if (!this.modules.has(successor)) {
        continue;
      }

      if (!this.indexMap.has(successor)) {
        // Successor has not yet been visited; recurse on it
        this.strongConnect(successor);
        const currentLowLink = this.lowLinkMap.get(modulePath)!;
        const successorLowLink = this.lowLinkMap.get(successor)!;
        this.lowLinkMap.set(modulePath, Math.min(currentLowLink, successorLowLink));
      } else if (this.onStack.has(successor)) {
        // Successor is in stack and hence in current SCC
        const currentLowLink = this.lowLinkMap.get(modulePath)!;
        const successorIndex = this.indexMap.get(successor)!;
        this.lowLinkMap.set(modulePath, Math.min(currentLowLink, successorIndex));
      }
    }

    // If this is a root node, pop the stack and create SCC
    const moduleIndex = this.indexMap.get(modulePath)!;
    const moduleLowLink = this.lowLinkMap.get(modulePath)!;

    if (moduleLowLink === moduleIndex) {
      const scc: ModulePath[] = [];
      let w: ModulePath;

      do {
        w = this.stack.pop()!;
        this.onStack.delete(w);
        scc.push(w);
      } while (w !== modulePath);

      this.sccs.push(scc);
    }
  }

  private hasSelfLoop(modulePath: ModulePath): boolean {
    const module = this.modules.get(modulePath);
    if (!module) {
      return false;
    }

    return module.imports.some((imp) => imp.resolvedPath === modulePath);
  }

  private createCycle(scc: ModulePath[]): Cycle {
    // Find the actual cycle path in the SCC
    const cyclePath = this.findCyclePath(scc);
    const edges = this.buildCycleEdges(cyclePath);
    const id = this.generateCycleId(cyclePath);

    return {
      paths: cyclePath,
      edges,
      id,
    };
  }

  private findCyclePath(scc: ModulePath[]): ModulePath[] {
    if (scc.length === 1) {
      return [scc[0], scc[0]];
    }

    // Build adjacency list for this SCC
    const sccSet = new Set(scc);
    const adjacency = new Map<ModulePath, ModulePath[]>();

    for (const modulePath of scc) {
      const module = this.modules.get(modulePath);
      if (!module) {
        continue;
      }

      const neighbors = module.imports
        .map((imp) => imp.resolvedPath)
        .filter((path) => sccSet.has(path));

      adjacency.set(modulePath, neighbors);
    }

    // Find a cycle using DFS
    const visited = new Set<ModulePath>();
    const path: ModulePath[] = [];
    const recStack = new Set<ModulePath>();

    const dfs = (node: ModulePath): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = adjacency.get(node) || [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          // Found cycle
          path.push(neighbor); // Close the cycle
          return true;
        }
      }

      recStack.delete(node);
      path.pop();
      return false;
    };

    // Start DFS from first node
    dfs(scc[0]);

    return path.length > 1 ? path : [scc[0], scc[0]];
  }

  private buildCycleEdges(cyclePath: ModulePath[]): CycleEdge[] {
    const edges: CycleEdge[] = [];

    for (let i = 0; i < cyclePath.length - 1; i++) {
      const from = cyclePath[i];
      const to = cyclePath[i + 1];
      const module = this.modules.get(from);

      if (module) {
        const importInfo = module.imports.find((imp) => imp.resolvedPath === to);
        if (importInfo) {
          edges.push({ from, to, importInfo });
        }
      }
    }

    return edges;
  }

  private generateCycleId(cyclePath: ModulePath[]): string {
    const normalized = [...cyclePath].sort().join('::');
    return crypto.createHash('md5').update(normalized).digest('hex').slice(0, 8);
  }
}
