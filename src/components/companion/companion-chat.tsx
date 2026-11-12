"use client";

import {
  ArrowDown,
  Check,
  ChevronDown,
  Download,
  History,
  Link2,
  PanelLeftOpen,
  PanelRightOpen,
  Paperclip,
  RotateCcw,
  SquarePen,
  TriangleAlert,
  Users,
  Workflow,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Mascot } from "@/components/brand/mascot";
import { AgentRun, runAnnouncement } from "@/components/companion/agent-run";
import {
  AGENT_SEQUENCE,
  type DetectorAgent,
} from "@/components/companion/agents";
import { AgentsDetailPanel } from "@/components/companion/agents-detail-panel";
import { AgentsView } from "@/components/companion/agents-view";
import {
  CompanionAuth,
  type CompanionSession,
} from "@/components/companion/companion-auth";
import { CompanionMarkdown } from "@/components/companion/companion-markdown";
import {
  type Attachment,
  Composer,
  formatAttachmentSize,
  isImageAttachment,
  scoringTextWithAttachments,
} from "@/components/companion/composer";
import {
  type AgentFinding,
  ExplanationCard,
} from "@/components/companion/explanation-card";
import {
  DetectionText,
  HighlightExplanation,
} from "@/components/companion/highlight-text";
import { LokerTool } from "@/components/companion/loker-tool";
import { ProcessTrace } from "@/components/companion/process-trace";
import {
  CompanionQuickCards,
  type RecentAgentRun,
} from "@/components/companion/quick-cards";
import { ReportTemplate } from "@/components/companion/report-template";
import { ScoreCard } from "@/components/companion/score-card";
import { SessionSidebar } from "@/components/companion/session-sidebar";
import { SignalPanel } from "@/components/companion/signal-panel";
import { ThinkingRow } from "@/components/companion/thinking-row";
import { useStickyScroll } from "@/components/companion/use-sticky-scroll";
import { VerificationControls } from "@/components/companion/verification-controls";
import {
  requestReply,
  type VoiceOutcome,
} from "@/components/companion/voice-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ReportChannelId } from "@/data/report-contacts";
import type { ReportChannel } from "@/data/tactics";
import { caseMetrics, sessionCases } from "@/lib/agent/case-store";
import { runAgentLoop } from "@/lib/companion/agent-loop";
import { buildAnswerRequest } from "@/lib/companion/answer-client";
import {
  describeReads,
  readAttachments,
  attachmentContext as toAttachmentContext,
} from "@/lib/companion/attachment-reader";
import { type Explanation, explain } from "@/lib/companion/explain";
import {
  collectHighlights,
  highlightQuoteKey,
  highlightSegments,
} from "@/lib/companion/highlights";

import {
  listConversationHistory,
  saveConversationHistory,
} from "@/lib/companion/history";
import {
  conversationIntent,
  learningModulesFor,
  wantsLinkCheck,
} from "@/lib/companion/intent";
import { composeReply, suggestedActions } from "@/lib/companion/reply";
import { runSettled } from "@/lib/companion/run-state";
import { requestToolSummary } from "@/lib/companion/tool-client";
import {
  isContentQuestion,
  isFollowUpQuestion,
  isQuestionAbout,
  isWebLookupQuestion,
  type Lane,
  planTurn,
  refersToPriorAttachment,
  wantsSafetyCheck,
} from "@/lib/companion/turn";
import { transcribeImages } from "@/lib/companion/vision-client";
import {
  type AgentStage,
  type AgentTrace,
  STAGE_LABEL,
  type VoiceDigest,
  voiceDigest,
} from "@/lib/contracts/agent-run";
import type { ToolObservation } from "@/lib/contracts/loop";
import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";
import type { ScoreResult } from "@/lib/contracts/score";
import type { ToolCall } from "@/lib/contracts/tool";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import type { LinkVerdict } from "@/lib/link-verify/urlvet";
import { filterPostings } from "@/lib/loker/search";
import type {
  LokerCorpus,
  LokerSearchArgs,
  LokerView,
} from "@/lib/loker/types";
import { useSavedLoker } from "@/lib/loker/use-saved";
import { kalimatRekomendasi, ringkasRekomendasi } from "@/lib/loker/verdict";
import { modusFor } from "@/lib/modus";
import { streamOrchestrator } from "@/lib/orchestrator/client";
import type { AgentRunSummary } from "@/lib/orchestrator/summary";
import { extractEntities, extractedSignals } from "@/lib/scoring/extract";
import { extractLinks } from "@/lib/scoring/link";
import { scoreWithTrace } from "@/lib/scoring/score";
import { cn } from "@/lib/utils";
import { inspectFileMetadata } from "@/lib/verify/file";

/**
 * Companion — the full chat workspace. No site nav: navigation lives in the
 * sidebar.
 *
 * Layout is a 1:1 clone of the Cortex reference (`cortex_ui.tsx`):
 *
 *   ┌──────────┬────────────────────────────────┬──────────────┐
 *   │ 220px    │  pill header (orb · title · ⋯)  │ agent        │
 *   │ brand    │  ─────────────────────────────  │ pipeline     │
 *   │ new chat │  orb hero + lavender composer   │ graph        │
 *   │ search   │  ─────────────────────────────  │ (376/396px)  │
 *   │ nav      │  suggestion card grid           │              │
 *   │ history  │                                 │              │
 *   └──────────┴────────────────────────────────┴──────────────┘
 *
 * The shell is full-bleed: sidebar, conversation, and evidence panel are three
 * edge-to-edge columns of one white workspace (no floating card, no lavender
 * background) on the plain `bg-bg` surface. Accents are the documented
 * `--lumina-brand*` tokens added for this surface; every
 * reference hex lives in `globals.css`, no component holds a literal colour.
 *
 * Three product decisions that override the reference:
 *   a. The transcript stays on the device. An account can persist only the
 *      thread's title, turn count, and risk band, so the sidebar can list its
 *      own history after a reload without copying checked messages to the
 *      server.
 *   b. The evidence panel is a real column on desktop, not a drawer, because
 *      the agent-by-agent evidence IS the argument the product makes.
 *   c. The sidebar second row is the manipulated risk band, not a timestamp —
 *      a judge scanning threads needs the verdict before opening one.
 */

function agentFindingsFrom(events?: OrchestratorEvent[]): AgentFinding[] {
  const findings: AgentFinding[] = [];
  for (const event of events ?? []) {
    if (event.type !== "agent_result") continue;
    for (const point of event.points) {
      findings.push({ agent: event.label, point });
    }
  }
  return findings;
}

interface Turn {
  id: number;
  role: "user" | "companion";
  text: string;
  /** Stamped in the handler only — reading the clock during render breaks prerender. */
  at?: string;
  result?: ScoreResult;
  /** The text that produced `result`, including attachment filenames. */
  source?: string;
  attachments?: Attachment[];
  /** Why an attached image could not be read; absent when every image was read. */
  visionNote?: string;
  /** Local transcript for an attachment the user asked about. Never from a check. */
  attachmentText?: string;
  /**
   * Local OCR text kept so a later turn that refers back to the screenshot can
   * be answered. Never shown; the model sees it only when the reader explicitly
   * points at the earlier attachment.
   */
  recallText?: string;
  /** A local note when an attachment could not be read. */
  attachmentNote?: string;
  /** True when this turn asked about attachment content, not its safety. */
  contentQuestion?: boolean;
  /** What the agents actually did for this turn, measured. */
  trace?: AgentTrace;
  /** The real multi-agent run: planner, specialists, tool calls, synthesis. */
  orchestration?: OrchestratorEvent[];
  /** True when this turn ran the agent orchestrator, so the band waits for it. */
  orchestrated?: boolean;
  /** The teaching layer: tactics, anatomy, checks, and where to report. */
  explanation?: Explanation;
  /** True while the language layer is still writing. */
  streaming?: boolean;
  /**
   * Epoch ms when the language request left. Stamped in the handler, never in
   * render: Next 16 fails the prerender of a client component that reads the
   * clock while rendering, and a `Date.now()` prop here would do exactly that.
   */
  voiceStartedAt?: number;
  /** Which lane the router picked. Rendered as the honest reason, not a badge. */
  lane?: Lane;
  /** The reader's own words, kept only so the lane chip can re-send them. */
  laneSource?: string;
  /**
   * Set when the model lane produced no usable answer. The bubble shows an
   * honest failure and a retry instead of a templated answer dressed as the
   * model's voice.
   */
  failure?: VoiceOutcome;
  /** The job-search card for this turn, when the tool ran. */
  tool?: LokerTurnTool;
  /** The report card the model opened for the previous verdict. */
  report?: ReportTurnTool;
  /** A manual link scan the agent ran at the reader's explicit request. */
  link?: LinkVerdict;
  /** A link waiting for the reader's approval before it leaves the browser. */
  linkPrompt?: { url: string };
  /** Why the link scan could not produce a verdict. */
  linkError?: string;
  /** Public learning destinations, separate from a scored pattern. */
  learningModules?: number[];
  ocrConfidence?: number;
  caseId?: string;
}

interface ReportTurnTool {
  /** The institution the model asked for, when the user named one. */
  channel: ReportChannelId | null;
  /** The verdict the card is built from; never re-scored here. */
  result: ScoreResult;
  /** Channels of that verdict's explanation. */
  channels: readonly ReportChannel[];
}

interface LokerTurnTool {
  args: LokerSearchArgs;
  count: number;
  total: number;
  capped: boolean;
  summary: string | null;
  summaryState: "idle" | "running" | "done" | "failed";
}

/**
 * The visible process for a link turn. The steps are derived from what the
 * browser actually did: it asked for consent, waited, scanned, then answered.
 * This is not hidden chain-of-thought; it is the same audit trail Pi shows
 * around a tool call, scoped to the link lane.
 */
function LinkProcess({ turn }: { turn: Turn }) {
  const steps: { label: string; active?: boolean }[] = [
    { label: "Mengenali tautan dan menyiapkan pemeriksaan" },
  ];
  if (turn.linkPrompt) {
    steps.push({
      label: "Menunggu persetujuan sebelum URL dikirim ke pemindai",
      active: true,
    });
  }
  if (turn.link) {
    steps.push({
      label: `Memindai ${turn.link.domain ?? "tautan"} dengan url.vet`,
    });
    steps.push({ label: "Menyusun jawaban dari hasil pemindaian" });
  }
  if (turn.linkError) {
    steps.push({ label: "Pemeriksaan gagal; menyiapkan penjelasan" });
  }

  return (
    <details
      open
      className="max-w-[92%] rounded-[12px] border border-line bg-panel-2 px-3 py-2 text-[12px]"
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 font-medium">
        <Workflow aria-hidden className="size-3.5" />
        Proses
        <span className="font-normal text-dim">{steps.length} langkah</span>
      </summary>
      <ol className="mt-2 flex flex-col gap-1.5">
        {steps.map((step, index) => (
          <li key={`${step.label}-${index}`} className="flex gap-2">
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-medium",
                step.active
                  ? "bg-brand-soft text-brand-ink"
                  : "bg-panel text-dim",
              )}
            >
              {index + 1}
            </span>
            <p
              className={cn(
                "pt-0.5 leading-relaxed",
                step.active ? "text-txt" : "text-dim",
              )}
            >
              {step.label}
            </p>
          </li>
        ))}
      </ol>
    </details>
  );
}

interface Session {
  id: number;
  /** Account-scoped row id; present once the thread is saved for a signed-in reader. */
  serverId?: string;
  title: string;
  turns: Turn[];
  /** Band of the last check in this conversation, for the sidebar's second row. */
  risk?: "bersih" | "rendah" | "mencurigakan" | "tinggi";
  /** Short clock time, printed on the title row like the reference does. */
  time?: string;
  /** Epoch ms of the last turn, used to bucket the thread under Hari ini/Kemarin. */
  updatedAt?: number;
}

interface ActiveHighlight {
  turnId: number;
  quote: string;
}

/**
 * A user turn borrows the findings of the companion answer that follows it.
 * Agent-generated points supply detailed highlights; deterministic signals and
 * the teaching explanation fill the quotes the agents did not cover.
 */
function highlightsForUserTurn(turns: readonly Turn[], index: number) {
  const turn = turns[index];
  const next = turns[index + 1];
  if (!turn || next?.role !== "companion") return [];
  return collectHighlights({
    text: turn.text,
    signals: next.result?.signals ?? [],
    explanation: next.explanation,
    events: next.orchestration,
  });
}

/** One dot colour per band, reused by the header pill and the pipeline header. */
const RISK_DOT: Record<NonNullable<Session["risk"]>, string> = {
  bersih: "bg-brand",
  rendah: "bg-brand",
  mencurigakan: "bg-warn",
  tinggi: "bg-danger",
};

let nextId = 1;
const id = () => nextId++;

function newSession(): Session {
  return {
    id: id(),
    title: "Percakapan baru",
    turns: [],
  };
}

function titleFor(text: string, attachments: readonly Attachment[]): string {
  const base = text.trim() || attachments[0]?.name || "";
  if (!base) return "Percakapan baru";
  return base.length > 42 ? `${base.slice(0, 42).trimEnd()}…` : base;
}

const EMPTY_CORPUS: LokerCorpus = {
  postings: [],
  total: 0,
  capped: false,
};

/**
 * Deterministic copy when the summary route is offline or unconfigured. It
 * states the count and the engine's own recommendation, nothing the card does
 * not already show.
 */
function summaryFallback(postings: readonly LokerView[]): string {
  return kalimatRekomendasi(ringkasRekomendasi(postings));
}

function failureHeadline(reason: VoiceOutcome): string {
  if (reason === "timeout") return "Model terlalu lambat menjawab.";
  if (reason === "unconfigured") return "Model belum dikonfigurasi.";
  if (reason === "truncated") return "Jawaban model terpotong.";
  return "Model tidak merespons.";
}

function failureHint(reason: VoiceOutcome): string {
  if (reason === "unconfigured")
    return "Jawaban AI belum aktif di lingkungan ini.";
  return "Tidak ada jawaban yang ditampilkan. Coba lagi sebentar lagi.";
}

function failureNote(reason: VoiceOutcome): string {
  if (reason === "timeout")
    return "Model terlalu lambat menjawab; tidak ada jawaban yang ditampilkan.";
  if (reason === "unconfigured")
    return "Model belum dikonfigurasi; tidak ada jawaban yang ditampilkan.";
  if (reason === "truncated")
    return "Jawaban model terpotong; tidak ada jawaban yang ditampilkan.";
  return "Model gagal dihubungi; tidak ada jawaban yang ditampilkan.";
}

export function CompanionChat({
  session = null,
  initialPanel,
  latestRun = null,
  corpus = EMPTY_CORPUS,
  initialModule,
  orchestrator = false,
}: {
  session?: CompanionSession | null;
  /** Set when another surface links straight into the detector overview. */
  initialPanel?: "agen";
  latestRun?: AgentRunSummary | null;
  /** The capped cumulative scan snapshot; the client filters it locally. */
  corpus?: LokerCorpus;
  initialModule?: { no: number; title: string };
  /** Server-resolved flag for the real multi-agent orchestrator. */
  orchestrator?: boolean;
}) {
  const [tutorModule, setTutorModule] = React.useState(initialModule);
  const router = useRouter();
  // `null` outside a mounted router (and in tests); the agent route check below
  // then reads false and the shell keeps its in-place behavior.
  const pathname = usePathname();
  const onAgentRoute = pathname === "/agen";
  const [sessions, setSessions] = React.useState<Session[]>(() => [
    newSession(),
  ]);
  /** `null` = the newest session, never a hardcoded id. */
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  /** Set while an attached image is being read, before the answer turn exists. */
  const [readingAt, setReadingAt] = React.useState<{
    turnId: number;
    at: number;
  } | null>(null);
  const inFlight = React.useRef<symbol | null>(null);
  const activeControlRef = React.useRef<AbortController | null>(null);
  const stoppedRef = React.useRef(false);
  const streamedRef = React.useRef("");
  const stop = React.useCallback(() => {
    stoppedRef.current = true;
    activeControlRef.current?.abort();
  }, []);
  const attachmentUrls = React.useRef(new Set<string>());
  const pendingControllers = React.useRef(new Set<AbortController>());
  const pendingTimers = React.useRef(new Set<ReturnType<typeof setTimeout>>());
  React.useEffect(
    () => () => {
      for (const control of pendingControllers.current) control.abort();
      for (const timer of pendingTimers.current) clearTimeout(timer);
      for (const url of attachmentUrls.current) URL.revokeObjectURL(url);
      attachmentUrls.current.clear();
    },
    [],
  );
  const [showEvidence, setShowEvidence] = React.useState(false);
  const [showSessions, setShowSessions] = React.useState(false);
  /**
   * The center column's second view. The address owns it: `/agen` is the
   * overview, `/companion` is the conversation. Keeping it in state let a
   * reused client instance carry the previous view across routes, which showed
   * the chat under an `/agen` URL.
   */
  const showAgents = onAgentRoute || initialPanel === "agen";
  /** Seed for the empty-state composer: a nonce remounts it with new text. */
  const [composerSeed, setComposerSeed] = React.useState({
    text: "",
    nonce: 0,
  });
  /** Which agent's brief the right pane shows while the overview is open. */
  const [selectedAgent, setSelectedAgent] =
    React.useState<DetectorAgent | null>("message");
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [evidenceCollapsed, setEvidenceCollapsed] = React.useState(false);
  const [copiedThread, setCopiedThread] = React.useState(false);
  const [activeHighlight, setActiveHighlight] =
    React.useState<ActiveHighlight | null>(null);
  const [agentsAnnouncement, setAgentsAnnouncement] = React.useState("");
  /** Height of the floating composer, so the log can pad its tail above it. */
  const [composerHeight, setComposerHeight] = React.useState(0);
  const composerObserver = React.useRef<ResizeObserver | null>(null);
  const setComposerNode = React.useCallback((node: HTMLDivElement | null) => {
    composerObserver.current?.disconnect();
    composerObserver.current = null;
    if (!node) return;
    const measure = () =>
      setComposerHeight(node.getBoundingClientRect().height);
    measure();
    composerObserver.current = new ResizeObserver(measure);
    composerObserver.current.observe(node);
  }, []);
  React.useEffect(() => () => composerObserver.current?.disconnect(), []);
  const { saved, toggle: toggleSaved } = useSavedLoker();

  /*
   * The mobile drawer covers the column but not the window: Escape must close
   * it, exactly like the close button and the scrim. Without this the only exit
   * was the 44px button inside the drawer, which a keyboard user cannot reach.
   */
  React.useEffect(() => {
    if (!showSessions) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowSessions(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSessions]);

  const active = sessions.find((s) => s.id === selectedId) ?? sessions[0];
  const activeId = active?.id;
  const turns = active?.turns ?? [];
  const sticky = useStickyScroll<HTMLDivElement>(active?.id);
  const highlightsByUserTurn = React.useMemo(() => {
    const map = new Map<number, ReturnType<typeof highlightsForUserTurn>>();
    turns.forEach((turn, index) => {
      if (turn.role === "user") {
        map.set(turn.id, highlightsForUserTurn(turns, index));
      }
    });
    return map;
  }, [turns]);
  const segmentsByUserTurn = React.useMemo(() => {
    const map = new Map<number, ReturnType<typeof highlightSegments>>();
    turns.forEach((turn) => {
      if (turn.role === "user") {
        map.set(
          turn.id,
          highlightSegments(turn.text, highlightsByUserTurn.get(turn.id) ?? []),
        );
      }
    });
    return map;
  }, [turns, highlightsByUserTurn]);

  /**
   * Persists only the account-scoped metadata. The transcript and attachments
   * stay in React state; this table never receives a message body.
   */
  const persistSession = React.useCallback(
    (input: {
      id: string;
      title: string;
      turns: number;
      risk?: Session["risk"];
    }) => {
      if (!session) return;
      void saveConversationHistory({
        id: input.id,
        title: input.title,
        turns: input.turns,
        risk: input.risk ?? null,
      }).catch(() => {});
    },
    [session],
  );

  const selectEvidence = React.useCallback(
    (evidence: string, turnId?: number) => {
      setShowEvidence(false);
      setActiveHighlight((current) => {
        let selectedTurn = turnId;
        if (selectedTurn === undefined) {
          const evidenceKey = highlightQuoteKey(evidence);
          for (let index = turns.length - 1; index >= 0; index -= 1) {
            const turn = turns[index];
            if (
              turn.role === "user" &&
              highlightQuoteKey(turn.text).includes(evidenceKey)
            ) {
              selectedTurn = turn.id;
              break;
            }
          }
        }
        if (selectedTurn === undefined) return current;
        if (
          current?.turnId === selectedTurn &&
          highlightQuoteKey(current.quote) === highlightQuoteKey(evidence)
        ) {
          return null;
        }
        return { turnId: selectedTurn, quote: evidence };
      });
    },
    [turns],
  );

  /** Loads a prompt into the empty-state composer without sending it. */
  const prefillComposer = React.useCallback((text: string) => {
    setComposerSeed((prev) => ({ text, nonce: prev.nonce + 1 }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on session change
  React.useEffect(() => {
    setActiveHighlight(null);
  }, [activeId]);

  React.useEffect(() => {
    if (activeHighlight === null) return;
    const turn = document.querySelector<HTMLElement>(
      `[data-turn-id="${activeHighlight.turnId}"]`,
    );
    const target = Array.from(
      turn?.querySelectorAll<HTMLElement>("[data-evidence]") ?? [],
    ).find(
      (element) =>
        highlightQuoteKey(element.dataset.evidence ?? "") ===
        highlightQuoteKey(activeHighlight.quote),
    );
    target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [activeHighlight]);

  /*
   * Opening the Agents view unmounts the transcript, and with it AgentRun's
   * live region. Keep announcing the settled summary here while that view is
   * on screen instead of letting the run finish silently.
   */
  const wasBusy = React.useRef(busy);
  React.useEffect(() => {
    const was = wasBusy.current;
    wasBusy.current = busy;
    if (busy) {
      // Clear on start so two identical runs still announce the second time.
      if (!was) setAgentsAnnouncement("");
      return;
    }
    if (!was) return;
    // Only the turn that just settled may announce; an older checked turn must
    // not be re-announced after a plain chat reply.
    const latest = turns[turns.length - 1];
    setAgentsAnnouncement(latest?.trace ? runAnnouncement(latest.trace) : "");
  }, [busy, turns]);

  /**
   * History is a list of conversations that happened. A blank new-chat screen
   * is a composer, not a thread, so it never joins the sidebar until the first
   * message lands.
   */
  const conversations = React.useMemo(
    () =>
      sessions.filter(
        (session) => session.turns.length > 0 || !!session.serverId,
      ),
    [sessions],
  );
  const recentAgentRuns = React.useMemo<RecentAgentRun[]>(() => {
    const inTab = sessions
      .flatMap((item) =>
        item.turns.flatMap((turn) => {
          const events = (turn.orchestration ?? []).flatMap((event) => {
            if (event.type !== "agent_result") return [];
            if (event.status !== "selesai") return [];
            const agent = AGENT_SEQUENCE.find((id) => id === event.agent);
            return agent
              ? [
                  {
                    id: agent,
                    key: `${turn.id}-${agent}`,
                    sessionId: item.id,
                    ms: event.ms,
                    turnId: turn.id,
                    source: "tab" as const,
                  },
                ]
              : [];
          });
          if (events.length > 0) return events;
          return AGENT_SEQUENCE.flatMap((agent) => {
            const stage = turn.trace?.stages.find(
              (stage) =>
                stage.id === agent &&
                (stage.status === "selesai" || stage.status === "temuan"),
            );
            return stage
              ? [
                  {
                    id: agent,
                    key: `${turn.id}-${agent}`,
                    sessionId: item.id,
                    ms: stage.ms,
                    turnId: turn.id,
                    source: "tab" as const,
                  },
                ]
              : [];
          });
        }),
      )
      .sort((a, b) => b.turnId - a.turnId)
      .slice(0, 4);

    if (inTab.length > 0) return inTab;
    if (!latestRun) return [];

    return latestRun.agents
      .flatMap((agent) => {
        if (agent.status !== "selesai") return [];
        const id = AGENT_SEQUENCE.find((candidate) => candidate === agent.id);
        return id
          ? [
              {
                id,
                key: `${latestRun.runId}-${id}`,
                sessionId: -1,
                ms: agent.ms,
                source: "akun" as const,
              },
            ]
          : [];
      })
      .slice(0, 4);
  }, [sessions, latestRun]);

  /**
   * The panel describes one verdict, never the whole session. Bundling every
   * scored turn put artifacts from an older, cleaner message under the newest
   * score, so a panel reading 97/100 could cite proof that did not produce it.
   * Everything the panel renders is scoped to the latest scored turn.
   */
  const latestCheck = React.useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn?.result) {
        return {
          result: turn.result,
          trace: turn.trace ?? null,
          explanation: turn.explanation ?? null,
          source: turn.source ?? "",
          at: turn.at,
        };
      }
    }
    return null;
  }, [turns]);

  const latestResult = latestCheck?.result ?? null;
  const latestTrace = latestCheck?.trace ?? null;

  const latestLink = React.useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn?.link) return turn.link;
    }
    return null;
  }, [turns]);

  const latestLinkPrompt = React.useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn?.linkPrompt) return turn.linkPrompt;
    }
    return null;
  }, [turns]);

  /**
   * The panel goes live while the language stage is streaming. The open turn
   * already carries the detector's `result` and an `AgentTrace` whose voice
   * stage is `berjalan`, so the graph can light the one stage that is actually
   * running instead of waiting for the whole answer to finish.
   */
  const liveCheck = React.useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const turn = turns[i];
      if (turn?.streaming && turn.trace) {
        return {
          result: turn.result ?? null,
          trace: turn.trace,
          orchestration: turn.orchestration,
        };
      }
    }
    return null;
  }, [turns]);

  const activeTurn = [...turns].reverse().find((turn) => turn.streaming);
  const panelBandReady =
    !activeTurn ||
    !activeTurn.orchestrated ||
    (activeTurn.orchestration !== undefined &&
      runSettled(activeTurn.orchestration));
  const panelResult = panelBandReady
    ? (liveCheck?.result ?? latestResult)
    : null;
  const panelTrace = liveCheck?.trace ?? latestTrace;
  const panelLink = panelBandReady ? (panelResult ? null : latestLink) : null;
  const panelLinkPending = panelResult || panelLink ? null : latestLinkPrompt;
  const running = liveCheck != null;

  const latestExplanation = latestCheck?.explanation ?? null;

  const evidence = React.useMemo(
    () =>
      latestCheck?.source
        ? buildEvidenceBundle([
            {
              text: latestCheck.source,
              at: latestCheck.at,
              result: latestCheck.result,
            },
          ])
        : null,
    [latestCheck],
  );

  React.useLayoutEffect(() => {
    if (turns.length === 0) return;
    sticky.pinIfFollowing();
  }, [turns, sticky.pinIfFollowing]);

  const lastComposerHeight = React.useRef(composerHeight);
  React.useLayoutEffect(() => {
    if (lastComposerHeight.current === composerHeight) return;
    lastComposerHeight.current = composerHeight;
    sticky.pinIfFollowing();
  }, [composerHeight, sticky.pinIfFollowing]);

  const send = React.useCallback(
    async (
      raw: string,
      attachments: Attachment[] = [],
      options: {
        force?: "periksa";
        recheckOf?: number;
        /** Set by the link confirmation card; unlocks check_link on this turn. */
        linkApproved?: string;
      } = {},
    ) => {
      const text = raw.trim();
      if ((!text && attachments.length === 0) || busy || inFlight.current)
        return;

      // Stamped here, never during render: Next 16 fails the prerender of a
      // client component that reads the clock while rendering.
      const stamp = new Date().toISOString();

      const target = activeId;
      if (target === undefined) return;
      const operation = Symbol();
      inFlight.current = operation;
      stoppedRef.current = false;
      streamedRef.current = "";
      setBusy(true);
      sticky.arm();
      const release = () => {
        if (inFlight.current !== operation) return;
        inFlight.current = null;
        setBusy(false);
        setReadingAt(null);
      };
      const control = new AbortController();
      activeControlRef.current = control;
      pendingControllers.current.add(control);
      try {
        // The composer owns its draft URLs and revokes them after submit. The
        // transcript owns separate URLs until the conversation component closes.
        const retainedAttachments = attachments.map((attachment) => {
          const url = URL.createObjectURL(attachment.file);
          attachmentUrls.current.add(url);
          return { ...attachment, url };
        });
        const originalIndex = (active?.turns ?? []).findIndex(
          (turn) => turn.id === options.recheckOf,
        );
        const privateIds = new Set(
          originalIndex < 0
            ? []
            : (active?.turns ?? [])
                .slice(Math.max(0, originalIndex - 1), originalIndex + 1)
                .map((turn) => turn.id),
        );
        const protectRechecked = (items: Turn[]) =>
          items.map((turn) =>
            privateIds.has(turn.id)
              ? { ...turn, lane: "periksa" as const, laneSource: undefined }
              : turn,
          );

        /*
         * Intent first, medium second.
         *
         * The old rule made every image a check, so "apa isi gambar ini?" was
         * scored and explained as a scam report. A content question is now a
         * conversation lane even when it carries a screenshot; only a safety
         * question (or an attachment with no question at all) goes to the
         * detector. This decision is made before OCR, so the user turn can still
         * appear immediately.
         */
        const hasImages = !tutorModule && attachments.some(isImageAttachment);
        const hasAttachments = !tutorModule && attachments.length > 0;
        const hasLinks = !tutorModule && extractLinks(text).length > 0;
        /*
         * A text-only turn can still be about a screenshot the reader sent on
         * an earlier turn ("the screenshot I just gave you"). The local OCR
         * text is kept on that turn; replay it only when the wording points
         * back at it and nothing new was attached. This is the same content
         * question exception as an attachment in the current turn, so the
         * checked message itself still never becomes chat history.
         */
        const recalledText =
          !tutorModule &&
          !hasAttachments &&
          !hasLinks &&
          refersToPriorAttachment(text)
            ? [...(active?.turns ?? [])]
                .reverse()
                .find((turn) => turn.role === "companion" && turn.recallText)
                ?.recallText
            : undefined;
        const contentQuestion =
          !options.force &&
          (hasAttachments || hasLinks || !!recalledText) &&
          (isContentQuestion(text) || !!recalledText) &&
          !wantsSafetyCheck(text);
        const safetyCheck =
          !options.force &&
          hasAttachments &&
          !contentQuestion &&
          (wantsSafetyCheck(text) || text.trim().length === 0);

        const userTurn: Turn = {
          id: id(),
          role: "user",
          text,
          attachments: retainedAttachments,
          at: stamp,
          lane: contentQuestion
            ? "tanya"
            : hasAttachments && !tutorModule
              ? "periksa"
              : undefined,
        };

        if (hasImages) {
          setBusy(true);
          setReadingAt({ turnId: userTurn.id, at: Date.now() });
          setSessions((prev) =>
            prev.map((session) =>
              session.id === target
                ? {
                    ...session,
                    title:
                      session.turns.length <= 1
                        ? titleFor(text, attachments)
                        : session.title,
                    time: stamp.slice(11, 16),
                    updatedAt: new Date(stamp).getTime(),
                    turns: [...session.turns, userTurn],
                  }
                : session,
            ),
          );
        }

        /*
         * The model reads pixels; it does not judge. The transcription joins the
         * filenames and typed words as input to the deterministic engine, so a
         * failed read degrades to the filename-only check rather than inventing
         * a verdict. A content question reads the same pixels, but only for the
         * text it was asked about.
         */
        const transcription = await transcribeImages(
          tutorModule ? [] : attachments,
          control.signal,
        );

        /*
         * A failed pixel read is a receipt, not a silent fallback. Without it the
         * turn still scores from the filename, and the reader would believe the
         * screenshot itself was examined.
         */
        if (
          hasImages &&
          (transcription.failed > 0 || transcription.skipped > 0)
        ) {
          setSessions((prev) =>
            prev.map((session) =>
              session.id === target
                ? {
                    ...session,
                    turns: session.turns.map((turn) =>
                      turn.id === userTurn.id
                        ? {
                            ...turn,
                            visionNote: [
                              transcription.failed > 0
                                ? transcription.failed ===
                                  transcription.attempted
                                  ? `${transcription.failed} gambar gagal dibaca; pemeriksaan hanya memakai nama berkas.`
                                  : `${transcription.failed} dari ${transcription.attempted} gambar gagal dibaca; sisanya diperiksa.`
                                : "",
                              transcription.skipped > 0
                                ? `${transcription.skipped} gambar tidak diperiksa; maksimal 3 gambar per pesan.`
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" "),
                          }
                        : turn,
                    ),
                  }
                : session,
            ),
          );
        }

        /*
         * Attachment reading is its own agent step. Images come from the OCR
         * result; text-like files are read on the device. Unsupported files are
         * named as unsupported rather than silently scored from a filename.
         */
        const readStarted = performance.now();
        const readResult = contentQuestion
          ? await readAttachments(attachments, transcription, control.signal)
          : null;
        const readMs = performance.now() - readStarted;
        const links = hasLinks ? extractLinks(text) : [];
        const modelAttachments = recalledText
          ? [{ kind: "image" as const, text: recalledText.slice(0, 6000) }]
          : readResult
            ? toAttachmentContext(readResult.reads)
            : [];

        const scored = [
          transcription.text,
          scoringTextWithAttachments(text, attachments),
        ]
          .filter(Boolean)
          .join("\n\n");

        /*
         * The question guard runs BEFORE scoring. Asking what a scam is must not
         * produce a red card about the person asking: measured, "apa itu pinjol?"
         * scored 70/tinggi and named the pinjol scheme. A question is not a
         * message someone received, so the detectors never see it.
         */
        const webLookup =
          !options.force &&
          attachments.length === 0 &&
          isWebLookupQuestion(text);
        const asked =
          contentQuestion ||
          webLookup ||
          (!options.force &&
            attachments.length === 0 &&
            wantsLinkCheck(text)) ||
          (options.force || attachments.length > 0
            ? false
            : isQuestionAbout(scored, {
                hasPriorVerdict: latestResult !== null,
              }));
        const intent =
          !options.force && attachments.length === 0
            ? conversationIntent(text)
            : null;
        const followUp =
          !options.force &&
          attachments.length === 0 &&
          latestResult !== null &&
          isFollowUpQuestion(text);

        /*
         * Prior *checked* user turns go to the Conversation Agent so escalation
         * across messages is visible. Chat lanes are excluded on purpose: the
         * Conversation Agent models messages the user received, and feeding it
         * "apa itu dana?" because the word "dana" appears there would let a
         * question manufacture an escalation.
         *
         * `source` is the local text the engine examined (typed words plus
         * OCR), not the model's answer, so a failed language layer does not
         * invalidate it: the next turn must still see the earlier message.
         */
        const priorTurns = (active?.turns ?? [])
          .filter(
            (turn) =>
              turn.role === "companion" &&
              turn.result !== undefined &&
              !!turn.source,
          )
          .map((turn) => ({ text: turn.source ?? "" }));

        const { result, trace } =
          asked || intent || followUp || tutorModule
            ? { result: null, trace: null }
            : scoreWithTrace({
                text: scored,
                turns: priorTurns,
                extraSignals: [
                  ...attachments.flatMap(inspectFileMetadata),
                  ...(transcription.text
                    ? extractedSignals(transcription.text)
                    : []),
                ],
              });

        const plan = planTurn({
          text: scored,
          result,
          lastResult: latestResult,
          lastExplanation: latestExplanation,
          asked,
          intent,
          attachments: attachments.length,
        });

        const lane: Lane = options.force
          ? "periksa"
          : tutorModule
            ? "belajar"
            : contentQuestion
              ? "tanya"
              : safetyCheck
                ? "periksa"
                : plan.lane;

        /*
         * The card and the trace render on `result`, never on `risk`. The bench
         * records 20/20 caught but 18/20 `tinggi`; gating on `tinggi` would drop
         * two scam samples and turn a 20/20 claim into 18/20 on stage.
         */
        const checked = lane === "periksa" && result !== null;

        /*
         * The user turn carries the lane too. The chat-lane history is built by
         * filtering on `turn.lane`, and user turns have no lane of their own
         * unless it is set here — otherwise history would contain companion
         * answers with no questions in between.
         */
        const stampedTurn: Turn = { ...userTurn, lane };

        const evidenceStarted = performance.now();
        const evidenceBundle = checked
          ? buildEvidenceBundle([{ text: scored, at: stamp, result: result }])
          : null;
        const evidenceMs = performance.now() - evidenceStarted;
        const artifacts = evidenceBundle?.artifacts.length ?? 0;

        const evidenceStage: AgentStage | null =
          trace && checked
            ? {
                id: "evidence",
                ...STAGE_LABEL.evidence,
                // No artifact means the stage did not produce evidence. It must
                // not wear a finished tick over a bundle it never filled.
                status: artifacts > 0 ? "selesai" : "dilewati",
                findings: 0,
                ms: evidenceMs,
                note:
                  artifacts > 0
                    ? `${artifacts} kutipan tercatat`
                    : "Tidak ada kutipan yang bisa dicatat.",
              }
            : null;

        /*
         * A content question has its own first step: reading the attachment.
         * The stage id is reused, but the label names what actually happened, so
         * the trace cannot imply a report was being prepared.
         */
        const readerStage: AgentStage | null =
          contentQuestion && readResult
            ? {
                id: "evidence",
                label: "Pembaca Lampiran",
                task: "Membaca teks dari lampiran yang ditanyakan",
                status:
                  readResult.readable > 0 || hasLinks ? "selesai" : "dilewati",
                findings: 0,
                ms: readMs,
                note:
                  readResult.readable > 0
                    ? `${readResult.readable} lampiran terbaca`
                    : hasLinks
                      ? `${links.length} tautan dibaca dari pertanyaan`
                      : (readResult.reads.find((read) => read.note)?.note ??
                        "Tidak ada teks yang bisa dibaca."),
              }
            : null;

        const stages: AgentStage[] = checked
          ? [
              ...(trace?.stages ?? []),
              ...(evidenceStage ? [evidenceStage] : []),
            ]
          : readerStage
            ? [readerStage]
            : [];
        const detectorMs =
          (trace?.totalMs ?? 0) + (checked ? evidenceMs : readMs);

        const companionId = id();
        const voiceStartedAt = Date.now();

        /*
         * The language stage is attached immediately as `berjalan`, because it
         * genuinely is running from this moment. Attaching it only at the end
         * would let the header show a finished checkmark over work still in
         * flight — the one dishonest state this card could produce.
         */
        const openTrace: AgentTrace | null =
          checked || contentQuestion
            ? {
                stages: [
                  ...stages,
                  {
                    id: "voice",
                    ...STAGE_LABEL.voice,
                    status: "berjalan",
                    findings: 0,
                    ms: 0,
                  },
                ],
                totalMs: detectorMs,
              }
            : null;

        /*
         * The teaching layer is a pure function of the verdict, so it is computed
         * once here and reused when the turn seals. The card can then render the
         * same explanation immediately, before the language layer has written a
         * word — the verdict is not allowed to wait for the voice.
         */
        const explanation =
          checked &&
          result !== null &&
          result.signals.some((signal) => signal.weight > 0)
            ? explain(result, scored)
            : undefined;

        const conversationId = active?.serverId ?? crypto.randomUUID();
        const nextTitle = active?.serverId
          ? active.title
          : (active?.turns.length ?? 0) <= 1
            ? titleFor(text, attachments)
            : (active?.title ?? titleFor(text, attachments));
        const storedVerdict = checked ? result : latestResult;
        const storedModus = modusFor(storedVerdict?.relatedModule ?? null);
        // Local titles may quote the message. Persist only public labels.
        const metadataTitle = storedVerdict
          ? storedModus
            ? `Pemeriksaan: ${storedModus.nama}`
            : "Pemeriksaan pesan"
          : "Percakapan Companion";

        setBusy(true);
        setReadingAt(null);
        setSessions((prev) =>
          prev.map((session) =>
            session.id === target
              ? {
                  ...session,
                  serverId: session.serverId ?? conversationId,
                  title: session.serverId ? session.title : nextTitle,
                  time: stamp.slice(11, 16),
                  updatedAt: new Date(stamp).getTime(),
                  risk: checked ? (result?.risk ?? session.risk) : session.risk,
                  turns: [
                    ...protectRechecked(session.turns),
                    ...(hasImages ? [] : [stampedTurn]),
                    {
                      id: companionId,
                      role: "companion",
                      text: "",
                      at: stamp,
                      streaming: true,
                      voiceStartedAt,
                      result: checked ? (result ?? undefined) : undefined,
                      source: checked ? scored : undefined,
                      orchestrated: checked && orchestrator ? true : undefined,
                      explanation,
                      contentQuestion,
                      attachmentText:
                        readResult && readResult.readable > 0
                          ? readResult.text
                          : undefined,
                      attachmentNote:
                        readResult &&
                        readResult.readable === 0 &&
                        !hasLinks &&
                        modelAttachments.length === 0
                          ? (readResult.reads.find((read) => read.note)?.note ??
                            "Tidak ada teks yang bisa dibaca dari lampiran itu.")
                          : undefined,
                      learningModules:
                        intent === "learning"
                          ? learningModulesFor(
                              text,
                              (active?.turns ?? [])
                                .filter(
                                  (turn) =>
                                    turn.role === "user" &&
                                    turn.lane !== "periksa",
                                )
                                .map((turn) => turn.text),
                            )
                          : undefined,
                      ocrConfidence: transcription.text
                        ? extractEntities(transcription.text).confidence
                        : undefined,
                      recallText:
                        transcription.items.length > 0
                          ? transcription.items
                              .map((item) => item.text)
                              .join("\n\n")
                              .slice(0, 6000)
                          : undefined,
                      trace: openTrace ?? undefined,
                    },
                  ],
                }
              : session,
          ),
        );
        persistSession({
          id: conversationId,
          title: metadataTitle,
          turns: (active?.turns.length ?? 0) + 2,
          risk: checked ? (result?.risk ?? active?.risk) : active?.risk,
        });

        const patchCompanion = (patch: (turn: Turn) => Turn) =>
          setSessions((prev) =>
            prev.map((session) =>
              session.id === target
                ? {
                    ...session,
                    turns: session.turns.map((turn) =>
                      turn.id === companionId ? patch(turn) : turn,
                    ),
                  }
                : session,
            ),
          );

        /**
         * A chunk is only appended while the turn is still streaming.
         *
         * This is the epoch guard: once `finish()` seals a turn, a chunk that
         * arrives late from a slow socket has nowhere to land. Without it, a
         * timed-out turn could regain text after the template was shown.
         */
        const appendText = (chunk: string) => {
          if (chunk) streamedRef.current += chunk;
          patchCompanion((turn) =>
            turn.streaming ? { ...turn, text: turn.text + chunk } : turn,
          );
        };

        /**
         * Why the words came from a template, in the reader's language.
         *
         * Four different failures used to share one sentence, and that sentence
         * claimed the model was not configured. When the real cause was a slow
         * network, the interface was lying about its own setup.
         */
        const templateNote = (reason: VoiceOutcome): string => {
          if (reason === "timeout") {
            return "Model terlalu lambat menjawab; jawaban disusun dari templat.";
          }
          if (reason === "truncated") {
            return "Jawaban model terpotong di tengah; jawaban disusun ulang dari templat.";
          }
          if (reason === "unconfigured") {
            return "Model tidak dikonfigurasi; jawaban disusun dari templat.";
          }
          return "Model gagal dihubungi; jawaban disusun dari templat.";
        };

        const finish = (
          finalText: string,
          voice: "model" | "template",
          reason?: VoiceOutcome,
          finalResult?: ScoreResult,
          failure?: VoiceOutcome,
          note?: string,
        ) => {
          if (sealed) return;
          sealed = true;
          const voiceMs = Date.now() - voiceStartedAt;
          patchCompanion((turn) => ({
            ...turn,
            text: finalText,
            streaming: false,
            voiceStartedAt: undefined,
            failure,
            lane,
            laneSource: lane === "tanya" ? text : undefined,
            result: checked
              ? (finalResult ?? result ?? undefined)
              : (finalResult ?? undefined),
            source: checked ? scored : undefined,
            explanation,
            trace: turn.trace
              ? {
                  // Replace the open `berjalan` stage rather than appending a
                  // second one: one stage, one outcome.
                  stages: turn.trace.stages.map((stage) =>
                    stage.id === "voice"
                      ? {
                          ...stage,
                          status: note
                            ? "dilewati"
                            : voice === "model"
                              ? "selesai"
                              : failure
                                ? "gagal"
                                : "dilewati",
                          ms: voiceMs,
                          note:
                            note ??
                            (voice === "model"
                              ? reason === "truncated"
                                ? "Jawaban terpotong; bagian yang sudah tampil dipertahankan."
                                : undefined
                              : failure
                                ? failureNote(reason ?? "failed")
                                : templateNote(reason ?? "unconfigured")),
                        }
                      : stage,
                  ),
                  totalMs: detectorMs + voiceMs,
                }
              : undefined,
          }));
          if (checked && result && openTrace) {
            const caseTrace: AgentTrace = {
              ...openTrace,
              totalMs: detectorMs + voiceMs,
              stages: openTrace.stages.map((stage) =>
                stage.id === "voice"
                  ? {
                      ...stage,
                      status:
                        voice === "model"
                          ? "selesai"
                          : failure
                            ? "gagal"
                            : "dilewati",
                      ms: voiceMs,
                    }
                  : stage,
              ),
            };
            void sessionCases
              .record(scored, result, caseTrace)
              .then((item) =>
                patchCompanion((turn) => ({ ...turn, caseId: item.id })),
              )
              .catch(() => {});
          }
          release();
        };
        let sealed = false;

        /**
         * The model lane failed. Seal the turn with no text and keep the
         * deterministic verdict: an honest failure plus a retry beats a
         * templated answer that looks like the model spoke.
         */
        const fail = (reason: VoiceOutcome, finalResult?: ScoreResult) => {
          finish("", "template", reason, finalResult, reason);
        };

        /*
         * The follow-up lane answers *from* the verdict it followed, so it must
         * carry that verdict: `buildAnswerRequest` forwards the digest only for
         * `lanjutan`, and the route's prompt expects one. Without this the model
         * saw `digest: null` and could only speak from the tactics.
         */
        const digestOf = (verdict: ScoreResult): VoiceDigest =>
          voiceDigest(
            verdict,
            modusFor(verdict.relatedModule)?.nama ?? verdict.modus,
          );

        const digest: VoiceDigest | null =
          checked && result
            ? digestOf(result)
            : lane === "lanjutan" && latestResult
              ? digestOf(latestResult)
              : null;

        /*
         * History for the chat lane. A turn that was checked carries the message
         * someone received, so it is filtered out here rather than trusted to be
         * dropped inside the route: the schema is strict, but the client decides
         * what it is allowed to see.
         */
        const chatHistory = (active?.turns ?? [])
          .filter(
            (turn) =>
              !privateIds.has(turn.id) &&
              turn.text.trim().length > 0 &&
              (turn.lane === "tanya" ||
                turn.lane === "obrolan" ||
                turn.lane === "lanjutan"),
          )
          .map((turn) => ({
            role: turn.role,
            text: turn.text.slice(0, 2000),
          }));

        /*
         * 55 s for the planner + specialists + synthesizer, under the route's
         * own 60 s deadline. The deterministic answer path still returns sooner.
         */
        const controller = control;
        const abortTimer = setTimeout(() => controller.abort(), 55000);
        pendingTimers.current.add(abortTimer);

        // Defensive: nothing below may leave `busy` stuck.
        try {
          if (
            tutorModule &&
            (attachments.length > 0 ||
              /https?:\/\/|\b(cek|periksa|analisis|analisa)\b/i.test(text))
          ) {
            finish(
              "Konteks materi sedang aktif. Untuk memeriksa pesan atau lampiran, tutup konteks modul lalu kirim lewat pemeriksa; isi ini tidak dikirim ke tutor.",
              "template",
            );
            return;
          }
          if (contentQuestion && modelAttachments.length === 0 && !hasLinks) {
            finish(
              readResult
                ? describeReads(readResult)
                : "Saya belum menemukan teks yang bisa dibaca dari lampiran itu.",
              "template",
              "failed",
            );
            return;
          }
          if (lane !== "periksa" && text.length > 2000) {
            finish(
              "Pertanyaan maksimal 2.000 karakter. Ringkas pertanyaanmu lalu kirim lagi.",
              "template",
              "failed",
            );
            return;
          }
          if (lane === "periksa") {
            if (!digest) {
              finish(
                composeReply(text || attachments[0]?.name || "", null, {
                  first: false,
                  containsContent: false,
                }),
                "template",
                "unconfigured",
              );
              return;
            }

            /*
             * The real multi-agent path, including checks that carry an image
             * or file. The attachment text is already folded into `scored` by
             * the OCR step. Any failure falls through to the voice call below.
             */
            if (orchestrator) {
              /*
               * An attachment can contain a URL, but the orchestrator's link
               * specialist pre-calls url.vet without the Companion consent
               * card. Redact attachment URLs before the agent sees them; the
               * local detector already scored the original text.
               */
              const orchestratorMessage = hasAttachments
                ? extractLinks(scored).reduce(
                    (clean, link) =>
                      clean.split(link).join("[tautan tidak dipindai]"),
                    scored,
                  )
                : scored;
              let pendingDelta = "";
              let flushTimer: number | null = null;
              const flushDelta = () => {
                if (flushTimer !== null) {
                  clearTimeout(flushTimer);
                  flushTimer = null;
                }
                if (!pendingDelta) return;
                const chunk = pendingDelta;
                pendingDelta = "";
                appendText(chunk);
              };
              const queueDelta = (chunk: string) => {
                pendingDelta += chunk;
                if (flushTimer === null)
                  flushTimer = window.setTimeout(flushDelta, 50);
              };
              const orchestrated = await streamOrchestrator(
                {
                  lane: "periksa",
                  caseId: conversationId,
                  question: (
                    text.trim() ||
                    (hasImages
                      ? "Periksa isi gambar ini."
                      : "Periksa lampiran ini.")
                  ).slice(0, 2_000),
                  message:
                    orchestratorMessage.slice(0, 20_000) ||
                    attachments[0]?.name ||
                    "Lampiran tanpa teks.",
                  history: chatHistory.slice(-10),
                  priorTurns: priorTurns
                    .map((turn) => turn.text.slice(0, 20_000))
                    .slice(-5),
                  consent: true,
                },
                {
                  signal: controller.signal,
                  onEvent: (event) => {
                    patchCompanion((turn) => ({
                      ...turn,
                      orchestration: [...(turn.orchestration ?? []), event],
                      ...(event.type === "score_decision" && event.result
                        ? { result: event.result as ScoreResult }
                        : {}),
                    }));
                    if (event.type === "synthesis_delta")
                      queueDelta(event.text);
                  },
                },
              );
              if (stoppedRef.current) {
                flushDelta();
                finish(
                  orchestrated.text.trim() ||
                    streamedRef.current.trim() ||
                    "Dihentikan.",
                  "model",
                  undefined,
                  orchestrated.score ?? undefined,
                  undefined,
                  "Dihentikan pengguna.",
                );
                return;
              }
              flushDelta();
              if (
                orchestrated.outcome === "model" &&
                orchestrated.text.trim().length > 0
              ) {
                finish(
                  orchestrated.text,
                  "model",
                  undefined,
                  orchestrated.score ?? undefined,
                );
                return;
              }
            }

            if (stoppedRef.current) {
              finish(
                streamedRef.current.trim() || "Dihentikan.",
                "template",
                undefined,
                undefined,
                undefined,
                "Dihentikan pengguna.",
              );
              return;
            }

            const voice = await requestReply(
              digest,
              appendText,
              controller.signal,
            );
            if (stoppedRef.current) {
              finish(
                voice.text.trim() ||
                  streamedRef.current.trim() ||
                  "Dihentikan.",
                voice.text.trim() ? "model" : "template",
                undefined,
                undefined,
                undefined,
                "Dihentikan pengguna.",
              );
              return;
            }

            /*
             * A reply that was cut but had already said something is kept.
             * `isComplete` treats a missing full stop as a failed answer, but the
             * reader has been watching those words arrive for two seconds —
             * replacing them is the "it is hardcoded" symptom. Below 40
             * characters there is effectively nothing to keep, so the template
             * takes over.
             */
            const partial = voice.text.trim();
            const keepPartial =
              voice.outcome === "truncated" && partial.length >= 40;

            if (voice.outcome === "model" || keepPartial) {
              // `finish` turns the `truncated` reason into a trace note on the
              // periksa card, so a kept partial answer is never labelled as a
              // clean finish.
              finish(partial, "model", keepPartial ? "truncated" : undefined);
            } else {
              fail(voice.outcome);
            }
            return;
          }

          const agentRequest = {
            ...buildAnswerRequest(lane, text, {
              history: chatHistory,
              digest,
              explanation: latestExplanation,
              contentQuestion,
              attachmentContext: modelAttachments,
              hasVerdict: checked || latestResult !== null,
              linkApproved: options.linkApproved,
              userName: session?.nama,
            }),
            ...(tutorModule ? { moduleNo: tutorModule.no } : {}),
          };

          const jobToolRef: {
            current: {
              args: LokerSearchArgs;
              matches: ReturnType<typeof filterPostings>;
            } | null;
          } = { current: null };
          let reportBlocked = false;

          const loop = await runAgentLoop({
            request: agentRequest,
            signal: controller.signal,
            execute: async (call: ToolCall) => {
              if (call.name === "report_draft") {
                if (!latestResult) {
                  reportBlocked = true;
                  return { kind: "terminal", terminal: "report" } as const;
                }
                const channels =
                  latestExplanation?.report ?? explain(latestResult, "").report;
                const requested = call.arguments.channel ?? null;
                const channel =
                  requested && channels.some((item) => item.id === requested)
                    ? requested
                    : null;
                patchCompanion((turn) => ({
                  ...turn,
                  report: { channel, result: latestResult, channels },
                }));
                return { kind: "terminal", terminal: "report" } as const;
              }

              if (call.name === "ask_link_check") {
                patchCompanion((turn) => ({
                  ...turn,
                  linkPrompt: { url: call.arguments.url },
                }));
                return { kind: "terminal", terminal: "link" } as const;
              }

              if (call.name === "check_link") {
                let observation: ToolObservation;
                try {
                  const response = await fetch("/api/link/verify", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ url: call.arguments.url }),
                    signal: controller.signal,
                  });
                  const json = (await response.json()) as
                    | { ok: true; verdict: LinkVerdict }
                    | { ok: false; error: string };
                  if (json.ok) {
                    patchCompanion((turn) => ({
                      ...turn,
                      link: json.verdict,
                    }));
                    observation = {
                      name: "check_link",
                      callId: call.id,
                      arguments: call.arguments,
                      ok: true,
                      result: {
                        verdict: json.verdict.verdict,
                        score: json.verdict.score,
                        badReasons: json.verdict.badReasons.slice(0, 5),
                        goodReasons: json.verdict.goodReasons.slice(0, 5),
                        incomplete: json.verdict.incomplete,
                        domain: json.verdict.domain,
                      },
                    };
                  } else {
                    const error =
                      json.error === "rate-limited" ||
                      json.error === "upstream-timeout" ||
                      json.error === "upstream-invalid" ||
                      json.error === "not-configured"
                        ? json.error
                        : "upstream-failed";
                    patchCompanion((turn) => ({
                      ...turn,
                      linkError:
                        error === "rate-limited"
                          ? "Batas pemeriksaan tautan tercapai. Coba lagi sebentar."
                          : error === "upstream-timeout"
                            ? "Pemeriksaan tautan melewati batas waktu."
                            : error === "not-configured"
                              ? "Pemeriksa tautan belum dikonfigurasi."
                              : "Pemeriksaan tautan gagal.",
                    }));
                    observation = {
                      name: "check_link",
                      callId: call.id,
                      arguments: call.arguments,
                      ok: false,
                      result: {
                        badReasons: [],
                        goodReasons: [],
                        incomplete: false,
                        error,
                      },
                    };
                  }
                } catch {
                  patchCompanion((turn) => ({
                    ...turn,
                    linkError: "Pemeriksaan tautan gagal.",
                  }));
                  observation = {
                    name: "check_link",
                    callId: call.id,
                    arguments: call.arguments,
                    ok: false,
                    result: {
                      badReasons: [],
                      goodReasons: [],
                      incomplete: false,
                      error: "upstream-failed",
                    },
                  };
                }

                return { kind: "observation", observation } as const;
              }

              const toolStarted = performance.now();
              const matches = filterPostings(corpus.postings, call.arguments);
              const toolMs = performance.now() - toolStarted;
              jobToolRef.current = { args: call.arguments, matches };

              const searchStage: AgentStage = {
                id: "job-search",
                ...STAGE_LABEL["job-search"],
                status: "selesai",
                findings: 0,
                ms: toolMs,
                note: `${matches.length} lowongan cocok`,
              };

              patchCompanion((turn) => ({
                ...turn,
                tool: {
                  args: call.arguments,
                  count: matches.length,
                  total: corpus.total,
                  capped: corpus.capped,
                  summary: null,
                  summaryState: "running",
                },
                trace: turn.trace
                  ? {
                      stages: [...turn.trace.stages, searchStage],
                      totalMs: turn.trace.totalMs + toolMs,
                    }
                  : { stages: [searchStage], totalMs: toolMs },
              }));

              /*
               * Phase 2 carries titles, companies, verdicts, and a count. The
               * query, descriptions, apply URLs, and the saved list never enter
               * this object, so the privacy boundary is the payload.
               */
              const observation: ToolObservation = {
                name: "job_search",
                callId: call.id,
                arguments: call.arguments,
                ok: true,
                result: {
                  count: matches.length,
                  total: corpus.total,
                  capped: corpus.capped,
                  postings: matches.slice(0, 5).map((item) => ({
                    title: item.title,
                    company: item.company,
                    sentinelStatus: item.sentinelStatus,
                    luminaRisk: item.luminaRisk,
                  })),
                },
              };
              return { kind: "observation", observation } as const;
            },
          });

          if (loop.terminal === "report") {
            if (reportBlocked) {
              finish(
                "Periksa pesan yang mencurigakan terlebih dahulu agar template laporan memakai temuan yang benar.",
                "template",
                "failed",
              );
              return;
            }
            finish(
              loop.text || "Template laporan sudah dibuka di bawah.",
              "model",
            );
            return;
          }

          if (loop.terminal === "link") {
            finish(
              loop.text ||
                "Mau saya periksa tautan ini dengan pemindai phishing? Hanya URL-nya yang dikirim ke url.vet; isi pesan tetap di perangkat.",
              "model",
            );
            return;
          }

          /*
           * The model may answer a link request without calling the tool. The
           * reader still gets the consent card instead of a silent scan or a
           * bare prose answer: no URL leaves the browser before approval.
           */
          if (
            !loop.terminal &&
            wantsLinkCheck(text) &&
            !loop.calls.some((call) => call.name === "check_link")
          ) {
            const pendingUrl = extractLinks(text)[0];
            if (pendingUrl) {
              patchCompanion((turn) => ({
                ...turn,
                linkPrompt: { url: pendingUrl },
              }));
              finish(
                "Mau saya periksa tautan ini dengan pemindai phishing? Hanya URL-nya yang dikirim ke url.vet; isi pesan tetap di perangkat.",
                "template",
              );
              return;
            }
          }

          if (stoppedRef.current) {
            finish(
              streamedRef.current.trim() || "Dihentikan.",
              "model",
              undefined,
              undefined,
              undefined,
              "Dihentikan pengguna.",
            );
            return;
          }

          if (loop.outcome === "model") {
            finish(loop.text, "model");
            const jobTool = jobToolRef.current;
            if (!jobTool) return;

            /*
             * The job summary is a second bubble only while the tool turn is
             * still the last thing in the thread. It runs after the loop so the
             * final answer is not pushed above its own card.
             */
            const { args, matches } = jobTool;
            const summaryControl = new AbortController();
            pendingControllers.current.add(summaryControl);
            const summaryTimer = setTimeout(
              () => summaryControl.abort(),
              21000,
            );
            pendingTimers.current.add(summaryTimer);
            let summary: string | null = null;
            try {
              summary = await requestToolSummary(
                {
                  count: matches.length,
                  postings: matches.slice(0, 20).map((item) => ({
                    title: item.title,
                    company: item.company,
                    sentinelStatus: item.sentinelStatus,
                    luminaRisk: item.luminaRisk,
                  })),
                },
                summaryControl.signal,
              );
            } finally {
              clearTimeout(summaryTimer);
              pendingTimers.current.delete(summaryTimer);
              pendingControllers.current.delete(summaryControl);
            }

            const sentence = summary ?? summaryFallback(matches);
            patchCompanion((turn) => ({
              ...turn,
              tool: turn.tool
                ? {
                    ...turn.tool,
                    args,
                    summary: sentence,
                    summaryState: summary ? "done" : "failed",
                  }
                : undefined,
            }));

            const summaryTurn: Turn = {
              id: id(),
              role: "companion",
              text: sentence,
              at: stamp,
            };
            setSessions((prev) =>
              prev.map((item) => {
                if (item.id !== target) return item;
                const last = item.turns[item.turns.length - 1];
                if (last?.id !== companionId) return item;
                return { ...item, turns: [...item.turns, summaryTurn] };
              }),
            );
            return;
          }

          fail(loop.outcome as VoiceOutcome);
        } catch {
          if (stoppedRef.current) {
            finish(
              streamedRef.current.trim() || "Dihentikan.",
              "model",
              undefined,
              undefined,
              undefined,
              "Dihentikan pengguna.",
            );
            return;
          }
          fail("failed");
        } finally {
          clearTimeout(abortTimer);
          pendingTimers.current.delete(abortTimer);
        }
      } finally {
        if (activeControlRef.current === control)
          activeControlRef.current = null;
        pendingControllers.current.delete(control);
        release();
      }
    },
    [
      active?.risk,
      active?.serverId,
      active?.title,
      active?.turns,
      activeId,
      busy,
      corpus,
      latestExplanation,
      latestResult,
      tutorModule,
      persistSession,
      session?.nama,
      orchestrator,
      sticky.arm,
    ],
  );

  /**
   * Retry a failed model turn without faking a result.
   *
   * The failed bubble and the user turn that produced it are removed, then the
   * same text and attachments are sent again. The check lane is preserved so a
   * retry of a `periksa` turn stays a check.
   */
  const retryTurn = (turn: Turn) => {
    if (busy || inFlight.current) return;
    const list = active?.turns ?? [];
    const index = list.findIndex((item) => item.id === turn.id);
    const userTurn = index > 0 ? list[index - 1] : undefined;
    if (!userTurn || userTurn.role !== "user") return;
    const removed = new Set([turn.id, userTurn.id]);
    setSessions((prev) =>
      prev.map((item) =>
        item.id === activeId
          ? { ...item, turns: item.turns.filter((t) => !removed.has(t.id)) }
          : item,
      ),
    );
    void send(
      userTurn.text,
      userTurn.attachments ?? [],
      turn.lane === "periksa" ? { force: "periksa" } : {},
    );
  };

  /**
   * The chip path: open the card with no filters and no model call.
   *
   * It still records a `job-search` stage, because the trace is the honest
   * record of what ran; it simply has no detector and no language stage. The
   * summary is skipped on purpose.
   */
  const openJobSearch = React.useCallback(() => {
    if (busy || inFlight.current) return;
    const target = activeId;
    if (target === undefined) return;

    const stamp = new Date().toISOString();
    const started = performance.now();
    const matches = filterPostings(corpus.postings, { query: "" });
    const toolMs = performance.now() - started;

    const searchStage: AgentStage = {
      id: "job-search",
      ...STAGE_LABEL["job-search"],
      status: "selesai",
      findings: 0,
      ms: toolMs,
      note: `${matches.length} lowongan cocok`,
    };

    const userTurn: Turn = {
      id: id(),
      role: "user",
      text: "Cari lowongan",
      at: stamp,
      lane: "obrolan",
    };
    const cardTurn: Turn = {
      id: id(),
      role: "companion",
      text: "",
      at: stamp,
      tool: {
        args: { query: "" },
        count: matches.length,
        total: corpus.total,
        capped: corpus.capped,
        summary: null,
        summaryState: "idle",
      },
      trace: { stages: [searchStage], totalMs: toolMs },
    };

    setSessions((prev) =>
      prev.map((item) =>
        item.id === target
          ? {
              ...item,
              title: item.turns.length === 0 ? "Cari lowongan" : item.title,
              time: stamp.slice(11, 16),
              updatedAt: new Date(stamp).getTime(),
              turns: [...item.turns, userTurn, cardTurn],
            }
          : item,
      ),
    );
  }, [activeId, busy, corpus]);

  const startNew = () => {
    /*
     * `/agen` is the overview's own address. A blank conversation is a
     * different surface, so leave the agent route instead of rendering the
     * composer under an `/agen` URL.
     */
    if (onAgentRoute) {
      router.push("/companion");
      return;
    }
    setShowSessions(false);
    setSelectedAgent(null);

    /*
     * A blank screen is already a new conversation. Pressing the button again
     * while nothing has been said must reuse that screen, not pile another
     * empty "Percakapan baru" into history. `sessions` is newest first, so the
     * nearest blank screen is the one the reader just left.
     */
    const blank = sessions.find(
      (session) => session.turns.length === 0 && !session.serverId,
    );
    if (blank) {
      setSelectedId(blank.id);
      return;
    }

    const session = newSession();
    setSessions((prev) => [session, ...prev]);
    setSelectedId(session.id);
  };

  /**
   * "Agen" is its own address (`/agen`), so the sidebar row is a plain link.
   * The empty-state card still has to navigate from the conversation.
   */
  const openAgents = () => {
    setShowSessions(false);
    router.push("/agen");
  };

  React.useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void listConversationHistory()
      .then((result) => {
        if (cancelled || !result.ok) return;
        setSessions((prev) => {
          const known = new Set(
            prev.map((item) => item.serverId).filter(Boolean),
          );
          const loaded = result.conversations
            .filter((item) => !known.has(item.id))
            .map(
              (item): Session => ({
                id: id(),
                serverId: item.id,
                title: item.title,
                turns: [],
                risk: item.risk ?? undefined,
                time: item.updatedAt.slice(11, 16),
                updatedAt: new Date(item.updatedAt).getTime(),
              }),
            );
          return loaded.length ? [...prev, ...loaded] : prev;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session]);

  /**
   * The header's "Ekspor percakapan" is the reference's Export chat, wired to
   * the only export that is honest here: the thread the reader can already see,
   * as a plain download. History never leaves the tab (§11.6) — the file is
   * built from the same state that renders the transcript, no network call.
   */
  const exportThread = () => {
    const lines = turns.map((turn) => {
      const who = turn.role === "user" ? "Kamu" : "Lumina";
      const verdict = turn.result
        ? `\n[skor ${turn.result.score}/100 · ${turn.result.risk}]`
        : "";
      return `${who}${turn.at ? ` · ${turn.at}` : ""}\n${turn.text}${verdict}`;
    });
    const blob = new Blob(
      [
        `${active?.title ?? "Percakapan"}\n${"=".repeat(40)}\n\n${lines.join("\n\n")}\n`,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(active?.title ?? "percakapan").replace(/[^\w\s-]/g, "").trim() || "percakapan"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyThreadLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedThread(true);
      window.setTimeout(() => setCopiedThread(false), 1600);
    } catch {
      // No clipboard permission — the reader still has the address bar.
    }
  };

  const empty = turns.length === 0;
  const contentTop = tutorModule ? "pt-4" : "pt-[76px]";

  return (
    <div
      data-workspace
      className="companion-font relative flex h-full min-h-0 flex-col overflow-x-hidden bg-bg select-none"
    >
      {/*
        One live region for the whole shell, outside the transcript's
        `role="log"`. AgentRun suppresses its own region here so the summary is
        announced once, whether the Agents view or the transcript is on screen.
      */}
      <output
        data-testid="run-announcement"
        className="sr-only"
        aria-live="polite"
      >
        {agentsAnnouncement}
      </output>
      <div className="relative z-10 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-0 overflow-hidden md:flex-row">
        <SessionSidebar
          sessions={conversations}
          activeId={activeId}
          onSelect={(sessionId) => {
            // A conversation belongs to `/companion`; `/agen` is the overview.
            if (onAgentRoute) {
              setSelectedId(sessionId);
              setShowSessions(false);
              router.push("/companion");
              return;
            }
            setSelectedId(sessionId);
            setShowSessions(false);
            setSelectedAgent(null);
          }}
          onNew={startNew}
          onClose={() => setShowSessions(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          auth={(iconsOnly) => (
            <CompanionAuth session={session} iconsOnly={iconsOnly} />
          )}
          className={cn(
            "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:rounded-r-xl max-md:border-line max-md:border-r-2 max-md:bg-bg max-md:shadow-rest md:z-10 md:bg-transparent",
            showSessions ? "max-md:flex" : "max-md:hidden",
          )}
        />

        {/*
         * The drawer is 220px wide, so the remaining 100–200px of the page is
         * still on screen. Without a scrim that strip stays tappable and the
         * chat behind the drawer scrolls; the drawer stops reading as an
         * overlay. It sits above the header (z-20) and below the sidebar (z-40).
         */}
        {showSessions ? (
          <button
            type="button"
            aria-label="Tutup navigasi"
            onClick={() => setShowSessions(false)}
            className="fixed inset-0 z-30 bg-ink/25 md:hidden"
          />
        ) : null}

        {/* Main panel: the conversation column shares the workspace ground. */}
        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className={cn(
              "absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-4 pt-4 pb-2 pointer-events-none sm:px-5 [&_a]:pointer-events-auto [&_button]:pointer-events-auto",
              showAgents && "md:hidden",
            )}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSessions((v) => !v)}
                aria-label="Buka navigasi"
                title="Buka navigasi"
                aria-expanded={showSessions}
                className="size-11 shrink-0 rounded-full bg-chip text-ink-mute hover:bg-chip-hover hover:text-ink md:hidden"
              >
                <PanelLeftOpen
                  aria-hidden
                  strokeWidth={1.6}
                  className="size-4"
                />
              </Button>

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
                <span className="truncate font-medium font-serif text-[12px] text-txt">
                  {showAgents
                    ? "Agen pemeriksa"
                    : (active?.title ?? "Percakapan baru")}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    showAgents
                      ? "hidden"
                      : panelResult
                        ? RISK_DOT[panelResult.risk]
                        : "bg-dim/50",
                  )}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Opsi percakapan"
                      className="-mr-1 grid size-[22px] shrink-0 place-items-center rounded-full text-ink-faint outline-none transition-colors hover:bg-chip hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-glow"
                    >
                      <ChevronDown
                        aria-hidden
                        strokeWidth={1.9}
                        className="size-3"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel className="truncate font-medium text-[11px] text-ink-faint">
                      {active?.title ?? "Percakapan baru"}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={startNew}>
                      <SquarePen aria-hidden strokeWidth={1.7} />
                      Percakapan baru
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={exportThread}>
                      <Download aria-hidden strokeWidth={1.7} />
                      Ekspor percakapan
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="lg:hidden"
                      onSelect={() => setShowEvidence(true)}
                    >
                      <Workflow aria-hidden strokeWidth={1.7} />
                      Buka panel bukti
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled>
                      <History aria-hidden strokeWidth={1.7} />
                      Judul riwayat tersimpan di akun
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                aria-label={copiedThread ? "Tautan disalin" : "Salin tautan"}
                onClick={copyThreadLink}
                className="hidden size-10 shrink-0 rounded-full border border-line bg-panel text-ink-soft shadow-sm transition-colors hover:bg-panel-2 hover:text-txt lg:grid"
              >
                <span className="relative grid size-4 place-items-center">
                  <Check
                    aria-hidden
                    strokeWidth={1.8}
                    className={cn(
                      "col-start-1 row-start-1 size-4 transition-[opacity,scale] duration-150",
                      copiedThread
                        ? "scale-100 opacity-100"
                        : "scale-75 opacity-0",
                    )}
                  />
                  <Link2
                    aria-hidden
                    strokeWidth={1.7}
                    className={cn(
                      "col-start-1 row-start-1 size-4 transition-[opacity,scale] duration-150",
                      copiedThread
                        ? "scale-75 opacity-0"
                        : "scale-100 opacity-100",
                    )}
                  />
                </span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportThread}
                className="hidden h-10 gap-1.5 rounded-full border border-line bg-panel px-4 text-xs font-medium text-txt shadow-sm transition-colors hover:bg-panel-2 lg:flex"
              >
                <Download aria-hidden strokeWidth={1.7} className="size-3.5" />
                Ekspor percakapan
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={startNew}
                aria-label="Percakapan baru"
                className="h-11 gap-1.5 rounded-full bg-brand-soft px-3 text-[12px] font-medium text-brand-ink hover:bg-brand-soft-2 max-md:size-11 max-md:px-0 lg:hidden"
              >
                <SquarePen aria-hidden strokeWidth={1.6} className="size-3.5" />
                <span className="max-md:sr-only">Percakapan baru</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEvidence((v) => !v)}
                aria-label={showAgents ? "Detail agen" : "Panel bukti"}
                aria-expanded={showEvidence}
                className="h-11 gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 text-[11.5px] text-brand-ink hover:bg-brand-soft-2 hover:text-brand-strong max-sm:w-11 max-sm:justify-center max-sm:px-0 lg:hidden"
              >
                <Workflow aria-hidden strokeWidth={1.6} className="size-3.5" />
                <span aria-hidden className="hidden sm:inline">
                  Agen
                </span>
              </Button>
              <Button
                asChild
                size="sm"
                className="hidden h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-panel shadow-[0_10px_22px_-14px_color-mix(in_oklab,var(--lumina-brand)_85%,transparent)] hover:bg-brand-strong lg:inline-flex"
              >
                <Link href="/komunitas">
                  <Users aria-hidden strokeWidth={1.9} className="size-3.5" />
                  Komunitas
                </Link>
              </Button>
              {!showAgents && evidenceCollapsed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Buka panel bukti"
                  aria-expanded={false}
                  onClick={() => setEvidenceCollapsed(false)}
                  className="hidden size-10 shrink-0 rounded-[10px] border border-hairline-strong bg-panel text-ink-soft shadow-sm transition-colors hover:bg-panel-2 hover:text-txt lg:grid"
                >
                  <PanelRightOpen
                    aria-hidden
                    strokeWidth={1.7}
                    className="size-4"
                  />
                </Button>
              ) : null}
            </div>
          </header>

          {tutorModule && (
            <div className="flex flex-wrap items-center gap-2 px-4 pt-[76px] pb-2 text-sm">
              <span>
                Modul {tutorModule.no}: {tutorModule.title}
              </span>
              <Button
                variant="outline"
                className="min-h-11"
                aria-label="Tutup konteks materi"
                onClick={() => setTutorModule(undefined)}
              >
                Tutup konteks
              </Button>
            </div>
          )}
          {showAgents ? (
            <div
              className={cn(
                "min-h-0 flex-1 pb-4 pr-2.5 pl-4 md:py-4 xl:py-5 xl:pr-3 xl:pl-5",
                tutorModule ? "pt-4" : "pt-[76px]",
              )}
            >
              <AgentsView
                latestRun={latestRun}
                onSelect={(agent) => {
                  setSelectedAgent(agent);
                  // Picking an agent is a request to read its explanation, so
                  // reopen the detail column instead of leaving the user to
                  // discover the separate top-right toggle.
                  setEvidenceCollapsed(false);
                }}
                selected={selectedAgent}
                onExport={exportThread}
                onCopyLink={copyThreadLink}
                copied={copiedThread}
              />
            </div>
          ) : empty ? (
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 sm:px-6",
                contentTop,
              )}
            >
              <div className="mx-auto my-auto flex w-full max-w-[840px] flex-col items-center py-2">
                <div className="mb-2 flex items-center justify-center">
                  <Mascot
                    className="pointer-events-none h-[94px] w-[129px] select-none"
                    effect
                  />
                </div>

                <h1 className="text-center font-semibold font-serif text-[24px] leading-[1.2] tracking-[-0.015em] sm:text-[26px]">
                  <span className="bg-[linear-gradient(90deg,var(--lumina-brand-glow)_0%,var(--lumina-brand-ink-soft)_50%,var(--lumina-brand-glow)_100%)] bg-clip-text text-transparent">
                    Periksa sebelum
                  </span>
                </h1>
                <h2 className="mt-0.5 text-center font-semibold font-serif text-[24px] leading-[1.22] tracking-[-0.015em] text-ink sm:text-[26px]">
                  kamu percaya.
                </h2>

                {active?.serverId ? (
                  <p className="mt-3 max-w-[520px] text-center text-dim text-xs leading-relaxed">
                    Riwayat ini tersimpan sebagai judul di akunmu. Isi
                    percakapan tetap di perangkat tempat ia dibuat, jadi
                    transkripnya tidak bisa dibuka di sini.
                  </p>
                ) : null}

                <div className="mt-5 w-full max-w-[520px]">
                  <Composer
                    key={composerSeed.nonce}
                    initialDraft={composerSeed.text}
                    onSubmit={(text, attachments) => send(text, attachments)}
                    busy={busy}
                    onSearchJobs={openJobSearch}
                    onStop={stop}
                    autoFocus
                    placeholder="Tempel pesan, lampirkan tangkapan layar, atau tulis pertanyaanmu…"
                  />
                </div>

                <div className="mt-4 w-full">
                  <CompanionQuickCards
                    name={session?.nama}
                    history={recentAgentRuns}
                    onFeature={prefillComposer}
                    onOpenHistory={openAgents}
                    onResume={(sessionId) => {
                      setSelectedId(sessionId);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div
                key={active?.id ?? "new"}
                ref={sticky.ref}
                onScroll={sticky.onScroll}
                style={{ paddingBottom: composerHeight + 8 }}
                className={cn(
                  "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 [scrollbar-gutter:stable] motion-safe:animate-in motion-safe:fade-in-0 duration-150 sm:px-6",
                  contentTop,
                )}
                role="log"
                aria-live="polite"
                aria-label="Percakapan"
              >
                {turns.map((turn, turnIndex) =>
                  turn.role === "user" ? (
                    <div
                      key={turn.id}
                      data-turn
                      data-turn-id={turn.id}
                      className="mx-auto w-full max-w-[820px]"
                    >
                      <div className="flex flex-col items-end gap-1.5">
                        {turn.text ? (
                          <p className="max-w-[85%] whitespace-pre-wrap rounded-[14px] border border-brand bg-panel px-4 py-2.5 font-normal text-[15px] text-txt leading-relaxed tracking-normal shadow-rest sm:text-[14px]">
                            <DetectionText
                              activeQuote={
                                activeHighlight?.turnId === turn.id
                                  ? activeHighlight.quote
                                  : null
                              }
                              highlights={
                                highlightsByUserTurn.get(turn.id) ?? []
                              }
                              onSelect={(quote) =>
                                selectEvidence(quote, turn.id)
                              }
                              text={turn.text}
                            />
                          </p>
                        ) : null}
                        {activeHighlight?.turnId === turn.id ? (
                          <HighlightExplanation
                            quote={activeHighlight.quote}
                            details={
                              (segmentsByUserTurn.get(turn.id) ?? []).find(
                                (segment) =>
                                  segment.quote !== null &&
                                  highlightQuoteKey(segment.quote) ===
                                    highlightQuoteKey(activeHighlight.quote),
                              )?.details ?? []
                            }
                          />
                        ) : null}

                        {turn.attachments?.length ? (
                          <ul className="flex flex-wrap justify-end gap-1.5">
                            {turn.attachments.map((attachment) => (
                              <li
                                key={attachment.id}
                                className="overflow-hidden rounded-sm border border-line bg-panel-2"
                              >
                                {isImageAttachment(attachment) &&
                                attachment.url ? (
                                  <span className="block size-20">
                                    {/* biome-ignore lint/performance/noImgElement: a blob: URL from a local File cannot go through next/image */}
                                    <img
                                      src={attachment.url}
                                      alt={attachment.name}
                                      className="size-full object-contain"
                                    />
                                  </span>
                                ) : (
                                  <span className="flex max-w-[10rem] items-center gap-1.5 px-2 py-1.5">
                                    <Paperclip
                                      aria-hidden
                                      strokeWidth={1.5}
                                      className="size-3 shrink-0 text-dim"
                                    />
                                    <span className="min-w-0">
                                      <span className="block truncate text-[0.7rem] text-txt">
                                        {attachment.name}
                                      </span>
                                      <span className="tabular block text-[0.6rem] text-dim">
                                        {formatAttachmentSize(attachment.size)}
                                      </span>
                                    </span>
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {readingAt?.turnId === turn.id ? (
                          <div className="self-start">
                            <ThinkingRow
                              label="Membaca lampiran"
                              startedAt={readingAt.at}
                            />
                          </div>
                        ) : null}

                        {turn.visionNote ? (
                          <p className="max-w-[85%] text-right text-[11px] text-danger leading-snug">
                            {turn.visionNote}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={turn.id}
                      data-turn
                      className="mx-auto flex w-full max-w-[820px] flex-col gap-2"
                    >
                      {turn.orchestration && turn.orchestration.length > 0 ? (
                        <ProcessTrace
                          events={turn.orchestration}
                          live={turn.streaming}
                          startedAt={turn.voiceStartedAt}
                        />
                      ) : turn.trace ? (
                        <AgentRun
                          trace={turn.trace}
                          result={turn.result}
                          live={turn.streaming === true}
                          announce={false}
                        />
                      ) : null}

                      {turn.streaming &&
                      turn.text.length === 0 &&
                      !turn.trace &&
                      !turn.orchestration ? (
                        <ThinkingRow
                          label="Menyusun jawaban"
                          startedAt={turn.voiceStartedAt ?? null}
                        />
                      ) : null}

                      {turn.text.length > 0 ? (
                        <CompanionMarkdown
                          content={turn.text}
                          streaming={turn.streaming}
                        />
                      ) : null}

                      {turn.failure && turn.text.length === 0 ? (
                        <div className="max-w-[92%] rounded-[12px] border border-line bg-panel-2 px-3.5 py-3">
                          <p className="flex items-start gap-2 text-[13px] leading-relaxed">
                            <TriangleAlert
                              aria-hidden
                              strokeWidth={1.75}
                              className="mt-0.5 size-4 shrink-0 text-warn"
                            />
                            <span>
                              <span className="font-medium text-txt">
                                {failureHeadline(turn.failure)}
                              </span>{" "}
                              <span className="text-dim">
                                {failureHint(turn.failure)}
                              </span>
                            </span>
                          </p>
                          <Button
                            className="mt-2.5 min-h-9"
                            onClick={() => retryTurn(turn)}
                            size="sm"
                            variant="outline"
                          >
                            <RotateCcw
                              aria-hidden
                              strokeWidth={1.75}
                              className="size-3.5"
                            />
                            Coba lagi
                          </Button>
                        </div>
                      ) : null}

                      {turn.attachmentNote ? (
                        <p className="max-w-[92%] text-[12px] text-dim">
                          {turn.attachmentNote}
                        </p>
                      ) : null}

                      {turn.attachmentText ? (
                        <details className="max-w-[92%] rounded-[10px] border border-line bg-panel-2 px-3 py-2 text-[12px] text-txt">
                          <summary className="cursor-pointer select-none text-[11px] font-medium text-dim">
                            Teks yang terbaca dari lampiran
                          </summary>
                          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-sans text-[12px] leading-relaxed">
                            {turn.attachmentText}
                          </pre>
                        </details>
                      ) : null}

                      {turn.tool ? (
                        <LokerTool
                          corpus={corpus}
                          initialArgs={turn.tool.args}
                          summaryState={turn.tool.summaryState}
                          canRefresh={session !== null}
                          saved={saved}
                          onToggleSave={toggleSaved}
                        />
                      ) : null}

                      {turn.linkPrompt || turn.link || turn.linkError ? (
                        <LinkProcess turn={turn} />
                      ) : null}

                      {turn.linkPrompt ? (
                        <div className="max-w-[92%] rounded-[12px] border border-brand-edge bg-brand-soft/40 p-3 text-[12px]">
                          <p className="font-medium text-txt">
                            Periksa tautan ini dengan pemindai phishing?
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] text-dim">
                            {turn.linkPrompt.url}
                          </p>
                          <p className="mt-1.5 text-[10.5px] text-dim">
                            Hanya URL ini yang dikirim ke url.vet. Isi pesan
                            tetap di perangkat.
                          </p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Button
                              className="min-h-9"
                              onClick={() => {
                                const url = turn.linkPrompt?.url;
                                if (!url) return;
                                setSessions((prev) =>
                                  prev.map((session) =>
                                    session.id === activeId
                                      ? {
                                          ...session,
                                          turns: session.turns.map((item) =>
                                            item.id === turn.id
                                              ? {
                                                  ...item,
                                                  linkPrompt: undefined,
                                                }
                                              : item,
                                          ),
                                        }
                                      : session,
                                  ),
                                );
                                void send(
                                  `Ya, periksa tautan ${url} apakah aman?`,
                                  [],
                                  { linkApproved: url },
                                );
                              }}
                              size="sm"
                            >
                              Ya, periksa
                            </Button>
                            <Button
                              className="min-h-9"
                              onClick={() =>
                                setSessions((prev) =>
                                  prev.map((session) =>
                                    session.id === activeId
                                      ? {
                                          ...session,
                                          turns: session.turns.map((item) =>
                                            item.id === turn.id
                                              ? {
                                                  ...item,
                                                  linkPrompt: undefined,
                                                  text: "Baik, tautan tidak diperiksa.",
                                                }
                                              : item,
                                          ),
                                        }
                                      : session,
                                  ),
                                )
                              }
                              size="sm"
                              variant="outline"
                            >
                              Tidak
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {turn.link ? (
                        <div className="max-w-[92%] rounded-[12px] border border-line bg-panel-2 p-3 text-[12px]">
                          <p className="flex flex-wrap items-center gap-2 font-medium">
                            <span
                              className={cn(
                                turn.link.verdict === "Risky"
                                  ? "text-danger"
                                  : turn.link.verdict === "Suspicious"
                                    ? "text-warn"
                                    : "text-brand-ink",
                              )}
                            >
                              {turn.link.verdict === "Risky"
                                ? "Berisiko"
                                : turn.link.verdict === "Suspicious"
                                  ? "Mencurigakan"
                                  : "Aman"}
                            </span>
                            <span className="tabular text-[11px] text-dim">
                              {turn.link.score}/100
                            </span>
                            {turn.link.domain ? (
                              <span className="truncate text-[11px] text-dim">
                                {turn.link.domain}
                              </span>
                            ) : null}
                          </p>
                          {turn.link.badReasons.length > 0 ? (
                            <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4 text-[11px] text-txt/80">
                              {turn.link.badReasons
                                .slice(0, 3)
                                .map((reason) => (
                                  <li key={reason}>{reason}</li>
                                ))}
                            </ul>
                          ) : null}
                          {turn.link.incomplete ? (
                            <p className="mt-1 text-[10.5px] text-warn">
                              Sebagian pemeriksaan tidak selesai; ulangi bila
                              perlu.
                            </p>
                          ) : null}
                          <p className="mt-1.5 text-[10px] text-dim">
                            Diperiksa oleh url.vet · hanya tautan ini yang
                            dikirim
                          </p>
                        </div>
                      ) : null}

                      {turn.linkError ? (
                        <p className="max-w-[92%] text-[11px] text-dim">
                          {turn.linkError}
                        </p>
                      ) : null}

                      {turn.report ? (
                        <ReportTemplate
                          result={turn.report.result}
                          channels={turn.report.channels}
                          defaultOpen
                          initialChannel={turn.report.channel}
                        />
                      ) : null}

                      {turn.learningModules ? (
                        <div className="flex flex-wrap gap-2">
                          {turn.learningModules.map((no) => (
                            <Button
                              key={no}
                              asChild
                              variant="outline"
                              className="min-h-11 max-w-full whitespace-normal text-left"
                            >
                              <Link href={`/belajar/${no}`}>
                                {modusFor(no)?.nama ?? `Modul ${no}`}
                              </Link>
                            </Button>
                          ))}
                          <Button
                            asChild
                            variant="outline"
                            className="min-h-11"
                          >
                            <Link href="/belajar">Semua materi Belajar</Link>
                          </Button>
                        </div>
                      ) : null}

                      {turn.lane === "tanya" && turn.laneSource ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-dim text-[0.7rem]">
                            {turn.failure
                              ? "Dianggap pertanyaan"
                              : "Dijawab sebagai pertanyaan"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-dim text-xs hover:text-txt"
                            onClick={() =>
                              send(
                                turn.laneSource ?? "",
                                turns[turns.indexOf(turn) - 1]?.attachments ??
                                  [],
                                {
                                  force: "periksa",
                                  recheckOf: turn.id,
                                },
                              )
                            }
                          >
                            Periksa sebagai pesan
                          </Button>
                        </div>
                      ) : null}

                      {turn.result &&
                      (!turn.streaming ||
                        !turn.orchestrated ||
                        (turn.orchestration !== undefined &&
                          runSettled(turn.orchestration))) ? (
                        <>
                          {turn.ocrConfidence !== undefined && (
                            <p className="text-xs text-dim">
                              Kelengkapan entitas OCR:{" "}
                              {Math.round(turn.ocrConfidence * 100)}%. Ini
                              ukuran kelengkapan kolom, bukan kepastian deteksi.
                            </p>
                          )}
                          <ScoreCard
                            result={turn.result}
                            trace={turn.trace}
                            showEscalation={false}
                            showLinks={false}
                          />
                          {turn.explanation ? (
                            <ExplanationCard
                              explanation={turn.explanation}
                              schemeName={
                                modusFor(turn.result.relatedModule)?.nama ??
                                null
                              }
                              result={turn.result}
                              agentFindings={agentFindingsFrom(
                                turn.orchestration,
                              )}
                              hideReport={Boolean(turn.report)}
                            />
                          ) : null}
                          <ActionRow result={turn.result} />
                          {!turn.streaming && turn.source && turn.trace && (
                            <VerificationControls
                              text={turn.source}
                              initial={{
                                result: turn.result,
                                trace: turn.trace,
                              }}
                              attachments={
                                turns[turnIndex - 1]?.attachments ?? []
                              }
                              onResult={(updated) => {
                                setSessions((previous) =>
                                  previous.map((s) =>
                                    s.id === activeId
                                      ? {
                                          ...s,
                                          turns: s.turns.map((item) =>
                                            item.id === turn.id
                                              ? {
                                                  ...item,
                                                  result: updated.result,
                                                  explanation: explain(
                                                    updated.result,
                                                    turn.source ?? "",
                                                  ),
                                                  trace: {
                                                    ...updated.trace,
                                                    stages: [
                                                      ...updated.trace.stages.filter(
                                                        (stage) =>
                                                          ![
                                                            "voice",
                                                            "evidence",
                                                          ].includes(stage.id),
                                                      ),
                                                      ...(item.trace?.stages.filter(
                                                        (stage) =>
                                                          stage.id ===
                                                            "voice" ||
                                                          stage.id ===
                                                            "evidence",
                                                      ) ?? []),
                                                    ],
                                                  },
                                                  text:
                                                    updated.result.score >
                                                    (turn.result?.score ?? 0)
                                                      ? `${item.text}\n\nVerifikasi lanjutan menambah temuan. Lihat kartu hasil yang diperbarui.`
                                                      : item.text,
                                                }
                                              : item,
                                          ),
                                        }
                                      : s,
                                  ),
                                );
                              }}
                            />
                          )}
                          <Button
                            variant="ghost"
                            className="min-h-11 w-fit"
                            onClick={async () => {
                              if (!turn.result || !turn.trace) return;
                              try {
                                const record = await sessionCases.record(
                                  turn.source ?? "",
                                  turn.result,
                                  turn.trace,
                                  Date.now(),
                                  turn.caseId,
                                );
                                const data = JSON.stringify(
                                  {
                                    case: record,
                                    metrics: caseMetrics(sessionCases.list()),
                                  },
                                  null,
                                  2,
                                );
                                const url = URL.createObjectURL(
                                  new Blob([data], {
                                    type: "application/json",
                                  }),
                                );
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `lumina-trace-${record.id}.json`;
                                a.click();
                                setTimeout(
                                  () => URL.revokeObjectURL(url),
                                  1000,
                                );
                              } catch {
                                // Export is best-effort; the trace stays open.
                              }
                            }}
                          >
                            Ekspor jejak tanpa isi pesan
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ),
                )}
              </div>

              {!sticky.following ? (
                <button
                  type="button"
                  onClick={sticky.pin}
                  style={{ bottom: composerHeight + 12 }}
                  className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-2 text-[11px] font-medium text-txt shadow-rest hover:bg-panel-2"
                >
                  <ArrowDown aria-hidden className="size-3.5" /> Pesan baru
                </button>
              ) : null}

              {/*
               * The composer floats over the transcript tail instead of sitting
               * in the flow. As a hard sibling it ended the log on a straight
               * edge, so scrolling looked like content being chopped by a box.
               * The gradient lets the last rows slide under the field, and the
               * measured height keeps the newest turn reachable above it.
               */}
              <div
                ref={setComposerNode}
                className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pt-10 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 bottom-0 bg-gradient-to-t from-bg via-bg/90 to-transparent"
                />
                <div className="pointer-events-auto relative mx-auto w-full max-w-[640px]">
                  <Composer
                    onSubmit={(text, attachments) => send(text, attachments)}
                    busy={busy}
                    onSearchJobs={openJobSearch}
                    onStop={stop}
                    placeholder="Tempel pesan berikutnya…"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <aside
          className={cn(
            "hidden shrink-0 bg-transparent",
            evidenceCollapsed ? "" : "lg:block",
            evidenceCollapsed ? "w-[48px]" : "w-[376px] xl:w-[396px]",
          )}
        >
          {evidenceCollapsed ? null : showAgents ? (
            <div className="h-full py-4 pr-4 pl-2.5 xl:py-5 xl:pr-5 xl:pl-3">
              <AgentsDetailPanel
                action={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Ciutkan panel detail"
                    aria-expanded
                    onClick={() => setEvidenceCollapsed(true)}
                    className="size-8 rounded-[9px] border border-hairline-strong bg-panel text-ink-mute shadow-sm hover:bg-panel-2 hover:text-txt"
                  >
                    <X aria-hidden strokeWidth={1.8} className="size-4" />
                  </Button>
                }
                className="rounded-[22px] bg-panel shadow-lift ring-1 ring-edge/50"
                selected={selectedAgent}
              />
            </div>
          ) : (
            <div className="h-full py-4 pr-4 pl-2.5 xl:py-5 xl:pr-5 xl:pl-3">
              <SignalPanel
                action={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Ciutkan panel bukti"
                    aria-expanded
                    onClick={() => setEvidenceCollapsed(true)}
                    className="size-8 rounded-[9px] border border-hairline-strong bg-panel text-ink-mute shadow-sm hover:bg-panel-2 hover:text-txt"
                  >
                    <X aria-hidden strokeWidth={1.8} className="size-4" />
                  </Button>
                }
                className="rounded-[22px] bg-panel shadow-lift ring-1 ring-edge/50"
                evidence={evidence}
                link={panelLink}
                linkPending={panelLinkPending}
                onSelectEvidence={selectEvidence}
                result={panelResult}
                sequence={AGENT_SEQUENCE}
                titleId="panel-bukti-title"
                trace={panelTrace}
                running={running}
              />
            </div>
          )}
        </aside>

        {/*
         * Below `lg` the panel is a drawer, not a squeezed column. A 19rem column
         * at 1024px leaves the conversation unusable, and the panel is the thing
         * that must stay readable on a projector.
         */}
        <Sheet onOpenChange={setShowEvidence} open={showEvidence}>
          <SheetContent
            className="flex flex-col gap-0 overflow-hidden bg-bg p-0"
            showCloseButton={false}
            side="right"
          >
            <SheetTitle className="sr-only">
              {showAgents ? "Detail agen" : "Panel bukti"}
            </SheetTitle>
            {showAgents ? (
              <AgentsDetailPanel
                action={
                  <SheetClose asChild>
                    <Button
                      aria-label="Tutup detail agen"
                      className="size-11 rounded-[10px] border border-hairline-strong bg-panel text-ink-mute shadow-sm hover:bg-panel-2 hover:text-txt"
                      size="icon-xs"
                      variant="ghost"
                    >
                      <X />
                    </Button>
                  </SheetClose>
                }
                className="rounded-none border-0"
                selected={selectedAgent}
                titleId="panel-detail-title-sheet"
              />
            ) : (
              <SignalPanel
                action={
                  <SheetClose asChild>
                    <Button
                      aria-label="Tutup panel bukti"
                      className="size-11 rounded-[10px] border border-hairline-strong bg-panel text-ink-mute shadow-sm hover:bg-panel-2 hover:text-txt"
                      size="icon-xs"
                      variant="ghost"
                    >
                      <X />
                    </Button>
                  </SheetClose>
                }
                className="rounded-none border-0"
                evidence={evidence}
                link={panelLink}
                linkPending={panelLinkPending}
                onSelectEvidence={selectEvidence}
                result={panelResult}
                sequence={AGENT_SEQUENCE}
                titleId="panel-bukti-title-sheet"
                trace={panelTrace}
                running={running}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function ActionRow({ result }: { result: ScoreResult }) {
  const actions = suggestedActions(result);
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.href}
          asChild
          variant="outline"
          size="sm"
          className="border-line text-dim hover:text-txt"
        >
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ))}
    </div>
  );
}
