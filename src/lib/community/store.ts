import "server-only";
import { randomUUID } from "node:crypto";
import { authDatabase } from "@/lib/auth/database";
import {
  type Category,
  type CommunityPost,
  type CommunityQuery,
  type CommunityReply,
  PAGE_SIZE,
  type PostInput,
  REPLY_PAGE_SIZE,
  type ReplyInput,
  type Target,
} from "@/lib/community/schema";

export class CommunityError extends Error {}
type PostRow = {
  id: string;
  nama: string;
  category: Category;
  title: string;
  body: string;
  source_url: string | null;
  image_url: string | null;
  created_at: Date;
  updated_at: Date;
  reply_count: number;
  helpful_count: number;
  has_helped: boolean;
  is_owner: boolean;
  hidden_at: Date | null;
};
const selectPost = `SELECT p.*,u.nama,
 (SELECT count(*)::int FROM community_replies r WHERE r.post_id=p.id AND r.deleted_at IS NULL AND r.hidden_at IS NULL) AS reply_count,
 (SELECT count(*)::int FROM community_helpful h WHERE h.post_id=p.id) AS helpful_count,
 EXISTS(SELECT 1 FROM community_helpful h WHERE h.post_id=p.id AND h.user_id=$1::uuid) AS has_helped,
 (p.author_id=$1::uuid) IS TRUE AS is_owner
 FROM community_posts p JOIN users u ON u.id=p.author_id`;
const visible = "p.deleted_at IS NULL AND p.hidden_at IS NULL";
function post(row: PostRow): CommunityPost {
  return {
    id: row.id,
    author: row.nama,
    category: row.category,
    title: row.title,
    body: row.body,
    sourceUrl: row.source_url,
    imageUrl: row.image_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    replies: row.reply_count,
    helpful: row.helpful_count,
    hasHelped: row.has_helped,
    isOwner: row.is_owner,
    hidden: !!row.hidden_at,
  };
}
export async function listPosts(query: CommunityQuery, userId: string | null) {
  const search = query.q.replace(/[\\%_]/g, "\\$&");
  const where = `${visible} AND ($2::text IS NULL OR p.category=$2) AND ($3='' OR p.title ILIKE '%'||$3||'%' OR p.body ILIKE '%'||$3||'%') ${query.sort === "belum-dibalas" ? "AND NOT EXISTS(SELECT 1 FROM community_replies r WHERE r.post_id=p.id AND r.deleted_at IS NULL AND r.hidden_at IS NULL)" : ""}`;
  const values = [userId, query.category ?? null, search];
  const { rows } = await authDatabase().query<PostRow>(
    `${selectPost} WHERE ${where} ORDER BY ${query.sort === "ramai" ? "reply_count DESC, helpful_count DESC," : ""} p.created_at DESC,p.id DESC LIMIT $4 OFFSET $5`,
    [...values, PAGE_SIZE, (query.page - 1) * PAGE_SIZE],
  );
  const count = await authDatabase().query<{ total: number }>(
    `SELECT count(*)::int AS total FROM community_posts p WHERE ${where.replaceAll("$2", "$1").replaceAll("$3", "$2")}`,
    [query.category ?? null, search],
  );
  return { posts: rows.map(post), total: count.rows[0].total };
}
export async function getPost(id: string, userId: string | null) {
  const { rows } = await authDatabase().query<PostRow>(
    `${selectPost} WHERE p.id=$2 AND ${visible}`,
    [userId, id],
  );
  return rows[0] ? post(rows[0]) : null;
}
export async function listReplies(
  postId: string,
  userId: string | null,
  page = 1,
) {
  const { rows } = await authDatabase().query<{
    id: string;
    nama: string;
    body: string;
    created_at: Date;
    updated_at: Date;
    is_owner: boolean;
  }>(
    `SELECT r.id,u.nama,r.body,r.created_at,r.updated_at,(r.author_id=$2::uuid) IS TRUE AS is_owner FROM community_replies r JOIN users u ON u.id=r.author_id JOIN community_posts p ON p.id=r.post_id WHERE r.post_id=$1 AND r.deleted_at IS NULL AND r.hidden_at IS NULL AND ${visible} ORDER BY r.created_at,r.id LIMIT $3 OFFSET $4`,
    [postId, userId, REPLY_PAGE_SIZE, (page - 1) * REPLY_PAGE_SIZE],
  );
  return rows.map(
    (r): CommunityReply => ({
      id: r.id,
      author: r.nama,
      body: r.body,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
      isOwner: r.is_owner,
    }),
  );
}
export async function writePost(userId: string, input: PostInput) {
  const id = input.id ?? randomUUID();
  if (input.id) {
    const r = await authDatabase().query(
      `UPDATE community_posts SET title=$3,body=$4,category=$5,source_url=$6,updated_at=now() WHERE id=$1 AND author_id=$2 AND deleted_at IS NULL AND hidden_at IS NULL`,
      [
        id,
        userId,
        input.title,
        input.body,
        input.category,
        input.sourceUrl || null,
      ],
    );
    if (!r.rowCount)
      throw new CommunityError("Topik tidak tersedia atau bukan milikmu.");
  } else
    await authDatabase().query(
      "INSERT INTO community_posts(id,author_id,title,body,category,source_url) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id,
        userId,
        input.title,
        input.body,
        input.category,
        input.sourceUrl || null,
      ],
    );
  return id;
}
export async function writeReply(userId: string, input: ReplyInput) {
  const id = input.id ?? randomUUID();
  const r = input.id
    ? await authDatabase().query(
        `UPDATE community_replies r SET body=$4,updated_at=now() FROM community_posts p WHERE r.id=$1 AND r.author_id=$2 AND r.post_id=$3 AND p.id=r.post_id AND r.deleted_at IS NULL AND r.hidden_at IS NULL AND ${visible}`,
        [id, userId, input.postId, input.body],
      )
    : await authDatabase().query(
        `INSERT INTO community_replies(id,author_id,post_id,body) SELECT $1,$2,p.id,$4 FROM community_posts p WHERE p.id=$3 AND ${visible}`,
        [id, userId, input.postId, input.body],
      );
  if (!r.rowCount)
    throw new CommunityError(
      "Diskusi atau balasan tidak tersedia atau bukan milikmu.",
    );
  return input.postId;
}
export async function removeOwnContent(userId: string, target: Target) {
  const table =
    target.kind === "post" ? "community_posts" : "community_replies";
  const result = await authDatabase().query(
    `UPDATE ${table} SET deleted_at=now(),body='[Konten ini telah dihapus oleh penulis.]' ${target.kind === "post" ? ",title='Topik dihapus',source_url=NULL,image_url=NULL" : ""} WHERE id=$1 AND author_id=$2 AND deleted_at IS NULL RETURNING ${target.kind === "post" ? "id" : "post_id"} AS post_id`,
    [target.id, userId],
  );
  if (!result.rowCount)
    throw new CommunityError("Konten tidak tersedia atau bukan milikmu.");
  return result.rows[0].post_id as string;
}
export async function setHelpful(
  userId: string,
  postId: string,
  value: boolean,
) {
  if (value) {
    const r = await authDatabase().query(
      `INSERT INTO community_helpful(post_id,user_id) SELECT p.id,$2 FROM community_posts p WHERE p.id=$1 AND ${visible} ON CONFLICT DO NOTHING`,
      [postId, userId],
    );
    if (!r.rowCount && !(await getPost(postId, userId)))
      throw new CommunityError("Topik tidak tersedia.");
  } else
    await authDatabase().query(
      "DELETE FROM community_helpful WHERE post_id=$1 AND user_id=$2",
      [postId, userId],
    );
}
export async function reportContent(
  userId: string,
  target: Target,
  reason: string,
) {
  const table =
    target.kind === "post" ? "community_posts" : "community_replies";
  const field = target.kind === "post" ? "post_id" : "reply_id";
  const r = await authDatabase().query(
    `INSERT INTO community_reports(reporter_id,${field},reason) SELECT $1,id,$3 FROM ${table} WHERE id=$2 AND deleted_at IS NULL AND hidden_at IS NULL ON CONFLICT DO NOTHING RETURNING id`,
    [userId, target.id, reason],
  );
  if (!r.rowCount) {
    const found = await authDatabase().query(
      `SELECT 1 FROM community_reports WHERE reporter_id=$1 AND ${field}=$2`,
      [userId, target.id],
    );
    if (!found.rowCount) throw new CommunityError("Konten tidak tersedia.");
  }
}
export async function moderationQueue() {
  const { rows } = await authDatabase().query<{
    id: string;
    kind: "post" | "reply";
    post_id: string;
    title: string;
    body: string;
    reason: string;
    reports: number;
    hidden: boolean;
  }>(
    `SELECT COALESCE(p.id,r.id) AS id,CASE WHEN p.id IS NOT NULL THEN 'post' ELSE 'reply' END AS kind,COALESCE(p.id,r.post_id) AS post_id,COALESCE(p.title,parent.title) AS title,COALESCE(p.body,r.body) AS body,min(f.reason) AS reason,count(*)::int AS reports,COALESCE(p.hidden_at,r.hidden_at) IS NOT NULL AS hidden FROM community_reports f LEFT JOIN community_posts p ON p.id=f.post_id LEFT JOIN community_replies r ON r.id=f.reply_id LEFT JOIN community_posts parent ON parent.id=r.post_id WHERE f.reviewed_at IS NULL AND COALESCE(p.deleted_at,r.deleted_at) IS NULL GROUP BY p.id,r.id,parent.title ORDER BY count(*) DESC LIMIT 50`,
  );
  return rows.map((r) => ({ ...r, postId: r.post_id }));
}
export async function reviewContent(target: Target, hide: boolean) {
  const table =
    target.kind === "post" ? "community_posts" : "community_replies";
  const field = target.kind === "post" ? "post_id" : "reply_id";
  const client = await authDatabase().connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      `UPDATE ${table} SET hidden_at=CASE WHEN $2 THEN now() ELSE NULL END WHERE id=$1 AND deleted_at IS NULL RETURNING id`,
      [target.id, hide],
    );
    if (!r.rowCount) throw new CommunityError("Konten tidak tersedia.");
    await client.query(
      `UPDATE community_reports SET reviewed_at=now() WHERE ${field}=$1`,
      [target.id],
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
