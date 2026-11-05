"use client";

import { MessageSquarePlus, PanelRight, Paperclip, Plus } from "lucide-react";
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
import { ScenarioCards } from "@/components/companion/scenario-cards";
import type { Scenario } from "@/components/companion/scenarios";
import { ScoreCard } from "@/components/companion/score-card";
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
 * Companion — a full-height chat surface, structured after the reference chat
 * UI in `lumina-references/` and rebuilt on this project's primitives.
 *
 * Layout copied from that reference, because it is what makes a chat feel like
 * an application rather than a form on a page:
 *
 *   ┌───────────┬─────────────────────────────┬──────────────┐
 *   │ sessions  │  header (title + actions)    │ evidence     │
 *   │ sidebar   │  ─────────────────────────── │ panel        │
 *   │ (240px)   │  centred message column      │ (336px)      │
 *   │           │  ─────────────────────────── │              │
 *   │           │  composer (pinned bottom)    │              │
 *   └───────────┴─────────────────────────────┴──────────────┘
 *
 * The main panel is a raised card with its own border and radius, sitting on
 * the grey page — the reference does this, and it is what makes the chat read
 * as a distinct workspace instead of content flowing down a document.
 *
 * Two deliberate departures, both product decisions rather than taste:
 *   a. Conversations live in memory only. The privacy promise (§11.6) says
 *      closing the tab loses the history, so there is no storage call anywhere
 *      in this file — the sidebar list is React state and nothing else.
 *   b. The evidence panel is a real third column rather than a hidden drawer,
 *      because the agent-by-agent evidence IS the product's argument.
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
  /** Derived from the first user message, like the reference's session list. */
  title: string;
  turns: Turn[];
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
  /**
   * `null` means "the newest session", not "id 1". Session ids come from a
   * module-level counter, so hardcoding the first id silently stops matching as
   * soon as anything else has minted one — the send then lands on a session
   * that does not exist and the panel stays empty.
   */
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  // `false` = the overlay is closed. The desktop column is always visible via
  // `xl:block`, so this only governs the phone overlay.
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

  /**
   * The bundle Stream D turns into a PDF. Rebuilt from the log on every turn,
   * so what the panel shows and what the report contains cannot disagree.
   */
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
    // The dependency on `turns` is the trigger, not the subject: this runs
    // after every appended turn so the newest one is visible.
    if (turns.length <= 1) return;
    const log = scrollRef.current;
    if (!log) return;
    const nodes = log.querySelectorAll<HTMLElement>("[data-turn]");
    const last = nodes[nodes.length - 1];
    // Anchor the newest turn to the top: a result card is taller than the
    // viewport, so scrolling to the bottom would hide the sentence the reply
    // just added.
    if (last) {
      log.scrollTop = last.offsetTop - log.offsetTop - 8;
    }
  }, [turns]);

  const send = React.useCallback(
    (raw: string, attachments: Attachment[] = []) => {
      const text = raw.trim();
      if ((!text && attachments.length === 0) || busy) return;

      /**
       * What the engine reads includes the attachment filenames: a file called
       * `undangan-nikah.apk` is the strongest signal in the APK family, and it
       * arrives as a name, not as prose the user types.
       */
      const scored = scoringTextWithAttachments(text, attachments);
      const hasContent = !isGreeting(scored);
      const result = hasContent ? scoreText({ text: scored }) : null;

      const userTurn: Turn = {
        id: id(),
        role: "user",
        text,
        attachments,
        at: new Date().toISOString(),
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
                turns: [...session.turns, userTurn],
              }
            : session,
        ),
      );

      // Brief delay so the panel reads as work happening, not an instant
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
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {/* ── Session sidebar ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex w-60 shrink-0 flex-col gap-2 p-2.5",
          // On phones it slides over the chat instead of stealing width.
          "max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:z-20 max-lg:w-64 max-lg:border-line max-lg:border-r max-lg:bg-bg",
          showSessions ? "max-lg:flex" : "max-lg:hidden",
        )}
      >
        <Button
          onClick={startNew}
          variant="outline"
          className="w-full justify-start gap-2 border-field bg-panel text-txt"
        >
          <Plus aria-hidden className="size-4" />
          Percakapan baru
        </Button>

        <p className="mt-2 px-1 font-medium text-dim text-xs uppercase tracking-wide">
          Riwayat
        </p>

        <ul className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {sessions.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(session.id);
                  setShowSessions(false);
                }}
                aria-current={session.id === activeId ? "true" : undefined}
                className={cn(
                  "mb-0.5 flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors duration-150",
                  session.id === activeId
                    ? "bg-panel-2 text-txt"
                    : "text-dim hover:bg-panel-2 hover:text-txt",
                )}
              >
                <MessageSquarePlus
                  aria-hidden
                  className="mt-0.5 size-3.5 shrink-0"
                />
                <span className="line-clamp-2 leading-snug">
                  {session.title}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="px-1 text-[0.65rem] text-dim leading-snug">
          Riwayat hanya ada di tab ini. Tutup tab, hilang.
        </p>
      </aside>

      {/* ── Main chat panel ─────────────────────────────────────────────── */}
      <section className="m-2.5 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-line bg-panel shadow-rest max-lg:m-0 max-lg:rounded-none max-lg:border-0 max-lg:shadow-none">
        <header className="flex shrink-0 items-center gap-2 border-line border-b px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSessions((v) => !v)}
            aria-label="Tampilkan riwayat percakapan"
            aria-expanded={showSessions}
            className="size-8 text-dim lg:hidden"
          >
            <MessageSquarePlus aria-hidden className="size-4" />
          </Button>

          <span className="truncate font-semibold text-base text-txt">
            {active?.title ?? "Percakapan baru"}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEvidence((v) => !v)}
              aria-label="Tampilkan panel bukti"
              aria-expanded={showEvidence}
              className="size-8 text-dim xl:hidden"
            >
              <PanelRight aria-hidden className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={startNew}
              className="hidden text-dim sm:inline-flex"
            >
              Mulai ulang
            </Button>
          </div>
        </header>

        {empty ? (
          /* ── New-chat state: hero, cards, composer ──────────────────── */
          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 py-6">
            <div className="mx-auto w-full max-w-[760px]">
              <div className="mb-6 text-center">
                <h1 className="font-semibold text-2xl tracking-tight sm:text-3xl">
                  Periksa sebelum kamu percaya.
                </h1>
                <p className="mt-2 text-dim text-sm">
                  Tempel pesan, tautan, atau lampirkan tangkapan layar. Semuanya
                  diperiksa di perangkat ini.
                </p>
              </div>

              <div className="mb-4">
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
            {/* ── Conversation ─────────────────────────────────────────── */}
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

            {/* ── Composer, pinned ─────────────────────────────────────── */}
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

      {/* ── Evidence panel ─────────────────────────────────────────────── */}
      <aside
        className={cn(
          "w-[21rem] shrink-0 overflow-y-auto p-2.5 xl:block",
          // Desktop: always a third column. Below `xl` it becomes an overlay
          // the header button opens — a panel hidden by CSS regardless of the
          // toggle would make that button do nothing.
          "max-xl:absolute max-xl:inset-y-0 max-xl:right-0 max-xl:z-20 max-xl:w-[20rem] max-xl:border-line max-xl:border-l max-xl:bg-bg",
          showEvidence ? "max-xl:block" : "max-xl:hidden",
        )}
      >
        <div className="mb-2 flex justify-end xl:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEvidence(false)}
            className="text-dim"
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
