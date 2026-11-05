"use client";

import { History, PanelRight, Paperclip } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import {
  type Attachment,
  Composer,
  formatAttachmentSize,
  isImageAttachment,
  scoringTextWithAttachments,
} from "@/components/companion/composer";
import { NavRail } from "@/components/companion/nav-rail";
import { ScenarioCards } from "@/components/companion/scenario-cards";
import type { Scenario } from "@/components/companion/scenarios";
import { ScoreCard } from "@/components/companion/score-card";
import { SessionSidebar } from "@/components/companion/session-sidebar";
import { SignalPanel } from "@/components/companion/signal-panel";
import { Button } from "@/components/ui/button";
import {
  composeReply,
  isGreeting,
  suggestedActions,
} from "@/lib/companion/reply";
import type { ScoreResult } from "@/lib/contracts/score";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { scoreText } from "@/lib/scoring/score";
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
  const [thinking, setThinking] = React.useState(false);
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
    (raw: string, attachments: Attachment[] = []) => {
      const text = raw.trim();
      if ((!text && attachments.length === 0) || busy) return;

      // Attachment filenames are part of what the user received, so they are
      // part of what the engine reads: `undangan-nikah.apk` is the strongest
      // signal in the APK family and it is not prose anyone types.
      const scored = scoringTextWithAttachments(text, attachments);
      const hasContent = !isGreeting(scored);
      const result = hasContent ? scoreText({ text: scored }) : null;

      // Stamped here, never during render: Next 16 fails the prerender of a
      // client component that reads the clock while rendering.
      const stamp = new Date().toISOString();
      const userTurn: Turn = {
        id: id(),
        role: "user",
        text,
        attachments,
        at: stamp,
      };

      const target = activeId;
      if (target === undefined) return;

      setBusy(true);
      setThinking(true);
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
                turns: [...session.turns, userTurn],
              }
            : session,
        ),
      );

      // A short pause so the panel reads as work happening, not an instant
      // answer that might as well have been static text.
      window.setTimeout(() => {
        const reply = composeReply(text || attachments[0]?.name || "", result, {
          first: false,
          containsContent: hasContent,
        });
        setSessions((prev) =>
          prev.map((session) =>
            session.id === target
              ? {
                  ...session,
                  risk: result?.risk ?? session.risk,
                  turns: [
                    ...session.turns,
                    {
                      id: id(),
                      role: "companion",
                      text: reply,
                      at: userTurn.at,
                      result: result ?? undefined,
                      source: hasContent ? scored : undefined,
                    },
                  ],
                }
              : session,
          ),
        );
        setThinking(false);
        setBusy(false);
      }, 420);
    },
    [activeId, busy],
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
                    <p className="max-w-[92%] whitespace-pre-wrap rounded-[10px] bg-panel-2 px-3.5 py-2.5 text-base text-txt">
                      {turn.text}
                    </p>

                    {turn.result ? (
                      <>
                        <ScoreCard
                          result={turn.result}
                          showEscalation={false}
                          showLinks={false}
                        />
                        <ActionRow result={turn.result} />
                      </>
                    ) : null}
                  </div>
                ),
              )}

              {thinking ? (
                <div className="mx-auto flex w-full max-w-[820px]">
                  <div className="flex items-center gap-1.5 rounded-[10px] bg-panel-2 px-3.5 py-3">
                    <span className="size-1.5 animate-pulse rounded-full bg-dim" />
                    <span className="size-1.5 animate-pulse rounded-full bg-dim [animation-delay:150ms]" />
                    <span className="size-1.5 animate-pulse rounded-full bg-dim [animation-delay:300ms]" />
                    <span className="sr-only">Companion sedang memeriksa</span>
                  </div>
                </div>
              ) : null}
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
