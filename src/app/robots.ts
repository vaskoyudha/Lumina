import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";

/**
 * Crawler files must use the origin the request actually arrived on. Reading
 * `AUTH_URL` at module scope would freeze the value at build time (and fall
 * back to localhost in a Docker build), so resolve it per request instead.
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

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/profil", "/admin", "/komunitas/moderasi"],
    },
    sitemap: `${await baseUrl()}/sitemap.xml`,
  };
}
