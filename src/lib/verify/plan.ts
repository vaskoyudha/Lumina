import type { Risk } from "@/lib/contracts/score";
import { classifyLink, extractLinks } from "@/lib/scoring/link";
export interface EnrichmentPlan {
  verify: Array<"link" | "email" | "file">;
  urls: string[];
  reason: string;
  budgetMs: number;
}
export function planEnrichment(input: {
  text: string;
  hasLink?: boolean;
  hasHeaders?: boolean;
  hasAttachment?: boolean;
  fileConsent?: boolean;
  localRisk: Risk;
}): EnrichmentPlan {
  const urls = [...new Set(extractLinks(input.text))]
    .filter(
      (url) =>
        classifyLink(url)?.kind !== "official" ||
        ["mencurigakan", "tinggi"].includes(input.localRisk),
    )
    .slice(0, 2)
    .map((url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`));
  const file = !!input.hasAttachment && !!input.fileConsent;
  const limit = file ? 1 : 2;
  return {
    verify: [
      ...(urls.length ? ["link" as const] : []),
      ...(file ? ["file" as const] : []),
    ],
    urls: urls.slice(0, limit),
    budgetMs: 2500,
    reason:
      urls.length || file
        ? "Fakta publik tambahan dapat diperiksa setelah izin pengiriman URL atau hash; maksimal dua target."
        : input.hasHeaders
          ? "Header dibaca lokal; tidak perlu permintaan jaringan."
          : "Tidak ada target verifikasi tambahan; domain resmi tanpa indikasi dilewati.",
  };
}
