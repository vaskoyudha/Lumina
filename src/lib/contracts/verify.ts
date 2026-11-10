import { z } from "zod";
import type { Signal } from "@/lib/contracts/score";
export const VerifyLinkSchema = z
  .object({
    url: z.string().min(1).max(2048),
    mode: z.enum(["direct", "cached"]).default("direct"),
  })
  .strict();
export const VerifyFileSchema = z
  .object({ sha256: z.string().regex(/^[a-f0-9]{64}$/i) })
  .strict();
export interface ReputationVerdict {
  source: string;
  listed: boolean | null;
  status: "ok" | "tidak tersedia";
}
export interface LinkVerification {
  url: string;
  status: "ok" | "gagal" | "dilewati";
  domainAgeDays: number | null;
  tls: { issuer: string | null; ageDays: number | null } | null;
  redirects: string[];
  blocklists: ReputationVerdict[];
  signals: Signal[];
  dns?: {
    a: boolean;
    aaaa: boolean;
    mx: boolean;
    spf: boolean;
    dmarc: boolean;
  };
  note?: string;
}
export interface FileVerification {
  status: "ok" | "gagal" | "dilewati";
  sha256: string;
  sources: ReputationVerdict[];
  signals: Signal[];
  note: string;
}
