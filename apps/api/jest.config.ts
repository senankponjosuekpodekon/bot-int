import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  verbose: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/dto/*.ts'],
  coverageDirectory: '<rootDir>/coverage',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!puppeteer|cheerio|puppeteer-core)',
  ],
  moduleNameMapper: {
    'puppeteer': '<rootDir>/src/__mocks__/puppeteer.ts',
  },
};

export default config;
