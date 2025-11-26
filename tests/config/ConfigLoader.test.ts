import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { ConfigLoader } from '../../src/config/ConfigLoader';

describe('ConfigLoader', () => {
  it('loads configuration from default file', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cycfix-config-'));
    const configPath = path.join(tempDir, 'cycfix.config.json');
    await fs.writeFile(
      configPath,
      JSON.stringify(
        {
          analysis: {
            extensions: ['.ts'],
            includeNodeModules: true,
          },
        },
        null,
        2,
      ),
      'utf-8',
    );

    const loader = new ConfigLoader(tempDir);
    const config = await loader.load();

    expect(config).not.toBeNull();
    expect(config?.analysis?.extensions).toEqual(['.ts']);
    expect(config?.analysis?.includeNodeModules).toBe(true);
  });
});
