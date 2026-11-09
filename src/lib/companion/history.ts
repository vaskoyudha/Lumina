"use server";

import { z } from "zod";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";
import { MODUS } from "@/lib/modus";

const publicTitles = new Set([
  "Percakapan Companion",
  "Pemeriksaan pesan",
  ...MODUS.map((m) => `Pemeriksaan: ${m.nama}`),
]);
function privateTitle(title: string) {
  return publicTitles.has(title) ? title : "Percakapan Companion";
}

/**
 * Account-scoped conversation history. The transcript is stored per account so
 * a signed-in reader can open the same conversation on another device.
 * Attachment bytes, blob URLs, and local-only recall keys are stripped by the
 * client before this action ever sees them.
 */
const RiskSchema = z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]);
const TranscriptSchema = z.array(z.record(z.string(), z.unknown())).max(500);
/** Server Action bodies stay small enough for the default 1 MB request limit. */
const MAX_TRANSCRIPT_CHARS = 700_000;
const SaveSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(140),
  turns: z.number().int().min(0).max(10000),
  risk: RiskSchema.nullable().optional(),
  transcript: TranscriptSchema.optional(),
});

type SaveInput = z.infer<typeof SaveSchema>;

export async function listConversationHistory() {
  try {
    const session = await getSession();
    if (!session) return { ok: false as const, conversations: [] };
    const { rows } = await authDatabase().query<{
      id: string;
      title: string;
      turns: number;
      risk: "bersih" | "rendah" | "mencurigakan" | "tinggi" | null;
      transcript: unknown;
      updated_at: Date;
    }>(
      `SELECT id,title,turns,risk,transcript,updated_at
       FROM companion_conversations
       WHERE user_id=$1 AND deleted_at IS NULL
       ORDER BY updated_at DESC, id DESC LIMIT 50`,
      [session.id],
    );
    return {
      ok: true as const,
      conversations: rows.map((row) => ({
        id: row.id,
        title: privateTitle(row.title),
        turns: row.turns,
        risk: row.risk,
        transcript: Array.isArray(row.transcript) ? row.transcript : [],
        updatedAt: row.updated_at.toISOString(),
      })),
    };
  } catch {
    return { ok: false as const, conversations: [] };
  }
}

export async function saveConversationHistory(input: SaveInput) {
  try {
    const session = await getSession();
    if (!session)
      return { ok: false as const, error: "Masuk untuk menyimpan riwayat." };
    const parsed = SaveSchema.safeParse(input);
    if (!parsed.success)
      return { ok: false as const, error: "Riwayat tidak valid." };
    const { id, title, turns, risk, transcript } = parsed.data;
    if (transcript && JSON.stringify(transcript).length > MAX_TRANSCRIPT_CHARS)
      return { ok: false as const, error: "Transkrip terlalu besar." };
    const encoded = transcript ? JSON.stringify(transcript) : null;
    const result = await authDatabase().query(
      `INSERT INTO companion_conversations(id,user_id,title,turns,risk,transcript)
       VALUES($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT(id) DO UPDATE SET
         title=EXCLUDED.title,
         turns=EXCLUDED.turns,
         risk=EXCLUDED.risk,
         transcript=CASE
           WHEN $6::jsonb IS NULL THEN companion_conversations.transcript
           ELSE $6::jsonb
         END,
         updated_at=now()
       WHERE companion_conversations.user_id=EXCLUDED.user_id
       RETURNING id`,
      [id, session.id, privateTitle(title), turns, risk ?? null, encoded],
    );
    if (!result.rowCount)
      return { ok: false as const, error: "Percakapan tidak tersedia." };
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Riwayat belum tersimpan." };
  }
}
