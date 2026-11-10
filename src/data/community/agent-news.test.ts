import data from "@/data/community/agent-news.json";
import { COMMUNITY_AGENT_IDS } from "@/lib/community/agents";

const categories = new Set(["modus-baru", "pertanyaan", "pengalaman"]);

it("gives every detector exactly one hardcoded brief", () => {
  expect(data.posts).toHaveLength(COMMUNITY_AGENT_IDS.length);
  expect(new Set(data.posts.map((post) => post.agentId))).toEqual(
    new Set(COMMUNITY_AGENT_IDS),
  );
  expect(new Set(data.posts.map((post) => post.id)).size).toBe(
    data.posts.length,
  );
});

it("keeps every brief valid for the community schema", () => {
  const agentIds = new Set(data.agents.map((agent) => agent.id));
  for (const post of data.posts) {
    expect(agentIds.has(post.agentId)).toBe(true);
    expect(categories.has(post.category)).toBe(true);
    expect(post.title.length).toBeGreaterThanOrEqual(10);
    expect(post.title.length).toBeLessThanOrEqual(140);
    expect(post.body.length).toBeGreaterThanOrEqual(30);
    expect(post.body.length).toBeLessThanOrEqual(6000);
    expect(post.imageUrls.length).toBeGreaterThan(0);
    for (const image of post.imageUrls)
      expect(image.startsWith("/images/community/")).toBe(true);
  }
});

it("does not attribute fictional demo briefs to a real source", () => {
  for (const post of data.posts) expect(post.sourceUrl).toBeNull();
});
