import type { ReportChannelId } from "@/data/report-contacts";
import type { ScoreResult } from "@/lib/contracts/score";
import { MODUS_BY_ID } from "@/lib/modus";

/**
 * Deterministic report draft.
 *
 * Everything here comes from the verdict and from what the user typed. There is
 * no network call and no model: the skeleton has to be sendable when the venue
 * is offline, and it must never invent a fact the engine did not produce.
 *
 * The checked message is not read. Evidence enters only through `narrative`,
 * which the user writes deliberately.
 */

export interface ReportInputs {
  name?: string;
  perpetrator?: string;
  loss?: string;
  narrative?: string;
}

const BLANK = {
  name: "[NAMA ANDA]",
  perpetrator: "[NOMOR ATAU REKENING PELAKU]",
  date: "[TANGGAL KEJADIAN]",
  loss: "[JUMLAH KERUGIAN]",
  narrative: "[KRONOLOGI SINGKAT]",
  evidence: "[DAFTAR BUKTI]",
} as const;

const INSTITUTION: Record<ReportChannelId, string> = {
  iasc: "Otoritas Jasa Keuangan",
  komdigi: "Kementerian Komunikasi dan Digital",
  patrolisiber: "Patroli Siber",
  cekrekening: "CekRekening.id",
};

export const REPORT_BODY_CAP = 700;

export function buildReportDraft({
  result,
  inputs,
  channel,
}: {
  result: ScoreResult;
  inputs: ReportInputs;
  channel: ReportChannelId;
}): { subject: string; body: string } {
  const modus = MODUS_BY_ID.get(result.modus)?.nama ?? null;

  const subject = modus
    ? `Laporan dugaan penipuan — ${modus}`
    : "Laporan dugaan penipuan";

  const name = valueOrBlank(inputs.name, BLANK.name);
  const perpetrator = valueOrBlank(inputs.perpetrator, BLANK.perpetrator);
  const loss = valueOrBlank(inputs.loss, BLANK.loss);

  let narrative = valueOrBlank(inputs.narrative, BLANK.narrative);
  let body = assemble({ channel, modus, name, perpetrator, loss, narrative });

  /*
   * The narrative is the only field that can grow without bound. Trim it until
   * the body fits; the blanks and the mandatory lines are never dropped.
   */
  while (body.length > REPORT_BODY_CAP && narrative.length > 0) {
    const overflow = body.length - REPORT_BODY_CAP;
    narrative = narrative.slice(
      0,
      Math.max(0, narrative.length - overflow - 1),
    );
    body = assemble({
      channel,
      modus,
      name,
      perpetrator,
      loss,
      narrative: narrative.length > 0 ? narrative : BLANK.narrative,
    });
  }

  return { subject, body };
}

function valueOrBlank(value: string | undefined, blank: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : blank;
}

function assemble({
  channel,
  modus,
  name,
  perpetrator,
  loss,
  narrative,
}: {
  channel: ReportChannelId;
  modus: string | null;
  name: string;
  perpetrator: string;
  loss: string;
  narrative: string;
}): string {
  return [
    `Kepada ${INSTITUTION[channel]},`,
    "",
    "Saya ingin melaporkan dugaan penipuan yang saya alami.",
    ...(modus ? [`Modus yang saya alami: ${modus}.`] : []),
    "",
    `Nama pelapor: ${name}`,
    `Nomor/akun pelaku: ${perpetrator}`,
    `Tanggal kejadian: ${BLANK.date}`,
    `Jumlah kerugian: ${loss}`,
    `Kronologi: ${narrative}`,
    `Bukti yang saya lampirkan: ${BLANK.evidence}`,
    "",
    "Mohon nomor tiket laporan agar saya dapat memantau tindak lanjutnya.",
  ].join("\n");
}
