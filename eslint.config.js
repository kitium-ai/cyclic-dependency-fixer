import { fileURLToPath } from 'node:url';
import { baseConfig, nodeConfig, typeScriptConfig } from '@kitiumai/lint/eslint';

const tsconfigPath = fileURLToPath(new URL('./tsconfig.eslint.json', import.meta.url));
const tsconfigRoot = fileURLToPath(new URL('./', import.meta.url));

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
    languageOptions: {
      parserOptions: {
        project: tsconfigPath,
        tsconfigRootDir: tsconfigRoot,
      },
    },
  },
  ...baseConfig,
  ...nodeConfig,
  ...typeScriptConfig,
  {
    name: 'cycfix-overrides',
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: tsconfigPath,
        tsconfigRootDir: tsconfigRoot,
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-restricted-imports': 'off',
      '@typescript-eslint/naming-convention': 'off',
      'max-lines-per-function': 'off',
      'max-statements': 'off',
      complexity: 'off',
      'max-depth': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'none', ignoreRestSiblings: false, caughtErrors: 'none' },
      ],
      indent: 'off',
    },
  },
  {
    name: 'cycfix-tests',
    files: ['tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: tsconfigPath,
        tsconfigRootDir: tsconfigRoot,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/require-await': 'off',
    },
  },
];
