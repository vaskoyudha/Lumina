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
    await pool.query(`DELETE FROM simulation_intrusion_timers t
      WHERE t.started_at < now()-interval '1 day'
      AND NOT EXISTS(SELECT 1 FROM simulation_results r WHERE r.attempt_id=t.attempt_id)`);
    await pool.query(
      "DELETE FROM agent_runs WHERE created_at < now() - interval '90 days'",
    );
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
