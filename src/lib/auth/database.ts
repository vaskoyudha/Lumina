import "server-only";
import { Pool } from "pg";

// Keep one pool across route bundles and development hot reloads in this process.
const databaseGlobal = globalThis as typeof globalThis & {
  luminaAuthPool?: Pool;
};
export function authDatabase(): Pool {
  if (!databaseGlobal.luminaAuthPool) {
    if (!process.env.DATABASE_URL) throw new Error("Database unavailable");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 2000,
      query_timeout: 2000,
      statement_timeout: 2000,
      idleTimeoutMillis: 30000,
    });
    pool.on("error", () => {});
    databaseGlobal.luminaAuthPool = pool;
  }
  return databaseGlobal.luminaAuthPool;
}
