# src/lib/community — posts, replies, moderation

## OVERVIEW
Server-only persistence and actions for `/komunitas`: paginated posts/replies, helpful/saved toggles, reports, soft-delete, verification badges, and moderator review. Authorship always comes from the session.

## STRUCTURE
| File | Owns |
|---|---|
| `schema.ts` | `CATEGORIES`, input schemas, `CommunityPost`/`CommunityReply`, `PAGE_SIZE`, `communityDate` |
| `store.ts` | `CommunityError` + all SQL (`listPosts`, `writePost`, `writeReply`, moderation, verify) |
| `actions.ts` | `"use server"` wrappers (`publishPost`, `markReply`, `flagContent`, `moderateContent`, `verifyPost`) |
| `access.ts` | `isCommunityModerator` (env `COMMUNITY_MODERATOR_IDS`) |
| `agents.ts` | `COMMUNITY_AGENTS` projection over `lib/agents/identities` |

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Pagination | `schema.ts` | `QuerySchema` uses `.catch()` defaults so bad URL params degrade |
| SQL filtering | `store.ts:73` `listPosts` | `visible`/`selectPost` constants; escape search wildcards |
| Target dispatch | `store.ts:220` | Dynamic table/column chosen only from `Target.kind` enum |
| Moderation | `store.ts:303` `reviewContent` | Transactional; authority from env allowlist |
| Agent ids | `agents.ts:14` | Must match DB CHECK list in `migrations/008_community_agents_verified.sql` |

## CONVENTIONS (different from root)
- Fixed SQL text with `$n` parameters; identifiers never interpolate user input.
- `failed()` collapses unknown errors to a generic Indonesian message — never expose DB errors.
- Dates are pinned to `Asia/Jakarta` (`communityDate`).
- `actions.ts` returns discriminated `{ ok } | { ok:false, error }`; domain failures throw `CommunityError`.

## ANTI-PATTERNS (THIS DIRECTORY)
- Never accept client-supplied author/role; authorship is the session, moderation is `COMMUNITY_MODERATOR_IDS`.
- Never interpolate user input into SQL identifiers.
- Never widen `image_url` beyond `/images/community/%`; there is no upload path.
- Never leak soft-deleted/hidden rows; keep `visible` filtering consistent across reads.
- Never run `db:seed:community` against production.
