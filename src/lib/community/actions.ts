"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, consumeAttempt } from "@/lib/auth/accounts";
import { getSession } from "@/lib/auth/server-session";
import { isCommunityModerator } from "@/lib/community/access";
import {
  type MutationResult,
  PostInputSchema,
  ReplyInputSchema,
  ReportSchema,
  TargetSchema,
} from "@/lib/community/schema";
import {
  CommunityError,
  removeOwnContent,
  reportContent,
  reviewContent,
  setHelpful,
  setSaved,
  writePost,
  writeReply,
} from "@/lib/community/store";

function failed(error: unknown): MutationResult {
  return {
    ok: false,
    error:
      error instanceof CommunityError || error instanceof AuthError
        ? error.message
        : error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Periksa isianmu.")
          : "Perubahan belum tersimpan. Coba lagi sebentar.",
  };
}
async function actor(kind = "aksi") {
  const session = await getSession();
  if (!session)
    throw new CommunityError("Masuk untuk berpartisipasi di komunitas.");
  await consumeAttempt(
    `community:${kind}:${session.id}`,
    kind === "topik" ? 5 : kind === "balasan" ? 15 : 60,
    60000,
  );
  return session;
}
function refresh(id?: string) {
  revalidatePath("/komunitas");
  if (id) revalidatePath(`/komunitas/${id}`);
}
export async function publishPost(input: unknown): Promise<MutationResult> {
  try {
    const session = await actor("topik");
    const parsed = PostInputSchema.parse(input);
    const id = await writePost(session.id, parsed);
    refresh(id);
    return { ok: true, id };
  } catch (e) {
    return failed(e);
  }
}
export async function publishReply(input: unknown): Promise<MutationResult> {
  try {
    const session = await actor("balasan");
    const parsed = ReplyInputSchema.parse(input);
    const result = await writeReply(session.id, parsed);
    refresh(result.postId);
    return {
      ok: true,
      id: result.postId,
      replyId: result.replyId,
      page: result.page,
    };
  } catch (e) {
    return failed(e);
  }
}
export async function deleteContent(input: unknown): Promise<MutationResult> {
  try {
    const session = await actor();
    const target = TargetSchema.parse(input);
    const id = await removeOwnContent(session.id, target);
    refresh(id);
    return { ok: true, id };
  } catch (e) {
    return failed(e);
  }
}
export async function markHelpful(input: unknown): Promise<MutationResult> {
  try {
    const session = await actor();
    const parsed = z.object({ id: z.uuid(), value: z.boolean() }).parse(input);
    await setHelpful(session.id, parsed.id, parsed.value);
    refresh(parsed.id);
    return { ok: true };
  } catch (e) {
    return failed(e);
  }
}
export async function markSaved(input: unknown): Promise<MutationResult> {
  try {
    const session = await actor();
    const parsed = z.object({ id: z.uuid(), value: z.boolean() }).parse(input);
    await setSaved(session.id, parsed.id, parsed.value);
    refresh(parsed.id);
    return { ok: true };
  } catch (e) {
    return failed(e);
  }
}
export async function flagContent(input: unknown): Promise<MutationResult> {
  try {
    const session = await actor();
    const parsed = ReportSchema.parse(input);
    await reportContent(session.id, parsed, parsed.reason);
    return { ok: true };
  } catch (e) {
    return failed(e);
  }
}
export async function moderateContent(input: unknown): Promise<MutationResult> {
  try {
    const session = await actor();
    if (!isCommunityModerator(session.id))
      throw new CommunityError("Hanya moderator yang dapat meninjau laporan.");
    const parsed = TargetSchema.extend({ hide: z.boolean() }).parse(input);
    await reviewContent(parsed, parsed.hide);
    refresh();
    revalidatePath("/komunitas/moderasi");
    return { ok: true };
  } catch (e) {
    return failed(e);
  }
}
