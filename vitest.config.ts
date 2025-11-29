import { createKitiumVitestConfig } from '@kitiumai/vitest-helpers/config';
import { defineConfig } from 'vitest/config';

export default defineConfig(
  createKitiumVitestConfig({
    preset: 'library',
    environment: 'node',
    setupFiles: ['tests/setup/vitest.setup.ts'],
    overrides: {
      test: {
        include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
        coverage: {
          reporter: ['text', 'lcov', 'html'],
          reportsDirectory: 'coverage',
          exclude: ['dist/**', 'tests/setup/**', 'tests/**/fixtures/**'],
          thresholds: {
            lines: 45,
            functions: 50,
            branches: 40,
            statements: 45,
          },
        },
      },
    },
  }),
);
