import {
  Briefcase,
  Fingerprint,
  Link2,
  type LucideIcon,
  MessageSquare,
  MessagesSquare,
  QrCode,
  Quote,
  Store,
} from "lucide-react";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import type { AgentId } from "@/lib/contracts/score";
import { DETECTOR_IDS } from "@/lib/scoring/detector-ids";

/**
 * The agent registry — one profile per detector, the single source of truth.
 *
 * Order, labels, and tasks are read from the engine's own contract instead of
 * being copied, so the panel, the diagram, and the trace cannot describe the
 * same detector three different ways. Mechanism chips are reader-facing copy,
 * not a coverage claim: a rule can exist without a chip, so the chips are not
 * evidence that every family is implemented.
 */

export type DetectorAgent = Exclude<AgentId, "scoring">;

/**
 * Same order the engine evaluates, plus the Evidence Agent.
 *
 * Evidence is not a detector — it assembles a bundle after findings exist — so
 * it is appended here rather than pretended into the pipeline.
 */
export const AGENT_SEQUENCE: DetectorAgent[] = [...DETECTOR_IDS, "evidence"];

export interface AgentProfile {
  id: DetectorAgent;
  displayName: string;
  label: string;
  task: string;
  mechanism: readonly string[];
  purpose: string;
  flavor: string;
  /** One honesty caveat printed in the expanded body; only `qris` uses it. */
  caveat?: string;
  icon: LucideIcon;
  portrait: string | null;
  identity: `--lumina-agent-${DetectorAgent}`;
}

export const AGENT_REGISTRY: Record<DetectorAgent, AgentProfile> = {
  email: {
    id: "email",
    displayName: "Email",
    ...STAGE_LABEL.email,
    mechanism: ["Autentikasi header", "Alamat balasan", "Nama tampilan"],
    purpose: "Memeriksa header yang tersedia tanpa menebak dari isi email.",
    flavor: "Memisahkan alamat pengirim dan alamat balasan.",
    caveat:
      "Header tempelan dapat dipalsukan; hasil ini bukan verifikasi penyedia penerima.",
    icon: Fingerprint,
    portrait: null,
    identity: "--lumina-agent-email",
  },
  injection: {
    id: "injection",
    displayName: "Penjaga",
    ...STAGE_LABEL.injection,
    mechanism: ["Instruksi ke pemeriksa", "Penyamaran peran", "Klaim skor"],
    purpose: "Mengenali upaya memerintah sistem untuk melewati pemeriksaan.",
    flavor: "Isi pesan tidak dapat memerintah pemeriksa.",
    icon: MessageSquare,
    portrait: null,
    identity: "--lumina-agent-injection",
  },
  message: {
    id: "message",
    displayName: "Mochi",
    label: STAGE_LABEL.message.label,
    task: STAGE_LABEL.message.task,
    mechanism: ["Kata kunci", "Urgensi · otoritas", "OTP · APK"],
    purpose:
      "Membaca nada pesan: urgensi palsu, klaim otoritas, iming-iming, serta permintaan OTP atau berkas APK.",
    flavor: "Membaca kata yang dipakai untuk menekan.",
    icon: MessageSquare,
    portrait: "/brand/agents/message.jpg",
    identity: "--lumina-agent-message",
  },
  link: {
    id: "link",
    displayName: "Bubu",
    label: STAGE_LABEL.link.label,
    task: STAGE_LABEL.link.task,
    mechanism: ["Ekstraksi URL", "Domain mirip merek", "Penyingkat · TLD"],
    purpose:
      "Membongkar setiap tautan: domain mirip merek resmi, penyingkat, TLD berisiko, dan jalur login palsu.",
    flavor: "Membaca domain dan bentuk tautan yang dikirim.",
    icon: Link2,
    portrait: "/brand/agents/link.jpg",
    identity: "--lumina-agent-link",
  },
  identity: {
    id: "identity",
    displayName: "Piyo",
    label: STAGE_LABEL.identity.label,
    task: STAGE_LABEL.identity.task,
    mechanism: ["Nomor pengirim", "Klaim institusi", "Nomor asing"],
    purpose:
      "Memeriksa identitas pengirim: nomor kontak, klaim institusi, dan nomor asing yang tidak wajar.",
    flavor: "Memeriksa nomor dan klaim pengirim.",
    icon: Fingerprint,
    portrait: "/brand/agents/identity.jpg",
    identity: "--lumina-agent-identity",
  },
  conversation: {
    id: "conversation",
    displayName: "Naga",
    label: STAGE_LABEL.conversation.label,
    task: STAGE_LABEL.conversation.task,
    mechanism: ["Riwayat giliran", "Eskalasi bertahap", "Konteks percakapan"],
    purpose:
      "Membandingkan pesan dengan giliran sebelumnya untuk menangkap eskalasi yang muncul bertahap.",
    flavor: "Melihat apakah tekanan itu datang bertahap.",
    icon: MessagesSquare,
    portrait: "/brand/agents/conversation.jpg",
    identity: "--lumina-agent-conversation",
  },
  job: {
    id: "job",
    displayName: "Kiko",
    label: STAGE_LABEL.job.label,
    task: STAGE_LABEL.job.task,
    mechanism: [
      "Biaya pendaftaran",
      "Tugas berbayar",
      "Penempatan luar negeri",
    ],
    purpose:
      "Memeriksa tawaran kerja: biaya di muka, tugas like/subscribe, dan penempatan luar negeri yang membebani pelamar.",
    flavor: "Memeriksa biaya yang diminta sebelum ada surat tawaran.",
    icon: Briefcase,
    portrait: "/brand/agents/job.jpg",
    identity: "--lumina-agent-job",
  },
  marketplace: {
    id: "marketplace",
    displayName: "Lala",
    label: STAGE_LABEL.marketplace.label,
    task: STAGE_LABEL.marketplace.task,
    mechanism: ["Bayar di luar platform", "Harga tidak wajar", "Resi palsu"],
    purpose:
      "Mengikuti alur jual-beli: pembayaran ke rekening pribadi, gift card, dan trik refund lewat QRIS.",
    flavor: "Mengikuti alur bayar yang keluar dari platform.",
    icon: Store,
    portrait: "/brand/agents/marketplace.jpg",
    identity: "--lumina-agent-marketplace",
  },
  qris: {
    id: "qris",
    displayName: "Ruru",
    label: STAGE_LABEL.qris.label,
    task: STAGE_LABEL.qris.task,
    mechanism: ["TLV EMVCo", "CRC-16", "Nama merchant"],
    purpose:
      "Membaca payload QRIS: struktur TLV, CRC, tautan di dalam QR, dan nama merchant yang tidak cocok.",
    flavor: "Membaca payload QR dan nama penerimanya.",
    caveat:
      "CRC valid hanya berarti formatnya benar; cocokkan nama merchant di layar sebelum membayar.",
    icon: QrCode,
    portrait: "/brand/agents/qris.jpg",
    identity: "--lumina-agent-qris",
  },
  evidence: {
    id: "evidence",
    displayName: "Bao",
    label: STAGE_LABEL.evidence.label,
    task: STAGE_LABEL.evidence.task,
    mechanism: ["Kutipan temuan", "Garis waktu", "Narasi bukti"],
    purpose:
      "Merangkum temuan menjadi kutipan, garis waktu, dan narasi singkat yang bisa diperiksa ulang.",
    flavor: "Menyimpan kutipan yang bisa diperiksa ulang.",
    icon: Quote,
    portrait: "/brand/agents/evidence.jpg",
    identity: "--lumina-agent-evidence",
  },
};

const ids = <K extends keyof AgentProfile>(key: K) =>
  Object.fromEntries(
    AGENT_SEQUENCE.map((id) => [id, AGENT_REGISTRY[id][key]]),
  ) as Record<DetectorAgent, AgentProfile[K]>;

export const AGENT_DISPLAY_NAME = ids("displayName");
export const AGENT_MECHANISM = ids("mechanism");
export const AGENT_PURPOSE = ids("purpose");

/**
 * The orchestrator's own lane, in the same chip grammar as the detectors.
 *
 * `scoring` is not an agent in the trace — it is the deterministic engine that
 * runs every detector and folds their findings into one score. Printing the
 * three steps keeps that distinction visible instead of drawing Lumina as a
 * sixth detector.
 */
export const LUMINA_STEPS = [
  "Jalankan agen",
  "Kumpulkan temuan",
  "Hitung skor",
] as const;
