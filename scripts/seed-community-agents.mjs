import { readFile } from "node:fs/promises";
import pg from "pg";

/**
 * Dummy agent news for `/komunitas`.
 *
 * Inserts the eight Lumina detector agents as community authors and the
 * hardcoded briefs from `src/data/community/agent-news.json`. This is the
 * placeholder for the future "agents publish field news" pipeline: the content
 * is written by hand and the seed is idempotent.
 *
 * Requires migration `008_community_agents_verified.sql`. Agent accounts use
 * the reserved `@agen.lumina` domain, have no password, and cannot log in.
 * `verified: true` in the JSON marks the demo briefs an admin already reviewed;
 * `verified_by` stays null because the seed is not a real admin session.
 *
 * Do NOT run this against production. `--reset` removes only the seeded agent
 * accounts (their posts cascade) before re-inserting.
 */

const AGENT_DOMAIN = "@agen.lumina";
const AGENT_USER_IDS = {
  message: "0c9a1a10-0000-4000-8000-000000000301",
  link: "0c9a1a10-0000-4000-8000-000000000302",
  identity: "0c9a1a10-0000-4000-8000-000000000303",
  conversation: "0c9a1a10-0000-4000-8000-000000000304",
  job: "0c9a1a10-0000-4000-8000-000000000305",
  marketplace: "0c9a1a10-0000-4000-8000-000000000306",
  qris: "0c9a1a10-0000-4000-8000-000000000307",
  evidence: "0c9a1a10-0000-4000-8000-000000000308",
};

const data = JSON.parse(
  await readFile(
    new URL("../src/data/community/agent-news.json", import.meta.url),
    "utf8",
  ),
);
const reset = process.argv.includes("--reset");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 2000,
});

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7368415)");

    if (reset) {
      await client.query("DELETE FROM users WHERE email LIKE $1", [
        `%${AGENT_DOMAIN}`,
      ]);
    }

    for (const agent of data.agents) {
      const id = AGENT_USER_IDS[agent.id];
      if (!id) throw new Error(`Unknown agent ${agent.id}`);
      await client.query(
        `INSERT INTO users (id, nama, email, password_hash, created_at)
         VALUES ($1, $2, $3, NULL, now()) ON CONFLICT (email) DO NOTHING`,
        [id, agent.nama, agent.email],
      );
    }

    const ids = new Map(
      (
        await client.query("SELECT id, email FROM users WHERE email LIKE $1", [
          `%${AGENT_DOMAIN}`,
        ])
      ).rows.map((row) => [row.email, row.id]),
    );

    for (const post of data.posts) {
      const agent = data.agents.find((a) => a.id === post.agentId);
      if (!agent) throw new Error(`Unknown post agent ${post.agentId}`);
      const authorId = ids.get(agent.email);
      if (!authorId) throw new Error(`Missing agent author ${agent.email}`);
      const gallery = post.imageUrls ?? [];
      await client.query(
        `INSERT INTO community_posts
           (id, author_id, category, title, body, source_url, image_url, image_urls,
            author_kind, agent_id, verified_at, verified_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'agent', $9,
                 CASE WHEN $10::boolean THEN now() ELSE NULL END, NULL,
                 now() - $11 * interval '1 hour', now() - $11 * interval '1 hour')
         ON CONFLICT (id) DO UPDATE SET
           author_id=EXCLUDED.author_id,
           category=EXCLUDED.category,
           title=EXCLUDED.title,
           body=EXCLUDED.body,
           source_url=EXCLUDED.source_url,
           image_url=EXCLUDED.image_url,
           image_urls=EXCLUDED.image_urls,
           author_kind='agent',
           agent_id=EXCLUDED.agent_id,
           verified_at=EXCLUDED.verified_at,
           verified_by=EXCLUDED.verified_by,
           created_at=EXCLUDED.created_at,
           updated_at=EXCLUDED.updated_at`,
        [
          post.id,
          authorId,
          post.category,
          post.title,
          post.body,
          post.sourceUrl ?? null,
          gallery[0] ?? null,
          gallery,
          post.agentId,
          post.verified === true,
          post.hoursAgo,
        ],
      );
    }

    const counts = await client.query(
      `SELECT
         count(*)::int AS posts,
         count(*) FILTER (WHERE verified_at IS NOT NULL)::int AS verified
       FROM community_posts WHERE author_kind='agent'`,
    );
    await client.query("COMMIT");
    const { posts, verified } = counts.rows[0];
    console.log(
      `Agent news ready: ${data.agents.length} agents, ${posts} posts (${verified} verified)${reset ? " (reset first)" : ""}.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error(
    "Agent news seed failed; apply migration 008 and check DATABASE_URL.",
  );
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
