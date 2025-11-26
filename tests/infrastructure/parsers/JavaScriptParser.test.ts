import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JavaScriptParser } from '../../../src/infrastructure/parsers/JavaScriptParser';
import { IFileSystem } from '../../../src/domain/interfaces/IFileSystem';
import { ImportType } from '../../../src/domain/models/types';

type MockedFileSystem = {
  [K in keyof IFileSystem]: IFileSystem[K] extends (...args: infer Args) => infer Return
    ? vi.Mock<Return, Args>
    : IFileSystem[K];
};

describe('JavaScriptParser', () => {
  let parser: JavaScriptParser;
  let mockFileSystem: MockedFileSystem;

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
    } as unknown as MockedFileSystem;

    parser = new JavaScriptParser(mockFileSystem);
  });

  describe('parse', () => {
    it('should parse static imports', async () => {
      const content = `
        import React from 'react';
        import { useState } from 'react';
        import * as utils from './utils';
      `;

      mockFileSystem.resolveModule.mockResolvedValue('/project/utils.ts');

      const module = await parser.parse('/project/index.ts', content);

      expect(module.path).toBe('/project/index.ts');
      expect(module.isTypeScript).toBe(true);
      expect(module.imports).toHaveLength(1); // Only local import
      expect(module.imports[0].type).toBe(ImportType.STATIC);
      expect(module.imports[0].source).toBe('./utils');
    });

    it('should parse dynamic imports', async () => {
      const content = `
        const module = import('./dynamic');
      `;

      mockFileSystem.resolveModule.mockResolvedValue('/project/dynamic.ts');

      const module = await parser.parse('/project/index.ts', content);

      expect(module.imports).toHaveLength(1);
      expect(module.imports[0].type).toBe(ImportType.DYNAMIC);
    });

    it('should parse require statements', async () => {
      const content = `
        const utils = require('./utils');
        const helper = require('./helper');
      `;

      mockFileSystem.resolveModule
        .mockResolvedValueOnce('/project/utils.js')
        .mockResolvedValueOnce('/project/helper.js');

      const module = await parser.parse('/project/index.js', content);

      expect(module.imports).toHaveLength(2);
      expect(module.imports[0].type).toBe(ImportType.REQUIRE);
      expect(module.imports[1].type).toBe(ImportType.REQUIRE);
    });

    it('should parse export-from statements', async () => {
      const content = `
        export { Component } from './components';
        export * from './types';
      `;

      mockFileSystem.resolveModule
        .mockResolvedValueOnce('/project/components.ts')
        .mockResolvedValueOnce('/project/types.ts');

      const module = await parser.parse('/project/index.ts', content);

      expect(module.imports).toHaveLength(2);
      expect(module.imports[0].type).toBe(ImportType.EXPORT_FROM);
      expect(module.imports[1].type).toBe(ImportType.EXPORT_FROM);
    });

    it('should ignore node_modules imports', async () => {
      const content = `
        import React from 'react';
        import { render } from '@testing-library/react';
        import { local } from './local';
      `;

      mockFileSystem.resolveModule.mockImplementation(async (_from, importPath) => {
        if (importPath === './local') {
          return '/project/local.ts';
        }
        return null;
      });

      const module = await parser.parse('/project/index.ts', content);

      expect(module.imports).toHaveLength(1); // Only local import
      expect(module.imports[0].source).toBe('./local');
    });

    it('should handle comments correctly', async () => {
      const content = `
        // import fake from './fake';
        /* import another from './another'; */
        import real from './real';
      `;

      mockFileSystem.resolveModule.mockResolvedValue('/project/real.ts');

      const module = await parser.parse('/project/index.ts', content);

      expect(module.imports).toHaveLength(1);
      expect(module.imports[0].source).toBe('./real');
    });

    it('should extract correct line numbers', async () => {
      const content = `
import first from './first';

import second from './second';
`;

      mockFileSystem.resolveModule
        .mockResolvedValueOnce('/project/first.ts')
        .mockResolvedValueOnce('/project/second.ts');

      const module = await parser.parse('/project/index.ts', content);

      expect(module.imports[0].line).toBe(2);
      expect(module.imports[1].line).toBe(4);
    });

    it('should extract imported identifiers', async () => {
      const content = `
        import defaultExport from './module1';
        import { named1, named2 } from './module2';
        import * as namespace from './module3';
      `;

      mockFileSystem.resolveModule
        .mockResolvedValueOnce('/project/module1.ts')
        .mockResolvedValueOnce('/project/module2.ts')
        .mockResolvedValueOnce('/project/module3.ts');

      const module = await parser.parse('/project/index.ts', content);

      expect(module.imports[0].identifiers).toContain('defaultExport');
      expect(module.imports[1].identifiers).toContain('named1');
      expect(module.imports[1].identifiers).toContain('named2');
      expect(module.imports[2].identifiers).toContain('namespace');
    });
  });

  describe('supports', () => {
    it('should support JavaScript extensions', () => {
      expect(parser.supports('.js')).toBe(true);
      expect(parser.supports('.jsx')).toBe(true);
      expect(parser.supports('.mjs')).toBe(true);
      expect(parser.supports('.cjs')).toBe(true);
    });

    it('should support TypeScript extensions', () => {
      expect(parser.supports('.ts')).toBe(true);
      expect(parser.supports('.tsx')).toBe(true);
    });

    it('should not support other extensions', () => {
      expect(parser.supports('.json')).toBe(false);
      expect(parser.supports('.css')).toBe(false);
      expect(parser.supports('.html')).toBe(false);
    });
  });
});
