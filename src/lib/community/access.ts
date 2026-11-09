import "server-only";
export function isCommunityModerator(userId: string) {
  return (process.env.COMMUNITY_MODERATOR_IDS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(userId.toLowerCase());
}
