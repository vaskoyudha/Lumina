import type { Signal } from "@/lib/contracts/score";

/**
 * Lowongan Agent — fake job ads and pay-to-earn tasks.
 *
 * The job-context gate is the ownership boundary: generic fee language belongs
 * to the Message Agent, so a bank transfer confirmation cannot be re-scored by
 * this module. Every rule quotes the user's own words in `evidence`.
 */

const JOB_CONTEXT =
  /\b(?:lowongan|kerja|karier|recruiter|rekrut|kandidat|pelamar|gaji|upah|honor|interview|wawancara|bergabung|tim|posisi|magang|part\s*time|full\s*time|tugas\s+harian)\b/i;

const EMPLOYER_PAYS =
  /\b(?:ditanggung|gratis|tidak\s+dipungut|tanpa\s+biaya|gaji\s+dibayar)\b[^.!?]{0,30}(?:perusahaan|pemberi\s+kerja|kantor|employer)\b/i;

interface JobRule {
  id: string;
  weight: number;
  label: string;
  pattern: RegExp;
}

const JOB_RULES: readonly JobRule[] = [
  {
    id: "job-fee",
    weight: 0.75,
    label:
      "Meminta biaya pendaftaran/pelatihan sebelum ada surat tawaran kerja",
    pattern:
      /\b(?:biaya|bayar|transfer)\b[^.!?]{0,30}\b(?:pendaftaran|pelatihan|seragam|tes\s+kesehatan|akomodasi)\b/i,
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
      /\b(?:ktp|selfie\s+ktp|pin|otp|nomor\s+rekening|kartu\s+atm)\b[^.!?]{0,60}\b(?:daftar|lamar|sebelum|syarat|kirim)\b/i,
  },
  {
    id: "job-overseas-fee",
    weight: 0.7,
    label:
      "Penempatan luar negeri dengan biaya visa/tiket yang dibebankan ke pelamar",
    pattern:
      /\b(?:luar\s+negeri|visa|tiket\s+pesawat|paspor)\b[^.!?]{0,60}\b(?:biaya|ditanggung\s+pelamar|bayar)\b/i,
  },
  {
    id: "job-brand-lure",
    weight: 0.6,
    label:
      "Mengaku lowongan perusahaan resmi tetapi mengarah ke tautan chat/formulir",
    pattern:
      /\b(?:lowongan|rekrutmen)\b[^.!?]{0,40}\b(?:wa\.me|t\.me|forms\.gle|bit\.ly|blogspot)\b/i,
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

function matchRule(text: string, rule: JobRule): Signal | null {
  const match = text.match(rule.pattern);
  if (!match) return null;
  return {
    label: rule.label,
    weight: rule.weight,
    evidence: match[0].trim(),
    agent: "job",
  };
}

export interface JobResult {
  signals: Signal[];
  note?: string;
}

export function jobSignals(text: string): JobResult {
  if (!JOB_CONTEXT.test(text)) {
    return { signals: [], note: "Bukan tawaran kerja." };
  }

  const employerPays = EMPLOYER_PAYS.test(text);
  const strong: Signal[] = [];
  const noisy: Signal[] = [];

  for (const rule of JOB_RULES) {
    // "Biaya ditanggung perusahaan" is the opposite of a fee demand.
    if (
      employerPays &&
      (rule.id === "job-fee" || rule.id === "job-overseas-fee")
    ) {
      continue;
    }
    const signal = matchRule(text, rule);
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

  return { signals: [...strong, ...noisy] };
}
