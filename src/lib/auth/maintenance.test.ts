/** @jest-environment node */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { testDatabaseUrl } from "@/lib/auth/test-database";

const url = testDatabaseUrl();
const integration = url ? describe : describe.skip;
integration("database maintenance", () => {
  const env = { ...process.env, DATABASE_URL: url };
  const run = (script: string, ...args: string[]) =>
    execFileSync(process.execPath, [script, ...args], { env, stdio: "pipe" });
  it("runs migration idempotently, imports hashes atomically, and cleans expired rows", async () => {
    run("scripts/migrate.mjs");
    run("scripts/migrate.mjs");
    const pool = new Pool({ connectionString: url });
    const dir = mkdtempSync(join(tmpdir(), "lumina-import-"));
    const source = join(dir, "backup.sqlite");
    const sqlite = new DatabaseSync(source);
    const id = randomUUID();
    const email = `${id}@example.test`;
    const hash = "scrypt$preserved-test-hash";
    try {
      sqlite.exec(
        "CREATE TABLE users (id TEXT, email TEXT, nama TEXT, password_hash TEXT, google_sub TEXT, created_at TEXT)",
      );
      sqlite
        .prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, email, "Test", hash, null, new Date().toISOString());
      sqlite.close();
      run("scripts/import-sqlite.mjs", source);
      expect(
        (
          await pool.query("SELECT password_hash FROM users WHERE id = $1", [
            id,
          ])
        ).rows[0].password_hash,
      ).toBe(hash);
      const second = new DatabaseSync(source);
      const extra = randomUUID();
      second.prepare("DELETE FROM users").run();
      second
        .prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)")
        .run(
          extra,
          `${extra}@example.test`,
          "Other",
          hash,
          null,
          new Date().toISOString(),
        );
      second
        .prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, email, "Test", hash, null, new Date().toISOString());
      second.close();
      expect(() => run("scripts/import-sqlite.mjs", source)).toThrow();
      expect(
        (await pool.query("SELECT id FROM users WHERE id = $1", [extra]))
          .rowCount,
      ).toBe(0);
      await pool.query(
        "INSERT INTO auth_attempts VALUES ($1, 1, now() - interval '1 second')",
        [id],
      );
      run("scripts/cleanup.mjs");
      expect(
        (await pool.query("SELECT key FROM auth_attempts WHERE key = $1", [id]))
          .rowCount,
      ).toBe(0);
    } finally {
      await pool.query("DELETE FROM users WHERE id = $1", [id]);
      await pool.end();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
