"use client";

import {
  ArrowRight,
  BarChart2,
  Briefcase,
  ChevronRight,
  Clock,
  Compass,
  type LucideIcon,
  MessageSquare,
  MoreVertical,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";
import {
  AGENT_REGISTRY,
  type DetectorAgent,
} from "@/components/companion/agents";

/**
 * The two dashboard cards the owner supplied (`lumina_dashboard.tsx`), cloned
 * onto the companion empty state: a quick-access list and the agent history.
 *
 * Geometry is the reference's, value for value — 24px card radius, 16px
 * padding, 42px quick rows, 40px history icon boxes. Colour is not: the
 * reference ships cool hexes, while the workspace runs the warm `[data-workspace]`
 * palette, so every tint resolves to an existing token instead of a literal.
 */

type Tone = "danger" | "brand" | "marketplace" | "evidence" | "message";

const TONE: Record<Tone, { box: string; ink: string }> = {
  danger: { box: "bg-agent-qris-soft", ink: "text-danger" },
  brand: { box: "bg-brand-soft", ink: "text-brand" },
  marketplace: {
    box: "bg-agent-marketplace-soft",
    ink: "text-agent-marketplace",
  },
  evidence: { box: "bg-agent-evidence-soft", ink: "text-agent-evidence" },
  message: { box: "bg-agent-message-soft", ink: "text-agent-message" },
};

interface QuickFeature {
  id: string;
  label: string;
  prompt: string;
  icon: LucideIcon;
  tone: Tone;
  filled?: boolean;
  highlight?: boolean;
}

const QUICK_FEATURES: readonly QuickFeature[] = [
  {
    id: "analisis",
    label: "Analisis iklan lowongan",
    prompt:
      "Tolong analisis iklan lowongan Frontend Engineer di PT Maju Jaya beserta poin negosiasi gajinya.",
    icon: Briefcase,
    tone: "danger",
    filled: true,
  },
  {
    id: "kecocokan",
    label: "Cek kecocokan karier",
    prompt:
      "Cek persentase kecocokan profil saya untuk posisi Senior Frontend Engineer (React & TypeScript).",
    icon: TrendingUp,
    tone: "danger",
  },
  {
    id: "wawancara",
    label: "Simulasi wawancara",
    prompt:
      "Mulai simulasi wawancara teknis untuk posisi Senior Frontend Engineer di PT Maju Jaya.",
    icon: MessageSquare,
    tone: "brand",
    filled: true,
  },
  {
    id: "tips",
    label: "Tips karier terbaru",
    prompt:
      "Berikan 5 tips karier terbaru agar CV dan portofolio Frontend Engineer menonjol di tahun ini.",
    icon: Compass,
    tone: "brand",
  },
  {
    id: "komunitas",
    label: "Komunitas profesional",
    prompt:
      "Tampilkan diskusi terbaru dari komunitas profesional IT & Engineering di Jakarta.",
    icon: Sparkles,
    tone: "brand",
    filled: true,
    highlight: true,
  },
];

interface AgentHistoryItem {
  id: string;
  agent: DetectorAgent;
  title: string;
  time: string;
  unreadDot?: boolean;
  icon: LucideIcon;
  tone: Tone;
  filled?: boolean;
}

const AGENT_HISTORY: readonly AgentHistoryItem[] = [
  {
    id: "h1",
    agent: "job",
    title: "Pencari Lowongan",
    time: "2 menit yang lalu",
    unreadDot: true,
    icon: Briefcase,
    tone: "brand",
    filled: true,
  },
  {
    id: "h2",
    agent: "marketplace",
    title: "Pesaing Agent",
    time: "1 jam yang lalu",
    icon: BarChart2,
    tone: "marketplace",
  },
  {
    id: "h3",
    agent: "identity",
    title: "Identitas Agent",
    time: "3 jam yang lalu",
    icon: User,
    tone: "evidence",
    filled: true,
  },
  {
    id: "h4",
    agent: "conversation",
    title: "Conversation Insights",
    time: "1 hari yang lalu",
    icon: MessageSquare,
    tone: "message",
    filled: true,
  },
];

export function CompanionQuickCards({
  onFeature,
  onOpenHistory,
  onResume,
}: {
  /** Loads the feature prompt into the composer. */
  onFeature: (prompt: string) => void;
  /** Opens the agent overview — the "Lihat semua" destination. */
  onOpenHistory: () => void;
  /** Loads "Lanjutkan sesi …" into the composer. */
  onResume: (title: string) => void;
}) {
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      {/* TOP CARD: Butuh apa lagi, Tamu? */}
      <div className="rounded-[24px] border border-edge-soft bg-panel p-4 shadow-rest">
        <div className="mb-3.5 flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft">
            <div className="flex size-6 items-center justify-center rounded-full bg-brand text-panel">
              <Clock aria-hidden strokeWidth={2.3} className="size-3.5" />
            </div>
          </div>
          <div>
            <h2 className="text-[13.5px] font-bold text-ink leading-tight">
              Butuh apa lagi, Tamu?
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-mute">
              Akses cepat ke fitur favorit Anda
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {QUICK_FEATURES.map((feat) => {
            const Icon = feat.icon;
            const tone = TONE[feat.tone];
            return (
              <button
                key={feat.id}
                type="button"
                onClick={() => onFeature(feat.prompt)}
                className={`group flex h-[42px] w-full items-center justify-between gap-2.5 rounded-2xl border px-2.5 text-left transition-colors ${
                  feat.highlight
                    ? "border-brand-edge-soft bg-brand-tint"
                    : "border-transparent bg-panel-2 hover:border-brand-edge-soft hover:bg-brand-tint"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-xl ${tone.box}`}
                  >
                    <Icon
                      aria-hidden
                      className={`size-3.5 ${tone.ink} ${
                        feat.filled ? "fill-current" : ""
                      }`}
                    />
                  </span>
                  <span className="truncate text-[12px] font-semibold text-txt transition-colors group-hover:text-brand-strong">
                    {feat.label}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="size-4 shrink-0 text-ink-mute transition-colors group-hover:text-brand-strong"
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* BOTTOM CARD: Riwayat Agen */}
      <div className="rounded-[24px] border border-edge-soft bg-panel p-4 shadow-rest">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-ink">Riwayat Agen</h2>
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-strong transition-colors hover:text-brand"
          >
            <span>Lihat semua</span>
            <ArrowRight aria-hidden className="size-3" />
          </button>
        </div>

        <div className="space-y-3">
          {AGENT_HISTORY.map((item) => {
            const Icon = item.icon;
            const tone = TONE[item.tone];
            const portrait = AGENT_REGISTRY[item.agent].portrait;
            return (
              <div
                key={item.id}
                className="group relative flex items-center justify-between gap-3 rounded-2xl p-1.5 transition-colors hover:bg-panel-2"
              >
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ${tone.box}`}
                  >
                    {portrait ? (
                      <Image
                        src={portrait}
                        alt=""
                        width={40}
                        height={40}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Icon
                        aria-hidden
                        className={`size-5 ${tone.ink} ${
                          item.filled ? "fill-current" : ""
                        }`}
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-bold text-ink transition-colors group-hover:text-brand-strong">
                        {item.title}
                      </span>
                      {item.unreadDot ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-faint">
                      {item.time}
                    </span>
                  </span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenuId((prev) =>
                        prev === item.id ? null : item.id,
                      )
                    }
                    aria-label={`Menu riwayat ${item.title}`}
                    aria-expanded={openMenuId === item.id}
                    className="flex size-7 items-center justify-center rounded-lg text-ink-mute hover:bg-edge-soft"
                  >
                    <MoreVertical aria-hidden className="size-3.5" />
                  </button>

                  {openMenuId === item.id ? (
                    <div className="absolute right-0 top-8 z-30 w-40 rounded-xl border border-edge-soft bg-panel py-1 text-xs shadow-lift">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onOpenHistory();
                        }}
                        className="w-full px-3 py-1.5 text-left font-medium text-ink-soft hover:bg-panel-2"
                      >
                        Lihat ringkasan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuId(null);
                          onResume(item.title);
                        }}
                        className="w-full px-3 py-1.5 text-left font-medium text-brand-strong hover:bg-panel-2"
                      >
                        Jalankan ulang
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
