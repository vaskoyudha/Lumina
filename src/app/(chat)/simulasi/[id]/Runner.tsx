"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Coffee,
  FileWarning,
  Flag,
  KeyRound,
  LayoutGrid,
  Lightbulb,
  MessageSquare,
  Pause,
  Play,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  WifiOff,
  Wind,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatBubble, ChatSystem } from "@/components/simulasi/chat/chat-bubble";
import {
  ChatComposer,
  ChatQuickReplies,
  ChatTyping,
} from "@/components/simulasi/chat/chat-composer";
import { ChatSurface } from "@/components/simulasi/chat/chat-surface";
import {
  SURFACE_ALERT,
  SURFACE_BADGE,
  SURFACE_FLAME,
  SURFACE_MAIN,
  SURFACE_NOTE,
  SURFACE_RAIL,
  SURFACE_ROW,
  SURFACE_SOFT,
  SURFACE_SUBCARD,
  SURFACE_TIP,
} from "@/components/simulasi/surface";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import type { SimulationContent } from "@/lib/content/schema";
import { submitSimulation } from "@/lib/learning/actions";
import type { SimulationSubmission } from "@/lib/learning/validation";
import { messageClock } from "@/lib/simulasi/clock";
import type {
  ScenarioChoice,
  ScenarioNode,
  TacticId,
} from "@/lib/simulasi/types";
import { cn } from "@/lib/utils";

type Message = Extract<ScenarioNode, { type: "message" }>;
type Ending = Extract<ScenarioNode, { type: "ending" }>;
type Mode = "santai" | "tantangan";
type TranscriptEntry =
  | { kind: "message"; node: Message }
  | { kind: "reply"; id: string; text: string };

function Meter({
  label,
  value,
  max,
  danger,
  start,
  end,
}: {
  label: string;
  value: number;
  max: number;
  danger?: boolean;
  start?: string;
  end?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-[10.5px] font-bold lg:text-xs">
        <span className="text-txt">{label}</span>
        <span className="tabular text-dim">
          {Math.round(value)} / {max}
        </span>
      </div>
      <Progress
        value={(value / max) * 100}
        max={100}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        className={cn(
          "h-[9px] rounded-full bg-[#f4eae1] lg:h-2.5",
          danger
            ? "[&_[data-slot=progress-indicator]]:bg-[linear-gradient(90deg,#e61919_0%,#b91c1c_100%)]"
            : "[&_[data-slot=progress-indicator]]:bg-[linear-gradient(90deg,#ff7a18_0%,#ee5a06_100%)]",
        )}
      />
      {start && end && (
        <div className="flex justify-between text-[9px] text-dim leading-none lg:text-[10px]">
          <span>{start}</span>
          <span>{end}</span>
        </div>
      )}
    </div>
  );
}

export function Runner({
  content,
  persist = true,
}: {
  content: SimulationContent;
  persist?: boolean;
}) {
  const {
    scenario,
    mission: MISSION,
    tactics: TACTICS,
    permissions: PERMISSIONS,
    reportArtifacts: REPORT_ARTIFACTS,
  } = content;
  const defaultEnding = scenario.nodes.find(
    (node): node is Ending => node.type === "ending",
  ) as Ending;
  const [attemptId, setAttemptId] = useState("");
  const [steps, setSteps] = useState<SimulationSubmission["steps"]>([]);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");
  const [mode, setMode] = useState<Mode>("santai");
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeId, setActiveId] = useState(scenario.start);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [decisions, setDecisions] = useState<ScenarioChoice[]>([]);
  const [panic, setPanic] = useState(scenario.hud.panic.start);
  const [intrusion, setIntrusion] = useState(scenario.hud.intrusion.start);
  const [compromised, setCompromised] = useState(false);
  const [isolated, setIsolated] = useState(false);
  const [breathingUsed, setBreathingUsed] = useState(false);
  const [breathingAt, setBreathingAt] = useState<number | undefined>();
  const [revoked, setRevoked] = useState<string[]>([]);
  const [proof, setProof] = useState<string[]>([]);
  const [unsafeNotice, setUnsafeNotice] = useState(false);
  const [attachmentOpen, setAttachmentOpen] = useState<string[]>([]);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const active = scenario.nodes.find((node) => node.id === activeId);
  const activeRef = useRef(activeId);
  const pausedRef = useRef(paused);
  const revealClock = useRef<{ id: string; remaining: number } | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const endingRef = useRef<HTMLDivElement>(null);
  activeRef.current = activeId;
  pausedRef.current = paused;
  const ended = !!failure || active?.type === "ending";
  const saveResult = useCallback(async () => {
    if (!persist || !ended || !attemptId) return;
    setSaveState("saving");
    try {
      const result = await submitSimulation({
        attemptId,
        scenarioId: scenario.scenario.id,
        mode,
        outcome: failure
          ? "failed"
          : active?.type === "ending"
            ? active.variant
            : "failed",
        steps,
        breathingAt,
      });
      if (result.ok) {
        setSaveState("saved");
        setSaveError("");
      } else {
        setSaveState("error");
        setSaveError(result.error);
      }
    } catch {
      setSaveState("error");
      setSaveError("Hasil belum tersimpan. Coba lagi.");
    }
  }, [
    persist,
    ended,
    attemptId,
    scenario.scenario.id,
    mode,
    failure,
    active,
    steps,
    breathingAt,
  ]);
  useEffect(() => {
    if (persist && ended) void saveResult();
  }, [persist, ended, saveResult]);
  const resultNotice = !persist ? (
    <Alert className="mb-4">
      <AlertDescription>
        Latihan pola ini tidak menyimpan hasil. Progres belajar tetap tersimpan
        di akunmu.
      </AlertDescription>
    </Alert>
  ) : (
    <Alert className="mb-4">
      <AlertDescription>
        {saveState === "saved"
          ? "Hasil simulasi tersimpan di akunmu."
          : saveState === "saving"
            ? "Menyimpan hasil simulasi…"
            : saveError || "Hasil belum tersimpan."}
        {saveState === "error" && (
          <span className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => void saveResult()}
            >
              Coba simpan lagi
            </Button>
            <Button asChild variant="outline" className="min-h-11">
              <Link href="/masuk">Masuk</Link>
            </Button>
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
  const tactics = [
    ...new Set(
      decisions
        .map((choice) => choice.tactic)
        .filter((id): id is TacticId => !!id),
    ),
  ];
  const latest = decisions.at(-1);
  const latestTactic = TACTICS.find((tactic) => tactic.id === latest?.tactic);

  const reveal = useCallback((node: Message) => {
    if (activeRef.current !== node.id || pausedRef.current) return;
    activeRef.current = node.next;
    setTranscript((current) =>
      current.some(
        (item) => item.kind === "message" && item.node.id === node.id,
      )
        ? current
        : [...current, { kind: "message", node }],
    );
    setActiveId(node.next);
  }, []);
  useEffect(() => {
    if (!started || paused || ended || active?.type !== "message") return;
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (revealClock.current?.id !== active.id) {
      revealClock.current = {
        id: active.id,
        remaining: reduced ? 0 : (active.delay_ms ?? 0),
      };
    }
    const startedAt = Date.now();
    const timeout = window.setTimeout(
      () => reveal(active),
      revealClock.current.remaining,
    );
    return () => {
      window.clearTimeout(timeout);
      if (revealClock.current?.id === active.id) {
        revealClock.current.remaining = Math.max(
          0,
          revealClock.current.remaining - (Date.now() - startedAt),
        );
      }
    };
  }, [active, ended, paused, reveal, started]);
  useEffect(() => {
    if (
      !started ||
      paused ||
      ended ||
      mode !== "tantangan" ||
      !compromised ||
      isolated
    )
      return;
    const interval = window.setInterval(
      () =>
        setIntrusion((current) =>
          Math.min(
            scenario.hud.intrusion.max,
            current + scenario.hud.intrusion.rate_per_second,
          ),
        ),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [
    started,
    paused,
    ended,
    mode,
    compromised,
    isolated,
    scenario.hud.intrusion.max,
    scenario.hud.intrusion.rate_per_second,
  ]);
  useEffect(() => {
    if (started && !ended && intrusion >= scenario.hud.intrusion.max)
      setFailure(scenario.hud.intrusion.fail_message);
  }, [
    started,
    ended,
    intrusion,
    scenario.hud.intrusion.max,
    scenario.hud.intrusion.fail_message,
  ]);
  useEffect(() => {
    if (!started || ended) return;
    function onVisibility() {
      if (document.hidden) {
        pausedRef.current = true;
        setPaused(true);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [started, ended]);
  useEffect(() => {
    if (transcript.length && transcriptRef.current)
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);
  useEffect(() => {
    if (!started) return;
    if (ended) endingRef.current?.focus();
    else if (active?.type === "choice" || active?.type === "tool_task")
      promptRef.current?.focus();
  }, [active?.type, ended, started]);

  function choose(choice: ScenarioChoice) {
    if (
      paused ||
      ended ||
      active?.type !== "choice" ||
      activeRef.current !== active.id
    )
      return;
    setSteps((current) => [
      ...current,
      { nodeId: active.id, choiceIndex: active.choices.indexOf(choice) },
    ]);
    activeRef.current = choice.next;
    setTranscript((current) => [
      ...current,
      { kind: "reply", id: active.id, text: choice.label },
    ]);
    setDecisions((current) => [...current, choice]);
    if (choice.compromisesDevice) setCompromised(true);
    const nextPanic = Math.min(
      scenario.hud.panic.max,
      panic + (choice.panic ?? 0),
    );
    setPanic(nextPanic);
    if (nextPanic >= scenario.hud.panic.fail_at) {
      setFailure(scenario.hud.panic.fail_message);
      return;
    }
    setActiveId(choice.next);
  }
  function advance(next: string) {
    if (!paused && !ended) {
      if (active?.type === "tool_task")
        setSteps((current) => [...current, { nodeId: active.id }]);
      activeRef.current = next;
      setActiveId(next);
    }
  }
  function reset() {
    setAttemptId("");
    setSteps([]);
    setSaveState("idle");
    setSaveError("");
    activeRef.current = scenario.start;
    pausedRef.current = false;
    revealClock.current = null;
    setStarted(false);
    setPaused(false);
    setActiveId(scenario.start);
    setTranscript([]);
    setDecisions([]);
    setPanic(scenario.hud.panic.start);
    setIntrusion(scenario.hud.intrusion.start);
    setCompromised(false);
    setIsolated(false);
    setBreathingUsed(false);
    setBreathingAt(undefined);
    setRevoked([]);
    setProof([]);
    setUnsafeNotice(false);
    setAttachmentOpen([]);
    setCollectionOpen(false);
    setFailure(null);
  }
  function toggle(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }
  const tacticCards = tactics.length
    ? TACTICS.filter((tactic) => tactics.includes(tactic.id))
    : [];
  const collection = (
    <Collapsible open={collectionOpen} onOpenChange={setCollectionOpen}>
      <CollapsibleTrigger asChild>
        <Button
          data-pressable
          variant="ghost"
          className="h-11 w-full justify-between rounded-xl px-2 text-dim hover:text-txt"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Flag aria-hidden className="size-4 shrink-0 text-dim" />
            <span className="truncate">
              Pola penipuan · {tactics.length} ditemukan
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-dim transition-transform",
              collectionOpen && "rotate-180",
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 flex flex-col gap-2">
        {tacticCards.length ? (
          tacticCards.map((tactic) => (
            <div key={tactic.id} className="rounded-xl bg-panel-2 p-4">
              <p className="font-medium text-sm text-txt">{tactic.name}</p>
              <p className="mt-0.5 text-dim text-sm">“{tactic.quote}”</p>
              <p className="mt-2 text-sm">{tactic.lesson}</p>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-panel-2 p-4 text-dim text-sm">
            Pola yang kamu temukan akan muncul di sini.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  if (!started)
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <header
            className={cn("relative overflow-hidden p-5 sm:p-6", SURFACE_MAIN)}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-12 size-56 rounded-full bg-[#f8cca8]/25 blur-3xl"
            />
            <div className="relative flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5dbd1] bg-[linear-gradient(180deg,#f8f3ee_0%,#f1e8e0_100%)] px-2.5 py-1 font-bold text-[10.5px] text-[#4a433e]">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                {persist
                  ? `Misi · Level ${scenario.scenario.level}`
                  : `Latihan modul ${content.moduleNo ?? ""}`.trim()}
              </span>
              <span aria-hidden="true" className="text-[#e0d3c8]">
                ·
              </span>
              <span className="rounded-full bg-[linear-gradient(90deg,#fde6d6_0%,#fbdac4_100%)] px-2.5 py-1 font-bold text-[10.5px] text-[#d4511b]">
                {persist ? "Fiktif" : "Latihan"}
              </span>
            </div>
            <h1 className="relative mt-3 font-extrabold text-2xl text-txt leading-tight tracking-tight sm:text-[30px]">
              {MISSION.title}
            </h1>
            <p className="relative mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-[11.5px] text-dim">
              <span>{MISSION.duration}</span>
              <span aria-hidden="true">·</span>
              <span>{MISSION.chapters.length} babak</span>
              <span aria-hidden="true">·</span>
              <span>
                {scenario.nodes.filter((node) => node.type === "ending").length}{" "}
                kemungkinan akhir
              </span>
            </p>
          </header>

          {!persist && (
            <Alert className="rounded-2xl border-brand-line bg-brand-tint/60">
              <ShieldCheck aria-hidden="true" />
              <AlertTitle>Latihan dari modul</AlertTitle>
              <AlertDescription>
                Ini latihan keputusan dari modul yang sudah kamu selesaikan.
                Hasilnya tidak disimpan sebagai misi.
              </AlertDescription>
            </Alert>
          )}

          <Card
            className={cn(
              "gap-0 border-0 py-0 ring-0 shadow-none",
              SURFACE_MAIN,
            )}
          >
            <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
              <div>
                <p className="font-semibold text-[10.5px] text-dim uppercase tracking-[0.12em]">
                  Briefing misi
                </p>
                <CardTitle
                  role="heading"
                  aria-level={2}
                  className="mt-1 font-extrabold text-xl text-txt"
                >
                  Siap jadi pemeran utama?
                </CardTitle>
                <CardDescription className="mt-1.5 text-sm leading-relaxed">
                  {MISSION.role} · {MISSION.context}
                </CardDescription>
              </div>

              <div className={cn(SURFACE_NOTE, "px-4 py-3.5")}>
                <p className="font-extrabold text-[12.5px] text-[#c8430e]">
                  Tujuan misi
                </p>
                <p className="mt-1 text-[#4a3728] text-sm leading-relaxed">
                  {MISSION.objective}
                </p>
              </div>

              <div>
                <h2 className="font-extrabold text-[15px] text-txt">
                  Pilih cara bermain
                </h2>
                <p className="mt-0.5 text-dim text-xs">
                  Bisa diubah sebelum misi dimulai.
                </p>
                <fieldset className="mt-3 grid gap-2 sm:grid-cols-2">
                  <legend className="sr-only">Pilih cara bermain</legend>
                  <Button
                    data-pressable
                    variant="outline"
                    aria-pressed={mode === "santai"}
                    data-mode="santai"
                    className={cn(
                      "h-auto justify-start gap-3 whitespace-normal rounded-[14px] px-4 py-3 text-left",
                      mode === "santai"
                        ? "border-[#f25c05]/60 bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)] ring-1 ring-[#f25c05]"
                        : "border-[#ede3da] bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)]",
                    )}
                    onClick={() => setMode("santai")}
                  >
                    <Coffee aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-bold text-[#221f1d]">
                        Santai
                      </span>
                      <span className="block text-[#8a8077] text-xs">
                        Tanpa tekanan waktu otomatis
                      </span>
                    </span>
                  </Button>
                  <Button
                    data-pressable
                    variant="outline"
                    aria-pressed={mode === "tantangan"}
                    data-mode="tantangan"
                    className={cn(
                      "h-auto justify-start gap-3 whitespace-normal rounded-[14px] px-4 py-3 text-left",
                      mode === "tantangan"
                        ? "border-[#f25c05]/60 bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)] ring-1 ring-[#f25c05]"
                        : "border-[#ede3da] bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)]",
                    )}
                    onClick={() => setMode("tantangan")}
                  >
                    <Zap aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-bold text-[#221f1d]">
                        Tantangan
                      </span>
                      <span className="block text-[#8a8077] text-xs">
                        Tekanan naik jika akses aplikasi terbuka
                      </span>
                    </span>
                  </Button>
                </fieldset>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-brand-line border-t pt-4">
                <Button
                  data-pressable
                  className={cn(
                    "h-11 rounded-full px-5 font-bold",
                    SURFACE_FLAME,
                  )}
                  onClick={() => {
                    setAttemptId(crypto.randomUUID());
                    setStarted(true);
                  }}
                >
                  {persist ? "Mulai misi" : "Mulai latihan"}{" "}
                  <ArrowRight aria-hidden="true" />
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-full border-[#ede3da] bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)] font-semibold text-[#221f1d] hover:brightness-99"
                  data-pressable
                >
                  <Link
                    href={
                      content.moduleNo
                        ? `/belajar/${content.moduleNo}`
                        : "/belajar"
                    }
                  >
                    Pelajari polanya dulu
                  </Link>
                </Button>
              </div>

              <p className="text-dim text-xs">
                Semua pesan dan alat di sini fiktif. Latihan tidak mengubah
                perangkat atau mengirim laporan ke mana pun.
              </p>
            </CardContent>
          </Card>
        </div>

        <aside aria-label="Ringkasan briefing" className="lg:sticky lg:top-0">
          <div className={cn("flex flex-col gap-2", SURFACE_RAIL)}>
            <section className={cn(SURFACE_SUBCARD, "p-4")}>
              <h2 className="font-extrabold text-[10.5px] text-[#1e1c1a]">
                Ringkasan misi
              </h2>
              <dl className="mt-2.5 grid grid-cols-3 gap-1 rounded-[12px] bg-[linear-gradient(90deg,#fbf8f6_0%,#f5f3f1_55%,#faf6f3_100%)] p-2.5">
                <div className="flex flex-col items-center py-1.5">
                  <dt className="order-2 mt-0.5 text-[8.8px] text-[#7c726a] leading-none">
                    Babak
                  </dt>
                  <dd className="order-1 tabular font-extrabold text-[#1e1c1a] text-sm">
                    {MISSION.chapters.length}
                  </dd>
                </div>
                <div className="flex flex-col items-center py-1.5">
                  <dt className="order-2 mt-0.5 text-[8.8px] text-[#7c726a] leading-none">
                    Akhir
                  </dt>
                  <dd className="order-1 tabular font-extrabold text-[#1e1c1a] text-sm">
                    {
                      scenario.nodes.filter((node) => node.type === "ending")
                        .length
                    }
                  </dd>
                </div>
                <div className="flex flex-col items-center py-1.5">
                  <dt className="order-2 mt-0.5 text-[8.8px] text-[#7c726a] leading-none">
                    Menit
                  </dt>
                  <dd className="order-1 tabular font-extrabold text-[#1e1c1a] text-sm">
                    3–5
                  </dd>
                </div>
              </dl>
              <p className="mt-2.5 text-[#7c726a] text-[10.5px] leading-relaxed">
                Pilihanmu mengubah meter panik dan akses asing. Penilaian
                mengikuti aturan skenario, bukan model.
              </p>
            </section>

            <section className={cn(SURFACE_SUBCARD, "p-4")}>
              <h2 className="font-extrabold text-[10.5px] text-[#1e1c1a]">
                Cara dinilai
              </h2>
              <ul className="mt-2 flex flex-col gap-1.5 text-[#7c726a] text-[10.5px] leading-relaxed">
                <li>Setiap pilihan punya konsekuensi tetap pada cerita.</li>
                <li>
                  Meter panik dan akses asing bergerak dari keputusanmu, bukan
                  tebakan.
                </li>
                <li>Bukti yang dibagikan harus aman; kode rahasia ditolak.</li>
              </ul>
            </section>

            <section
              className={cn(SURFACE_TIP, "flex items-start gap-2 p-2.5")}
            >
              <span className="mt-0.5 grid size-[20px] shrink-0 place-items-center rounded-full bg-[#ffffff]/80 text-[#b45309]">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="font-extrabold text-[10px] text-[#b45309] leading-tight">
                  Latihan, bukan pemindaian perangkat
                </p>
                <p className="mt-0.5 text-[#4a3728] text-[8.6px] leading-[1.35]">
                  Semua pesan, lampiran, dan alat di sini fiktif. Latihan tidak
                  mengubah perangkat atau mengirim laporan ke mana pun.
                </p>
              </div>
            </section>
          </div>
        </aside>
      </div>
    );
  if (!active)
    return (
      <Alert variant="destructive" data-tone="danger">
        <AlertTitle>Skenario tidak tersedia</AlertTitle>
      </Alert>
    );
  if (ended) {
    const ending = active.type === "ending" ? active : defaultEnding;
    const emergency = Boolean(failure) || ending.variant === "compromised";
    const safeSteps = decisions.filter((choice) => choice.verdict === "benar");
    const riskySteps = decisions.filter((choice) => choice.verdict === "salah");
    const proofItems = REPORT_ARTIFACTS.filter((item) =>
      proof.includes(item.id),
    );
    return (
      <>
        {resultNotice}
        <div
          className="flex flex-col gap-5"
          data-outcome={failure ? "failure" : ending.variant}
        >
          <header
            className={cn("relative overflow-hidden p-5 sm:p-6", SURFACE_MAIN)}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-12 size-56 rounded-full bg-[#f8cca8]/25 blur-3xl"
            />
            <div className="relative flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full border-[#e5dbd1] bg-[linear-gradient(180deg,#f8f3ee_0%,#f1e8e0_100%)] px-2.5 py-1 font-bold text-[10.5px] text-[#4a433e]"
              >
                {failure
                  ? persist
                    ? "Misi dihentikan"
                    : "Latihan dihentikan"
                  : persist
                    ? "Misi selesai"
                    : "Latihan selesai"}
              </Badge>
              <span aria-hidden="true" className="text-[#e0d3c8]">
                ·
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full border-0 px-2.5 py-1 font-bold text-[10.5px]",
                  failure || emergency
                    ? "bg-[linear-gradient(135deg,#fde8ea_0%,#fce1de_55%,#f9dbd2_100%)] text-[#b91c1c]"
                    : "bg-[linear-gradient(90deg,#fde6d6_0%,#fbdac4_100%)] text-[#d4511b]",
                )}
              >
                {failure
                  ? "Jalur berhenti"
                  : ending.variant === "success"
                    ? "Kamu aman"
                    : ending.variant === "recovery"
                      ? "Awal pemulihan"
                      : "Akun perlu diamankan"}
              </Badge>
            </div>
            <h1
              ref={endingRef}
              tabIndex={-1}
              className="relative mt-2.5 font-extrabold text-2xl text-txt leading-tight tracking-tight outline-none sm:text-[30px]"
            >
              {failure ? "Berhenti dan ambil langkah aman" : ending.title}
            </h1>
            <p className="relative mt-1.5 max-w-2xl text-dim text-sm leading-relaxed">
              {failure ?? ending.text}
            </p>
          </header>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
            <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
              <Card
                className={cn(
                  "gap-0 border-0 py-0 ring-0 shadow-none",
                  SURFACE_MAIN,
                )}
              >
                <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
                  {latest?.rationale && (
                    <div className={cn(SURFACE_ALERT, "px-3 py-2.5")}>
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid size-[20px] shrink-0 place-items-center rounded-full bg-[#d92d20] font-extrabold text-[10px] text-white">
                          <ShieldAlert aria-hidden="true" className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-[12.5px] text-[#c8430e]">
                            {failure
                              ? "Penjelasan pilihan"
                              : latestTactic
                                ? `Pola terakhir: ${latestTactic.name}`
                                : "Penjelasan pilihan terakhir"}
                          </p>
                          <p className="mt-1 text-[#b5481f] text-[12px] leading-relaxed">
                            {latest.rationale}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <section className="flex flex-col gap-2">
                    <h2 className="flex items-center gap-2 font-extrabold text-[15px] text-txt">
                      <Lightbulb
                        aria-hidden="true"
                        className="size-4 text-brand"
                      />
                      Empat hal untuk diingat
                    </h2>
                    <ol className="mt-1 flex list-none flex-col gap-1 p-0">
                      {ending.debrief.map((line, index) => (
                        <li key={line} className="flex items-start gap-2">
                          <span
                            className={cn(
                              "grid size-[18px] shrink-0 place-items-center rounded-[6px] font-extrabold text-[9.2px]",
                              SURFACE_BADGE,
                            )}
                          >
                            {index + 1}
                          </span>
                          <p
                            className={cn(
                              "flex-1 px-2.5 py-[5px] text-[#24211f] text-[12px] leading-[1.35]",
                              SURFACE_ROW,
                            )}
                          >
                            {line}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div
                      className={cn(
                        SURFACE_NOTE,
                        "flex items-start gap-2.5 px-3 py-2.5",
                      )}
                    >
                      <span className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full bg-white/80 text-[#c8430e]">
                        <CheckCircle2 aria-hidden="true" className="size-3.5" />
                      </span>
                      <div>
                        <p className="font-extrabold text-[10.4px] text-[#1c1a18] leading-tight">
                          Langkah aman
                        </p>
                        <p className="mt-0.5 text-[#6c615a] text-[9.5px] leading-[1.3]">
                          {safeSteps.length} dari {decisions.length} keputusan
                          menjaga kendali akun.
                        </p>
                      </div>
                    </div>
                    <div
                      className={cn(
                        SURFACE_NOTE,
                        "flex items-start gap-2.5 px-3 py-2.5",
                      )}
                    >
                      <span className="mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full bg-white/80 text-[#b91c1c]">
                        <ShieldAlert aria-hidden="true" className="size-3.5" />
                      </span>
                      <div>
                        <p className="font-extrabold text-[10.4px] text-[#1c1a18] leading-tight">
                          Langkah berisiko
                        </p>
                        <p className="mt-0.5 text-[#6c615a] text-[9.5px] leading-[1.3]">
                          {riskySteps.length} keputusan membuka celah. Pelajari
                          ulang alasannya.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      SURFACE_ROW,
                      "border border-[#f5ece4] px-3 py-2.5",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Lightbulb
                        aria-hidden="true"
                        className="size-3.5 text-[#c8430e]"
                      />
                      <p className="font-extrabold text-[10.4px] text-[#1e1c1a]">
                        Bukti latihan yang dipilih
                      </p>
                    </div>
                    <div className="mt-1.5 flex flex-col gap-1 pl-5">
                      {proofItems.length > 0 ? (
                        proofItems.map((item) => (
                          <span
                            key={item.id}
                            className="flex items-center gap-1.5 font-semibold text-[#4a3728] text-[10.5px]"
                          >
                            <CheckCircle2
                              aria-hidden="true"
                              className="size-3 fill-[#f2600c] text-white"
                            />
                            {item.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#8a8077] text-[10.5px]">
                          Belum ada bukti yang dipilih pada jalur ini.
                        </span>
                      )}
                    </div>
                  </div>

                  <section className="flex flex-col gap-2 border-brand-line border-t pt-4">
                    <h2 className="font-extrabold text-[15px] text-txt">
                      Jejak keputusan
                    </h2>
                    <div className="flex flex-col gap-2">
                      {decisions.map((choice, index) => (
                        <div
                          key={`${index}-${choice.label}`}
                          className={cn(
                            SURFACE_ROW,
                            "border border-[#f0e5dc] p-3",
                          )}
                        >
                          <p className="text-[12px]">
                            <strong
                              className={cn(
                                "font-bold",
                                choice.verdict === "benar"
                                  ? "text-[#c8430e]"
                                  : "text-[#b91c1c]",
                              )}
                            >
                              {choice.verdict === "benar"
                                ? "Langkah aman"
                                : "Langkah berisiko"}
                              :
                            </strong>{" "}
                            {choice.label}
                          </p>
                          <p className="mt-1 text-[#7c726a] text-[11.5px]">
                            {choice.rationale}
                          </p>
                        </div>
                      ))}
                      {decisions.length === 0 && (
                        <p className="text-sm">Belum ada keputusan.</p>
                      )}
                    </div>
                  </section>
                </CardContent>
              </Card>
            </div>

            <aside
              aria-label="Ringkasan hasil misi"
              className="order-first lg:order-none lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1"
            >
              <div className={cn("flex flex-col gap-2", SURFACE_RAIL)}>
                <section className={cn(SURFACE_SUBCARD, "p-3.5")}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-extrabold text-[10.5px] text-[#1e1c1a]">
                      Ringkasan Misi
                    </h2>
                    <span className="rounded-full bg-[linear-gradient(90deg,#fde6d6_0%,#fbdac4_100%)] px-2 py-[1px] font-bold text-[8.5px] text-[#d4511b]">
                      Level {scenario.scenario.level}
                    </span>
                  </div>
                  <dl
                    className={cn(
                      SURFACE_ROW,
                      "mt-2.5 grid grid-cols-3 gap-1 p-2.5",
                    )}
                  >
                    {[
                      ["Keputusan", decisions.length],
                      ["Pola", tactics.length],
                      ["Bukti", proof.length],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex flex-col items-center py-1.5"
                      >
                        <dt className="order-2 mt-0.5 text-[8.8px] text-[#7c726a] leading-none">
                          {label}
                        </dt>
                        <dd className="order-1 tabular font-extrabold text-[#1e1c1a] text-sm">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-2 flex items-start gap-1.5 rounded-[10px] bg-[#fdf3ec] p-2">
                    <span className="mt-0.5 grid size-3.5 shrink-0 place-items-center rounded-full bg-[#f2600c] font-bold text-[8px] text-white">
                      i
                    </span>
                    <p className="text-[#7c726a] text-[9.5px] leading-relaxed">
                      {tactics.length > 0
                        ? `Kamu menemukan ${tactics.length} pola dari jalur ini. Coba jalur lain untuk melengkapi koleksi.`
                        : "Belum ada pola yang terkumpul. Coba jalur lain untuk menemukan pola yang bisa dipelajari."}
                    </p>
                  </div>
                </section>

                <section className={cn(SURFACE_SUBCARD, "p-3.5")}>
                  <h2 className="font-extrabold text-[10.5px] text-[#1e1c1a]">
                    Langkah berikutnya
                  </h2>
                  <div className="mt-2.5 flex flex-col gap-2">
                    {emergency && (
                      <Button
                        asChild
                        className={cn(
                          "h-11 rounded-full font-bold",
                          SURFACE_FLAME,
                        )}
                        data-pressable
                      >
                        <Link href="/komunitas">
                          <MessageSquare
                            aria-hidden="true"
                            className="size-4"
                          />
                          Diskusikan pola ini
                        </Link>
                      </Button>
                    )}
                    <Button
                      data-pressable
                      variant={emergency ? "outline" : "default"}
                      className={cn(
                        "h-11 rounded-full font-bold",
                        emergency
                          ? "border-[#ede3da] bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)] text-[#221f1d]"
                          : SURFACE_FLAME,
                      )}
                      onClick={reset}
                    >
                      <Shuffle aria-hidden="true" className="size-4" />
                      Coba jalur lain
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-full border-[#ede3da] bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)] font-semibold text-[#221f1d] hover:brightness-99"
                      data-pressable
                    >
                      <Link
                        href={
                          content.moduleNo
                            ? `/belajar/${content.moduleNo}`
                            : "/belajar"
                        }
                      >
                        <BookOpen aria-hidden="true" className="size-4" />
                        Pelajari pola ini
                      </Link>
                    </Button>
                    {!emergency && (
                      <Button
                        asChild
                        variant="outline"
                        className="h-11 rounded-full border-[#ede3da] bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf7_100%)] font-semibold text-[#221f1d] hover:brightness-99"
                        data-pressable
                      >
                        <Link href="/komunitas">
                          <MessageSquare
                            aria-hidden="true"
                            className="size-4"
                          />
                          Diskusikan pola ini
                        </Link>
                      </Button>
                    )}
                    <Button
                      asChild
                      variant="ghost"
                      className="h-11 rounded-full text-dim hover:bg-brand-tint hover:text-txt"
                      data-pressable
                    >
                      <Link href="/simulasi">
                        <LayoutGrid aria-hidden="true" className="size-4" />
                        Semua simulasi
                      </Link>
                    </Button>
                  </div>
                  <p className="mt-2 text-[#7c726a] text-[9.5px] leading-relaxed">
                    Diskusi adalah tempat berbagi pengalaman. Bila kasus sedang
                    berlangsung, hubungi bank atau penyedia akun melalui kanal
                    resmi.
                  </p>
                  <div className="mt-3 border-[#f0e5dc] border-t pt-2">
                    {collection}
                  </div>
                </section>
              </div>
            </aside>
          </div>
        </div>
      </>
    );
  }
  const task = active.type === "tool_task" ? active : null;
  const tool = task && (
    <Card className={cn("border-0 ring-0 shadow-none", SURFACE_MAIN)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {task.tool === "isolation" ? (
            <WifiOff aria-hidden="true" className="size-4 text-brand" />
          ) : task.tool === "permissions" ? (
            <KeyRound aria-hidden="true" className="size-4 text-brand" />
          ) : (
            <FileWarning aria-hidden="true" className="size-4 text-brand" />
          )}
          <CardTitle
            ref={promptRef}
            tabIndex={-1}
            role="heading"
            aria-level={2}
            className="font-extrabold text-lg text-txt outline-none"
          >
            {scenario.tools.find((item) => item.id === task.tool)?.name}
          </CardTitle>
        </div>
        <CardDescription className="text-base">{task.prompt}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {task.tool === "isolation" && (
          <Button
            data-pressable
            className="h-11 w-full"
            disabled={paused}
            onClick={() => {
              setIsolated(true);
              advance(task.on_success);
            }}
          >
            Aktifkan mode pesawat
          </Button>
        )}
        {task.tool === "permissions" && (
          <>
            <p className="text-sm">Cabut kedua izin pada perangkat latihan.</p>
            {PERMISSIONS.map((permission) => (
              <div key={permission.id} className="flex flex-col gap-1">
                <Button
                  data-pressable
                  variant={
                    revoked.includes(permission.id) ? "secondary" : "outline"
                  }
                  className="h-auto justify-start whitespace-normal px-4 py-3 text-left"
                  disabled={paused}
                  aria-pressed={revoked.includes(permission.id)}
                  onClick={() => setRevoked(toggle(revoked, permission.id))}
                >
                  Cabut izin {permission.label}
                </Button>
                <p className="px-1 text-dim text-xs">{permission.detail}</p>
              </div>
            ))}
            <Button
              data-pressable
              className="h-11 w-full"
              disabled={paused || revoked.length !== PERMISSIONS.length}
              onClick={() => advance(task.on_success)}
            >
              Selesai memeriksa izin
            </Button>
          </>
        )}
        {task.tool === "report" && (
          <>
            <p className="text-dim text-xs">
              Jangan masukkan data nyata atau kode rahasia.
            </p>
            <p className="font-medium text-sm text-txt" aria-live="polite">
              {proof.length}/2 bukti aman dipilih
            </p>
            {REPORT_ARTIFACTS.map((item) => (
              <Button
                key={item.id}
                data-pressable
                variant={proof.includes(item.id) ? "secondary" : "outline"}
                className="h-auto justify-start gap-2 whitespace-normal px-4 py-3 text-left"
                aria-pressed={proof.includes(item.id)}
                disabled={paused}
                onClick={() => {
                  if (!item.safe) {
                    setUnsafeNotice(true);
                    return;
                  }
                  setUnsafeNotice(false);
                  setProof(toggle(proof, item.id));
                }}
              >
                {proof.includes(item.id) && (
                  <Check aria-hidden="true" className="size-4 shrink-0" />
                )}
                <span className="min-w-0">{item.label}</span>
              </Button>
            ))}
            {unsafeNotice && (
              <Alert role="status" variant="destructive">
                <AlertTitle>
                  Kode rahasia tidak aman disimpan sebagai bukti
                </AlertTitle>
                <AlertDescription>
                  Jangan sertakan OTP atau PIN dalam laporan.
                </AlertDescription>
              </Alert>
            )}
            <Button
              data-pressable
              className="h-11 w-full"
              disabled={paused || proof.length < 2}
              onClick={() => advance(task.on_success)}
            >
              Siapkan bukti
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
  const awaitingMessage =
    started && !paused && !ended && active.type === "message";
  const typing =
    awaitingMessage &&
    active.type === "message" &&
    active.speaker === MISSION.contact;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">{MISSION.title}</h1>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <aside
          aria-label="Status misi"
          className="sticky top-0 z-20 -mx-5 border-[#f2e5da] border-b bg-[#fffdfb]/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:static lg:z-auto lg:col-start-2 lg:row-start-1 lg:mx-0 lg:flex lg:flex-col lg:gap-4 lg:rounded-[22px] lg:border lg:border-[#f5e6dc] lg:bg-[linear-gradient(180deg,rgba(255,252,249,0.86)_0%,rgba(253,246,240,0.92)_100%)] lg:p-2.5 lg:px-2.5 lg:py-2.5 lg:shadow-[0_6px_24px_rgba(175,110,65,0.05)] lg:backdrop-blur-none"
        >
          <Card className="rounded-none bg-transparent py-0 ring-0 shadow-none lg:rounded-[18px] lg:border lg:border-[#f3e6dc] lg:bg-[linear-gradient(180deg,#ffffff_0%,#fdf9f6_100%)] lg:py-4 lg:shadow-none">
            <CardContent className="flex flex-col gap-3 p-0 lg:gap-4 lg:p-4">
              <div className="flex items-center justify-between gap-2 border-[#efe5dc] border-b pb-2">
                <span className="inline-flex items-center gap-1.5 font-extrabold text-[10.5px] text-[#1e1c1a]">
                  <Shield
                    aria-hidden="true"
                    className="size-3.5 fill-[#1e1c1a]/25 text-[#1e1c1a]"
                  />
                  Mode simulasi
                </span>
                <span className="rounded-full bg-[linear-gradient(90deg,#fde6d6_0%,#fbdac4_100%)] px-2 py-[1px] font-bold text-[8.5px] text-[#d4511b]">
                  {mode === "santai" ? "Santai" : "Tantangan"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-full border-brand-line bg-brand-soft/60 text-brand-chip-ink lg:hidden"
                    >
                      Fiktif
                    </Badge>
                    <Badge
                      variant="outline"
                      className="hidden rounded-full border-brand-line bg-brand-soft/60 text-brand-chip-ink lg:inline-flex"
                    >
                      Mode {mode === "santai" ? "santai" : "tantangan"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border-brand-line bg-panel text-dim",
                        paused ? undefined : "hidden lg:inline-flex",
                      )}
                    >
                      {paused ? "Dijeda" : "Berlangsung"}
                    </Badge>
                  </div>
                  <p className="text-dim text-xs lg:text-sm">
                    <span className="font-semibold text-txt">
                      Babak {active.chapter ?? 1} dari {MISSION.chapters.length}
                    </span>
                    <span className="lg:hidden">
                      {" "}
                      · {MISSION.chapters[(active.chapter ?? 1) - 1]} ·{" "}
                      {mode === "santai" ? "Santai" : "Tantangan"}
                      {compromised && (
                        <span className="text-danger">
                          {" "}
                          · {isolated ? "Terputus" : "Akses terbuka"}
                        </span>
                      )}
                    </span>
                    <span className="hidden lg:inline">
                      {" "}
                      ·{" "}
                      <span className="font-semibold text-txt">
                        {MISSION.chapters[(active.chapter ?? 1) - 1]}
                      </span>
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    data-pressable
                    variant="outline"
                    className="h-11 w-11 shrink-0 rounded-full border-brand-line bg-panel lg:h-10 lg:w-auto"
                    aria-label={paused ? "Lanjutkan misi" : "Jeda"}
                    onClick={() => {
                      pausedRef.current = !paused;
                      setPaused(!paused);
                    }}
                  >
                    {paused ? (
                      <Play aria-hidden="true" />
                    ) : (
                      <Pause aria-hidden="true" />
                    )}
                    <span className="hidden lg:inline">
                      {paused ? "Lanjutkan misi" : "Jeda"}
                    </span>
                  </Button>
                  <Button
                    data-pressable
                    variant="outline"
                    className="h-11 w-11 shrink-0 rounded-full border-brand-line bg-panel lg:hidden"
                    aria-label="Kurangi panik"
                    title="Tarik napas · kurangi panik 15"
                    disabled={paused || breathingUsed}
                    onClick={() => {
                      setBreathingAt(steps.length);
                      setPanic(Math.max(0, panic - 15));
                      setBreathingUsed(true);
                    }}
                  >
                    <Wind aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="hidden gap-1 lg:flex" aria-hidden="true">
                {MISSION.chapters.map((chapter, index) => {
                  const step = index + 1;
                  const current = (active.chapter ?? 1) === step;
                  const done = step < (active.chapter ?? 1);
                  return (
                    <span
                      key={chapter}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        done ? "bg-brand" : current ? "bg-txt" : "bg-line",
                      )}
                    />
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                <Meter
                  label="Panik"
                  value={panic}
                  max={scenario.hud.panic.max}
                  danger={panic >= 70}
                  start="Tenang"
                  end="Panik"
                />
                <Meter
                  label="Akses asing"
                  value={intrusion}
                  max={scenario.hud.intrusion.max}
                  danger={intrusion >= 70}
                  start="Aman"
                  end="Bocor"
                />
              </div>

              <p className="text-dim text-[11.5px] leading-relaxed">
                {!compromised
                  ? "Belum ada akses"
                  : isolated
                    ? "Terputus"
                    : "Akses aplikasi terbuka"}{" "}
                {mode === "santai"
                  ? "· tekanan waktu mati"
                  : "· mode Tantangan"}
              </p>

              <Button
                data-pressable
                variant="outline"
                className={cn(
                  "hidden h-10 rounded-[10px] font-bold text-[#3a332e] lg:flex",
                  SURFACE_SOFT,
                )}
                disabled={paused || breathingUsed}
                onClick={() => {
                  setBreathingAt(steps.length);
                  setPanic(Math.max(0, panic - 15));
                  setBreathingUsed(true);
                }}
              >
                <Wind aria-hidden="true" />
                Tarik napas{" "}
                {breathingUsed ? "· sudah digunakan" : "· kurangi panik 15"}
              </Button>

              <div
                className="hidden items-center justify-between gap-1 font-semibold text-[10px] text-dim lg:flex"
                aria-hidden="true"
              >
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-brand" />
                  Chat
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-brand-soft-2" />
                  Aksi
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-danger" />
                  Ancaman
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-ink-faint" />
                  Risiko
                </span>
              </div>
            </CardContent>
          </Card>
          {paused && (
            <Alert
              role="status"
              className="mt-2 rounded-2xl border-brand-line bg-brand-tint/60 lg:mt-0"
            >
              <AlertTitle>Misi dijeda</AlertTitle>
              <AlertDescription>
                Pesan dan tekanan berhenti hingga kamu melanjutkan.
              </AlertDescription>
            </Alert>
          )}
        </aside>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <ChatSurface
            contactName={MISSION.contact}
            status={typing ? "mengetik…" : "online"}
            notice={MISSION.contactDetail}
            bodyRef={transcriptRef}
            footer={
              <>
                {active.type === "choice" && (
                  <ChatQuickReplies
                    prompt={active.prompt}
                    promptRef={promptRef}
                    choices={active.choices}
                    disabled={paused}
                    onChoose={choose}
                  />
                )}
                <ChatComposer
                  hint={
                    active.type === "choice"
                      ? "Pilih balasan di atas"
                      : "Menunggu pesan berikutnya"
                  }
                />
              </>
            }
          >
            {transcript.map((entry, index) =>
              entry.kind === "reply" ? (
                <ChatBubble
                  key={`reply-${entry.id}`}
                  direction="outgoing"
                  text={entry.text}
                  time={messageClock(index)}
                  ticks
                />
              ) : entry.node.speaker === MISSION.contact ? (
                <ChatBubble
                  key={entry.node.id}
                  direction="incoming"
                  text={entry.node.text}
                  time={messageClock(index)}
                  attachment={
                    entry.node.attachment
                      ? {
                          name: entry.node.attachment.name,
                          detail: entry.node.attachment.detail,
                          action: (
                            <>
                              <button
                                type="button"
                                disabled={paused}
                                aria-expanded={attachmentOpen.includes(
                                  entry.node.id,
                                )}
                                onClick={() =>
                                  setAttachmentOpen(
                                    toggle(attachmentOpen, entry.node.id),
                                  )
                                }
                              >
                                Periksa lampiran · {entry.node.attachment.name}
                              </button>
                              {attachmentOpen.includes(entry.node.id) && (
                                <p className="wa-file__note">
                                  {entry.node.attachment.detail}. Ini contoh,
                                  tidak ada unduhan.
                                </p>
                              )}
                            </>
                          ),
                        }
                      : undefined
                  }
                />
              ) : (
                <ChatSystem
                  key={entry.node.id}
                  text={`${entry.node.speaker}: ${entry.node.text}`}
                  time={messageClock(index)}
                />
              ),
            )}
            {awaitingMessage && <ChatTyping />}

            {active.type === "message" && (
              <div className="mt-1 flex justify-center">
                <button
                  type="button"
                  disabled={paused}
                  className="wa-reveal"
                  onClick={() => reveal(active)}
                >
                  Tampilkan pesan sekarang
                </button>
              </div>
            )}
          </ChatSurface>

          {latest?.rationale && (
            <div
              className={cn(
                "rounded-[16px] border px-3.5 py-3",
                latest.verdict === "salah"
                  ? "border-danger/30 bg-danger/5"
                  : "border-brand-line bg-brand-tint/60",
              )}
            >
              <p className="flex items-center gap-1.5 font-extrabold text-[12px] text-brand-ink">
                <ShieldAlert aria-hidden="true" className="size-4" />
                {latestTactic
                  ? `Pelatih · Pola penipuan: ${latestTactic.name}`
                  : "Pelatih · penjelasan pilihan"}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-soft leading-relaxed">
                {latest.rationale}
              </p>
            </div>
          )}

          {tool}
          {collection}
        </div>
      </div>
    </div>
  );
}
