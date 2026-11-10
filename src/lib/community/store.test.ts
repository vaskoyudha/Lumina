/** @jest-environment node */
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "pg";
import { testDatabaseUrl } from "@/lib/auth/test-database";
import { type PostInput, QuerySchema } from "@/lib/community/schema";
import {
  getPost,
  listPosts,
  listReplies,
  moderationQueue,
  removeOwnContent,
  reportContent,
  reviewContent,
  setHelpful,
  setSaved,
  writePost,
  writeReply,
} from "@/lib/community/store";

jest.mock("server-only", () => ({}));
jest.mock("@/lib/auth/database", () => ({ authDatabase: () => pool }));
const url = testDatabaseUrl();
const pool = new Pool({ connectionString: url });
const userA = randomUUID(),
  userB = randomUUID();
const prefix = `Komunitas ${randomUUID()}`;
const input = (changes: Partial<PostInput> = {}): PostInput => ({
  title: `${prefix} pola kurir APK`,
  body: "Pesan kurir meminta memasang sebuah APK dari percakapan. Adakah yang menemui pola serupa?",
  category: "modus-baru",
  sourceUrl: "",
  ...changes,
});
(url ? describe : describe.skip)("community PostgreSQL", () => {
  beforeAll(async () => {
    const client = await pool.connect();
    try {
      await client.query(
        "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
      );
      for (const name of (await readdir("migrations"))
        .filter((n) => n.endsWith(".sql"))
        .sort()) {
        if (
          (
            await client.query(
              "SELECT 1 FROM schema_migrations WHERE version=$1",
              [name],
            )
          ).rowCount
        )
          continue;
        await client.query("BEGIN");
        try {
          await client.query(await readFile(`migrations/${name}`, "utf8"));
          await client.query(
            "INSERT INTO schema_migrations(version) VALUES($1)",
            [name],
          );
          await client.query("COMMIT");
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        }
      }
      await client.query(
        "INSERT INTO users(id,email,nama,created_at) VALUES($1,$2,'Anggota A',now()),($3,$4,'Anggota B',now())",
        [userA, `${userA}@example.test`, userB, `${userB}@example.test`],
      );
    } finally {
      client.release();
    }
  });
  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [
      [userA, userB],
    ]);
    await pool.end();
  });
  it("persists posts, public search/category filters, and author-only updates", async () => {
    const id = await writePost(userA, input());
    const list = await listPosts(
      QuerySchema.parse({ q: prefix, category: "modus-baru" }),
      null,
    );
    expect(list.posts.some((p) => p.id === id)).toBe(true);
    expect(list.posts.find((p) => p.id === id)?.isOwner).toBe(false);
    expect((await getPost(id, userA))?.isOwner).toBe(true);
    expect(JSON.stringify(list)).not.toContain("@example.test");
    await expect(
      writePost(userB, input({ id, title: `${prefix} pembajakan` })),
    ).rejects.toThrow(/bukan milikmu/);
    await writePost(
      userA,
      input({ id, title: `${prefix} sudah disunting`, category: "pengalaman" }),
    );
    expect((await getPost(id, null))?.title).toContain("sudah disunting");
    expect(
      (
        await listPosts(
          QuerySchema.parse({ q: prefix, category: "modus-baru" }),
          null,
        )
      ).posts.some((p) => p.id === id),
    ).toBe(false);
  });
  it("stores replies across account reads, enforces ownership and paginates", async () => {
    const id = await writePost(userA, input({ category: "pertanyaan" }));
    await writeReply(userB, {
      postId: id,
      body: "Saya pernah menjumpai pola serupa. Periksa lewat aplikasi resmi.",
    });
    let replies = await listReplies(id, userA);
    expect(replies).toHaveLength(1);
    expect(replies[0].isOwner).toBe(false);
    await expect(
      writeReply(userA, {
        id: replies[0].id,
        postId: id,
        body: "Ubah tulisan orang lain",
      }),
    ).rejects.toThrow();
    await writeReply(userB, {
      id: replies[0].id,
      postId: id,
      body: "Balasan diperbarui oleh penulis sendiri.",
    });
    for (let i = 0; i < 21; i++)
      await writeReply(userA, {
        postId: id,
        body: `Tambahan diskusi nomor ${i}.`,
      });
    replies = await listReplies(id, userB);
    expect(replies).toHaveLength(20);
    expect(await listReplies(id, userB, 2)).toHaveLength(2);
    expect((await getPost(id, userA))?.replies).toBe(22);
    expect(
      (
        await listPosts(
          QuerySchema.parse({ q: prefix, sort: "belum-dibalas" }),
          null,
        )
      ).posts.some((p) => p.id === id),
    ).toBe(false);
    await removeOwnContent(userB, { id: replies[0].id, kind: "reply" });
    expect((await getPost(id, null))?.replies).toBe(21);
  });
  it("keeps helpful reactions unique and reports reviewable without exposing reporters", async () => {
    const id = await writePost(userA, input());
    await setHelpful(userB, id, true);
    await setHelpful(userB, id, true);
    expect((await getPost(id, userB))?.helpful).toBe(1);
    expect((await getPost(id, userA))?.hasHelped).toBe(false);
    await setHelpful(userB, id, false);
    expect((await getPost(id, userB))?.helpful).toBe(0);
    await reportContent(userB, { id, kind: "post" }, "spam");
    await reportContent(userB, { id, kind: "post" }, "spam");
    const report = (await moderationQueue()).find((r) => r.id === id);
    expect(report?.reports).toBe(1);
    expect(JSON.stringify(report)).not.toContain(userB);
    await reviewContent({ id, kind: "post" }, true);
    expect(await getPost(id, null)).toBeNull();
    await expect(
      writeReply(userB, { postId: id, body: "Balasan pada topik tersembunyi" }),
    ).rejects.toThrow();
    expect((await moderationQueue()).find((r) => r.id === id)).toBeUndefined();
  });
  it("deletes only the author's content and removes it from public reads", async () => {
    const id = await writePost(userA, input());
    await expect(
      removeOwnContent(userB, { id, kind: "post" }),
    ).rejects.toThrow();
    await removeOwnContent(userA, { id, kind: "post" });
    expect(await getPost(id, null)).toBeNull();
    expect(
      (await listPosts(QuerySchema.parse({ q: prefix }), null)).posts.some(
        (p) => p.id === id,
      ),
    ).toBe(false);
    await expect(setHelpful(userB, id, true)).rejects.toThrow();
  });
  it("treats search wildcards literally and honors page size", async () => {
    const marker = `${prefix} 100%_khusus`;
    await writePost(userA, input({ title: marker }));
    await writePost(userA, input({ title: `${prefix} 100xYkhusus` }));
    const found = await listPosts(QuerySchema.parse({ q: marker }), null);
    expect(found.total).toBe(1);
  });
  it("keeps saved posts unique and account-scoped, and returns no private feed to guests", async () => {
    const id = await writePost(userA, input());
    await setSaved(userB, id, true);
    await setSaved(userB, id, true);
    const query = QuerySchema.parse({ q: prefix, saved: "1" });
    expect((await listPosts(query, userB)).posts.some((p) => p.id === id)).toBe(
      true,
    );
    expect((await listPosts(query, userA)).posts.some((p) => p.id === id)).toBe(
      false,
    );
    expect(await listPosts(query, null)).toEqual({ posts: [], total: 0 });
    expect(await listPosts(QuerySchema.parse({ mine: "1" }), null)).toEqual({
      posts: [],
      total: 0,
    });
    await setSaved(userB, id, false);
    expect((await getPost(id, userB))?.hasSaved).toBe(false);
  });
  it("reopens reviewed reports only after the post or reply changes", async () => {
    const id = await writePost(userA, input());
    const reply = await writeReply(userA, {
      postId: id,
      body: "Balasan awal untuk ditinjau.",
    });
    for (const target of [
      { id, kind: "post" as const },
      { id: reply.replyId, kind: "reply" as const },
    ]) {
      await reportContent(userB, target, "spam");
      await reviewContent(target, false);
      await reportContent(userB, target, "spam");
      expect((await moderationQueue()).some((r) => r.id === target.id)).toBe(
        false,
      );
      if (target.kind === "post")
        await writePost(
          userA,
          input({
            id,
            body: "Isi baru setelah peninjauan; konten berubah dan perlu ditinjau kembali.",
          }),
        );
      else
        await writeReply(userA, {
          id: target.id,
          postId: id,
          body: "Balasan baru setelah ditinjau.",
        });
      await reportContent(userB, target, "data-pribadi");
      await reportContent(userB, target, "data-pribadi");
      expect(
        (await moderationQueue()).find((r) => r.id === target.id),
      ).toMatchObject({ reports: 1, reason: "data-pribadi" });
      await reviewContent(target, false);
    }
  });
  it("returns the exact page and anchor for a newly created reply", async () => {
    const postId = await writePost(userA, input());
    for (let i = 0; i < 20; i++)
      await writeReply(userA, { postId, body: `Balasan ${i}` });
    const reply = await writeReply(userB, {
      postId,
      body: "Balasan terakhir saya.",
    });
    expect(reply).toMatchObject({ postId, page: 2 });
    expect((await listReplies(postId, userB, 2)).map((r) => r.id)).toContain(
      reply.replyId,
    );
  });
});
