/* global module */
/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
        },
        target: 'es2021',
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.ts',
    '!lib/**/*.d.ts',
  ],
  // Reduce memory usage
  maxWorkers: 1,
};

module.exports = config;
