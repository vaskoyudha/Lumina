import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import pg from "pg";

// Node 24 strips TypeScript; resolve the same source aliases as Next so CLI
// imports and request-time reads share exactly one content validator.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/"))
      return nextResolve(
        new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href,
        context,
      );
    return nextResolve(specifier, context);
  },
});
const { ContentBundleSchema } = await import("../src/lib/content/schema.ts");
const input =
  process.argv[2] ||
  fileURLToPath(new URL("../content/competition.json", import.meta.url));
const replace = process.argv.includes("--replace");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 2000,
});
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const bundle = ContentBundleSchema.parse(
    JSON.parse(await readFile(input, "utf8")),
  );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7368413)");
    for (const m of bundle.modules) {
      await client.query(
        `INSERT INTO learning_modules(no, metadata, content) VALUES ($1,$2,$3)
        ON CONFLICT(no) ${replace ? "DO UPDATE SET metadata=EXCLUDED.metadata, content=EXCLUDED.content, updated_at=now()" : "DO NOTHING"}`,
        [
          m.metadata.no,
          JSON.stringify(m.metadata),
          m.content ? JSON.stringify(m.content) : null,
        ],
      );
    }
    for (const s of bundle.simulations) {
      await client.query(
        `INSERT INTO simulation_scenarios(id,module_no,payload) VALUES ($1,$2,$3)
        ON CONFLICT(id) ${replace ? "DO UPDATE SET module_no=EXCLUDED.module_no, payload=EXCLUDED.payload, updated_at=now()" : "DO NOTHING"}`,
        [s.scenario.scenario.id, s.moduleNo, JSON.stringify(s)],
      );
    }
    // References in partial imports may point to records already in the DB.
    const bad =
      await client.query(`SELECT m.no FROM learning_modules m LEFT JOIN simulation_scenarios s
      ON s.id=m.content->>'scenarioId' WHERE m.content->>'scenarioId' IS NOT NULL AND s.id IS NULL`);
    if (bad.rowCount) throw new Error("Referenced simulation does not exist");
    await client.query("COMMIT");
    console.log(
      `Content imported: ${bundle.modules.length} modules, ${bundle.simulations.length} simulations (${replace ? "replace" : "preserve existing"}).`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(
    error?.name === "ZodError"
      ? "Invalid content: validation failed."
      : "Content import failed; check database, migrations and references.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
