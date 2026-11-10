/** @jest-environment node */

import { consumeAttempt } from "@/lib/auth/accounts";
import { getSession } from "@/lib/auth/server-session";
import {
  deleteContent,
  flagContent,
  markHelpful,
  moderateContent,
  publishPost,
  publishReply,
  verifyPost,
} from "@/lib/community/actions";
import {
  removeOwnContent,
  reportContent,
  reviewContent,
  setHelpful,
  setPostVerified,
  writePost,
  writeReply,
} from "@/lib/community/store";

jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/auth/accounts", () => ({
  consumeAttempt: jest.fn(),
  AuthError: class extends Error {},
}));
jest.mock("@/lib/community/store", () => ({
  writePost: jest.fn(),
  writeReply: jest.fn(),
  removeOwnContent: jest.fn(),
  setHelpful: jest.fn(),
  setPostVerified: jest.fn(),
  reportContent: jest.fn(),
  reviewContent: jest.fn(),
  CommunityError: class extends Error {},
}));
const id = "892e48bd-9178-461d-bd83-c32fc614bb23";
const post = {
  title: "Pesan kurir meminta instal APK",
  body: "Ada pesan kurir yang mengirim APK. Saya ingin tahu cara mengenali pola ini.",
  category: "modus-baru",
  sourceUrl: "",
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getSession).mockResolvedValue({
    id,
    email: "a@example.test",
    nama: "A",
    created_at: "2026-11-09",
    exp: 9999999999,
  });
  jest.mocked(consumeAttempt).mockResolvedValue();
  delete process.env.COMMUNITY_MODERATOR_IDS;
});
it("requires a session for every write", async () => {
  jest.mocked(getSession).mockResolvedValue(null);
  const results = await Promise.all([
    publishPost(post),
    publishReply({ postId: id, body: "Balasan saya" }),
    deleteContent({ id, kind: "post" }),
    markHelpful({ id, value: true }),
    flagContent({ id, kind: "post", reason: "spam" }),
    moderateContent({ id, kind: "post", hide: true }),
    verifyPost({ id, value: true }),
  ]);
  expect(results.every((r) => !r.ok)).toBe(true);
  for (const method of [
    writePost,
    writeReply,
    removeOwnContent,
    setHelpful,
    setPostVerified,
    reportContent,
    reviewContent,
  ])
    expect(method).not.toHaveBeenCalled();
});
it("takes authorship from the session and validates URL protocols", async () => {
  jest.mocked(writePost).mockResolvedValue(id);
  expect((await publishPost({ ...post, authorId: "someone-else" })).ok).toBe(
    true,
  );
  expect(writePost).toHaveBeenCalledWith(id, post);
  jest.mocked(writePost).mockClear();
  expect(
    (await publishPost({ ...post, sourceUrl: "javascript:alert(1)" })).ok,
  ).toBe(false);
  expect(writePost).not.toHaveBeenCalled();
});
it("does not grant moderation to a client-supplied role", async () => {
  expect(
    (await moderateContent({ id, kind: "post", hide: true, isModerator: true }))
      .ok,
  ).toBe(false);
  expect(reviewContent).not.toHaveBeenCalled();
  process.env.COMMUNITY_MODERATOR_IDS = id;
  expect((await moderateContent({ id, kind: "post", hide: true })).ok).toBe(
    true,
  );
  expect(reviewContent).toHaveBeenCalledWith(
    { id, kind: "post", hide: true },
    true,
  );
});
it("requires the moderator allowlist to verify or unverify a post", async () => {
  expect((await verifyPost({ id, value: true })).ok).toBe(false);
  expect(setPostVerified).not.toHaveBeenCalled();
  process.env.COMMUNITY_MODERATOR_IDS = id;
  expect((await verifyPost({ id, value: true })).ok).toBe(true);
  expect(setPostVerified).toHaveBeenCalledWith(id, id, true);
  expect((await verifyPost({ id, value: false })).ok).toBe(true);
  expect(setPostVerified).toHaveBeenLastCalledWith(id, id, false);
});
it("reports failures honestly without exposing database errors", async () => {
  jest
    .mocked(writePost)
    .mockRejectedValue(new Error("connection password details"));
  expect(await publishPost(post)).toEqual({
    ok: false,
    error: expect.stringMatching(/belum tersimpan/),
  });
});
