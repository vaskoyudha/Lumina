import type { Config } from "jest";
import nextJest from "next/jest.js";

/**
 * Jest via `next/jest`, the official Next.js test path: it wires the SWC
 * transform, CSS-module stubs, and the `@/*` alias from tsconfig.json.
 *
 * Tests must render real React components — a pure-TypeScript check does not
 * catch the things that actually break in a demo (hydration, missing client
 * boundary, broken props).
 */

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.ts?(x)"],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
};

export default createJestConfig(config);
