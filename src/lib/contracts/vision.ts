import { z } from "zod";

/**
 * The payload for image transcription.
 *
 * This endpoint reads pixels; it never returns a verdict. The only thing the
 * client may do with `text` is append it to what `score.ts` already scores, so
 * no field here can carry a score, a risk label, or a signal.
 *
 * `.strict()` on both objects makes an unexpected key a rejected request, not a
 * silently dropped field.
 */

export const VISION_MEDIA_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export type VisionMediaType = (typeof VISION_MEDIA_TYPES)[number];

export const VisionRequestSchema = z
  .object({
    image: z
      .object({
        mediaType: z.enum(VISION_MEDIA_TYPES),
        /** Raw base64, no `data:` prefix. */
        data: z.string().min(16).max(8_000_000),
      })
      .strict(),
  })
  .strict();

export type VisionRequest = z.infer<typeof VisionRequestSchema>;
