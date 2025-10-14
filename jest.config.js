module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.types.ts',
    '!src/**/*.interface.ts',
    '!src/cli/**/*.ts',
    '!src/application/ai/**/*.ts',
    '!src/infrastructure/ai/AnthropicProvider.ts',
    '!src/infrastructure/ai/OpenAIProvider.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 65,
      lines: 75,
      statements: 75,
    },
  },
  coverageDirectory: 'coverage',
  verbose: true,
};
