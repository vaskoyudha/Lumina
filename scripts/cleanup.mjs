import pg from "pg";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 2000,
  });
  try {
    for (const table of ["sessions", "oauth_states", "auth_attempts"])
      await pool.query(`DELETE FROM ${table} WHERE expires_at <= now()`);
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Operation failed; check configuration and database availability.",
  );
  process.exitCode = 1;
});
