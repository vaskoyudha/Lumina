import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

async function main() {
  const source = process.argv[2];
  if (!source || !process.env.DATABASE_URL || process.argv.length !== 3)
    throw new Error(
      "Usage: DATABASE_URL=... node scripts/import-sqlite.mjs BACKUP.sqlite",
    );
  const sqlite = new DatabaseSync(resolve(source), { readOnly: true });
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2000,
  });
  const client = await pool.connect();
  try {
    const users = sqlite
      .prepare(
        "SELECT id, email, nama, password_hash, google_sub, created_at FROM users",
      )
      .all();
    await client.query("BEGIN");
    for (const user of users)
      await client.query(
        "INSERT INTO users (id, email, nama, password_hash, google_sub, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          user.id,
          String(user.email).trim().toLowerCase(),
          user.nama,
          user.password_hash,
          user.google_sub,
          user.created_at,
        ],
      );
    await client.query("COMMIT");
    console.log(
      `Imported ${users.length} users. Sessions and OAuth transactions were not imported.`,
    );
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    throw new Error(
      "Import failed; transaction rolled back. Check for conflicting accounts and source format.",
    );
  } finally {
    client.release();
    await pool.end();
    sqlite.close();
  }
}
main().catch(() => {
  console.error(
    "Operation failed; check configuration and database availability.",
  );
  process.exitCode = 1;
});
