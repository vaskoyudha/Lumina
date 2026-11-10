import { z } from "zod";
import type { CommunityAgentId } from "@/lib/community/agents";

export const CATEGORIES = {
  "modus-baru": {
    label: "Modus baru",
    description: "Bagikan pola mencurigakan yang baru kamu temui.",
  },
  pertanyaan: {
    label: "Tanya komunitas",
    description: "Cari sudut pandang lain sebelum mengambil keputusan.",
  },
  pengalaman: {
    label: "Berbagi pengalaman",
    description: "Ceritakan apa yang kamu pelajari, tanpa menyalahkan korban.",
  },
} as const;
export type Category = keyof typeof CATEGORIES;
export const CategorySchema = z.enum([
  "modus-baru",
  "pertanyaan",
  "pengalaman",
]);
export const PostInputSchema = z.object({
  id: z.uuid().optional(),
  category: CategorySchema,
  title: z.string().trim().min(10, "Judul minimal 10 karakter.").max(140),
  body: z
    .string()
    .trim()
    .min(30, "Ceritakan konteksnya minimal 30 karakter.")
    .max(6000),
  sourceUrl: z
    .union([
      z.literal(""),
      z
        .url()
        .max(1000)
        .refine((value) => {
          const u = new URL(value);
          return (
            ["https:", "http:"].includes(u.protocol) &&
            !u.username &&
            !u.password
          );
        }, "Gunakan URL http atau https tanpa kredensial."),
    ])
    .default(""),
});
export const ReplyInputSchema = z.object({
  id: z.uuid().optional(),
  postId: z.uuid(),
  body: z.string().trim().min(5, "Balasan minimal 5 karakter.").max(3000),
});
export const TargetSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["post", "reply"]),
});
export const ReportSchema = TargetSchema.extend({
  reason: z.enum(["data-pribadi", "spam", "berbahaya"]),
});
export const VerifyPostSchema = z.object({
  id: z.uuid(),
  value: z.boolean(),
});
export const QuerySchema = z.object({
  q: z.string().trim().max(120).catch(""),
  category: CategorySchema.optional().catch(undefined),
  sort: z.enum(["terbaru", "ramai", "belum-dibalas"]).catch("terbaru"),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  mine: z
    .string()
    .optional()
    .transform((value) => value === "1" || value === "true")
    .catch(false),
  saved: z
    .string()
    .optional()
    .transform((value) => value === "1" || value === "true")
    .catch(false),
});
export type CommunityQuery = z.infer<typeof QuerySchema>;
export type PostInput = z.infer<typeof PostInputSchema>;
export type ReplyInput = z.infer<typeof ReplyInputSchema>;
export type Target = z.infer<typeof TargetSchema>;
export type CommunityPost = {
  id: string;
  author: string;
  /** `agent` posts are authored by an AI detector; `member` posts by people. */
  authorKind: "member" | "agent";
  /** Set only for agent posts; names the detector behind the post. */
  agentId: CommunityAgentId | null;
  /** Approved by a moderator/admin. Means "reviewed", not "fact-checked". */
  verified: boolean;
  category: Category;
  title: string;
  body: string;
  sourceUrl: string | null;
  /** Seed/demo covers under /images/community; never user-supplied. */
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
  replies: number;
  helpful: number;
  hasHelped: boolean;
  hasSaved: boolean;
  isOwner: boolean;
  hidden: boolean;
};
export type CommunityReply = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
};
export type MutationResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };
export const PAGE_SIZE = 12;
export const REPLY_PAGE_SIZE = 20;
export const communityDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
