import { VerifyFileSchema } from "@/lib/contracts/verify";
import {
  BodyTooLarge,
  limitAI,
  readJson,
  upstreamAbort,
} from "@/lib/server/request";
import { verifyFileHash } from "@/lib/verify/file";
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request, 512);
  } catch (error) {
    return Response.json(
      { ok: false, error: "invalid-request" },
      { status: error instanceof BodyTooLarge ? 413 : 400 },
    );
  }
  const parsed = VerifyFileSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { ok: false, error: "invalid-request" },
      { status: 400 },
    );
  if (process.env.VERIFY_FILE !== "on")
    return Response.json({
      ok: true,
      verification: {
        status: "dilewati",
        sha256: parsed.data.sha256,
        sources: [],
        signals: [],
        note: "Reputasi hash belum diaktifkan; berkas tidak diunggah.",
      },
    });
  const limited = await limitAI(request, "text");
  if (limited) return limited;
  const control = upstreamAbort(request, 2500);
  try {
    return Response.json(
      {
        ok: true,
        verification: await verifyFileHash(parsed.data.sha256, control.signal),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } finally {
    control.cleanup();
  }
}
