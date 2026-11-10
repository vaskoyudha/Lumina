import type { Signal } from "@/lib/contracts/score";
import { isQuotedWarning } from "@/lib/scoring/context";
import { annotateSignal } from "@/lib/scoring/mechanism";
import { normalizeWithMap, originalSpan } from "@/lib/scoring/normalize";

/**
 * Lowongan Agent — fake job ads and pay-to-earn tasks.
 *
 * The job-context gate is the ownership boundary: generic fee language belongs
 * to the Message Agent, so a bank transfer confirmation cannot be re-scored by
 * this module. Every rule quotes the user's own words in `evidence`.
 */

const JOB_CONTEXT =
  /\b(?:lowongan|kerja|karier|recruiter|rekrut|kandidat|pelamar|gaji|upah|honor|interview|wawancara|bergabung|tim|posisi|magang|part\s*time|full\s*time|tugas\s+harian)\b/i;

/**
 * "Biaya ditanggung perusahaan" is a waiver; "ditanggung pelamar" is the
 * opposite. Both must be judged per occurrence, never globally: one waived fee
 * must not silence a second demand in the same ad.
 */
const EMPLOYER_COVERS =
  /\b(?:ditanggung|gratis|tidak\s+dipungut|tanpa\s+biaya)\b[^.!?]{0,30}(?:perusahaan|pemberi\s+kerja|kantor|employer)\b/i;

/**
 * A negation waives a fee only when it directly precedes the fee trigger.
 * "tanpa pengalaman" and "gratis konsultasi" must not silence "biaya pelatihan",
 * and a negation earlier in the sentence must not reach a later fee.
 */
const FEE_DECLINED_BEFORE =
  /(?:^|[\s,;:])(?:tanpa|tidak\s+(?:ada|dipungut|memungut|mengenakan|meminta|minta)|bebas(?:\s+dari)?|gratis)\s*$/i;

const FEE_DECLINED_AFTER =
  /^\s*[,;:]?\s*(?:gratis|bebas|tidak\s+(?:dipungut|ada|memungut|diminta|dipinta))\b/i;

const CONTRAST =
  /\b(?:tetapi|tapi|namun|akan\s+tetapi|selain\s+itu|melainkan)\b/i;

/** A comma list that continues a denial: "tanpa biaya apa pun, termasuk …". */
const LIST_CONTINUATION =
  /^\s*(?:termasuk|yaitu|meliputi|seperti|antara\s+lain|di\s+antaranya)\b/i;

/** A fee explicitly billed to the applicant, even if another fee is waived. */
const APPLICANT_BILLED =
  /\b(?:biaya|bayar|transfer)\b[^.!?]{0,40}\b(?:ditanggung|dibebankan)\s+(?:oleh\s+)?(?:pelamar|peserta|sendiri|karyawan)\b/i;

/** A denial inside the matched span, e.g. "luar negeri tanpa biaya visa". */
const DECLINED_INSIDE =
  /(?:^|[\s,;:])(?:tanpa|tidak\s+(?:ada|dipungut|memungut|mengenakan|meminta|minta)|bebas(?:\s+dari)?|gratis)\s+(?:biaya|bayar|transfer|pungutan)\b/i;

/**
 * The rest of the sentence a match sits in, capped. A `.` between digits is a
 * thousands separator, not a sentence break: "biaya pelatihan Rp100.000
 * ditanggung perusahaan" is one waiver.
 */
function sentenceWindow(text: string, start: number, limit = 80): string {
  const hardEnd = Math.min(text.length, start + limit);
  let end = hardEnd;
  for (let index = start; index < hardEnd; index += 1) {
    if (!".!?".includes(text[index])) continue;
    const isThousands =
      /\d/.test(text[index - 1] ?? "") && /\d/.test(text[index + 1] ?? "");
    if (!isThousands) {
      end = index;
      break;
    }
  }
  return text.slice(start, end);
}

type DeclineReason = "employer" | "negated";

function feeDeclineReason(
  text: string,
  match: RegExpMatchArray,
): DeclineReason | null {
  const start = match.index ?? 0;
  const end = start + match[0].length;

  const after = sentenceWindow(text, start);
  if (EMPLOYER_COVERS.test(after) && !CONTRAST.test(after)) {
    return "employer";
  }

  // Only a negation that ends right before this fee trigger governs it.
  const before = text.slice(Math.max(0, start - 24), start);
  if (FEE_DECLINED_BEFORE.test(before)) return "negated";

  if (DECLINED_INSIDE.test(match[0]) && !CONTRAST.test(match[0])) {
    return "negated";
  }

  if (FEE_DECLINED_AFTER.test(text.slice(end, end + 40))) return "negated";
  return null;
}

interface JobRule {
  id: string;
  weight: number;
  label: string;
  pattern: RegExp;
}

const JOB_RULES: readonly JobRule[] = [
  {
    id: "job-admin-deposit",
    weight: 0.75,
    label: "Meminta deposit administrasi untuk proses rekrutmen",
    pattern:
      /\b(?:biaya administrasi|deposit)\b[^.!?]{0,60}\b(?:pendaftaran|penempatan|rekrutmen|kandidat)\b/i,
  },
  {
    id: "job-withdrawal",
    weight: 0.85,
    label: "Saldo tugas harus ditebus dengan pembayaran tambahan",
    pattern:
      /\b(?:saldo tugas|penarikan komisi|penarikan saldo)\b[^.!?]{0,80}\b(?:top\s*up|deposit|bayar|setor)\b/i,
  },
  {
    id: "job-fee",
    weight: 0.75,
    label:
      "Meminta biaya pendaftaran/pelatihan sebelum ada surat tawaran kerja",
    pattern:
      /\b(?:biaya|bayar|transfer)\b[^.!?]{0,30}\b(?:pendaftaran|daftar|pelatihan|seragam|tes\s+kesehatan|akomodasi)\b/i,
  },
  {
    id: "job-pay-to-earn",
    weight: 0.85,
    label:
      "Tugas berbayar yang meminta top-up/deposit lebih dulu — pola tugas palsu",
    pattern:
      /\b(?:like|subscribe|follow|rating|ulasan|komisi|misi|tugas\s+harian)\b[\s\S]{0,120}\b(?:top\s*up|topup|deposit|tambah\s+saldo|setor)\b/i,
  },
  {
    id: "job-personal-rail",
    weight: 0.7,
    label:
      "Pembayaran ke dompet digital/rekening pribadi, bukan kanal perusahaan",
    pattern:
      /\b(?:dana|ovo|gopay|shopeepay|linkaja)\b[^.!?]{0,40}\b(?:transfer|bayar|kirim|nomor)\b|\brekening\s+pribadi\b|\batas\s+nama\b/i,
  },
  {
    id: "job-early-data",
    weight: 0.6,
    label:
      "Meminta KTP/OTP/data rekening sebelum tawaran kerja resmi diberikan",
    pattern:
      /\b(?:ktp|selfie\s+ktp|pin|otp|nomor\s+rekening|kartu\s+atm)\b[^.!?]{0,60}\b(?:daftar|lamar|sebelum|syarat|kirim|dikirim|dikirimkan)\b|\b(?:kirim|kirimkan|serahkan|unggah|foto)\b[^.!?]{0,40}\b(?:ktp|selfie\s+ktp|pin|otp|nomor\s+rekening|kartu\s+atm)\b/i,
  },
  {
    id: "job-overseas-fee",
    weight: 0.7,
    label:
      "Penempatan luar negeri dengan biaya visa/tiket yang dibebankan ke pelamar",
    pattern:
      /\b(?:luar\s+negeri|visa|tiket(?:\s+pesawat)?|paspor)\b[^.!?]{0,60}\b(?:biaya|ditanggung\s+pelamar|bayar)\b/i,
  },
  {
    id: "job-brand-lure",
    weight: 0.6,
    label:
      "Mengaku lowongan perusahaan resmi tetapi mengarah ke tautan chat/formulir",
    pattern:
      /\b(?:lowongan|rekrutmen)\b[\s\S]{0,40}\b(?:wa\.me|t\.me|forms\.gle|bit\.ly|blogspot)\b|\b(?:wa\.me|t\.me|forms\.gle|bit\.ly|blogspot)\b[\s\S]{0,60}\b(?:lowongan|rekrutmen)\b/i,
  },
];

const NOISY: readonly JobRule[] = [
  {
    id: "job-free-mail",
    weight: 0.2,
    label: "Pelamar diminta menghubungi surel gratis, bukan domain perusahaan",
    pattern: /\b[a-z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail)\.com\b/i,
  },
  {
    id: "job-no-interview",
    weight: 0.25,
    label: "Menjanjikan diterima langsung tanpa wawancara",
    pattern: /\b(?:langsung\s+diterima|tanpa\s+interview|tanpa\s+wawancara)\b/i,
  },
  {
    id: "job-salary-outlier",
    weight: 0.25,
    label: "Gaji jauh di atas wajar untuk posisi yang disebut",
    pattern:
      /\b(?:gaji|upah)\b[^.!?]{0,20}\b(?:rp\s*)?(?:1[5-9]|[2-9]\d)\s*juta\b/i,
  },
];

function toSignal(rule: JobRule, match: RegExpMatchArray): Signal {
  return annotateSignal(
    {
      label: rule.label,
      weight: rule.weight,
      evidence: match[0].trim(),
      agent: "job",
    },
    `job.${rule.id}`,
  );
}

/** A declined span may still contain a later, independently demanded fee. */
function retryAfterDecline(
  rule: JobRule,
  match: RegExpMatchArray,
  reason: DeclineReason,
): Signal | null {
  const separators =
    reason === "employer"
      ? /,|\b(?:dan|serta)\b/i
      : /[,;]|\b(?:tetapi|tapi|namun|akan\s+tetapi|selain\s+itu|melainkan)\b/i;

  if (!separators.test(match[0])) return null;
  for (const part of match[0].split(separators).slice(1)) {
    // "tanpa biaya apa pun, termasuk biaya pendaftaran" is one denial.
    if (reason === "negated" && LIST_CONTINUATION.test(part)) continue;
    const inner = part.match(rule.pattern);
    if (inner && !feeDeclineReason(part, inner)) return toSignal(rule, inner);
  }
  return null;
}

function matchRule(
  text: string,
  rule: JobRule,
  declineNegated = false,
): Signal | null {
  if (!declineNegated) {
    const match = text.match(rule.pattern);
    return match ? toSignal(rule, match) : null;
  }

  const global = new RegExp(
    rule.pattern.source,
    rule.pattern.flags.includes("g")
      ? rule.pattern.flags
      : `${rule.pattern.flags}g`,
  );
  for (const match of text.matchAll(global)) {
    const reason = feeDeclineReason(text, match);
    if (!reason) return toSignal(rule, match);
    // A waived fee never hides a second one billed to the applicant.
    if (reason === "employer") {
      const billed = text.match(APPLICANT_BILLED);
      if (billed) return toSignal(rule, billed);
    }
    const retry = retryAfterDecline(rule, match, reason);
    if (retry) return retry;
  }
  return null;
}

export interface JobResult {
  signals: Signal[];
  note?: string;
}

export function jobSignals(input: string): JobResult {
  const normalized = normalizeWithMap(input);
  const text = normalized.text;
  if (!JOB_CONTEXT.test(text)) {
    return { signals: [], note: "Bukan tawaran kerja." };
  }

  const strong: Signal[] = [];
  const noisy: Signal[] = [];

  for (const rule of JOB_RULES) {
    const feeRule =
      rule.id === "job-fee" ||
      rule.id === "job-overseas-fee" ||
      rule.id === "job-admin-deposit";
    const signal = matchRule(text, rule, feeRule);
    if (signal) strong.push(signal);
  }

  /*
   * Context traits only corroborate a strong rule. On their own they must not
   * push a legitimate ad over a risk band, so a recruiter using Gmail plus an
   * implausible salary is reported as context, never as a verdict.
   */
  if (strong.length > 0) {
    for (const rule of NOISY) {
      const signal = matchRule(text, rule);
      if (signal) noisy.push(signal);
    }
  }

  return {
    signals: [...strong, ...noisy]
      .filter(
        (s) =>
          !isQuotedWarning(text, text.indexOf(s.evidence), s.evidence.length),
      )
      .map((s) => ({
        ...s,
        evidence: input.slice(
          ...originalSpan(
            normalized,
            text.indexOf(s.evidence),
            text.indexOf(s.evidence) + s.evidence.length,
          ),
        ),
      })),
  };
}
