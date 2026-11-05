"use client";

import { History, PanelRight, Paperclip } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { AgentTraceCard } from "@/components/companion/agent-trace";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import {
  type Attachment,
  Composer,
  formatAttachmentSize,
  isImageAttachment,
  scoringTextWithAttachments,
} from "@/components/companion/composer";
import { ExplanationCard } from "@/components/companion/explanation-card";
import { NavRail } from "@/components/companion/nav-rail";
import { ScenarioCards } from "@/components/companion/scenario-cards";
import type { Scenario } from "@/components/companion/scenarios";
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
  buildAnswerRequest,
  requestAnswer,
} from "@/lib/companion/answer-client";
import { type Explanation, explain } from "@/lib/companion/explain";
import {
  composeAnswerFallback,
  composeReply,
  suggestedActions,
} from "@/lib/companion/reply";
import { isQuestionAbout, type Lane, planTurn } from "@/lib/companion/turn";
import {
  type AgentStage,
  type AgentTrace,
  STAGE_LABEL,
  type VoiceDigest,
  voiceDigest,
} from "@/lib/contracts/agent-run";
import type { ScoreResult } from "@/lib/contracts/score";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { modusFor } from "@/lib/modus";
import { scoreWithTrace } from "@/lib/scoring/score";
import { cn } from "@/lib/utils";

/**
 * Companion — the full chat workspace. No site nav: navigation is the rail.
 *
 * Layout from the reference chat UI (`ChatPanel.vue`):
 *
 *   ┌────┬──────────┬───────────────────────────────┬────────────┐
 *   │ 64 │ sessions │  slim header (title · actions) │ evidence   │
 *   │ rail│ (240px) │  ───────────────────────────── │ (336px)    │
 *   │    │          │  centred column, scrolls       │            │
 *   │    │          │  ───────────────────────────── │            │
 *   │    │          │  composer, pinned              │            │
 *   └────┴──────────┴───────────────────────────────┴────────────┘
 *
 * The main panel is a raised card with a 14px radius sitting 10px inside the
 * shell, exactly as the reference does — that inset is what makes the chat
 * read as a workspace rather than a page.
 *
 * Two product decisions that override the reference:
 *   a. History is React state only. The privacy promise (§11.6) says closing
 *      the tab loses the conversation, so there is no storage call here.
 *   b. The evidence panel is a real column on desktop, not a drawer, because
 *      the agent-by-agent evidence IS the argument the product makes.
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
}

interface Session {
  id: number;
  title: string;
  turns: Turn[];
  /** Band of the last check in this conversation, for the sidebar's second row. */
  risk?: "bersih" | "rendah" | "mencurigakan" | "tinggi";
  /** Short clock time, printed on the title row like the reference does. */
  time?: string;
}

const GREETING =
  "Halo. Tempel pesan, tautan, atau ceritakan telepon yang kamu terima. Saya akan tunjukkan kalimat mana yang berbahaya dan apa yang sebaiknya kamu lakukan.";

let nextId = 1;
const id = () => nextId++;

function newSession(): Session {
  return {
    id: id(),
    title: "Percakapan baru",
    turns: [{ id: id(), role: "companion", text: GREETING }],
  };
}

function titleFor(text: string, attachments: readonly Attachment[]): string {
  const base = text.trim() || attachments[0]?.name || "";
  if (!base) return "Percakapan baru";
  return base.length > 42 ? `${base.slice(0, 42).trimEnd()}…` : base;
}

export function CompanionChat() {
  const [sessions, setSessions] = React.useState<Session[]>(() => [
    newSession(),
  ]);
  /** `null` = the newest session, never a hardcoded id. */
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showEvidence, setShowEvidence] = React.useState(false);
  const [showSessions, setShowSessions] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === selectedId) ?? sessions[0];
  const activeId = active?.id;
  const turns = active?.turns ?? [];

  const latestResult = React.useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const hit = turns[i]?.result;
      if (hit) return hit;
    }
    return null;
  }, [turns]);

  const latestExplanation = React.useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const hit = turns[i]?.explanation;
      if (hit) return hit;
    }
    return null;
  }, [turns]);

  const evidence = React.useMemo(
    () =>
      buildEvidenceBundle(
        turns.flatMap((turn) =>
          turn.result && turn.source
            ? [{ text: turn.source, at: turn.at, result: turn.result }]
            : [],
        ),
      ),
    [turns],
  );

  React.useEffect(() => {
    // `turns` is the trigger: this runs after every appended turn so the newest
    // one is anchored to the top of the log.
    if (turns.length <= 1) return;
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

      // Attachment filenames are part of what the user received, so they are
      // part of what the engine reads: `undangan-nikah.apk` is the strongest
      // signal in the APK family and it is not prose anyone types.
      const scored = scoringTextWithAttachments(text, attachments);

      // Stamped here, never during render: Next 16 fails the prerender of a
      // client component that reads the clock while rendering.
      const stamp = new Date().toISOString();

      const target = activeId;
      if (target === undefined) return;

      /*
       * The question guard runs BEFORE scoring. Asking what a scam is must not
       * produce a red card about the person asking: measured, "apa itu pinjol?"
       * scored 70/tinggi and named the pinjol scheme. A question is not a
       * message someone received, so the detectors never see it.
       */
      const asked = options.force
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
      const userTurn: Turn = {
        id: id(),
        role: "user",
        text,
        attachments,
        at: stamp,
        lane,
      };

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
              status: "selesai",
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
                risk: checked ? (result?.risk ?? session.risk) : session.risk,
                turns: [
                  ...session.turns,
                  userTurn,
                  {
                    id: companionId,
                    role: "companion",
                    text: "",
                    at: stamp,
                    streaming: true,
                    voiceStartedAt,
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
          /*
           * Only teach when something was actually found. A clean message has
           * no tactics and no scheme, and showing generic checks for "apa
           * kabar?" would be noise dressed as diligence.
           */
          explanation:
            checked &&
            result !== null &&
            result.signals.some((signal) => signal.weight > 0)
              ? explain(result, scored)
              : undefined,
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
       * 15 s, above the route's 13 s so the server is always the one that gives
       * up first. Before this the call passed no signal at all: a wedged socket
       * left `busy` true and the composer disabled with no way back.
       */
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 15000);

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
        } else {
          finish(
            composeAnswerFallback(lane),
            "template",
            answer.outcome as VoiceOutcome,
          );
        }
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
    [active?.turns, activeId, busy, latestExplanation, latestResult],
  );

  const startNew = () => {
    const session = newSession();
    setSessions((prev) => [session, ...prev]);
    setSelectedId(session.id);
    setShowSessions(false);
  };

  const empty = turns.length <= 1;

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <NavRail />

      <SessionSidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={(sessionId) => {
          setSelectedId(sessionId);
          setShowSessions(false);
        }}
        onNew={startNew}
        onClose={() => setShowSessions(false)}
        className={cn(
          "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:w-64 max-md:border-line max-md:border-r max-md:bg-bg",
          showSessions ? "max-md:flex" : "max-md:hidden",
        )}
      />

      {/* Main panel: a raised card inset 10px inside the shell. */}
      <section className="m-2.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-panel shadow-rest max-md:m-0 max-md:rounded-none max-md:border-0 max-md:shadow-none">
        <header className="flex h-11 shrink-0 items-center gap-2 border-line border-b px-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSessions((v) => !v)}
            aria-label="Riwayat percakapan"
            aria-expanded={showSessions}
            className="size-8 text-dim md:hidden"
          >
            <History aria-hidden strokeWidth={1.6} className="size-4" />
          </Button>

          <span className="truncate font-semibold text-[15px] text-txt">
            {active?.title ?? "Percakapan baru"}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={startNew}
              className="h-7 text-dim text-xs hover:text-txt"
            >
              Percakapan baru
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEvidence((v) => !v)}
              aria-label="Panel bukti"
              aria-expanded={showEvidence}
              className="size-8 text-dim xl:hidden"
            >
              <PanelRight aria-hidden strokeWidth={1.6} className="size-4" />
            </Button>
          </div>
        </header>

        {empty ? (
          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 py-6">
            <div className="mx-auto w-full max-w-[760px]">
              <div className="mb-6 text-center">
                <h1 className="font-semibold text-[clamp(19px,2.4vw,30px)] leading-tight tracking-[-0.6px]">
                  Periksa sebelum kamu percaya.
                </h1>
                <p className="mt-2 text-dim text-[13px]">
                  Pilih contoh di bawah, atau tempel pesan yang kamu terima.
                </p>
              </div>

              <div className="mb-5">
                <ScenarioCards onPick={(s: Scenario) => send(s.text, [])} />
              </div>

              <Composer
                onSubmit={(text, attachments) => send(text, attachments)}
                busy={busy}
                autoFocus
                placeholder="Tempel pesan, lampirkan tangkapan layar, atau tulis pertanyaanmu…"
              />
            </div>
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-5"
              role="log"
              aria-live="polite"
              aria-label="Percakapan"
            >
              {turns.map((turn) =>
                turn.role === "user" ? (
                  <div
                    key={turn.id}
                    data-turn
                    className="mx-auto w-full max-w-[820px]"
                  >
                    <div className="flex flex-col items-end gap-1.5">
                      {turn.text ? (
                        <p className="max-w-[85%] whitespace-pre-wrap rounded-[10px] bg-panel-2 px-3.5 py-2.5 text-base text-txt">
                          {turn.text}
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
                    </div>
                  </div>
                ) : (
                  <div
                    key={turn.id}
                    data-turn
                    className="mx-auto flex w-full max-w-[820px] flex-col gap-2"
                  >
                    {turn.trace ? <AgentTraceCard trace={turn.trace} /> : null}

                    {turn.streaming && turn.text.length === 0 ? (
                      <ThinkingRow
                        label="Menyusun jawaban"
                        startedAt={turn.voiceStartedAt ?? null}
                      />
                    ) : null}

                    {turn.text.length > 0 ? (
                      <p className="max-w-[92%] whitespace-pre-wrap rounded-[10px] bg-panel-2 px-3.5 py-2.5 text-base text-txt">
                        {turn.text}
                        {turn.streaming ? (
                          <span
                            aria-hidden
                            className="ms-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-dim align-baseline"
                          />
                        ) : null}
                      </p>
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

                    {turn.result && !turn.streaming ? (
                      <>
                        <ScoreCard
                          result={turn.result}
                          showEscalation={false}
                          showLinks={false}
                        />
                        {turn.explanation ? (
                          <ExplanationCard
                            explanation={turn.explanation}
                            schemeName={
                              modusFor(turn.result.relatedModule)?.nama ?? null
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

            <div className="shrink-0 border-line border-t px-4 py-3">
              <div className="mx-auto w-full max-w-[760px]">
                <Composer
                  onSubmit={(text, attachments) => send(text, attachments)}
                  busy={busy}
                  placeholder="Tempel pesan berikutnya…"
                />
              </div>
            </div>
          </>
        )}
      </section>

      <aside
        className={cn(
          "w-[21rem] shrink-0 overflow-y-auto p-2.5 xl:block",
          "max-xl:absolute max-xl:inset-y-0 max-xl:right-0 max-xl:z-30 max-xl:w-[20rem] max-xl:border-line max-xl:border-l max-xl:bg-bg",
          showEvidence ? "max-xl:block" : "max-xl:hidden",
        )}
      >
        <div className="mb-2 flex justify-end xl:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEvidence(false)}
            className="h-7 text-dim text-xs"
          >
            Tutup
          </Button>
        </div>
        <SignalPanel
          result={latestResult}
          sequence={AGENT_SEQUENCE}
          evidence={evidence}
        />
      </aside>
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
