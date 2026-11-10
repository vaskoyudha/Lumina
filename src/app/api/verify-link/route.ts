import { VerifyLinkSchema } from "@/lib/contracts/verify";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";
import { verifyPublicLink } from "@/lib/verify/link";
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 4096);
  } catch (error) {
    return Response.json(
      { ok: false, error: "invalid-request" },
      { status: error instanceof BodyTooLarge ? 413 : 400 },
    );
  }
  const parsed = VerifyLinkSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { ok: false, error: "invalid-request" },
      { status: 400 },
    );
  if (process.env.VERIFY_LINK !== "on")
    return Response.json({
      ok: true,
      verification: {
        url: parsed.data.url,
        status: "dilewati",
        domainAgeDays: null,
        tls: null,
        redirects: [],
        blocklists: [],
        signals: [],
        note: "Verifikasi lanjutan tidak diaktifkan.",
      },
    });
  const limited = await limitAI(request, "text");
  if (limited) return limited;
  const control = upstreamAbort(request, 2500);
  try {
    const verification = await Promise.race([
      verifyPublicLink(parsed.data.url, control.signal, parsed.data.mode),
      new Promise<Awaited<ReturnType<typeof verifyPublicLink>>>((resolve) => {
        control.signal.addEventListener(
          "abort",
          () =>
            resolve({
              url: parsed.data.url,
              status: "gagal",
              domainAgeDays: null,
              tls: null,
              redirects: [],
              blocklists: [],
              signals: [],
              note: "Batas waktu 2,5 detik tercapai; hasil lokal dipertahankan.",
            }),
          { once: true },
        );
        if (control.signal.aborted) control.abort();
      }),
    ]);
    return Response.json(
      { ok: true, verification },
      { headers: { "cache-control": "no-store" } },
    );
  } finally {
    control.cleanup();
  }
}
