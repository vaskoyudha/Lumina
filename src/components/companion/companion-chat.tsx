"use client";

import {
  Check,
  ChevronDown,
  Download,
  History,
  Link2,
  PanelLeftOpen,
  PanelRightOpen,
  Paperclip,
  SquarePen,
  Workflow,
  X,
} from "lucide-react";
import Link from "next/link";
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
import {
  type Attachment,
  Composer,
  formatAttachmentSize,
  isImageAttachment,
  scoringTextWithAttachments,
} from "@/components/companion/composer";
import { EvidenceText } from "@/components/companion/evidence-text";
import { ExplanationCard } from "@/components/companion/explanation-card";
import { LokerTool } from "@/components/companion/loker-tool";
import { CompanionQuickCards } from "@/components/companion/quick-cards";
import { ScoreCard } from "@/components/companion/score-card";
import { SessionSidebar } from "@/components/companion/session-sidebar";
import { SignalPanel } from "@/components/companion/signal-panel";
import { ThinkingRow } from "@/components/companion/thinking-row";
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
import {
  buildAnswerRequest,
  requestAnswer,
} from "@/lib/companion/answer-client";
import { type Explanation, explain } from "@/lib/companion/explain";
import {
  composeAnswerFallback,
  composeReply,
  suggestedActions,
} from "@/lib/companion/reply";
import { requestToolSummary } from "@/lib/companion/tool-client";
import { isQuestionAbout, type Lane, planTurn } from "@/lib/companion/turn";
import { transcribeImages } from "@/lib/companion/vision-client";
import {
  type AgentStage,
  type AgentTrace,
  STAGE_LABEL,
  type VoiceDigest,
  voiceDigest,
} from "@/lib/contracts/agent-run";
import type { ScoreResult, Signal } from "@/lib/contracts/score";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { filterPostings } from "@/lib/loker/search";
import type { LokerCorpus, LokerSearchArgs } from "@/lib/loker/types";
import { useSavedLoker } from "@/lib/loker/use-saved";
import { modusFor } from "@/lib/modus";
import { scoreWithTrace } from "@/lib/scoring/score";
import { cn } from "@/lib/utils";

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
 *   a. History is React state only. The privacy promise (§11.6) says closing
 *      the tab loses the conversation, so there is no storage call here.
 *   b. The evidence panel is a real column on desktop, not a drawer, because
 *      the agent-by-agent evidence IS the argument the product makes.
 *   c. The sidebar second row is the manipulated risk band, not a timestamp —
 *      a judge scanning threads needs the verdict before opening one.
 */

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
  /** What the agents actually did for this turn, measured. */
  trace?: AgentTrace;
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
  /** The job-search card for this turn, when the tool ran. */
  tool?: LokerTurnTool;
}

interface LokerTurnTool {
  args: LokerSearchArgs;
  count: number;
  total: number;
  capped: boolean;
  summary: string | null;
  summaryState: "idle" | "running" | "done" | "failed";
}

interface Session {
  id: number;
  title: string;
  turns: Turn[];
  /** Band of the last check in this conversation, for the sidebar's second row. */
  risk?: "bersih" | "rendah" | "mencurigakan" | "tinggi";
  /** Short clock time, printed on the title row like the reference does. */
  time?: string;
  /** Epoch ms of the last turn, used to bucket the thread under Hari ini/Kemarin. */
  updatedAt?: number;
}

/**
 * A user turn borrows the findings of the companion answer that follows it.
 * A question-only turn has no result, and therefore nothing to highlight.
 */
function signalsForUserTurn(
  turns: readonly Turn[],
  index: number,
): readonly Signal[] {
  const next = turns[index + 1];
  return next?.role === "companion" ? (next.result?.signals ?? []) : [];
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
 * states the count and nothing the card does not already show.
 */
function summaryFallback(count: number): string {
  if (count === 0) {
    return "Tidak ada lowongan yang cocok dengan saringan itu.";
  }
  return `${count} lowongan cocok dengan saringan itu. Buka kartu untuk melihat dua penilaian tiap lowongan.`;
}

export function CompanionChat({
  session = null,
  initialPanel,
  corpus = EMPTY_CORPUS,
}: {
  session?: CompanionSession | null;
  /** Set when another surface links straight into the detector overview. */
  initialPanel?: "agen";
  /** The capped cumulative scan snapshot; the client filters it locally. */
  corpus?: LokerCorpus;
}) {
  const [sessions, setSessions] = React.useState<Session[]>(() => [
    newSession(),
  ]);
  /** `null` = the newest session, never a hardcoded id. */
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showEvidence, setShowEvidence] = React.useState(false);
  const [showSessions, setShowSessions] = React.useState(false);
  /** The center column's second view; the turns stay in state while it is away. */
  const [showAgents, setShowAgents] = React.useState(initialPanel === "agen");
  /** Seed for the empty-state composer: a nonce remounts it with new text. */
  const [composerSeed, setComposerSeed] = React.useState({
    text: "",
    nonce: 0,
  });
  /** Which agent's brief the right pane shows while the overview is open. */
  const [selectedAgent, setSelectedAgent] =
    React.useState<DetectorAgent | null>(AGENT_SEQUENCE[0]);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [evidenceCollapsed, setEvidenceCollapsed] = React.useState(false);
  const [copiedThread, setCopiedThread] = React.useState(false);
  const [activeEvidence, setActiveEvidence] = React.useState<string | null>(
    null,
  );
  const [agentsAnnouncement, setAgentsAnnouncement] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
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

  const selectEvidence = React.useCallback((evidence: string) => {
    setShowEvidence(false);
    setActiveEvidence((current) => (current === evidence ? null : evidence));
  }, []);

  /** Loads a prompt into the empty-state composer without sending it. */
  const prefillComposer = React.useCallback((text: string) => {
    setComposerSeed((prev) => ({ text, nonce: prev.nonce + 1 }));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on session change
  React.useEffect(() => {
    setActiveEvidence(null);
  }, [activeId]);

  React.useEffect(() => {
    if (activeEvidence === null) return;
    const target = Array.from(
      document.querySelectorAll<HTMLElement>("[data-evidence]"),
    ).find((element) => element.dataset.evidence === activeEvidence);
    target?.scrollIntoView?.({ behavior: "smooth", block: "center" });
  }, [activeEvidence]);

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
    () => sessions.filter((session) => session.turns.length > 0),
    [sessions],
  );

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
          source: turn.source ?? "",
          at: turn.at,
        };
      }
    }
    return null;
  }, [turns]);

  const latestResult = latestCheck?.result ?? null;
  const latestTrace = latestCheck?.trace ?? null;

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
        };
      }
    }
    return null;
  }, [turns]);

  const panelResult = liveCheck?.result ?? latestResult;
  const panelTrace = liveCheck?.trace ?? latestTrace;
  const running = liveCheck != null;

  const latestExplanation = React.useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const hit = turns[i]?.explanation;
      if (hit) return hit;
    }
    return null;
  }, [turns]);

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

  React.useEffect(() => {
    // `turns` is the trigger: this runs after every appended turn so the newest
    // one is anchored to the top of the log.
    if (turns.length === 0) return;
    const log = scrollRef.current;
    if (!log) return;
    const nodes = log.querySelectorAll<HTMLElement>("[data-turn]");
    const last = nodes[nodes.length - 1];
    if (last) log.scrollTop = last.offsetTop - log.offsetTop - 8;
  }, [turns]);

  const send = React.useCallback(
    async (
      raw: string,
      attachments: Attachment[] = [],
      options: { force?: "periksa" } = {},
    ) => {
      const text = raw.trim();
      if ((!text && attachments.length === 0) || busy) return;

      // Stamped here, never during render: Next 16 fails the prerender of a
      // client component that reads the clock while rendering.
      const stamp = new Date().toISOString();

      const target = activeId;
      if (target === undefined) return;

      /*
       * An image is evidence, not a concept question, so a turn with one is a
       * check even when the typed words look like a question. The lane is
       * therefore known before the pixels are read, which lets the user's
       * message appear immediately instead of after the transcription.
       */
      const hasImages = attachments.some(isImageAttachment);

      const userTurn: Turn = {
        id: id(),
        role: "user",
        text,
        attachments,
        at: stamp,
        lane: hasImages ? "periksa" : undefined,
      };

      if (hasImages) {
        setBusy(true);
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
       * a verdict.
       */
      const transcription = await transcribeImages(attachments);

      /*
       * A failed pixel read is a receipt, not a silent fallback. Without it the
       * turn still scores from the filename, and the reader would believe the
       * screenshot itself was examined.
       */
      if (hasImages && transcription.failed > 0) {
        setSessions((prev) =>
          prev.map((session) =>
            session.id === target
              ? {
                  ...session,
                  turns: session.turns.map((turn) =>
                    turn.id === userTurn.id
                      ? {
                          ...turn,
                          visionNote:
                            transcription.failed === transcription.attempted
                              ? `${transcription.failed} gambar gagal dibaca; pemeriksaan hanya memakai nama berkas.`
                              : `${transcription.failed} dari ${transcription.attempted} gambar gagal dibaca; sisanya diperiksa.`,
                        }
                      : turn,
                  ),
                }
              : session,
          ),
        );
      }

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
      const asked =
        options.force || hasImages
          ? false
          : isQuestionAbout(scored, { hasPriorVerdict: latestResult !== null });

      /*
       * Prior *checked* user turns go to the Conversation Agent so escalation
       * across messages is visible. Chat lanes are excluded on purpose: the
       * Conversation Agent models messages the user received, and feeding it
       * "apa itu dana?" because the word "dana" appears there would let a
       * question manufacture an escalation.
       */
      const priorTurns = (active?.turns ?? [])
        .filter(
          (turn) =>
            turn.role === "user" &&
            turn.lane === "periksa" &&
            turn.text.trim().length > 0,
        )
        .map((turn) => ({ text: turn.text }));

      const { result, trace } = asked
        ? { result: null, trace: null }
        : scoreWithTrace({ text: scored, turns: priorTurns });

      const plan = planTurn({
        text: scored,
        result,
        lastResult: latestResult,
        lastExplanation: latestExplanation,
        asked,
        attachments: attachments.length,
      });

      const lane: Lane = options.force ? "periksa" : plan.lane;

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
                  ? `${artifacts} kutipan tercatat untuk laporan`
                  : "Tidak ada kutipan yang bisa dicatat.",
            }
          : null;

      const stages: AgentStage[] =
        trace && checked
          ? [...trace.stages, ...(evidenceStage ? [evidenceStage] : [])]
          : [];
      const detectorMs = (trace?.totalMs ?? 0) + evidenceMs;

      const companionId = id();
      const voiceStartedAt = Date.now();

      /*
       * The language stage is attached immediately as `berjalan`, because it
       * genuinely is running from this moment. Attaching it only at the end
       * would let the header show a finished checkmark over work still in
       * flight — the one dishonest state this card could produce.
       */
      const openTrace: AgentTrace | null = checked
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

      setBusy(true);
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
                risk: checked ? (result?.risk ?? session.risk) : session.risk,
                turns: [
                  ...session.turns,
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
                    explanation,
                    trace: openTrace ?? undefined,
                  },
                ],
              }
            : session,
        ),
      );

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
      const appendText = (chunk: string) =>
        patchCompanion((turn) =>
          turn.streaming ? { ...turn, text: turn.text + chunk } : turn,
        );

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
      ) => {
        const voiceMs = Date.now() - voiceStartedAt;
        patchCompanion((turn) => ({
          ...turn,
          text: finalText,
          streaming: false,
          voiceStartedAt: undefined,
          lane,
          laneSource: lane === "tanya" ? text : undefined,
          result: checked ? (result ?? undefined) : undefined,
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
                        status: voice === "model" ? "selesai" : "dilewati",
                        ms: voiceMs,
                        note:
                          voice === "model"
                            ? reason === "truncated"
                              ? "Jawaban terpotong; bagian yang sudah tampil dipertahankan."
                              : undefined
                            : templateNote(reason ?? "unconfigured"),
                      }
                    : stage,
                ),
                totalMs: detectorMs + voiceMs,
              }
            : undefined,
        }));
        setBusy(false);
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
        .filter((turn) => turn.lane === "tanya" || turn.lane === "obrolan")
        .map((turn) => ({
          role: turn.role,
          text: turn.text.slice(0, 2000),
        }));

      /*
       * 23 s, above the route's 20 s so the server is always the one that
       * gives up first. Before this the call passed no signal at all: a
       * wedged socket left `busy` true and the composer disabled with no way
       * back.
       */
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 23000);

      // Defensive: nothing below may leave `busy` stuck.
      try {
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

          const voice = await requestReply(
            digest,
            appendText,
            controller.signal,
          );

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
            finish(
              composeReply(text || attachments[0]?.name || "", result, {
                first: false,
                containsContent: true,
              }),
              "template",
              voice.outcome,
            );
          }
          return;
        }

        const answer = await requestAnswer(
          buildAnswerRequest(lane, text, {
            history: chatHistory,
            digest,
            explanation: latestExplanation,
          }),
          controller.signal,
        );

        if (answer.outcome === "model") {
          finish(answer.text, "model");

          const call = answer.toolCalls[0];
          if (!call) return;

          const toolStarted = performance.now();
          const matches = filterPostings(corpus.postings, call.arguments);
          const toolMs = performance.now() - toolStarted;

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
          const summaryControl = new AbortController();
          const summaryTimer = setTimeout(() => summaryControl.abort(), 21000);
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
          }

          const sentence = summary ?? summaryFallback(matches.length);

          patchCompanion((turn) => ({
            ...turn,
            tool: turn.tool
              ? {
                  ...turn.tool,
                  summary: sentence,
                  summaryState: summary ? "done" : "failed",
                }
              : undefined,
          }));

          /*
           * The summary is a second companion bubble only while the tool turn
           * is still the last thing in the thread. If the reader already sent
           * another message, appending it would answer a question they moved
           * past.
           */
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

        finish(
          composeAnswerFallback(lane),
          "template",
          answer.outcome as VoiceOutcome,
        );
      } catch {
        finish(
          lane === "periksa"
            ? composeReply(text || attachments[0]?.name || "", result, {
                first: false,
                containsContent: checked,
              })
            : composeAnswerFallback(lane),
          "template",
          "failed",
        );
      } finally {
        clearTimeout(abortTimer);
      }
    },
    [active?.turns, activeId, busy, corpus, latestExplanation, latestResult],
  );

  /**
   * The chip path: open the card with no filters and no model call.
   *
   * It still records a `job-search` stage, because the trace is the honest
   * record of what ran; it simply has no detector and no language stage. The
   * summary is skipped on purpose.
   */
  const openJobSearch = React.useCallback(() => {
    if (busy) return;
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
    setShowSessions(false);
    setShowAgents(false);
    setSelectedAgent(null);

    /*
     * A blank screen is already a new conversation. Pressing the button again
     * while nothing has been said must reuse that screen, not pile another
     * empty "Percakapan baru" into history. `sessions` is newest first, so the
     * nearest blank screen is the one the reader just left.
     */
    const blank = sessions.find((session) => session.turns.length === 0);
    if (blank) {
      setSelectedId(blank.id);
      return;
    }

    const session = newSession();
    setSessions((prev) => [session, ...prev]);
    setSelectedId(session.id);
  };

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

  return (
    <div
      data-workspace
      className="relative flex h-full min-h-0 flex-col overflow-x-hidden bg-bg select-none"
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
            setSelectedId(sessionId);
            setShowSessions(false);
            setShowAgents(false);
            setSelectedAgent(null);
          }}
          onNew={startNew}
          onClose={() => setShowSessions(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          agentsActive={showAgents}
          onShowAgents={() => {
            setShowAgents(true);
            setSelectedAgent(AGENT_SEQUENCE[0]);
            setShowSessions(false);
            setAgentsAnnouncement("");
          }}
          onShowChat={() => {
            setShowAgents(false);
            setShowSessions(false);
          }}
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
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header
            className={cn(
              "relative z-20 flex shrink-0 items-center justify-between gap-2 px-4 pt-4 pb-2 sm:px-5",
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

              <div className="flex h-[32px] min-w-0 items-center gap-1.5 rounded-full border border-brand-line bg-panel px-2.5 shadow-rest">
                <span className="truncate font-medium text-[12px] text-txt">
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
                      : latestResult
                        ? RISK_DOT[latestResult.risk]
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
                      Riwayat hanya di tab ini
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
                className="hidden size-[32px] rounded-full bg-chip text-ink-soft hover:bg-chip-hover hover:text-ink lg:grid"
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
                className="hidden h-[32px] gap-1.5 rounded-full bg-chip px-3 text-[12px] font-medium text-ink-soft hover:bg-chip-hover hover:text-ink lg:flex"
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
                className="hidden h-[32px] bg-ink px-3.5 text-[12px] font-medium text-bg hover:bg-ink-hover lg:inline-flex"
              >
                <Link href="/komunitas">Komunitas</Link>
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

          {showAgents ? (
            <div className="min-h-0 flex-1 py-4 pr-2.5 pl-4 xl:py-5 xl:pr-3 xl:pl-5">
              <AgentsView
                onSelect={setSelectedAgent}
                selected={selectedAgent}
                onExport={exportThread}
                onCopyLink={copyThreadLink}
                copied={copiedThread}
                panelCollapsed={evidenceCollapsed}
                onOpenPanel={() => setEvidenceCollapsed(false)}
              />
            </div>
          ) : empty ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 sm:px-6">
              <div className="mx-auto my-auto flex w-full max-w-[840px] flex-col items-center py-2">
                <div className="mb-2 flex items-center justify-center">
                  <Mascot
                    className="pointer-events-none h-[94px] w-[129px] select-none"
                    effect
                  />
                </div>

                <h1 className="text-center font-semibold text-[24px] leading-[1.2] tracking-[-0.025em] sm:text-[26px]">
                  <span className="bg-[linear-gradient(90deg,var(--lumina-brand-glow)_0%,var(--lumina-brand-ink-soft)_50%,var(--lumina-brand-glow)_100%)] bg-clip-text text-transparent">
                    Periksa sebelum
                  </span>
                </h1>
                <h2 className="mt-0.5 text-center font-semibold text-[24px] leading-[1.22] tracking-[-0.025em] text-ink sm:text-[26px]">
                  kamu percaya.
                </h2>

                <div className="mt-5 w-full max-w-[520px]">
                  <Composer
                    key={composerSeed.nonce}
                    initialDraft={composerSeed.text}
                    onSubmit={(text, attachments) => send(text, attachments)}
                    busy={busy}
                    onSearchJobs={openJobSearch}
                    autoFocus
                    placeholder="Tempel pesan, lampirkan tangkapan layar, atau tulis pertanyaanmu…"
                  />
                </div>

                <div className="mt-4 w-full">
                  <CompanionQuickCards
                    onFeature={prefillComposer}
                    onOpenHistory={() => setShowAgents(true)}
                    onResume={(title) =>
                      prefillComposer(`Lanjutkan sesi ${title}`)
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div
                key={active?.id ?? "new"}
                ref={scrollRef}
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 motion-safe:animate-in motion-safe:fade-in-0 duration-150 sm:px-6"
                role="log"
                aria-live="polite"
                aria-label="Percakapan"
              >
                {turns.map((turn, turnIndex) =>
                  turn.role === "user" ? (
                    <div
                      key={turn.id}
                      data-turn
                      className="mx-auto w-full max-w-[820px]"
                    >
                      <div className="flex flex-col items-end gap-1.5">
                        {turn.text ? (
                          <p className="max-w-[85%] whitespace-pre-wrap rounded-[14px] bg-panel-2 px-4 py-2.5 font-normal text-[13px] text-txt leading-relaxed tracking-normal">
                            <EvidenceText
                              activeEvidence={activeEvidence}
                              onSelect={selectEvidence}
                              signals={signalsForUserTurn(turns, turnIndex)}
                              text={turn.text}
                            />
                          </p>
                        ) : null}

                        {turn.attachments?.length ? (
                          <ul className="flex flex-wrap justify-end gap-1.5">
                            {turn.attachments.map((attachment) => (
                              <li
                                key={attachment.id}
                                className="overflow-hidden rounded-sm border border-line bg-panel-2"
                              >
                                {isImageAttachment(attachment) ? (
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
                      {turn.trace ? (
                        <AgentRun
                          trace={turn.trace}
                          result={turn.result}
                          live={turn.streaming === true}
                          announce={false}
                        />
                      ) : null}

                      {turn.streaming &&
                      turn.text.length === 0 &&
                      !turn.trace ? (
                        <ThinkingRow
                          label="Menyusun jawaban"
                          startedAt={turn.voiceStartedAt ?? null}
                        />
                      ) : null}

                      {turn.text.length > 0 ? (
                        <p className="max-w-[92%] whitespace-pre-wrap font-normal text-[13px] text-txt leading-relaxed tracking-normal">
                          {turn.text}
                          {turn.streaming ? (
                            <span
                              aria-hidden
                              className="ms-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-dim align-baseline"
                            />
                          ) : null}
                        </p>
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

                      {turn.lane === "tanya" && turn.laneSource ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-dim text-[0.7rem]">
                            Dijawab sebagai pertanyaan
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-dim text-xs hover:text-txt"
                            onClick={() =>
                              send(turn.laneSource ?? "", [], {
                                force: "periksa",
                              })
                            }
                          >
                            Periksa sebagai pesan
                          </Button>
                        </div>
                      ) : null}

                      {turn.result ? (
                        <>
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
                            />
                          ) : null}
                          <ActionRow result={turn.result} />
                        </>
                      ) : null}
                    </div>
                  ),
                )}
              </div>

              <div className="shrink-0 px-4 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
                <div className="mx-auto w-full max-w-[640px]">
                  <Composer
                    onSubmit={(text, attachments) => send(text, attachments)}
                    busy={busy}
                    onSearchJobs={openJobSearch}
                    placeholder="Tempel pesan berikutnya…"
                  />
                </div>
              </div>
            </>
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
