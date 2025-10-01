/**
 * Integration tests for end-to-end scenarios
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createAnalyzer } from '../../src/index';

describe('End-to-End Integration Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cycfix-test-'));
  });

  afterEach(async () => {
    // Clean up
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Simple 2-node cycle', () => {
    it('should detect a simple circular dependency', async () => {
      // Create test files
      const fileA = path.join(tempDir, 'a.ts');
      const fileB = path.join(tempDir, 'b.ts');

      await fs.writeFile(
        fileA,
        `import { b } from './b';\nexport const a = 'a' + b;`,
      );

      await fs.writeFile(
        fileB,
        `import { a } from './a';\nexport const b = 'b' + a;`,
      );

      const analyzer = createAnalyzer(tempDir);
      const result = await analyzer.detect({});

      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0].paths).toContain(fileA);
      expect(result.cycles[0].paths).toContain(fileB);
    });
  });

  describe('3-node cycle', () => {
    it('should detect a 3-node circular dependency', async () => {
      const fileA = path.join(tempDir, 'a.ts');
      const fileB = path.join(tempDir, 'b.ts');
      const fileC = path.join(tempDir, 'c.ts');

      await fs.writeFile(fileA, `import { b } from './b';\nexport const a = b;`);
      await fs.writeFile(fileB, `import { c } from './c';\nexport const b = c;`);
      await fs.writeFile(fileC, `import { a } from './a';\nexport const c = a;`);

      const analyzer = createAnalyzer(tempDir);
      const result = await analyzer.detect({});

      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0].paths.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('No cycles', () => {
    it('should not detect cycles in acyclic graph', async () => {
      const fileA = path.join(tempDir, 'a.ts');
      const fileB = path.join(tempDir, 'b.ts');

      await fs.writeFile(fileA, `import { b } from './b';\nexport const a = b;`);
      await fs.writeFile(fileB, `export const b = 'b';`);

      const analyzer = createAnalyzer(tempDir);
      const result = await analyzer.detect({});

      expect(result.cycles).toHaveLength(0);
    });
  });

  describe('Fix scenarios', () => {
    it('should provide manual steps for fixing cycles', async () => {
      const fileA = path.join(tempDir, 'a.ts');
      const fileB = path.join(tempDir, 'b.ts');

      await fs.writeFile(
        fileA,
        `import { b } from './b';\nexport const a = 'a' + b;`,
      );

      await fs.writeFile(
        fileB,
        `import { a } from './a';\nexport const b = 'b' + a;`,
      );

      const analyzer = createAnalyzer(tempDir);
      const { analysisResult, fixResults } = await analyzer.fix({}, { dryRun: true });

      expect(analysisResult.cycles).toHaveLength(1);
      expect(fixResults).toHaveLength(1);
      expect(fixResults[0].manualSteps || fixResults[0].success).toBeTruthy();
    });
  });

  describe('Multiple independent cycles', () => {
    it('should detect multiple independent cycles', async () => {
      // Cycle 1: A <-> B
      await fs.writeFile(
        path.join(tempDir, 'a.ts'),
        `import { b } from './b';\nexport const a = b;`,
      );
      await fs.writeFile(
        path.join(tempDir, 'b.ts'),
        `import { a } from './a';\nexport const b = a;`,
      );

      // Cycle 2: C <-> D
      await fs.writeFile(
        path.join(tempDir, 'c.ts'),
        `import { d } from './d';\nexport const c = d;`,
      );
      await fs.writeFile(
        path.join(tempDir, 'd.ts'),
        `import { c } from './c';\nexport const d = c;`,
      );

      const analyzer = createAnalyzer(tempDir);
      const result = await analyzer.detect({});

      expect(result.cycles).toHaveLength(2);
    });
  });

  describe('Exclusion patterns', () => {
    it('should respect exclusion patterns', async () => {
      // Create files in excluded directory
      const testDir = path.join(tempDir, 'tests');
      await fs.mkdir(testDir);

      await fs.writeFile(
        path.join(testDir, 'a.test.ts'),
        `import { b } from './b.test';\nexport const a = b;`,
      );
      await fs.writeFile(
        path.join(testDir, 'b.test.ts'),
        `import { a } from './a.test';\nexport const b = a;`,
      );

      const analyzer = createAnalyzer(tempDir);
      const result = await analyzer.detect({ exclude: ['tests'] });

      expect(result.cycles).toHaveLength(0);
    });
  });
});
