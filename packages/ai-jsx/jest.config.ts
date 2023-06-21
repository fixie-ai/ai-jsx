import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  moduleDirectories: ['node_modules', 'dist', 'src'],
  modulePaths: ['<rootDir>/node_modules', '<rootDir>/dist', '<rootDir>/src'],
  roots: ['<rootDir>', '<rootDir>/src', '<rootDir>/dist'],
};

export default config;
