import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import type { Module } from '../../domain/models/types';

export type CachedModule = {
  readonly hash: string;
  readonly module: Module;
};

export type CacheState = {
  readonly modules: Record<string, CachedModule>;
};

export class AnalysisCache {
  constructor(private readonly cacheDir: string) {}

  private get cacheFile(): string {
    return path.join(this.cacheDir, 'cycfix-cache.json');
  }

  async load(): Promise<CacheState> {
    try {
      const content = await fs.readFile(this.cacheFile, 'utf-8');
      return JSON.parse(content) as CacheState;
    } catch {
      return { modules: {} };
    }
  }

  async save(state: CacheState): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.writeFile(this.cacheFile, JSON.stringify(state, null, 2), 'utf-8');
  }

  static hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
