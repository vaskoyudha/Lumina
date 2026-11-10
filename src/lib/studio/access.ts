import "server-only";

/** Coding tools are a separate capability from community moderation. */
export function isStudioAllowed(userId: string) {
  return (process.env.STUDIO_ALLOWED_IDS ?? "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean)
    .includes(userId.toLowerCase());
}
