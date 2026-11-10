/**
 * The eight identity agents shown in Lumina's Agents view.
 *
 * This module is server-safe: no React, icons, or browser APIs. The panel,
 * the community projection, the Orchestrator, and the process trace all read
 * these rows so an agent cannot appear under one name in one surface and a
 * different name in another.
 */

export const CREW_IDS = [
  "message",
  "link",
  "identity",
  "conversation",
  "job",
  "marketplace",
  "qris",
  "evidence",
] as const;

export type CrewId = (typeof CREW_IDS)[number];

export interface AgentIdentity {
  id: CrewId;
  displayName: string;
  /** Reader-facing field printed beside the role label. */
  field: string;
  /** What this agent reads, in one sentence. */
  purpose: string;
  /** Portrait already shipped under /brand/agents/. */
  portrait: string;
  /** Three short mechanism labels from the Agents view. */
  mechanisms: readonly [string, string, string];
}

export const AGENT_IDENTITIES: Record<CrewId, AgentIdentity> = {
  message: {
    id: "message",
    displayName: "Mochi",
    field: "Pesan & rekayasa sosial",
    purpose:
      "Membaca nada pesan: urgensi palsu, klaim otoritas, iming-iming, serta permintaan OTP atau berkas APK.",
    portrait: "/brand/agents/message.jpg",
    mechanisms: ["Kata kunci", "Urgensi · otoritas", "OTP · APK"],
  },
  link: {
    id: "link",
    displayName: "Bubu",
    field: "Tautan & domain",
    purpose:
      "Membongkar setiap tautan: domain mirip merek resmi, penyingkat, TLD berisiko, dan jalur login palsu.",
    portrait: "/brand/agents/link.jpg",
    mechanisms: ["Ekstraksi URL", "Domain mirip merek", "Penyingkat · TLD"],
  },
  identity: {
    id: "identity",
    displayName: "Piyo",
    field: "Identitas pengirim",
    purpose:
      "Memeriksa identitas pengirim: nomor kontak, klaim institusi, dan nomor asing yang tidak wajar.",
    portrait: "/brand/agents/identity.jpg",
    mechanisms: ["Nomor pengirim", "Klaim institusi", "Nomor asing"],
  },
  conversation: {
    id: "conversation",
    displayName: "Naga",
    field: "Percakapan & eskalasi",
    purpose:
      "Membandingkan pesan dengan giliran sebelumnya untuk menangkap eskalasi yang muncul bertahap.",
    portrait: "/brand/agents/conversation.jpg",
    mechanisms: ["Riwayat giliran", "Eskalasi bertahap", "Konteks percakapan"],
  },
  job: {
    id: "job",
    displayName: "Kiko",
    field: "Lowongan kerja",
    purpose:
      "Memeriksa tawaran kerja: biaya di muka, tugas like/subscribe, dan penempatan luar negeri yang membebani pelamar.",
    portrait: "/brand/agents/job.jpg",
    mechanisms: [
      "Biaya pendaftaran",
      "Tugas berbayar",
      "Penempatan luar negeri",
    ],
  },
  marketplace: {
    id: "marketplace",
    displayName: "Lala",
    field: "Jual-beli",
    purpose:
      "Mengikuti alur jual-beli: pembayaran ke rekening pribadi, gift card, dan trik refund lewat QRIS.",
    portrait: "/brand/agents/marketplace.jpg",
    mechanisms: ["Bayar di luar platform", "Harga tidak wajar", "Resi palsu"],
  },
  qris: {
    id: "qris",
    displayName: "Ruru",
    field: "QRIS & pembayaran",
    purpose:
      "Membaca payload QRIS: struktur TLV, CRC, tautan di dalam QR, dan nama merchant yang tidak cocok.",
    portrait: "/brand/agents/qris.jpg",
    mechanisms: ["TLV EMVCo", "CRC-16", "Nama merchant"],
  },
  evidence: {
    id: "evidence",
    displayName: "Bao",
    field: "Bukti & pelaporan",
    purpose:
      "Merangkum temuan menjadi kutipan, garis waktu, dan narasi singkat yang bisa diperiksa ulang.",
    portrait: "/brand/agents/evidence.jpg",
    mechanisms: ["Kutipan temuan", "Garis waktu", "Narasi bukti"],
  },
};

export const AGENT_IDENTITY_LIST = CREW_IDS.map((id) => AGENT_IDENTITIES[id]);

export function agentIdentity(id: CrewId): AgentIdentity {
  return AGENT_IDENTITIES[id];
}
