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
  // Integration suites reset the same dedicated database. Keep their data isolated in time.
  maxWorkers: process.env.TEST_DATABASE_URL ? 1 : "50%",
  // Component suites drive real user events; on a loaded Windows host the
  // default 5s budget expires while the worker is still scheduling timers.
  testTimeout: 15_000,
  modulePathIgnorePatterns: ["<rootDir>/.cache/", "<rootDir>/.next/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.ts?(x)"],
  moduleDirectories: ["node_modules", "<rootDir>/"],
  // `next/jest` resolves the `@/*` alias inside the SWC transform, so static
  // imports work without this. But `jest.mock("@/…")` is resolved by Jest's own
  // resolver *before* transform, which knows nothing about tsconfig paths —
  // so the alias has to be declared here too.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
};

/**
 * next/jest prepends its own node_modules ignore rules, which wins over the
 * config passed to nextJest. Override the resolved config so the ESM-only
 * react-markdown/unified stack can be compiled by the SWC transformer.
 */
const esmPackages = [
  "react-markdown",
  "remark-.*",
  "micromark.*",
  "mdast-.*",
  "hast-.*",
  "unist-.*",
  "vfile.*",
  "unified",
  "bail",
  "trough",
  "devlop",
  "property-information",
  "space-separated-tokens",
  "comma-separated-tokens",
  "html-url-attributes",
  "style-to-object",
  "inline-style-parser",
  "character-entities.*",
  "decode-named-character-reference",
  "trim-lines",
  "ccount",
  "markdown-table",
  "longest-streak",
  "zwitch",
  "escape-string-regexp",
  "is-plain-obj",
  "github-slugger",
  "parse-entities",
  "stringify-entities",
  "character-reference-invalid",
  "html-void-elements",
  "web-namespaces",
  "estree-util-.*",
];

export default async function jestConfig(): Promise<Config> {
  const resolved = await createJestConfig(config)();
  return {
    ...resolved,
    transformIgnorePatterns: [
      `/node_modules/(?!(${esmPackages.join("|")})/)`,
      "^.+\\.module\\.(css|sass|scss)$",
      "/.next/",
    ],
  };
}
