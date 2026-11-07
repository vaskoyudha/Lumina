import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

let database: DatabaseSync | undefined;

/** Open lazily: prerendering must never create an account database. */
export function authDatabase(): DatabaseSync {
  if (database) return database;
  const path = process.env.AUTH_DATABASE_PATH || resolve("data/auth.sqlite");
  if (path !== ":memory:")
    // The database is runtime data, never an input to the deployment bundle.
    mkdirSync(dirname(resolve(/* turbopackIgnore: true */ path)), {
      recursive: true,
    });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      nama TEXT NOT NULL,
      password_hash TEXT,
      google_sub TEXT UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS auth_attempts (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS oauth_states (
      state_hash TEXT PRIMARY KEY,
      verifier TEXT NOT NULL,
      nonce TEXT NOT NULL,
      intent TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);
  database = db;
  return db;
}
