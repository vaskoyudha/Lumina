/** Reject destructive integration tests unless they target a clearly separate database. */
export function testDatabaseUrl(): string | undefined {
  const candidate = process.env.TEST_DATABASE_URL;
  if (!candidate) return undefined;
  const test = new URL(candidate);
  const production = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL)
    : undefined;
  if (!test.pathname.slice(1).endsWith("_test"))
    throw new Error("TEST_DATABASE_URL must name a database ending in _test");
  if (
    production &&
    test.hostname === production.hostname &&
    (test.port || "5432") === (production.port || "5432") &&
    test.pathname === production.pathname
  )
    throw new Error("TEST_DATABASE_URL must target a separate database");
  return candidate;
}
