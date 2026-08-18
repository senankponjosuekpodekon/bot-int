"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    moduleFileExtensions: ['ts', 'js', 'json'],
    testMatch: ['<rootDir>/src/**/*.spec.ts'],
    verbose: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/dto/*.ts'],
    coverageDirectory: '<rootDir>/coverage',
    transform: {
        '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    },
};
exports.default = config;
//# sourceMappingURL=jest.config.js.map