import { defineConfig } from 'vitest/config';

type Preset = {
  test?: Record<string, unknown>;
};

export default defineConfig(async () => {
  let libraryPreset: Preset = {};

  try {
    const { VitestPresets } = await import('@kitiumai/vitest-helpers/setup');
    libraryPreset = VitestPresets.library ?? {};
  } catch (error) {
    console.warn(
      '[vitest] Failed to load @kitiumai/vitest-helpers presets, falling back to local defaults.',
      error,
    );
    libraryPreset = {
      test: {
        globals: true,
        environment: 'node',
        restoreMocks: true,
        clearMocks: true,
        mockReset: true,
        coverage: {
          enabled: true,
          provider: 'v8',
          reporter: ['text', 'lcov'],
        },
      },
    };
  }

  const baseTest = libraryPreset.test ?? {};

  return {
    ...libraryPreset,
    test: {
      ...baseTest,
      include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
      setupFiles: ['tests/setup/vitest.setup.ts'],
      coverage: {
        ...(baseTest as { coverage?: Record<string, unknown> }).coverage,
        provider: 'v8',
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
  };
});
