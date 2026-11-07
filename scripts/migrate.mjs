import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2000,
  });
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(7368412)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const directory = fileURLToPath(new URL("../migrations/", import.meta.url));
    for (const file of (await readdir(directory))
      .filter((f) => /^\d+_[\w-]+\.sql$/.test(f))
      .sort()) {
      if (
        (
          await client.query(
            "SELECT 1 FROM schema_migrations WHERE version = $1",
            [file],
          )
        ).rowCount
      )
        continue;
      await client.query("BEGIN");
      try {
        await client.query(
          await readFile(
            new URL(`../migrations/${file}`, import.meta.url),
            "utf8",
          ),
        );
        await client.query(
          "INSERT INTO schema_migrations(version) VALUES ($1)",
          [file],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(7368412)").catch(() => {});
    client.release();
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Operation failed; check configuration and database availability.",
  );
  process.exitCode = 1;
});
