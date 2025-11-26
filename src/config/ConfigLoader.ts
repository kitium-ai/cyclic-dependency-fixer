import { promises as fs } from 'fs';
import path from 'path';
import { getCycfixLogger } from '../logger';
import type { CycfixConfig } from './CycfixConfig';

const logger = getCycfixLogger('config');

export class ConfigLoader {
  private readonly projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async load(explicitPath?: string): Promise<CycfixConfig | null> {
    const candidates = this.getCandidatePaths(explicitPath);

    for (const filePath of candidates) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content) as CycfixConfig;
        logger.info('Loaded configuration file', { filePath });
        return parsed;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          continue;
        }

        logger.warn('Failed to read configuration file', {
          filePath,
          error,
        });
      }
    }

    return null;
  }

  private getCandidatePaths(explicitPath?: string): string[] {
    if (explicitPath) {
      return [this.resolvePath(explicitPath)];
    }

    return [
      path.join(this.projectRoot, 'cycfix.config.json'),
      path.join(this.projectRoot, '.cycfixrc.json'),
    ];
  }

  private resolvePath(target: string): string {
    return path.isAbsolute(target) ? target : path.join(this.projectRoot, target);
  }
}
