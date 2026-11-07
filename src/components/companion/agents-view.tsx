"use client";

import {
  ArrowLeft,
  Fingerprint,
  Link2,
  type LucideIcon,
  MessageSquare,
  MessagesSquare,
  Quote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Fragment } from "react";
import {
  AGENT_DISPLAY_NAME,
  AGENT_MECHANISM,
  AGENT_SEQUENCE,
  type DetectorAgent,
  LUMINA_STEPS,
} from "@/components/companion/agents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import { cn } from "@/lib/utils";

/**
 * Agents — the detector overview shown in the center column.
 *
 * Static by design. The right-hand pane is the live surface on the conversation
 * and the explanatory surface here; this view only answers who checks a message
 * and what each one looks for. The connectors are decorative: they loop to show
 * direction, never to claim that a stage is running. No trace is read here.
 *
 * The layout follows the reference graph turned on its side: Lumina sits at the
 * top as the orchestrator, then the five detectors descend in the order the
 * evidence panel walks them. Each row carries its own mechanism chips, so the
 * diagram never repeats a second list of names.
 */

/** One icon per detector family, matching the evidence panel's rows. */
const AGENT_ICON: Record<DetectorAgent, LucideIcon> = {
  message: MessageSquare,
  link: Link2,
  identity: Fingerprint,
  conversation: MessagesSquare,
  evidence: Quote,
};

export function AgentsView({
  onBack,
  onSelect,
  selected = null,
}: {
  onBack: () => void;
  onSelect: (agent: DetectorAgent) => void;
  selected?: DetectorAgent | null;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-8 sm:px-6">
      <div className="mx-auto w-full max-w-[720px] pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 h-8 gap-1.5 rounded-full px-2.5 text-[12px] text-ink-soft hover:bg-chip hover:text-ink"
        >
          <ArrowLeft aria-hidden strokeWidth={1.8} className="size-3.5" />
          Kembali ke percakapan
        </Button>

        <h1
          id="agen-pemeriksa-title"
          className="mt-3 font-semibold text-[22px] text-ink leading-[1.2] tracking-[-0.02em]"
        >
          Agen pemeriksa
        </h1>
        <p className="mt-1.5 max-w-[560px] text-[12.5px] text-ink-soft leading-relaxed">
          Lumina menjalankan lima agen atas pesan yang sama, mengumpulkan
          temuannya, lalu menghitung satu skor deterministik. Pilih agen untuk
          membaca perannya di panel kanan.
        </p>

        <div className="mt-6">
          <LuminaCard />
          {AGENT_SEQUENCE.map((agent, index) => (
            <Fragment key={agent}>
              <Connector index={index} reduced={reduced} />
              <AgentRow
                agent={agent}
                index={index}
                onSelect={onSelect}
                selected={selected === agent}
              />
            </Fragment>
          ))}
        </div>

        <p className="mt-5 flex items-start gap-2 rounded-[9px] border border-hairline bg-panel-2 px-3 py-2.5 text-[11.5px] text-ink-mute leading-relaxed">
          <ShieldCheck
            aria-hidden
            strokeWidth={1.8}
            className="mt-px size-4 shrink-0 text-brand"
          />
          Pesan yang diperiksa tidak pernah meninggalkan perangkat. Agen
          berjalan lokal; model bahasa hanya menyusun kalimat dari temuan.
        </p>
      </div>
    </div>
  );
}

function LuminaCard() {
  return (
    <Card
      data-agent="lumina"
      className="relative gap-0 rounded-[10px] border border-brand-line bg-panel py-0 shadow-rest ring-0"
    >
      <CardHeader className="flex flex-row items-center gap-3 px-3.5 pt-3.5 pb-0">
        <span className="grid size-11 shrink-0 place-items-center rounded-[9px] border border-brand-line bg-brand-soft">
          {/* biome-ignore lint/performance/noImgElement: a fixed 36px PNG with transparency; next/image adds no value here */}
          <img
            src="/images/companion-orb.png"
            alt=""
            width={36}
            height={33}
            className="pointer-events-none size-9 object-contain select-none [filter:hue-rotate(132deg)_saturate(1.45)]"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="font-semibold text-[13.5px] text-ink leading-snug">
              Lumina
            </CardTitle>
            <Badge
              variant="outline"
              className="h-auto rounded-[5px] border-brand-line bg-brand-soft px-1.5 py-0.5 font-mono text-[9.5px] font-normal text-brand-ink uppercase tracking-[0.08em]"
            >
              Orkestrator
            </Badge>
          </div>
          <p className="mt-0.5 text-[11.5px] text-ink-soft leading-snug">
            Satu engine deterministik yang menjalankan kelima agen.
          </p>
        </div>
        <Sparkles
          aria-hidden
          strokeWidth={1.6}
          className="size-3.5 shrink-0 text-brand"
        />
      </CardHeader>
      <CardContent className="px-3.5 pt-2.5 pb-3">
        <Chips items={LUMINA_STEPS} strong />
      </CardContent>
    </Card>
  );
}

function AgentRow({
  agent,
  index,
  selected,
  onSelect,
}: {
  agent: DetectorAgent;
  index: number;
  selected: boolean;
  onSelect: (agent: DetectorAgent) => void;
}) {
  const { label } = STAGE_LABEL[agent];
  const display = AGENT_DISPLAY_NAME[agent];
  const Icon = AGENT_ICON[agent];

  return (
    <div className="relative">
      <Card
        data-agent={agent}
        data-selected={selected ? "true" : undefined}
        className={cn(
          "relative gap-0 rounded-[10px] border bg-panel py-0 shadow-rest ring-0 transition-[border-color,background-color] duration-200",
          selected
            ? "border-brand-line bg-brand-soft/40"
            : "border-edge hover:border-brand-line",
        )}
      >
        <CardHeader className="flex flex-row items-center gap-2.5 px-3.5 pt-3 pb-0">
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[7px] transition-colors duration-200",
              selected ? "bg-brand text-white" : "bg-brand-soft text-brand-ink",
            )}
          >
            <Icon aria-hidden strokeWidth={1.8} className="size-4" />
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <CardTitle className="font-semibold text-[12.5px] text-ink leading-snug">
              {display}
            </CardTitle>
            <span className="font-mono text-[9.5px] text-ink-faint uppercase tracking-[0.08em]">
              {label}
            </span>
          </div>
          <span className="font-mono text-[10px] text-ink-faint">
            {String(index + 1).padStart(2, "0")}
          </span>
        </CardHeader>
        <CardContent className="px-3.5 pt-2 pb-3">
          <Chips items={AGENT_MECHANISM[agent]} />
        </CardContent>
      </Card>

      {/*
       * The card is explanatory, but selecting a row is a real action: it
       * highlights and scrolls to that agent's brief in the right pane. An
       * overlay button keeps the whole card clickable without nesting a button
       * around headings and paragraphs.
       */}
      <Button
        type="button"
        variant="ghost"
        aria-label={`Lihat detail ${display}`}
        aria-pressed={selected}
        onClick={() => onSelect(agent)}
        className="absolute inset-0 h-full w-full rounded-[10px] p-0 opacity-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-brand/40"
      />
    </div>
  );
}

function Chips({
  items,
  strong = false,
}: {
  items: readonly string[];
  strong?: boolean;
}) {
  return (
    <ul className="flex list-none flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item}>
          <Badge
            variant="outline"
            className={cn(
              "h-auto rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-normal",
              strong
                ? "border-brand-line bg-brand-soft text-brand-ink"
                : "border-edge bg-panel-2 text-ink-mute",
            )}
          >
            {item}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/**
 * The vertical connector between two rows.
 *
 * One pulse per connector draws the line downward, then waits. Cycle lengths
 * differ slightly per row so the diagram never beats in unison — a marching
 * loop would read like a live pipeline, which this view is not. Under reduced
 * motion the line is simply drawn and nothing moves.
 */
function Connector({ index, reduced }: { index: number; reduced: boolean }) {
  return (
    <div aria-hidden className="flex h-8 items-center justify-center">
      <svg
        aria-hidden="true"
        fill="none"
        height="32"
        viewBox="0 0 14 32"
        width="14"
      >
        <path
          d="M7 0v25"
          stroke="var(--lumina-line)"
          strokeDasharray="3 4"
          strokeWidth="1.5"
        />
        {reduced ? null : (
          <motion.path
            animate={{ pathLength: [0, 1] }}
            d="M7 0v25"
            initial={{ pathLength: 0 }}
            stroke="var(--lumina-brand)"
            strokeWidth="1.5"
            transition={{
              delay: index * 0.18,
              duration: 1.3,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 0.6 + index * 0.3,
            }}
          />
        )}
        <path
          d="m2.5 21.5 4.5 5 4.5-5"
          stroke="var(--lumina-brand)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    </div>
  );
}
