"use client";

import { ArrowRight, Send, ShieldAlert } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { ScoreCard } from "@/components/companion/score-card";
import { SignalPanel } from "@/components/companion/signal-panel";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  composeReply,
  isGreeting,
  suggestedActions,
} from "@/lib/companion/reply";
import type { AgentId, ScoreResult } from "@/lib/contracts/score";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { scoreText } from "@/lib/scoring/score";
import { cn } from "@/lib/utils";

/**
 * The companion conversation (§3). Not a paste form: the result card appears
 * *inside* the flow, the reply explains it in plain language, and the evidence
 * panel fills as detectors report.
 *
 * LLM is deliberately absent. Strings come from `composeReply`, which reads the
 * deterministic ScoreResult. Nothing leaves the device, so the privacy promise
 * in §11.7 holds without a caveat.
 */

interface Turn {
  id: number;
  role: "user" | "companion";
  text: string;
  /**
   * ISO 8601, stamped inside the send handler — never during render. Next 16
   * fails the prerender of a client component that reads the clock, and the
   * greeting turn has no timestamp worth keeping anyway.
   */
  at?: string;
  result?: ScoreResult;
  /**
   * On a reply turn: the user message it answered. The bundle extracts
   * artifacts from that text, not from the companion's own prose.
   */
  source?: string;
}

const AGENT_SEQUENCE: AgentId[] = [
  "message",
  "link",
  "conversation",
  "evidence",
];

const EXAMPLES = [
  {
    id: "apk",
    label: "APK undangan pernikahan",
    text: "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim, isinya lengkap dengan lokasi acara.",
  },
  {
    id: "topup",
    label: "Tugas like & top-up",
    text: "Halo kak, tugas hari ini tinggal like 10 video, komisi Rp15.000 sudah masuk. Untuk lanjut ke tugas berikutnya, kakak perlu top up saldo Rp500.000 dulu ya biar bisa ikut penarikan.",
  },
  {
    id: "blokir",
    label: 'WhatsApp "akun diblokir"',
    text: "Akun Anda akan diblokir dalam 2 jam. Verifikasi OTP sekarang di bit.ly/verifikasi-wa agar akun tidak ditutup permanen.",
  },
] as const;

let nextId = 1;
const id = () => nextId++;

export function CompanionChat() {
  const [turns, setTurns] = React.useState<Turn[]>([
    {
      id: id(),
      role: "companion",
      text: "Halo. Tempel pesan, tautan, atau ceritakan telepon yang kamu terima. Saya akan tunjukkan kalimat mana yang berbahaya dan apa yang sebaiknya kamu lakukan.",
    },
  ]);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const latestResult = React.useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      const hit = turns[i]?.result;
      if (hit) return hit;
    }
    return null;
  }, [turns]);

  /**
   * The bundle Stream D turns into a PDF. Rebuilt from the log on every turn,
   * so what the panel shows and what the report contains can never disagree.
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
    const log = scrollRef.current;
    if (!log) return;
    const nodes = log.querySelectorAll<HTMLElement>("[data-turn]");
    const last = nodes[nodes.length - 1];
    // Anchor the newest turn to the top of the log: a result card is taller
    // than the viewport, so scrolling to the bottom would hide the very
    // sentence the reply just added. `turns` changes on both the user turn
    // and the reply, which is every moment the anchor needs to move.
    if (turns.length > 0 && last) {
      log.scrollTop = last.offsetTop - log.offsetTop - 8;
    }
  }, [turns]);

  const send = React.useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      const userTurn: Turn = {
        id: id(),
        role: "user",
        text,
        at: new Date().toISOString(),
      };
      const hasContent = !isGreeting(text);
      const result = hasContent ? scoreText({ text }) : null;

      setDraft("");
      setBusy(true);
      setThinking(true);
      setTurns((prev) => [...prev, userTurn]);

      // Brief delay so the panel reads as work happening, not an instant
      // answer that might as well have been static text.
      window.setTimeout(() => {
        const reply = composeReply(text, result, {
          first: false,
          containsContent: hasContent,
        });
        setTurns((prev) => [
          ...prev,
          {
            id: id(),
            role: "companion",
            text: reply,
            at: userTurn.at,
            result: result ?? undefined,
            source: hasContent ? text : undefined,
          },
        ]);
        setThinking(false);
        setBusy(false);
      }, 420);
    },
    [busy],
  );

  const reset = () => {
    setTurns([
      {
        id: id(),
        role: "companion",
        text: "Halo. Tempel pesan, tautan, atau ceritakan telepon yang kamu terima.",
      },
    ]);
    setDraft("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
      <div className="min-w-0">
        <header className="mb-4">
          <h1 className="font-semibold text-2xl tracking-tight">
            Tanya companion
          </h1>
          <p className="mt-1 text-dim text-sm">
            Percakapan tidak disimpan. Semuanya diperiksa di perangkat ini.
          </p>
        </header>

        <div className="flex flex-col rounded-xl border border-line bg-panel">
          <div
            ref={scrollRef}
            className="flex max-h-[26rem] min-h-[18rem] flex-col gap-3 overflow-y-auto p-4"
            role="log"
            aria-live="polite"
            aria-label="Percakapan"
          >
            {turns.map((turn) =>
              turn.role === "user" ? (
                <div key={turn.id} data-turn className="max-w-[85%] self-end">
                  <p className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-panel-2 px-3.5 py-2.5 text-sm text-txt">
                    {turn.text}
                  </p>
                </div>
              ) : (
                <div
                  key={turn.id}
                  data-turn
                  className="flex max-w-[92%] flex-col gap-2 self-start"
                >
                  <p className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-line bg-bg px-3.5 py-2.5 text-sm text-txt">
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
              <div className="flex items-center gap-1.5 self-start rounded-2xl rounded-bl-md border border-line bg-bg px-3.5 py-3">
                <span className="size-1.5 animate-pulse rounded-full bg-dim" />
                <span className="size-1.5 animate-pulse rounded-full bg-dim [animation-delay:150ms]" />
                <span className="size-1.5 animate-pulse rounded-full bg-dim [animation-delay:300ms]" />
                <span className="sr-only">Companion sedang memeriksa</span>
              </div>
            ) : null}
          </div>

          <form
            className="border-line border-t p-3"
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
          >
            <Field>
              <FieldLabel htmlFor="pesan" className="sr-only">
                Pesan
              </FieldLabel>
              <Textarea
                id="pesan"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send(draft);
                  }
                }}
                rows={2}
                placeholder="Tempel pesan atau tulis pertanyaanmu…"
                className="resize-none bg-panel-2"
              />
            </Field>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                disabled={busy || draft.trim().length === 0}
                className="h-9 bg-safe px-3 text-bg hover:bg-safe/90"
              >
                <Send data-icon="inline-start" aria-hidden />
                Kirim
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={reset}
                className="h-9 text-dim"
              >
                Mulai ulang
              </Button>
              <span className="ml-auto hidden text-dim text-xs sm:inline">
                Enter mengirim · Shift+Enter baris baru
              </span>
            </div>
          </form>
        </div>

        <div className="mt-4">
          <p className="font-medium text-dim text-xs uppercase tracking-wide">
            Coba contoh
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <li key={example.id}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-line text-dim hover:text-txt"
                  onClick={() => send(example.text)}
                  disabled={busy}
                >
                  {example.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 text-dim text-xs">
          Butuh bantuan sekarang?{" "}
          <Link
            href="/darurat"
            className="text-danger underline-offset-4 hover:underline"
          >
            Buka mode darurat
          </Link>{" "}
          — checklist berurutan, tanpa akun.
        </p>
      </div>

      <SignalPanel
        result={latestResult}
        sequence={AGENT_SEQUENCE}
        evidence={evidence}
      />
    </div>
  );
}

function ActionRow({ result }: { result: ScoreResult }) {
  const actions = suggestedActions(result);
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, index) => {
        const danger = action.href === "/darurat";
        return (
          <Link
            key={action.href}
            href={action.href}
            data-pressable
            className={cn(
              "group inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs",
              danger
                ? "border-danger/50 bg-danger/10 text-danger hover:bg-danger/20"
                : index === 0
                  ? "border-safe/40 bg-safe/10 text-safe hover:bg-safe/20"
                  : "border-line text-dim hover:bg-panel-2 hover:text-txt",
            )}
          >
            {danger ? <ShieldAlert aria-hidden className="size-3" /> : null}
            {action.label}
            {danger ? null : (
              <ArrowRight
                aria-hidden
                className="arrow-nudge arrow-nudge--right size-3"
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
