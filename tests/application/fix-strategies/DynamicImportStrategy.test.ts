/**
 * Unit tests for DynamicImportStrategy
 */

import { DynamicImportStrategy } from '../../../src/application/fix-strategies/DynamicImportStrategy';
import { Cycle, CycleEdge, ImportType, FixStrategy } from '../../../src/domain/models/types';
import { IFileSystem } from '../../../src/domain/interfaces/IFileSystem';

describe('DynamicImportStrategy', () => {
  let strategy: DynamicImportStrategy;
  let mockFileSystem: jest.Mocked<IFileSystem>;

  beforeEach(() => {
    strategy = new DynamicImportStrategy();

    mockFileSystem = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn(),
      glob: jest.fn(),
      resolveModule: jest.fn(),
      getAbsolutePath: jest.fn(),
      getRelativePath: jest.fn(),
      backup: jest.fn(),
    };
  });

  describe('type', () => {
    it('should have correct strategy type', () => {
      expect(strategy.type).toBe(FixStrategy.DYNAMIC_IMPORT);
    });
  });

  describe('canFix', () => {
    it('should return true for cycle with static imports', async () => {
      const edge: CycleEdge = {
        from: '/a.ts',
        to: '/b.ts',
        importInfo: {
          source: './b',
          resolvedPath: '/b.ts',
          line: 1,
          type: ImportType.STATIC,
          identifiers: ['b'],
        },
      };

      const cycle: Cycle = {
        paths: ['/a.ts', '/b.ts', '/a.ts'],
        edges: [edge],
        id: 'test',
      };

      const result = await strategy.canFix(cycle);

      expect(result).toBe(true);
    });

    it('should return false for cycle with no static imports', async () => {
      const edge: CycleEdge = {
        from: '/a.ts',
        to: '/b.ts',
        importInfo: {
          source: './b',
          resolvedPath: '/b.ts',
          line: 1,
          type: ImportType.DYNAMIC,
          identifiers: [],
        },
      };

      const cycle: Cycle = {
        paths: ['/a.ts', '/b.ts', '/a.ts'],
        edges: [edge],
        id: 'test',
      };

      const result = await strategy.canFix(cycle);

      expect(result).toBe(false);
    });
  });

  describe('score', () => {
    it('should give high score for simple 2-node cycles', () => {
      const edge: CycleEdge = {
        from: '/a.ts',
        to: '/b.ts',
        importInfo: {
          source: './b',
          resolvedPath: '/b.ts',
          line: 1,
          type: ImportType.STATIC,
          identifiers: ['b'],
        },
      };

      const cycle: Cycle = {
        paths: ['/a.ts', '/b.ts', '/a.ts'],
        edges: [edge, edge],
        id: 'test',
      };

      const score = strategy.score(cycle);

      expect(score).toBe(80);
    });

    it('should give lower score for longer cycles', () => {
      const edge: CycleEdge = {
        from: '/a.ts',
        to: '/b.ts',
        importInfo: {
          source: './b',
          resolvedPath: '/b.ts',
          line: 1,
          type: ImportType.STATIC,
          identifiers: ['b'],
        },
      };

      const cycle: Cycle = {
        paths: ['/a.ts', '/b.ts', '/c.ts', '/a.ts'],
        edges: [edge, edge, edge],
        id: 'test',
      };

      const score = strategy.score(cycle);

      expect(score).toBe(50);
    });

    it('should give zero score for no static imports', () => {
      const edge: CycleEdge = {
        from: '/a.ts',
        to: '/b.ts',
        importInfo: {
          source: './b',
          resolvedPath: '/b.ts',
          line: 1,
          type: ImportType.DYNAMIC,
          identifiers: [],
        },
      };

      const cycle: Cycle = {
        paths: ['/a.ts', '/b.ts', '/a.ts'],
        edges: [edge],
        id: 'test',
      };

      const score = strategy.score(cycle);

      expect(score).toBe(0);
    });
  });

  describe('fix', () => {
    it('should create manual steps when auto-fix fails', async () => {
      const edge: CycleEdge = {
        from: '/a.ts',
        to: '/b.ts',
        importInfo: {
          source: './b',
          resolvedPath: '/b.ts',
          line: 1,
          type: ImportType.STATIC,
          identifiers: ['b'],
        },
      };

      const cycle: Cycle = {
        paths: ['/a.ts', '/b.ts', '/a.ts'],
        edges: [edge],
        id: 'test',
      };

      const modules = new Map();

      mockFileSystem.readFile.mockRejectedValue(new Error('Read error'));

      const result = await strategy.fix(cycle, modules, mockFileSystem, false);

      expect(result.success).toBe(false);
      expect(result.manualSteps).toBeDefined();
      expect(result.manualSteps!.length).toBeGreaterThan(0);
    });

    it('should not modify files in dry run mode', async () => {
      const edge: CycleEdge = {
        from: '/a.ts',
        to: '/b.ts',
        importInfo: {
          source: './b',
          resolvedPath: '/b.ts',
          line: 1,
          type: ImportType.STATIC,
          identifiers: ['b'],
        },
      };

      const cycle: Cycle = {
        paths: ['/a.ts', '/b.ts', '/a.ts'],
        edges: [edge],
        id: 'test',
      };

      const modules = new Map();

      mockFileSystem.readFile.mockResolvedValue("import b from './b';");

      const result = await strategy.fix(cycle, modules, mockFileSystem, true);

      expect(mockFileSystem.writeFile).not.toHaveBeenCalled();
      expect(result.modifiedFiles).toHaveLength(0);
    });
  });
});
