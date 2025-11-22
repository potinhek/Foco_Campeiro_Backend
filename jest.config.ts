import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/tests"],
  moduleFileExtensions: ["ts", "js"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/tests/**",
    "!src/index.ts",
    "!src/server.ts",
    "!src/router.ts",
    "!src/config/env.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: 1,
};

export default config;
