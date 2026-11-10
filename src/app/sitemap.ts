import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { KURIKULUM } from "@/data/kurikulum";

/**
 * Public surfaces only. Signed-in pages (`/profil`), the curriculum workbench
 * (`/admin`), moderator tools, and API routes are deliberately absent.
 */
async function baseUrl() {
  await connection();
  const incoming = await headers();
  const host =
    incoming.get("x-forwarded-host") ??
    incoming.get("host") ??
    "localhost:3000";
  const proto =
    incoming.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await baseUrl();
  const modules = Object.keys(KURIKULUM).map((no) => ({
    url: `${base}/belajar/${no}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/belajar`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/simulasi`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/komunitas`, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/masuk`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/daftar`, changeFrequency: "yearly", priority: 0.3 },
    ...modules,
  ];
}
