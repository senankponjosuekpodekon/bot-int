import type { Config } from 'jest';

const config: Config = {
  // ESM mode: NestJS 12 packages are pure ESM (import.meta, no CJS build).
  // Run jest with NODE_OPTIONS=--experimental-vm-modules (see "test" script).
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  verbose: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/dto/*.ts'],
  coverageDirectory: '<rootDir>/coverage',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.spec.json', useESM: true },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!@nestjs|puppeteer|cheerio|puppeteer-core)',
  ],
  // TS sources are imported as "./x.js" from compiled-style paths inside
  // ESM deps; map bare .js spec-imports back to .ts when resolving our code.
  moduleNameMapper: {
    'puppeteer': '<rootDir>/src/__mocks__/puppeteer.ts',
  },
};

export default config;
