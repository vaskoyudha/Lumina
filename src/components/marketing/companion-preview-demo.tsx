"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Bot,
  Briefcase,
  Check,
  ChevronRight,
  Circle,
  Download,
  GraduationCap,
  History,
  Link2,
  Loader2,
  LogIn,
  MessageSquare,
  Minus,
  MinusCircle,
  MoreVertical,
  Paperclip,
  PenLine,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  TriangleAlert,
  Users,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LuminaLogo } from "@/components/brand/lumina-logo";
import { Mascot } from "@/components/brand/mascot";
import { AGENT_REGISTRY, AGENT_SEQUENCE } from "@/components/companion/agents";
import { SCENARIOS } from "@/components/companion/scenarios";
import { PreviewComposer } from "@/components/marketing/companion-preview-chrome";
import {
  type AgentStage,
  type AgentTrace,
  STAGE_LABEL,
} from "@/lib/contracts/agent-run";
import { RISK_LABEL, type ScoreResult } from "@/lib/contracts/score";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { formattedLaporan, modusFor } from "@/lib/modus";
import { scoreWithTrace } from "@/lib/scoring/score";

const DEMO = SCENARIOS[2];
const TEXT = DEMO.text;

/*
  The empty state's mascot glow reaches past its 94px box: the halo is 112% wide
  and the blurred bloom spills a few pixels on every side. The frame around the
  empty state reserves that room so the scroll box never slices a round edge off
  the glow, and the fit effect measures the padded frame rather than the inner
  block. The bottom only needs the bloom's soft edge.
*/
const EMPTY_STATE_GLOW_X = 14;
const EMPTY_STATE_GLOW_TOP = 18;
const EMPTY_STATE_GLOW_BOTTOM = 6;

/*
 * The transcript opens on an earlier exchange, so the phishing message reads as
 * the third turn of a conversation instead of a single prompt that summons a
 * verdict. Both prelude turns are plain companion answers — no score in them —
 * because the Coordinator only scores the message the user brings in.
 */
const PRELUDE: readonly { role: "user" | "ai"; text: string }[] = [
  {
    role: "user",
    text: "Halo, aku baru pindah ke kota ini. Kalau ada pesan berisi tautan yang belum kukenal, apa yang sebaiknya kulakukan dulu?",
  },
  {
    role: "ai",
    text: "Tahan dulu sebelum membuka apa pun. Periksa alamatnya — pendek seperti bit.ly atau gabungan nama acak adalah sinyal awal. Pekan ini, kirim isinya ke sini dan aku bantu bedah polanya.",
  },
];

const PRELUDE_USER_AT = 900;
const PRELUDE_USER_MS = 26;
const PRELUDE_SEND_AT =
  PRELUDE_USER_AT + PRELUDE[0].text.length * PRELUDE_USER_MS + 260;
const PRELUDE_REPLY_AT = PRELUDE_SEND_AT + 700;
const PRELUDE_REPLY_TICK = 24;
const PRELUDE_REPLY_CHUNK = 4;
const PRELUDE_DONE_AT =
  PRELUDE_REPLY_AT +
  Math.ceil(PRELUDE[1].text.length / PRELUDE_REPLY_CHUNK) * PRELUDE_REPLY_TICK +
  700;

const TYPE_START = PRELUDE_DONE_AT;
const TYPE_MS = 17;
const SEND_AT = TYPE_START + TEXT.length * TYPE_MS + 280;
const PLAN_AT = SEND_AT + 220;
const RUN_AT = SEND_AT + 560;
const ROW_MS = 175;
const ROW_DONE_MS = 118;
const SCORING_MS = 380;
const ROWS = AGENT_SEQUENCE.length;
const SCORING_AT = RUN_AT + ROWS * ROW_MS;
const SCORE_COUNT_MS = 520;
const VERDICT_AT = SCORING_AT + SCORING_MS + 240;
const REPLY_AT = VERDICT_AT + 420;
const REPLY_TICK = 34;
const REPLY_CHUNK = 16;
const REPLY_HOLD = 5200;
const TOTAL_MS = REPLY_AT + 1200 + REPLY_HOLD;

const MS = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function fmtMs(ms: number) {
  if (ms <= 0) return "0 ms";
  return ms >= 1000 ? `${MS.format(ms / 1000)} s` : `${MS.format(ms)} ms`;
}

interface DemoData {
  result: ScoreResult;
  trace: AgentTrace;
  stages: AgentStage[];
  engineMs: number;
  scoringMs: number;
  artifacts: number;
  reply: string;
}

interface Demo {
  data: DemoData;
  preludeUser: number;
  preludeUserDone: boolean;
  preludeSent: boolean;
  preludeReply: string;
  preludeDone: boolean;
  typed: number;
  text: string;
  typing: boolean;
  sent: boolean;
  showPlan: boolean;
  revealed: number;
  doneCount: number;
  complete: boolean;
  shownScore: number;
  showVerdict: boolean;
  reply: string;
  replyDone: boolean;
  showActions: boolean;
}

function buildDemo(): DemoData {
  const { result, trace } = scoreWithTrace({ text: TEXT });

  const evidenceStarted = performance.now();
  const bundle = buildEvidenceBundle([
    { text: TEXT, at: "2026-11-10T09:00:00.000Z", result },
  ]);
  const evidenceMs = performance.now() - evidenceStarted;
  const artifacts = bundle.artifacts.length;

  const stages: AgentStage[] = [
    ...trace.stages.filter((stage) => stage.id !== "scoring"),
    {
      id: "evidence",
      label: "Evidence Agent",
      task: "Menyusun kutipan, nominal, dan kontak untuk laporan",
      status: artifacts > 0 ? "selesai" : "dilewati",
      findings: 0,
      ms: evidenceMs,
      note:
        artifacts > 0
          ? `${artifacts} kutipan tercatat untuk laporan`
          : "Tidak ada kutipan yang bisa dicatat.",
    },
  ];

  const link = result.signals.find((signal) => signal.agent === "link");
  const reply = `Skor ${result.score}/100 — ${RISK_LABEL[result.risk].toLowerCase()}. Pesan ini menekan dengan tenggat dua jam, memakai tautan pendek${link?.evidence ? ` ${link.evidence}` : ""}, lalu meminta kode OTP. Jangan buka tautannya, dan jangan kirim kode OTP ke siapa pun.`;

  return {
    result,
    trace,
    stages,
    engineMs: trace.totalMs + evidenceMs,
    scoringMs: trace.stages.find((stage) => stage.id === "scoring")?.ms ?? 0,
    artifacts,
    reply,
  };
}

function statusOf(
  stage: AgentStage,
  revealed: boolean,
  done: boolean,
): AgentStage["status"] {
  if (!revealed) return "menunggu";
  if (!done) return "berjalan";
  return stage.status === "menunggu" ? "selesai" : stage.status;
}

function statusWord(stage: AgentStage, status: AgentStage["status"]) {
  if (status === "berjalan") return "Berjalan";
  if (status === "temuan") return `${stage.findings} temuan`;
  if (status === "dilewati") return "Dilewati";
  if (status === "gagal") return "Gagal";
  return "Selesai";
}

function glyphFor(status: AgentStage["status"], findings: number) {
  if (status === "berjalan") {
    return (
      <Loader2
        aria-hidden
        strokeWidth={2.2}
        className="size-3 animate-spin text-brand-strong motion-reduce:animate-none"
      />
    );
  }
  if (status === "temuan") {
    return (
      <Circle
        aria-hidden
        strokeWidth={2.4}
        className="size-2.5 fill-current text-warn"
      />
    );
  }
  if (status === "dilewati") {
    return (
      <MinusCircle aria-hidden strokeWidth={1.9} className="size-3 text-dim" />
    );
  }
  if (status === "gagal") {
    return (
      <TriangleAlert
        aria-hidden
        strokeWidth={1.9}
        className="size-3 text-danger"
      />
    );
  }
  return findings === 0 ? (
    <Check aria-hidden strokeWidth={2.4} className="size-3 text-brand" />
  ) : (
    <Circle
      aria-hidden
      strokeWidth={2.4}
      className="size-2.5 fill-current text-warn"
    />
  );
}

function solve(t: number, data: DemoData | null): Demo {
  const preludeUser = Math.min(
    PRELUDE[0].text.length,
    Math.max(0, Math.floor((t - PRELUDE_USER_AT) / PRELUDE_USER_MS)),
  );
  const preludeUserDone = preludeUser >= PRELUDE[0].text.length;
  const preludeSent = preludeUserDone && t >= PRELUDE_SEND_AT;
  const preludeCount = preludeSent
    ? Math.max(
        0,
        Math.floor((t - PRELUDE_REPLY_AT) / PRELUDE_REPLY_TICK) *
          PRELUDE_REPLY_CHUNK,
      )
    : 0;
  const preludeReply = PRELUDE[1].text.slice(0, preludeCount);
  const preludeDone =
    preludeSent && preludeReply.length >= PRELUDE[1].text.length;

  const typed = data
    ? Math.min(TEXT.length, Math.max(0, Math.floor((t - TYPE_START) / TYPE_MS)))
    : 0;
  const text = typed === 0 ? "" : TEXT.slice(0, typed);
  const typing = typed > 0 && typed < TEXT.length;
  const sent = Boolean(data) && t >= SEND_AT;
  const showPlan = sent && t >= PLAN_AT;
  const revealed = sent
    ? Math.max(0, Math.min(ROWS, Math.floor((t - RUN_AT) / ROW_MS) + 1))
    : 0;
  const doneCount = sent
    ? Math.max(
        0,
        Math.min(ROWS, Math.floor((t - RUN_AT - ROW_DONE_MS) / ROW_MS) + 1),
      )
    : 0;
  const complete = sent && t >= SCORING_AT + SCORING_MS;
  const scoreP = data
    ? Math.min(1, Math.max(0, (t - VERDICT_AT) / SCORE_COUNT_MS))
    : 0;
  const eased = 1 - (1 - scoreP) ** 3;
  const shownScore = data ? Math.round(data.result.score * eased) : 0;
  const showVerdict = Boolean(data) && t >= VERDICT_AT;
  const replyCount = data
    ? Math.max(0, Math.floor((t - REPLY_AT) / REPLY_TICK) * REPLY_CHUNK)
    : 0;
  const reply = data ? data.reply.slice(0, replyCount) : "";
  const replyDone = data !== null && reply.length >= data.reply.length;
  const showActions = replyDone;

  return {
    data: data as DemoData,
    preludeUser,
    preludeUserDone,
    preludeSent,
    preludeReply,
    preludeDone,
    typed,
    text,
    typing,
    sent,
    showPlan,
    revealed,
    doneCount,
    complete,
    shownScore,
    showVerdict,
    reply,
    replyDone,
    showActions,
  };
}

function titleFor(text: string): string {
  const base = text.trim();
  if (!base) return "Percakapan baru";
  return base.length > 42 ? `${base.slice(0, 42).trimEnd()}…` : base;
}

export function CompanionPreviewDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [running, setRunning] = useState(false);
  const [ms, setMs] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [data, setData] = useState<DemoData | null>(null);

  useEffect(() => {
    setData(buildDemo());
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || reduced) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRunning(Boolean(entry?.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [reduced]);

  useEffect(() => {
    if (!running || reduced) return;
    let last = performance.now();
    let elapsed = 0;
    let frame = 0;

    const step = (now: number) => {
      elapsed += now - last;
      last = now;
      if (elapsed >= TOTAL_MS) {
        elapsed = 0;
        setRunKey((key) => key + 1);
        setMs(0);
      } else {
        setMs(elapsed);
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduced, running]);

  const t = reduced ? TOTAL_MS : ms;
  const demo = solve(t, data);
  const sessionTitle = demo.preludeUserDone
    ? titleFor(demo.preludeDone ? TEXT : PRELUDE[0].text)
    : "Percakapan baru";
  const risk = demo.showVerdict ? demo.data.result.risk : null;
  const sidebarTitle = demo.preludeDone
    ? titleFor(TEXT)
    : titleFor(PRELUDE[0].text);

  return (
    <div ref={hostRef} className="h-full w-full">
      <AppWindow
        key={runKey}
        demo={demo}
        sessionTitle={sessionTitle}
        sidebarTitle={sidebarTitle}
        risk={risk}
      />
    </div>
  );
}

function AppWindow({
  demo,
  sessionTitle,
  sidebarTitle,
  risk,
}: {
  demo: Demo;
  sessionTitle: string;
  sidebarTitle: string;
  risk: ScoreResult["risk"] | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  // The empty state is the first beat only: the opening question is typed into
  // its composer, and once it is sent the transcript stays up while the
  // composer moves to its footer slot.
  const showTranscript = demo.preludeSent || demo.showPlan;

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run the scroll on every visible state change; the body reads only refs and the flags below.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const behavior: ScrollBehavior = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "auto"
      : "smooth";
    const verdict = verdictRef.current;
    if (demo.showVerdict && verdict && !demo.replyDone) {
      // offsetTop is relative to the nearest positioned ancestor, which is not
      // the scroll box, so measure from the visible rects instead.
      const top =
        verdict.getBoundingClientRect().top -
        node.getBoundingClientRect().top +
        node.scrollTop -
        8;
      node.scrollTo({ top: Math.max(0, top), behavior });
      return;
    }
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, [demo.showVerdict, demo.replyDone, demo.revealed, demo.preludeReply]);

  /*
    The empty state is taller than the transcript box on short windows (the
    mascot, the composer and two cards), so the scroll box clipped it and the
    beat started mid-page with the mascot's glow sliced off by the top edge.
    The hero wants the empty state to fit, not to scroll: measure it, shrink it
    only when it overflows, and let it center once it fits.

    `zoom` rather than `scale` because it shrinks the used layout too: a
    transform would leave the overflow (and the bottom-pinned scroll position)
    in place, so the clipped top would survive. Presentation-only; the
    transcript mode is untouched.

    The mascot's halo and bloom deliberately sit outside the 94px mascot box, so
    the measured element is an inner spacer padded by EMPTY_STATE_GLOW on the
    sides and top and a smaller amount at the bottom. That reserves room for the
    glow inside the same frame that the rest of the empty state centers in, so
    shrinking for height never cuts a round edge off the halo.
  */
  useEffect(() => {
    const node = scrollRef.current;
    const spacer = node?.firstElementChild as HTMLElement | null | undefined;
    if (!node || !spacer) return;
    const fit = () => {
      spacer.style.zoom = "";
      node.style.maskImage = "";
      if (showTranscript || spacer.dataset.fit !== "empty") return;
      const cs = getComputedStyle(node);
      const client = node.clientHeight;
      const available =
        client -
        Number.parseFloat(cs.paddingTop) -
        Number.parseFloat(cs.paddingBottom);
      const height = spacer.offsetHeight;
      if (available <= 0 || !height) return;
      const scale = Math.min(1, Math.max(0.74, available / height));
      if (scale < 1) {
        spacer.style.zoom = String(scale);
        /*
          The transcript effect keeps this box pinned to the bottom; with the
          content still taller than the box, that would show its lower half.
          When the empty state cannot fit, its top (the mascot) has to stay in
          view.
        */
        node.scrollTop = 0;
      }
      if (scale >= 1 || height * scale <= available) return;
      /*
        A phone's 4:3 window cannot hold even the 0.74 pass (header, mascot
        and composer only). Keep the top edge, which is the glowing mascot,
        and fade the cut at the composer into the window instead of slicing it.
      */
      node.style.maskImage = `linear-gradient(to bottom, #000 0, #000 ${client - 32}px, transparent ${client}px)`;
    };
    fit();
    /* Re-measure after the first frame, once the entrance animation settles. */
    const frame = requestAnimationFrame(fit);
    const resize = new ResizeObserver(fit);
    resize.observe(node);
    resize.observe(spacer);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [showTranscript]);

  return (
    <div className="lc-preview relative flex h-full min-h-0 w-full select-none overflow-hidden bg-bg text-txt">
      <DemoSidebar
        liveTitle={sidebarTitle}
        live={demo.preludeSent}
        risk={risk}
        working={demo.sent && !demo.complete}
      />

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-4 pt-4 pb-2">
          <div className="flex h-10 min-w-0 items-center gap-1.5 rounded-full border border-brand-line bg-panel pr-2 pl-1.5 shadow-rest">
            <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-soft">
              <Image
                alt=""
                src="/brand/companion-mascot.png"
                width={128}
                height={123}
                className="size-6 object-contain"
              />
            </span>
            <span className="truncate font-medium text-[12px] text-txt">
              {sessionTitle}
            </span>
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${
                risk === "tinggi"
                  ? "bg-danger"
                  : risk === "mencurigakan"
                    ? "bg-warn"
                    : risk
                      ? "bg-brand"
                      : "bg-dim/50"
              }`}
            />
            <ChevronDownMark />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="hidden size-10 place-items-center rounded-full border border-line bg-panel text-ink-soft shadow-sm min-[1180px]:grid">
              <Link2 aria-hidden strokeWidth={1.7} className="size-4" />
            </span>
            <span className="hidden h-10 items-center gap-1.5 rounded-full border border-line bg-panel px-4 text-xs font-medium text-txt shadow-sm min-[1180px]:flex">
              <Download aria-hidden strokeWidth={1.7} className="size-3.5" />
              Ekspor percakapan
            </span>
            <span className="flex h-11 items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 text-[11.5px] text-brand-ink min-[1180px]:hidden">
              <Workflow aria-hidden strokeWidth={1.6} className="size-3.5" />
              <span className="hidden sm:inline">Agen</span>
            </span>
            <span className="hidden h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-panel shadow-[0_10px_22px_-14px_color-mix(in_oklab,var(--lumina-brand)_85%,transparent)] min-[1180px]:inline-flex">
              <Users aria-hidden strokeWidth={1.9} className="size-3.5" />
              Komunitas
            </span>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6"
          style={{ overflowAnchor: "none" }}
        >
          {showTranscript ? (
            <Transcript demo={demo} verdictRef={verdictRef} />
          ) : (
            <EmptyState demo={demo} composing={!showTranscript} />
          )}
        </div>

        {showTranscript ? (
          <div className="shrink-0 px-4 pt-1 pb-3 sm:px-6">
            <div className="mx-auto w-full max-w-[640px]">
              <FooterComposer
                value={demo.text}
                typing={demo.typing}
                sendable={demo.typed > 0}
                busy={!demo.complete || !demo.replyDone || demo.sent}
              />
            </div>
          </div>
        ) : null}
      </section>

      <EvidencePanel demo={demo} />
    </div>
  );
}

function ChevronDownMark() {
  return (
    <span
      aria-hidden
      className="grid size-3 shrink-0 place-items-center text-ink-faint"
    >
      <svg
        aria-hidden
        role="presentation"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3"
      >
        <path d="M3 4.5 6 7.5 9 4.5" />
      </svg>
    </span>
  );
}

const NAV_ITEMS = [
  { label: "AI Companion", icon: MessageSquare, active: true },
  { label: "Agen", icon: Bot, active: false },
  { label: "Belajar", icon: GraduationCap, active: false },
  { label: "Simulasi", icon: Swords, active: false },
  { label: "Komunitas", icon: UsersRound, active: false },
] as const;

function DemoSidebar({
  liveTitle,
  live,
  risk,
  working,
}: {
  liveTitle: string;
  live: boolean;
  risk: ScoreResult["risk"] | null;
  working: boolean;
}) {
  return (
    <aside className="hidden w-[248px] shrink-0 select-none flex-col justify-between overflow-hidden px-3 pt-2.5 pb-2 min-[960px]:flex">
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-white/80 bg-panel/95 px-3 pt-4 pb-2.5 shadow-panel backdrop-blur-md">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3.5 flex items-center gap-1.5 px-1.5">
              <span className="min-w-0 flex-1">
                <LuminaLogo className="h-[36px] w-auto" />
              </span>
            </div>

            <span className="flex h-auto w-full items-center justify-between gap-2 rounded-full border-0 bg-gradient-to-r from-brand-cta-from to-brand-cta-to py-2 pr-1.5 pl-3.5 font-semibold text-[13px] text-bg shadow-[inset_0_1px_0_0_var(--color-brand-edge),0_4px_0_0_var(--color-brand-ink)]">
              <span>Percakapan baru</span>
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg text-brand-ink shadow-sm">
                <Plus aria-hidden strokeWidth={2.8} className="size-3.5" />
              </span>
            </span>

            <div className="my-2.5 border-t border-txt/[0.06]" />

            <div className="-ml-3 min-h-0 flex-1 space-y-2.5 overflow-hidden pr-0.5 pl-3">
              <span className="relative flex h-[38px] items-center rounded-[10px] border border-hairline bg-panel pr-2 pl-2.5 shadow-rest">
                <Search
                  aria-hidden
                  strokeWidth={1.7}
                  className="pointer-events-none size-3.5 shrink-0 text-ink-mute"
                />
                <span className="min-w-0 flex-1 px-2 text-[13px] text-ink-faint">
                  Cari percakapan
                </span>
                <span className="grid h-[20px] min-w-[20px] shrink-0 place-items-center rounded-[5px] border border-hairline bg-panel-2 px-1 font-sans text-[10.5px] text-ink-mute">
                  ⌘K
                </span>
              </span>

              <div>
                <p className="mb-1 px-1.5 font-semibold text-[10.5px] text-ink-mute uppercase tracking-[0.12em]">
                  Ruang kerja
                </p>
                <div className="flex flex-col gap-0.5">
                  {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
                    <span
                      key={label}
                      className={`relative flex min-w-0 items-center gap-2.5 rounded-xl px-3 py-2 ${
                        active
                          ? "nav-active-tint font-bold text-nav-active-ink"
                          : "font-semibold text-ink-soft"
                      }`}
                    >
                      {active ? (
                        <span
                          aria-hidden
                          className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r-full bg-nav-active-icon"
                        />
                      ) : null}
                      <Icon
                        aria-hidden
                        strokeWidth={1.8}
                        fill={active ? "currentColor" : "none"}
                        className={`size-4 shrink-0 ${active ? "text-nav-active-icon" : ""}`}
                      />
                      <span className="truncate text-[12.5px]">{label}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="flex w-full items-center gap-1.5 rounded-[7px] px-1.5 py-1.5 font-semibold text-[10.5px] text-ink-mute uppercase tracking-[0.12em]">
                  <ChevronRight
                    aria-hidden
                    strokeWidth={2}
                    className="size-3 shrink-0 rotate-90"
                  />
                  <span className="flex-1 truncate">Riwayat</span>
                  <span className="shrink-0 rounded-full bg-panel-2 px-1.5 py-0.5 tabular text-[10px] text-ink-mute normal-case tracking-normal">
                    {live ? "1" : "0"}
                  </span>
                </span>
                <div className="pt-1.5">
                  {live ? (
                    <ul className="space-y-0.5">
                      <li>
                        <SessionRow
                          title={liveTitle}
                          meta={
                            working
                              ? "Agen memeriksa…"
                              : risk
                                ? "Hasil pemeriksaan"
                                : "Baru saja"
                          }
                          risk={risk}
                          live
                          working={working}
                        />
                      </li>
                    </ul>
                  ) : (
                    <p className="px-1.5 py-2 text-[12px] text-ink-faint">
                      Belum ada percakapan.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-2.5 flex min-h-[150px] shrink-0 select-none flex-col justify-end overflow-hidden rounded-[20px] p-3.5 shadow-rest">
            <Image
              src="/brand/promo-dashboard.png"
              alt=""
              fill
              sizes="204px"
              className="pointer-events-none object-cover"
            />
            <div className="relative z-10 max-w-[115px] pt-7">
              <p className="font-bold text-[12px] text-txt leading-[1.25]">
                Saling jaga, bersama.
              </p>
              <p className="mt-1 mb-2.5 text-[9.5px] text-dim leading-[1.35]">
                Bagikan pola baru dan belajar dari pengalaman anggota.
              </p>
              <span className="inline-flex h-auto items-center justify-center gap-1.5 rounded-full border-0 bg-gradient-to-r from-brand-cta-from to-brand-cta-to px-3 py-1.5 font-semibold text-[10.5px] text-bg shadow-slab">
                <span>Buka komunitas</span>
                <ChevronRight
                  aria-hidden
                  strokeWidth={2.4}
                  className="size-3"
                />
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 shrink-0 rounded-[20px] border border-white/80 bg-panel/95 px-3.5 py-2.5 shadow-panel backdrop-blur-md">
          <div className="grid grid-cols-2 gap-1.5">
            <span className="flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] border border-hairline bg-panel font-medium text-[12.5px] text-ink-soft">
              <LogIn aria-hidden strokeWidth={1.8} className="size-4" />
              Masuk
            </span>
            <span className="group/daftar relative inline-flex shrink-0 items-center overflow-hidden rounded-xl bg-charcoal-ring p-[2px] font-semibold text-charcoal-50 shadow-md">
              <span className="flex h-full w-full items-center justify-center gap-1 bg-charcoal-700 px-2 text-[12px] leading-[26px] [background-image:radial-gradient(at_95%_89%,var(--color-charcoal-950)_0px,transparent_50%),radial-gradient(at_0%_100%,var(--color-charcoal-900)_0px,transparent_50%),radial-gradient(at_0%_0%,var(--color-charcoal-700)_0px,transparent_50%)] [text-shadow:0_0_20px_var(--color-charcoal-100)]">
                Daftar
                <ArrowDown
                  aria-hidden
                  strokeWidth={2}
                  className="size-2.5 shrink-0 text-charcoal-50"
                />
              </span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function SessionRow({
  title,
  meta,
  risk = null,
  live = false,
  working = false,
}: {
  title: string;
  meta?: string;
  risk?: ScoreResult["risk"] | null;
  live?: boolean;
  working?: boolean;
}) {
  return (
    <span
      className={`flex min-h-9 w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left ${
        live || working ? "bg-panel shadow-rest" : ""
      }`}
    >
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[12.5px] leading-5 ${
            live ? "font-semibold text-ink" : "font-medium text-ink-soft"
          }`}
        >
          {title}
        </span>
        {meta ? (
          <span className="block truncate text-[9px] text-ink-faint">
            {meta}
          </span>
        ) : null}
      </span>
      {working ? (
        <Loader2
          aria-hidden
          strokeWidth={2.2}
          className="size-3 shrink-0 animate-spin text-brand motion-reduce:animate-none"
        />
      ) : risk ? (
        <ShieldAlert
          aria-hidden
          strokeWidth={1.8}
          className={`size-3.5 shrink-0 ${
            risk === "tinggi" ? "text-danger" : "text-warn"
          }`}
        />
      ) : null}
    </span>
  );
}

const QUICK_FEATURES = [
  {
    label: "Periksa pesan mencurigakan",
    icon: MessageSquare,
    box: "bg-agent-qris-soft",
    ink: "text-danger",
    filled: true,
  },
  {
    label: "Cek tautan & domain palsu",
    icon: Link2,
    box: "bg-agent-qris-soft",
    ink: "text-danger",
    filled: false,
  },
  {
    label: "Periksa tawaran kerja palsu",
    icon: Briefcase,
    box: "bg-brand-soft",
    ink: "text-brand",
    filled: true,
  },
  {
    label: "Cek QRIS & bukti bayar",
    icon: QrCodeIcon,
    box: "bg-brand-soft",
    ink: "text-brand",
    filled: false,
  },
  {
    label: "Laporkan ke komunitas",
    icon: FlagIcon,
    box: "bg-brand-soft",
    ink: "text-brand",
    filled: true,
  },
] as const;

const AGENT_HISTORY = [
  { id: "job", time: "2 menit yang lalu", unreadDot: true },
  { id: "marketplace", time: "1 jam yang lalu" },
  { id: "identity", time: "3 jam yang lalu" },
  { id: "conversation", time: "1 hari yang lalu" },
] as const;

const AGENT_TONE: Record<string, string> = {
  job: "bg-brand-soft",
  marketplace: "bg-agent-marketplace-soft",
  identity: "bg-agent-evidence-soft",
  conversation: "bg-agent-message-soft",
};

function QrCodeIcon({
  className,
  strokeWidth,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      aria-hidden
      role="presentation"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9.5 9.5h2v2h-2zM12.5 12.5h2v2h-2zM9.5 14.5h1M14.5 9.5h-1" />
    </svg>
  );
}

function FlagIcon({
  className,
  strokeWidth,
  fill = "none",
}: {
  className?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  return (
    <svg
      aria-hidden
      role="presentation"
      viewBox="0 0 16 16"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 14V2.5" />
      <path d="M3 3h8.2l-.8 2.6.8 2.6H3z" />
    </svg>
  );
}

function EmptyState({ demo, composing }: { demo: Demo; composing: boolean }) {
  const activeId = demo.preludeUser > 0 ? DEMO.id : null;
  // The opening question is composed here, then the send swaps to the transcript.
  const value = composing ? PRELUDE[0].text.slice(0, demo.preludeUser) : "";

  return (
    <div
      data-fit="empty"
      style={{
        paddingTop: EMPTY_STATE_GLOW_TOP,
        paddingRight: EMPTY_STATE_GLOW_X,
        paddingBottom: EMPTY_STATE_GLOW_BOTTOM,
        paddingLeft: EMPTY_STATE_GLOW_X,
      }}
    >
      <div className="mx-auto flex w-full max-w-[840px] flex-col items-center py-2">
        <div className="mb-2 flex items-center justify-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-500">
          <Mascot
            className="pointer-events-none h-[94px] w-[129px] select-none"
            effect
          />
        </div>

        <h3 className="text-center font-semibold text-[24px] leading-[1.2] tracking-[-0.025em] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 sm:text-[26px]">
          <span className="bg-[linear-gradient(90deg,var(--lumina-brand-glow)_0%,var(--lumina-brand-ink-soft)_50%,var(--lumina-brand-glow)_100%)] bg-clip-text text-transparent">
            Periksa sebelum
          </span>
        </h3>
        <p className="mt-0.5 text-center font-semibold text-[24px] leading-[1.22] tracking-[-0.025em] text-ink motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:delay-75 motion-safe:duration-500 sm:text-[26px]">
          kamu percaya.
        </p>

        {composing ? (
          <div className="mt-5 w-full max-w-[520px] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:delay-150 motion-safe:duration-500">
            <PreviewComposer
              value={value}
              placeholder="Tempel pesan, lampirkan tangkapan layar, atau tulis pertanyaanmu…"
              caret={demo.preludeUser > 0 && !demo.preludeUserDone}
              sendable={value.length > 0}
              busy={demo.preludeUserDone && !demo.preludeSent}
            />
          </div>
        ) : null}

        <div className="mt-4 grid w-full grid-cols-1 gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:delay-200 motion-safe:duration-500 sm:grid-cols-2">
          <div className="rounded-[24px] border border-edge-soft bg-panel p-4 shadow-rest">
            <div className="mb-3.5 flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                <div className="flex size-6 items-center justify-center rounded-full bg-brand text-panel">
                  <ShieldCheck
                    aria-hidden
                    strokeWidth={2.3}
                    className="size-3.5"
                  />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-[13.5px] text-ink leading-tight">
                  Mau periksa apa, Tamu?
                </h4>
                <p className="mt-0.5 text-[11px] text-ink-mute">
                  Akses cepat ke pemeriksaan penipuan
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {QUICK_FEATURES.map((feat) => {
                const Icon = feat.icon;
                const active = activeId === DEMO.id && feat.filled;
                return (
                  <span
                    key={feat.label}
                    className={`group flex h-[42px] w-full items-center justify-between gap-2.5 rounded-2xl border px-2.5 text-left ${
                      active
                        ? "border-brand-edge-soft bg-brand-tint"
                        : "border-transparent bg-panel-2"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-xl ${feat.box}`}
                      >
                        <Icon
                          aria-hidden
                          strokeWidth={1.7}
                          className={`size-3.5 ${feat.ink}`}
                        />
                      </span>
                      <span className="truncate font-semibold text-[12px] text-txt">
                        {feat.label}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-ink-mute"
                    />
                  </span>
                );
              })}
            </div>
          </div>

          <div className="rounded-[24px] border border-edge-soft bg-panel p-4 shadow-rest">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                  <div className="flex size-6 items-center justify-center rounded-full bg-brand text-panel">
                    <History
                      aria-hidden
                      strokeWidth={2.3}
                      className="size-3.5"
                    />
                  </div>
                </div>
                <h4 className="font-bold text-[14px] text-ink">Riwayat Agen</h4>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-strong">
                <span>Lihat semua</span>
                <ArrowRight aria-hidden className="size-3" />
              </span>
            </div>

            <div className="space-y-3">
              {AGENT_HISTORY.map((item) => {
                const agent = AGENT_REGISTRY[item.id];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl p-1.5"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl ${AGENT_TONE[item.id]}`}
                      >
                        <Image
                          src={agent.portrait ?? "/brand/agents/lumina.jpg"}
                          alt=""
                          width={40}
                          height={40}
                          className="size-full object-cover"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate font-bold text-[12.5px] text-ink">
                            {agent.displayName}
                          </span>
                          {"unreadDot" in item && item.unreadDot ? (
                            <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-ink-faint">
                          {item.time}
                        </span>
                      </span>
                    </span>
                    <MoreVertical
                      aria-hidden
                      className="size-3.5 shrink-0 text-ink-mute"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Transcript({
  demo,
  verdictRef,
}: {
  demo: Demo;
  verdictRef: React.RefObject<HTMLDivElement | null>;
}) {
  const data = demo.data;
  const findings = data.result.signals.filter((signal) => signal.weight > 0);
  const preludeReplyTyping =
    demo.preludeSent && !demo.preludeDone && demo.preludeReply.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[9.5px] uppercase tracking-[0.12em] text-ink-faint">
          Hari ini
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <p className="max-w-[85%] rounded-[14px] border border-brand bg-panel px-4 py-2.5 font-normal text-[12px] text-txt leading-relaxed motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
          {demo.preludeUserDone
            ? PRELUDE[0].text
            : PRELUDE[0].text.slice(0, demo.preludeUser)}
          {demo.preludeUser > 0 && !demo.preludeUserDone ? (
            <span
              aria-hidden
              className="ms-0.5 inline-block h-[12px] w-[1.5px] translate-y-0.5 animate-pulse bg-brand align-baseline motion-reduce:hidden"
            />
          ) : null}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {demo.preludeSent ? (
          demo.preludeReply.length > 0 ? (
            <p className="max-w-[92%] text-[12px] text-txt leading-relaxed motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
              {demo.preludeReply}
              {preludeReplyTyping ? (
                <span
                  aria-hidden
                  className="ms-0.5 inline-block h-[12px] w-[1.5px] translate-y-0.5 animate-pulse bg-dim align-baseline motion-reduce:hidden"
                />
              ) : null}
            </p>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-dim">
              <Loader2
                aria-hidden
                strokeWidth={2}
                className="size-3 animate-spin motion-reduce:animate-none"
              />
              Menyusun jawaban
            </span>
          )
        ) : null}
      </div>

      {demo.preludeDone ? (
        <div className="flex flex-col items-end gap-1.5">
          <p className="max-w-[85%] rounded-[14px] border border-brand bg-panel px-4 py-2.5 font-normal text-[12px] text-txt leading-relaxed motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
            {TEXT}
          </p>
        </div>
      ) : null}

      {demo.showPlan ? <PlanCard demo={demo} /> : null}

      {demo.revealed > 0 ? (
        <ul className="flex flex-col gap-1">
          {data.stages.slice(0, demo.revealed).map((stage, index) => (
            <AgentRow
              key={stage.id}
              stage={stage}
              index={index}
              status={statusOf(
                stage,
                demo.revealed > index,
                demo.doneCount > index,
              )}
            />
          ))}
        </ul>
      ) : null}

      {demo.showVerdict ? (
        <>
          <div ref={verdictRef}>
            <VerdictCard
              demo={demo}
              findings={findings}
              inspected={inspectedCount(data.stages)}
            />
          </div>

          <div className="rounded-[13px] border border-line bg-panel-2/60 px-3.5 py-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-strong">
                <PenLine aria-hidden strokeWidth={1.9} className="size-3" />
              </span>
              <p className="min-w-0 flex-1 text-[12px] text-txt leading-relaxed">
                {demo.reply ? (
                  <span>{demo.reply}</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-dim">
                    <Loader2
                      aria-hidden
                      strokeWidth={2}
                      className="size-3 animate-spin motion-reduce:animate-none"
                    />
                    Menyusun jawaban dari temuan…
                  </span>
                )}
                {demo.reply && !demo.replyDone ? (
                  <span
                    aria-hidden
                    className="ms-0.5 inline-block h-[13px] w-[1.5px] translate-y-0.5 animate-pulse bg-dim align-baseline motion-reduce:hidden"
                  />
                ) : null}
              </p>
            </div>

            <div
              className={`mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-line/70 pt-2 transition-opacity duration-300 ${demo.showActions ? "opacity-100" : "opacity-0"}`}
            >
              <span className="flex items-center gap-1 text-[10px] text-dim">
                <Sparkles
                  aria-hidden
                  strokeWidth={1.8}
                  className="size-3 text-brand-ink-soft"
                />
                Dijawab dari {findings.length} temuan, bukan dinilai ulang
              </span>
              <span className="flex gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-[7px] border border-brand/40 bg-brand/10 px-2 py-0.5 font-medium text-[10px] text-brand-strong">
                  Pelajari pola ini
                  <ArrowRight
                    aria-hidden
                    strokeWidth={2}
                    className="size-2.5"
                  />
                </span>
                <span className="inline-flex items-center rounded-[7px] border border-line px-2 py-0.5 font-medium text-[10px] text-dim">
                  Buka modul {data.result.relatedModule ?? 7}
                </span>
              </span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function PlanCard({ demo }: { demo: Demo }) {
  const data = demo.data;
  const running = demo.revealed > 0 && !demo.complete;
  const steps = [
    { label: "Jalankan agen", done: demo.revealed >= ROWS },
    { label: "Kumpulkan temuan", done: demo.complete },
    { label: "Hitung skor", done: demo.showVerdict },
  ];

  return (
    <div className="rounded-[13px] border-2 border-brand/40 bg-panel px-3 py-2.5 shadow-rest motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300">
      <div className="flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft">
          <span className="grid size-4.5 place-items-center rounded-full bg-brand text-white">
            <Workflow aria-hidden strokeWidth={2.1} className="size-2.5" />
          </span>
        </span>
        <span className="flex min-w-0 flex-1 items-baseline gap-1.5">
          <span className="font-bold text-[12px] text-txt leading-none">
            Orkestrator
          </span>
          <span className="text-[10px] text-dim">
            {demo.complete
              ? `8 agen · ${fmtMs(data.engineMs)}`
              : running
                ? `${demo.doneCount}/8 agen selesai`
                : "8 agen siap"}
          </span>
        </span>
        {running ? (
          <span className="flex items-center gap-1 text-[9.5px] text-brand-ink">
            <Loader2
              aria-hidden
              strokeWidth={2.2}
              className="size-3 animate-spin motion-reduce:animate-none"
            />
            berjalan
          </span>
        ) : (
          <span className="rounded-[5px] border border-brand-line bg-panel px-1.5 py-0.5 text-[9px] text-dim">
            deterministik
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <Chip>{countStatus(demo, "selesai")} selesai</Chip>
        {countStatus(demo, "temuan") > 0 ? (
          <Chip tone="warn">{countStatus(demo, "temuan")} dengan temuan</Chip>
        ) : null}
        <Chip>{countStatus(demo, "dilewati")} dilewati</Chip>
        <Chip>
          {demo.data.result.signals.filter((s) => s.weight > 0).length} temuan
        </Chip>
        {demo.complete ? <Chip>{fmtMs(data.engineMs)}</Chip> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[9.5px] text-dim">
        {steps.map((step, index) => (
          <span key={step.label} className="flex items-center gap-1">
            <span
              className={`grid size-3.5 place-items-center rounded-full border text-[8px] leading-none ${
                step.done
                  ? "border-brand-edge bg-brand-soft text-brand-ink"
                  : "border-line text-dim"
              }`}
            >
              {step.done ? "✓" : index + 1}
            </span>
            <span>{step.label}</span>
            {index < steps.length - 1 ? (
              <span aria-hidden className="ms-1 text-dim/60">
                →
              </span>
            ) : null}
          </span>
        ))}
        {demo.complete ? (
          <span className="tabular ms-1 text-[9px] text-txt/60">
            {fmtMs(demo.data.scoringMs)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function AgentRow({
  stage,
  index,
  status,
}: {
  stage: AgentStage;
  index: number;
  status: AgentStage["status"];
}) {
  const profile = AGENT_REGISTRY[stage.id as keyof typeof AGENT_REGISTRY];
  const running = status === "berjalan";
  const note = stage.note;
  const secondary = note ?? (running ? profile?.flavor : stage.label);

  return (
    <li
      className={`motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-0.5 motion-safe:duration-200 ${
        running ? "rounded-[9px] bg-brand-tint" : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 border-line/70 border-b px-1.5 py-[5px] ${
          index === AGENT_SEQUENCE.length - 1 ? "border-b-0" : ""
        }`}
      >
        <span
          className={`relative size-[22px] shrink-0 overflow-hidden rounded-full border border-line transition-opacity duration-300 ${
            status === "menunggu" ? "opacity-40" : "opacity-100"
          }`}
        >
          {profile?.portrait ? (
            <Image
              src={profile.portrait}
              alt=""
              width={22}
              height={22}
              className="size-full object-cover"
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate font-medium text-[11px] text-txt leading-[1.35]">
              {profile?.displayName ?? stage.label}
            </span>
            <span className="hidden shrink-0 font-mono text-[8.5px] uppercase tracking-[0.1em] text-dim sm:inline">
              {stage.label}
            </span>
          </span>
          <span
            className={`block truncate text-[9.5px] leading-[1.35] ${
              note ? "text-dim" : "text-ink-faint"
            } max-w-[420px]`}
          >
            {secondary}
          </span>
        </span>
        <span
          className={`flex shrink-0 items-center gap-1 text-[9.5px] ${
            status === "temuan"
              ? "text-warn"
              : status === "berjalan"
                ? "text-brand-ink"
                : "text-txt/70"
          }`}
        >
          {glyphFor(status, stage.findings)}
          <span>{statusWord(stage, status)}</span>
        </span>
        <span className="tabular hidden w-11 shrink-0 text-right text-[9px] text-txt/60 min-[560px]:block">
          {status === "berjalan"
            ? "…"
            : status === "menunggu"
              ? "—"
              : fmtMs(stage.ms)}
        </span>
      </div>
    </li>
  );
}

function VerdictCard({
  demo,
  findings,
  inspected,
}: {
  demo: Demo;
  findings: ScoreResult["signals"];
  inspected: number;
}) {
  const data = demo.data;
  const result = data.result;
  const modus = modusFor(result.relatedModule);
  const danger = result.risk === "tinggi";
  const pro = Math.max(0, Math.min(1, (demo.shownScore || 0) / 100));

  return (
    <div
      className={`flex flex-col gap-3 rounded-[13px] border bg-panel p-3 shadow-rest motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 ${
        danger ? "border-danger/40" : "border-line"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={`tabular font-semibold text-[30px] leading-none ${
                danger ? "text-danger" : "text-warn"
              }`}
            >
              {demo.shownScore}
              <span className="ml-0.5 font-normal text-[12px] text-dim">
                /100
              </span>
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 font-medium text-[9.5px] uppercase tracking-[0.08em] ${
                danger
                  ? "border-danger/30 text-danger"
                  : "border-warn/30 text-warn"
              }`}
            >
              {RISK_LABEL[result.risk]}
            </span>
          </div>
          {modus ? (
            <p className="mt-1 font-medium text-[11.5px] text-txt leading-snug">
              {modus.nama}
            </p>
          ) : null}
          <p className="mt-0.5 text-[10px] text-dim">
            {findings.length} temuan dari{" "}
            {new Set(findings.map((s) => s.agent)).size} agen
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 rounded-[6px] border border-line px-1.5 py-0.5 text-[9px] text-dim">
            <ShieldAlert aria-hidden strokeWidth={1.8} className="size-3" />
            Deterministik
          </span>
          <span className="text-[9px] text-ink-faint">
            Skor dihitung di perangkat
          </span>
        </div>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-panel-2"
        role="presentation"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-out ${
            danger ? "bg-danger" : "bg-warn"
          }`}
          style={{ width: `${Math.round(pro * 100)}%` }}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
        <section className="min-w-0">
          <h4 className="font-medium text-[9.5px] uppercase tracking-[0.12em] text-dim">
            Kenapa
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {findings.map((signal) => (
              <li
                key={`${signal.label}-${signal.evidence}`}
                className="rounded-[7px] border border-line bg-panel-2/70 px-2 py-1.5"
              >
                <p className="text-[10.5px] text-txt leading-snug">
                  {signal.label}
                </p>
                {signal.evidence ? (
                  <p className="mt-0.5 truncate text-[9.5px] text-dim">
                    Kutipan:{" "}
                    <span className="text-txt/80">“{signal.evidence}”</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0">
          <h4 className="font-medium text-[9.5px] uppercase tracking-[0.12em] text-dim">
            Yang perlu dilakukan
          </h4>
          <ol className="mt-1.5 flex flex-col gap-1">
            {result.advice.map((step, index) => (
              <li
                key={step}
                className="flex gap-1.5 text-[10.5px] leading-snug"
              >
                <span className="tabular shrink-0 text-dim">{index + 1}.</span>
                <span className="text-txt">{step}</span>
              </li>
            ))}
          </ol>
          <p className="tabular mt-2 text-[9.5px] text-dim">
            {inspected} dari 8 agen benar-benar memeriksa pesan ini
          </p>
        </section>
      </div>
    </div>
  );
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <span
      className={`rounded-[5px] border border-brand-line bg-panel px-1.5 py-0.5 text-[9px] leading-none text-txt/70 ${
        tone === "warn" ? "border-warn/30 text-warn" : ""
      }`}
    >
      {children}
    </span>
  );
}

const BRANCH_KIND: Record<string, string> = {
  message: "Urgensi",
  link: "Tautan",
  identity: "Identitas",
  conversation: "Eskalasi",
  job: "Lowongan",
  marketplace: "Jual-beli",
  qris: "QRIS",
  evidence: "Bukti",
};

const BRANCH_CONDITION: Record<string, string> = {
  message: "Ada urgensi, otoritas, atau iming-iming",
  link: "Ada tautan yang perlu dibuka",
  identity: "Ada klaim institusi atau nomor asing",
  conversation: "Ada pesan sebelumnya di percakapan",
  job: "Ada tawaran kerja atau tugas berbayar",
  marketplace: "Ada percakapan jual-beli",
  qris: "Ada payload QRIS",
  evidence: "Ada temuan yang bisa dikutip",
};

const branchCode = (index: number) => `Q${5 + index}`;
const synthesisCode = (count: number) => `Q${5 + count}`;

/**
 * The evidence column, rebuilt on the live `SignalPanel`: same 376px column,
 * same inner padding, same `rounded-[22px]` card. Before a verdict it is the
 * empty routing canvas ("Masukan pesan · menunggu"); once the run lands it
 * becomes the finding ledger, so the hero never shows a graph that pretends
 * work has already happened.
 */
function EvidencePanel({ demo }: { demo: Demo }) {
  const data = demo.data;
  const result = data?.result;
  const modus = modusFor(result?.relatedModule ?? null);
  const findings = result?.signals.filter((signal) => signal.weight > 0) ?? [];
  const running = demo.sent && !demo.complete;
  const sequence = AGENT_SEQUENCE;

  return (
    <aside className="hidden w-[376px] shrink-0 bg-transparent min-[1120px]:block xl:w-[396px]">
      <div className="h-full py-4 pr-4 pl-2.5 xl:py-5 xl:pr-5 xl:pl-3">
        <div className="flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-[22px] bg-panel shadow-lift ring-1 ring-edge/50">
          <div className="flex shrink-0 items-start justify-between gap-2 border-edge border-b bg-panel/85 px-3.5 pt-3 pb-2.5">
            <div className="min-w-0">
              <h2
                id="preview-panel-title"
                className="flex items-center gap-1.5 font-semibold text-[12px] text-txt"
              >
                <span
                  aria-hidden
                  className={`size-1.5 shrink-0 rounded-full ${
                    result
                      ? result.risk === "tinggi"
                        ? "bg-danger"
                        : result.risk === "mencurigakan"
                          ? "bg-warn"
                          : "bg-brand"
                      : "bg-dim/50"
                  }`}
                />
                Panel bukti
              </h2>
              <p className="mt-0.5 truncate text-[10.5px] text-dim">
                {running
                  ? "Pemeriksaan sedang berjalan"
                  : demo.showVerdict && result
                    ? "Pemeriksaan terakhir selesai"
                    : "Menunggu pesan untuk diperiksa"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="rounded-[5px] border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
                {demo.showVerdict && result
                  ? `${findings.length} temuan`
                  : `${sequence.length} agen`}
              </span>
              <span className="grid size-8 place-items-center rounded-[9px] border border-hairline-strong bg-panel text-ink-mute shadow-sm">
                <X aria-hidden strokeWidth={1.8} className="size-4" />
              </span>
            </div>
          </div>

          {!demo.showVerdict ? (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3.5 pt-3 pb-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mb-1 flex flex-col items-center">
                  <div className="rounded-full border border-edge bg-panel/90 px-2 py-0.5 font-mono text-[9.5px] text-ink-mute uppercase tracking-wider">
                    {running
                      ? "Membuka pesan · berjalan"
                      : "Masukan pesan · menunggu"}
                  </div>
                  <div className="h-3 border-brand-edge border-l" />
                  <div className="-mb-1.5 z-10 size-2.5 rounded-full border-2 border-dot bg-panel" />
                </div>

                <div className="overflow-hidden rounded-[15px] border-[1.5px] border-brand-strong bg-panel shadow-lift">
                  <div className="px-3.5 pt-3 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-brand-edge bg-brand-tint">
                        <span className="flex h-2.5 w-4 items-center justify-start rounded-full bg-brand px-0.5">
                          <span className="size-1.5 rounded-full bg-white" />
                        </span>
                      </span>
                      <span className="truncate font-semibold text-[13.5px] text-ink tracking-[-0.01em]">
                        {running ? "Pesan masuk" : "Belum ada yang diperiksa"}
                      </span>
                    </div>
                    <p className="mt-2 font-mono text-[10px] text-ink-mute uppercase tracking-[0.1em]">
                      Q4 &nbsp;·&nbsp; Masukan
                    </p>
                  </div>
                  <ul className="divide-y divide-edge-soft border-edge-soft border-t">
                    {sequence.map((agent, index) => (
                      <PreviewRoutingRow
                        key={agent}
                        agent={agent}
                        target={branchCode(index)}
                        active={running && demo.revealed > index}
                      />
                    ))}
                  </ul>
                </div>

                <div aria-hidden className="h-11" />

                <ol className="relative space-y-2.5 px-3">
                  {sequence.map((agent, index) => (
                    <PreviewAgentNode
                      key={agent}
                      agent={agent}
                      code={branchCode(index)}
                      nextCode={synthesisCode(sequence.length)}
                      status={
                        !running
                          ? "pending"
                          : demo.doneCount > index
                            ? "ran"
                            : demo.revealed > index
                              ? "live"
                              : "pending"
                      }
                      count={
                        demo.showVerdict || running
                          ? findings[index]
                            ? 1
                            : 0
                          : 0
                      }
                    />
                  ))}
                </ol>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex justify-center px-3.5">
                <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-edge bg-panel/95 px-1.5 py-1 shadow-lift backdrop-blur-md">
                  <span className="flex size-6 items-center justify-center rounded-full bg-chip text-ink">
                    <Workflow aria-hidden className="size-3.5" />
                  </span>
                  <span className="mx-0.5 h-4 w-px bg-edge" />
                  <span className="grid size-6 place-items-center rounded-full text-ink-mute">
                    <Minus aria-hidden className="size-3.5" />
                  </span>
                  <span className="tabular min-w-8 text-center font-mono text-[10.5px] text-ink-mute">
                    100%
                  </span>
                  <span className="grid size-6 place-items-center rounded-full text-ink-mute">
                    <Plus aria-hidden className="size-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 pt-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {modus ? (
                <div className="rounded-[12px] border border-line bg-panel-2/50 p-2.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
                  <div className="flex items-center gap-1">
                    <span className="rounded-[4px] bg-brand-soft px-1 py-0.5 font-mono text-[8px] text-brand-ink">
                      MODUL {String(modus.no).padStart(2, "0")}
                    </span>
                    <span className="text-[8px] text-ink-faint">
                      level {modus.level}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-[11px] text-txt leading-snug">
                    {modus.nama}
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="tabular font-semibold text-[15px] text-txt leading-none">
                      {formattedLaporan(modus)}
                    </span>
                    <span className="text-[8.5px] text-dim">laporan</span>
                  </div>
                  <p className="mt-0.5 text-[8.5px] text-ink-faint">
                    {modus.kerugian} kerugian tercatat
                  </p>
                </div>
              ) : null}

              <div>
                <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-faint">
                  Sinyal
                </p>
                <ul className="mt-1.5 flex flex-col gap-2">
                  {findings.map((signal) => (
                    <li key={`${signal.label}-${signal.evidence}`}>
                      <span className="line-clamp-2 block text-[10px] text-txt leading-snug">
                        {signal.label}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <span className="h-1 flex-1 overflow-hidden rounded-full bg-panel-2">
                          <span
                            className={`block h-full rounded-full ${
                              signal.weight >= 0.6 ? "bg-danger" : "bg-warn"
                            }`}
                            style={{
                              width: `${Math.round(signal.weight * 100)}%`,
                            }}
                          />
                        </span>
                        <span className="tabular text-[8.5px] text-dim">
                          {signal.weight.toFixed(2)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto rounded-[12px] border border-line bg-panel-2/40 p-2.5">
                <div className="flex items-baseline gap-1">
                  <span className="tabular font-semibold text-[17px] text-txt leading-none">
                    {inspectedCount(data.stages)}
                  </span>
                  <span className="text-[9.5px] text-dim">
                    / 8 agen memeriksa
                  </span>
                </div>
                <p className="mt-1 text-[9px] text-ink-faint leading-relaxed">
                  {countStatus(demo, "dilewati")} agen dilewati karena tidak
                  relevan untuk pesan ini.
                </p>
                {data.artifacts > 0 ? (
                  <p className="mt-1 flex items-center gap-1 text-[9px] text-brand-ink-soft">
                    <Link2 aria-hidden strokeWidth={2} className="size-2.5" />
                    {data.artifacts} kutipan siap untuk laporan
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function PreviewRoutingRow({
  agent,
  target,
  active,
}: {
  agent: string;
  target: string;
  active: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between px-3.5 py-2 ${active ? "bg-brand-tint" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2 pr-2">
        <span className="shrink-0 rounded-[5px] bg-chip px-1.5 py-0.5 font-mono font-medium text-[10px] text-ink-soft">
          IF
        </span>
        <span
          className={`truncate text-[12px] ${active ? "font-medium text-txt" : "text-ink-mute"}`}
        >
          {BRANCH_CONDITION[agent] ?? agent}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-[10.5px] text-ink-mute">
          → &nbsp;{target}
        </span>
        <span
          className={`size-2.5 rounded-full bg-brand ${active ? "scale-110 ring-4 ring-brand/20" : ""}`}
        />
      </div>
    </li>
  );
}

function PreviewAgentNode({
  agent,
  code,
  nextCode,
  status,
  count,
}: {
  agent: string;
  code: string;
  nextCode: string;
  status: "ran" | "live" | "pending";
  count: number;
}) {
  const live = status === "live";
  return (
    <li
      className={`relative rounded-[14px] border bg-panel shadow-rest ${
        live ? "border-brand-strong shadow-lift" : "border-edge"
      }`}
    >
      <span className="absolute top-4 -left-[2px] flex items-center">
        <span
          className={`size-2.5 rounded-full border-2 bg-panel ${
            status === "pending" ? "border-dot" : "border-brand-strong"
          }`}
        />
      </span>

      <div className="px-3.5 pt-2.5 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-brand-edge bg-brand-chip">
            <Image
              alt=""
              src="/brand/companion-mascot.png"
              width={128}
              height={128}
              className="size-full object-cover"
            />
          </span>
          <p className="font-semibold text-[12.5px] text-ink leading-snug">
            {STAGE_LABEL[agent as keyof typeof STAGE_LABEL]?.label ?? agent}
          </p>
        </div>
        <p className="mt-1.5 font-mono text-[9.5px] text-ink-mute uppercase tracking-[0.1em]">
          {code} &nbsp;·&nbsp; {BRANCH_KIND[agent] ?? agent}
        </p>
      </div>

      <div className="relative flex items-center justify-between border-edge-soft border-t px-3.5 py-1.5 text-[11.5px] text-ink-mute">
        <span>Then</span>
        <span className="font-mono text-[10.5px]">→ &nbsp;{nextCode}</span>
        <span
          className={`absolute top-1/2 -right-[5px] size-2.5 -translate-y-1/2 rounded-full ${
            status === "pending" ? "bg-dot" : "bg-brand-strong"
          }`}
        />
      </div>

      <div className="flex items-center justify-between border-edge-soft border-t px-3.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`size-2 rounded-full ${
              status === "ran"
                ? "bg-brand"
                : status === "live"
                  ? "bg-brand"
                  : "bg-dot"
            }`}
          />
          <span className="font-medium text-[11px] text-ink-mute">
            {status === "ran"
              ? "Selesai"
              : status === "live"
                ? "Berjalan"
                : "Tanpa catatan"}
          </span>
        </div>
        {count > 0 ? (
          <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
            {count} sinyal
          </span>
        ) : null}
      </div>
    </li>
  );
}

function FooterComposer({
  busy,
  value,
  typing,
  sendable,
}: {
  busy: boolean;
  value: string;
  typing: boolean;
  sendable: boolean;
}) {
  return (
    <div
      className={`w-full rounded-[18px] border p-[5px] transition-[border-color,background-color,box-shadow] duration-150 ease-out ${
        sendable
          ? "border-brand-glow bg-brand-tint"
          : "border-brand-line bg-brand-tint shadow-[0_4px_24px_color-mix(in_oklab,var(--lumina-brand-glow)_8%,transparent)]"
      }`}
    >
      <div className="rounded-[14px] border border-brand-line/70 bg-panel px-3.5 pt-3 pb-2.5 shadow-[0_1px_2px_color-mix(in_oklab,var(--lumina-txt)_3%,transparent)]">
        <p className="mb-1.5 min-h-[41px] text-[12.5px] leading-relaxed">
          {value ? (
            <span className="text-ink">{value}</span>
          ) : (
            <span className="text-ink-faint">Tempel pesan berikutnya…</span>
          )}
          {typing ? (
            <span
              aria-hidden
              className="ms-0.5 inline-block h-[13px] w-[1.5px] translate-y-[2px] animate-pulse bg-brand-strong align-baseline motion-reduce:hidden"
            />
          ) : null}
        </p>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="grid size-[29px] shrink-0 place-items-center rounded-[8px] bg-chip text-ink-mute">
              <Paperclip aria-hidden strokeWidth={1.6} className="size-3.5" />
            </span>
            <span className="flex h-[29px] shrink-0 items-center gap-1 rounded-[8px] bg-chip px-2.5 text-ink-mute text-[11px]">
              <Briefcase aria-hidden strokeWidth={1.6} className="size-3.5" />
              <span className="hidden sm:inline">Cari lowongan</span>
            </span>
            <span className="hidden truncate text-[10.5px] text-ink-faint sm:inline">
              Enter mengirim · Shift+Enter baris baru
            </span>
          </div>

          <span
            className={`grid size-[30px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-soft-2 via-brand-glow to-brand-strong text-white ring-2 ring-brand-line shadow-[0_2px_8px_color-mix(in_oklab,var(--lumina-brand-glow)_45%,transparent)] transition-[opacity,transform] duration-200 ${
              sendable || busy ? "opacity-100" : "opacity-40"
            } ${sendable ? "scale-105" : ""}`}
          >
            {busy ? (
              <Loader2
                aria-hidden
                strokeWidth={2}
                className="size-[15px] animate-spin motion-reduce:animate-none"
              />
            ) : (
              <ArrowUp aria-hidden strokeWidth={2.2} className="size-[15px]" />
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function countStatus(demo: Demo, status: AgentStage["status"]) {
  return demo.data.stages.reduce((sum, stage, index) => {
    const current = statusOf(
      stage,
      demo.revealed > index,
      demo.doneCount > index,
    );
    return sum + (current === status ? 1 : 0);
  }, 0);
}

function inspectedCount(stages: readonly AgentStage[]) {
  return stages.filter(
    (stage) => stage.status === "selesai" || stage.status === "temuan",
  ).length;
}
