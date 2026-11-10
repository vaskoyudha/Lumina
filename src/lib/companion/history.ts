"use server";

import { z } from "zod";
import { authDatabase } from "@/lib/auth/database";
import { getSession } from "@/lib/auth/server-session";

/**
 * Account-scoped conversation metadata. The transcript itself never leaves the
 * device: this table only stores the title, turn count, and latest risk band so
 * the sidebar can list a signed-in reader's history after a reload.
 */
const RiskSchema = z.enum(["bersih", "rendah", "mencurigakan", "tinggi"]);
const SaveSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(140),
  turns: z.number().int().min(0).max(10000),
  risk: RiskSchema.nullable().optional(),
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
      updated_at: Date;
    }>(
      `SELECT id,title,turns,risk,updated_at FROM companion_conversations
       WHERE user_id=$1 AND deleted_at IS NULL
       ORDER BY updated_at DESC, id DESC LIMIT 50`,
      [session.id],
    );
    return {
      ok: true as const,
      conversations: rows.map((row) => ({
        id: row.id,
        title: row.title,
        turns: row.turns,
        risk: row.risk,
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
    const { id, title, turns, risk } = parsed.data;
    const result = await authDatabase().query(
      `INSERT INTO companion_conversations(id,user_id,title,turns,risk)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(id) DO UPDATE SET
         title=EXCLUDED.title,
         turns=EXCLUDED.turns,
         risk=EXCLUDED.risk,
         updated_at=now()
       WHERE companion_conversations.user_id=EXCLUDED.user_id
       RETURNING id`,
      [id, session.id, title, turns, risk ?? null],
    );
    if (!result.rowCount)
      return { ok: false as const, error: "Percakapan tidak tersedia." };
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Riwayat belum tersimpan." };
  }
}
