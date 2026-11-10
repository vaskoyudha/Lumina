import { existsSync } from "node:fs";

/**
 * Reproduce the full local `/komunitas` demo feed on another database.
 *
 * Order matters: schema first (`npm run db:migrate`), then this script. It runs
 * both committed seeds sequentially:
 *
 *   1. `seed-community.mjs`       — 5 fictional members, 9 scam-modus briefs
 *   2. `seed-community-agents.mjs` — 8 Lumina detector agents, 8 briefs
 *
 * Both are idempotent and only touch the reserved `@contoh.lumina` and
 * `@agen.lumina` accounts, so real accounts, sessions, learning progress, and
 * simulation results are left untouched. `--reset` removes only those seed
 * accounts (their posts cascade) before re-inserting.
 *
 * The member seed is demo fiction. It is fine for a local demo or a
 * presentation database the owner controls; do not present the seeded members
 * as real member activity.
 *
 * Usage:
 *   node scripts/seed-demo.mjs
 *   node scripts/seed-demo.mjs --reset
 *   DATABASE_URL=postgresql://... node scripts/seed-demo.mjs
 */

if (!process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set; nothing to seed.");
  process.exit(1);
}

await import("./seed-community.mjs");
await import("./seed-community-agents.mjs");
