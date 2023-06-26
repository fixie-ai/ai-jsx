import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testMatch: ['<rootDir>/test/**/*.ts', '<rootDir>/test/**/*.tsx'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;
