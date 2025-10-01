/**
 * Unit tests for TarjanCycleDetector
 */

import { TarjanCycleDetector } from '../../../src/infrastructure/graph/TarjanCycleDetector';
import { Module, ImportType } from '../../../src/domain/models/types';

describe('TarjanCycleDetector', () => {
  let detector: TarjanCycleDetector;

  beforeEach(() => {
    detector = new TarjanCycleDetector();
  });

  describe('detectCycles', () => {
    it('should detect no cycles in acyclic graph', async () => {
      const modules = new Map<string, Module>([
        [
          '/a.ts',
          {
            path: '/a.ts',
            imports: [
              {
                source: './b',
                resolvedPath: '/b.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['b'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
        [
          '/b.ts',
          {
            path: '/b.ts',
            imports: [],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
      ]);

      const cycles = await detector.detectCycles(modules, 50);

      expect(cycles).toHaveLength(0);
    });

    it('should detect simple 2-node cycle', async () => {
      const modules = new Map<string, Module>([
        [
          '/a.ts',
          {
            path: '/a.ts',
            imports: [
              {
                source: './b',
                resolvedPath: '/b.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['b'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
        [
          '/b.ts',
          {
            path: '/b.ts',
            imports: [
              {
                source: './a',
                resolvedPath: '/a.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['a'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
      ]);

      const cycles = await detector.detectCycles(modules, 50);

      expect(cycles).toHaveLength(1);
      expect(cycles[0].paths).toHaveLength(3); // A -> B -> A
      expect(cycles[0].edges).toHaveLength(2);
    });

    it('should detect 3-node cycle', async () => {
      const modules = new Map<string, Module>([
        [
          '/a.ts',
          {
            path: '/a.ts',
            imports: [
              {
                source: './b',
                resolvedPath: '/b.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['b'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
        [
          '/b.ts',
          {
            path: '/b.ts',
            imports: [
              {
                source: './c',
                resolvedPath: '/c.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['c'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
        [
          '/c.ts',
          {
            path: '/c.ts',
            imports: [
              {
                source: './a',
                resolvedPath: '/a.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['a'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
      ]);

      const cycles = await detector.detectCycles(modules, 50);

      expect(cycles).toHaveLength(1);
      expect(cycles[0].paths.length).toBeGreaterThanOrEqual(3);
    });

    it('should detect self-loop', async () => {
      const modules = new Map<string, Module>([
        [
          '/a.ts',
          {
            path: '/a.ts',
            imports: [
              {
                source: './a',
                resolvedPath: '/a.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['self'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
      ]);

      const cycles = await detector.detectCycles(modules, 50);

      expect(cycles).toHaveLength(1);
      expect(cycles[0].paths).toContain('/a.ts');
    });

    it('should detect multiple independent cycles', async () => {
      const modules = new Map<string, Module>([
        [
          '/a.ts',
          {
            path: '/a.ts',
            imports: [
              {
                source: './b',
                resolvedPath: '/b.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['b'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
        [
          '/b.ts',
          {
            path: '/b.ts',
            imports: [
              {
                source: './a',
                resolvedPath: '/a.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['a'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
        [
          '/c.ts',
          {
            path: '/c.ts',
            imports: [
              {
                source: './d',
                resolvedPath: '/d.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['d'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
        [
          '/d.ts',
          {
            path: '/d.ts',
            imports: [
              {
                source: './c',
                resolvedPath: '/c.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['c'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
      ]);

      const cycles = await detector.detectCycles(modules, 50);

      expect(cycles).toHaveLength(2);
    });

    it('should generate unique IDs for cycles', async () => {
      const modules = new Map<string, Module>([
        [
          '/a.ts',
          {
            path: '/a.ts',
            imports: [
              {
                source: './b',
                resolvedPath: '/b.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['b'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
        [
          '/b.ts',
          {
            path: '/b.ts',
            imports: [
              {
                source: './a',
                resolvedPath: '/a.ts',
                line: 1,
                type: ImportType.STATIC,
                identifiers: ['a'],
              },
            ],
            extension: '.ts',
            isTypeScript: true,
          },
        ],
      ]);

      const cycles = await detector.detectCycles(modules, 50);

      expect(cycles[0].id).toBeDefined();
      expect(cycles[0].id.length).toBeGreaterThan(0);
    });
  });
});
