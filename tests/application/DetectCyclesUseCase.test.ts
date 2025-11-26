import { beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { DetectCyclesUseCase } from '../../src/application/DetectCyclesUseCase';
import { IFileSystem } from '../../src/domain/interfaces/IFileSystem';
import { IParser } from '../../src/domain/interfaces/IParser';
import { ICycleDetector } from '../../src/domain/interfaces/ICycleDetector';
import { AnalysisConfig, Module, Cycle, ImportType } from '../../src/domain/models/types';

describe('DetectCyclesUseCase', () => {
  let useCase: DetectCyclesUseCase;
  let mockFileSystem: Mocked<IFileSystem>;
  let mockParser: Mocked<IParser>;
  let mockCycleDetector: Mocked<ICycleDetector>;

  beforeEach(() => {
    mockFileSystem = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      exists: vi.fn(),
      glob: vi.fn(),
      resolveModule: vi.fn(),
      getAbsolutePath: vi.fn(),
      getRelativePath: vi.fn(),
      backup: vi.fn(),
    };

    mockParser = {
      parse: vi.fn(),
      supports: vi.fn(),
    };

    mockCycleDetector = {
      detectCycles: vi.fn(),
    };

    useCase = new DetectCyclesUseCase(mockFileSystem, mockParser, mockCycleDetector);
  });

  describe('execute', () => {
    const config: AnalysisConfig = {
      rootDir: '/project',
      extensions: ['.ts', '.js'],
      exclude: ['node_modules'],
      includeNodeModules: false,
      maxDepth: 50,
    };

    it('should find and parse all files', async () => {
      const files = ['/project/a.ts', '/project/b.ts'];
      mockFileSystem.glob.mockResolvedValue(files);
      mockFileSystem.readFile.mockResolvedValue('content');

      const mockModule: Module = {
        path: '/project/a.ts',
        imports: [],
        extension: '.ts',
        isTypeScript: true,
      };

      mockParser.parse.mockResolvedValue(mockModule);
      mockCycleDetector.detectCycles.mockResolvedValue([]);

      const result = await useCase.execute(config);

      expect(mockFileSystem.glob).toHaveBeenCalledWith(
        ['*.ts', '*.js'],
        expect.arrayContaining(['node_modules']),
      );
      expect(mockParser.parse).toHaveBeenCalledTimes(2);
      expect(result.totalModules).toBe(2);
    });

    it('should detect cycles', async () => {
      const files = ['/project/a.ts', '/project/b.ts'];
      mockFileSystem.glob.mockResolvedValue(files);
      mockFileSystem.readFile.mockResolvedValue('content');

      const mockModule: Module = {
        path: '/project/a.ts',
        imports: [
          {
            source: './b',
            resolvedPath: '/project/b.ts',
            line: 1,
            type: ImportType.STATIC,
            identifiers: ['b'],
          },
        ],
        extension: '.ts',
        isTypeScript: true,
      };

      mockParser.parse.mockResolvedValue(mockModule);

      const mockCycle: Cycle = {
        paths: ['/project/a.ts', '/project/b.ts', '/project/a.ts'],
        edges: [],
        id: 'abc123',
      };

      mockCycleDetector.detectCycles.mockResolvedValue([mockCycle]);

      const result = await useCase.execute(config);

      expect(result.cycles).toHaveLength(1);
      expect(result.affectedModules).toContain('/project/a.ts');
      expect(result.affectedModules).toContain('/project/b.ts');
    });

    it('should return empty cycles when none found', async () => {
      const files = ['/project/a.ts'];
      mockFileSystem.glob.mockResolvedValue(files);
      mockFileSystem.readFile.mockResolvedValue('content');

      const mockModule: Module = {
        path: '/project/a.ts',
        imports: [],
        extension: '.ts',
        isTypeScript: true,
      };

      mockParser.parse.mockResolvedValue(mockModule);
      mockCycleDetector.detectCycles.mockResolvedValue([]);

      const result = await useCase.execute(config);

      expect(result.cycles).toHaveLength(0);
      expect(result.affectedModules).toHaveLength(0);
    });

    it('should handle parsing errors gracefully', async () => {
      const files = ['/project/a.ts', '/project/b.ts'];
      mockFileSystem.glob.mockResolvedValue(files);
      mockFileSystem.readFile.mockResolvedValue('content');

      const mockModule: Module = {
        path: '/project/a.ts',
        imports: [],
        extension: '.ts',
        isTypeScript: true,
      };

      mockParser.parse
        .mockRejectedValueOnce(new Error('Parse error'))
        .mockResolvedValueOnce(mockModule);

      mockCycleDetector.detectCycles.mockResolvedValue([]);

      const result = await useCase.execute(config);

      // Should only parse the successful one
      expect(result.totalModules).toBe(1);
    });

    it('should include duration in result', async () => {
      mockFileSystem.glob.mockResolvedValue([]);
      mockCycleDetector.detectCycles.mockResolvedValue([]);

      const result = await useCase.execute(config);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });
  });
});
