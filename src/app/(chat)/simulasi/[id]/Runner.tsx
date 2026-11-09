"use client";

import {
  ArrowRight,
  ChevronDown,
  Coffee,
  FileWarning,
  Flag,
  KeyRound,
  MessageSquare,
  Pause,
  Play,
  ShieldCheck,
  WifiOff,
  Wind,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  MISSION,
  PERMISSIONS,
  REPORT_ARTIFACTS,
  type ScenarioChoice,
  type ScenarioNode,
  L1_KURIR_APK as scenario,
  TACTICS,
  type TacticId,
} from "@/lib/simulasi/scenario";
import { cn } from "@/lib/utils";

type Message = Extract<ScenarioNode, { type: "message" }>;
type Ending = Extract<ScenarioNode, { type: "ending" }>;
type Mode = "santai" | "tantangan";
type TranscriptEntry =
  | { kind: "message"; node: Message }
  | { kind: "reply"; id: string; text: string };

const defaultEnding = scenario.nodes.find(
  (node): node is Ending => node.type === "ending",
) as Ending;

function Meter({
  label,
  value,
  max,
  danger,
}: {
  label: string;
  value: number;
  max: number;
  danger?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-txt">{label}</span>
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
          "h-2.5",
          danger
            ? "[&_[data-slot=progress-indicator]]:bg-danger"
            : "[&_[data-slot=progress-indicator]]:bg-brand",
        )}
      />
    </div>
  );
}

export function Runner() {
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
  }, [started, paused, ended, mode, compromised, isolated]);
  useEffect(() => {
    if (started && !ended && intrusion >= scenario.hud.intrusion.max)
      setFailure(scenario.hud.intrusion.fail_message);
  }, [started, ended, intrusion]);
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
      activeRef.current = next;
      setActiveId(next);
    }
  }
  function reset() {
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
              Koleksi taktik · {tactics.length} ditemukan
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
            Taktik yang kamu temukan akan muncul di sini.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  if (!started)
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <header>
            <p className="flex items-center gap-1.5 font-medium text-dim text-xs">
              Level {scenario.scenario.level} · Misi interaktif
            </p>
            <h1 className="mt-1 font-bold text-2xl text-txt tracking-tight sm:text-[30px]">
              {MISSION.title}
            </h1>
            <p className="mt-1 text-dim text-sm">
              {MISSION.duration} · {MISSION.chapters.length} babak
            </p>
          </header>

          <Card className="rounded-2xl border border-line ring-0 shadow-[var(--appnext-shadow-ambient)]">
            <CardHeader>
              <p className="font-semibold text-[11px] text-dim uppercase tracking-wide">
                Briefing misi
              </p>
              <CardTitle className="text-xl">
                Siap jadi pemeran utama?
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {MISSION.role} · {MISSION.context}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="rounded-xl bg-panel-2 p-4">
                <p className="font-medium text-sm text-txt">Tujuan misi</p>
                <p className="mt-0.5 text-dim text-sm">{MISSION.objective}</p>
              </div>

              <div>
                <h2 className="font-bold text-[15px] text-txt">
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
                      "h-auto justify-start gap-3 whitespace-normal px-4 py-3 text-left",
                      mode === "santai" && "border-brand-line bg-brand-soft",
                    )}
                    onClick={() => setMode("santai")}
                  >
                    <Coffee aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">Santai</span>
                      <span className="block text-dim text-xs">
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
                      "h-auto justify-start gap-3 whitespace-normal px-4 py-3 text-left",
                      mode === "tantangan" && "border-brand-line bg-brand-soft",
                    )}
                    onClick={() => setMode("tantangan")}
                  >
                    <Zap aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">Tantangan</span>
                      <span className="block text-dim text-xs">
                        Tekanan naik jika akses aplikasi terbuka
                      </span>
                    </span>
                  </Button>
                </fieldset>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-line border-t pt-4">
                <Button
                  data-pressable
                  className="h-10 rounded-xl px-5"
                  onClick={() => setStarted(true)}
                >
                  Mulai misi <ArrowRight aria-hidden="true" />
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl"
                  data-pressable
                >
                  <Link href="/belajar/10">Baca pola APK dulu</Link>
                </Button>
              </div>

              <p className="text-dim text-xs">
                Semua pesan dan alat di sini fiktif. Latihan tidak mengubah
                perangkat atau mengirim laporan ke mana pun.
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-0">
          <Card className="gap-0 rounded-2xl border border-line p-4 ring-0 shadow-[var(--appnext-shadow-ambient)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-sm text-txt">Ringkasan misi</h2>
              <span className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-[10px] text-brand-ink">
                LEVEL {scenario.scenario.level}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-panel-2 p-2.5">
              <div className="flex flex-col items-center py-1.5">
                <dd className="tabular font-bold text-sm text-txt">
                  {MISSION.chapters.length}
                </dd>
                <dt className="mt-0.5 text-[9px] text-dim leading-none">
                  Babak
                </dt>
              </div>
              <div className="flex flex-col items-center py-1.5">
                <dd className="tabular font-bold text-sm text-txt">
                  {
                    scenario.nodes.filter((node) => node.type === "ending")
                      .length
                  }
                </dd>
                <dt className="mt-0.5 text-[9px] text-dim leading-none">
                  Akhir
                </dt>
              </div>
              <div className="flex flex-col items-center py-1.5">
                <dd className="tabular font-bold text-sm text-txt">3–5</dd>
                <dt className="mt-0.5 text-[9px] text-dim leading-none">
                  Menit
                </dt>
              </div>
            </dl>
            <p className="mt-3 text-dim text-[11px] leading-relaxed">
              Pilihanmu mengubah meter panik dan intrusi. Penilaian mengikuti
              aturan skenario, bukan model.
            </p>
          </Card>

          <Card className="gap-0 rounded-2xl border border-line p-4 ring-0 shadow-[var(--appnext-shadow-ambient)]">
            <h2 className="font-bold text-sm text-txt">Cara dinilai</h2>
            <ul className="mt-2 flex flex-col gap-2 text-dim text-xs leading-relaxed">
              <li>Setiap pilihan punya konsekuensi tetap pada cerita.</li>
              <li>
                Meter panik dan intrusi bergerak dari keputusanmu, bukan
                tebakan.
              </li>
              <li>Bukti yang dibagikan harus aman; kode rahasia ditolak.</li>
            </ul>
          </Card>

          <Alert className="rounded-2xl border-line">
            <ShieldCheck aria-hidden />
            <AlertTitle>Latihan, bukan pemindaian perangkat</AlertTitle>
            <AlertDescription>
              Semua pesan, lampiran, dan alat di sini fiktif. Latihan tidak
              mengubah perangkat atau mengirim laporan ke mana pun.
            </AlertDescription>
          </Alert>
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
    return (
      <div
        className="flex flex-col gap-4"
        data-outcome={failure ? "failure" : ending.variant}
      >
        <h1 className="sr-only">{MISSION.title}</h1>
        <Card className="rounded-[24px] ring-0 shadow-[var(--appnext-shadow-ambient)]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={failure ? "destructive" : "secondary"}
                data-tone={failure ? "danger" : undefined}
              >
                {failure ? "Misi dihentikan" : "Misi selesai"}
              </Badge>
              <Badge variant="outline">
                {failure
                  ? "Jalur berhenti"
                  : ending.variant === "success"
                    ? "Pencegahan"
                    : ending.variant === "recovery"
                      ? "Awal pemulihan"
                      : "Akun perlu diamankan"}
              </Badge>
            </div>
            <CardTitle
              ref={endingRef}
              tabIndex={-1}
              role="heading"
              aria-level={2}
              className="mt-1 text-xl outline-none"
            >
              {failure ? "Berhenti dan ambil langkah aman" : ending.title}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {failure ?? ending.text}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {latest?.rationale && (
              <Alert
                role="status"
                data-tone={latest.verdict === "salah" ? "danger" : "safe"}
                variant={latest.verdict === "salah" ? "destructive" : "default"}
                className="border-line"
              >
                <AlertTitle>
                  {failure
                    ? "Penjelasan pilihan"
                    : latestTactic
                      ? `Taktik terakhir: ${latestTactic.name}`
                      : "Penjelasan pilihan terakhir"}
                </AlertTitle>
                <AlertDescription>{latest.rationale}</AlertDescription>
              </Alert>
            )}

            <dl className="grid gap-2 sm:grid-cols-3">
              {[
                ["Keputusan", decisions.length],
                ["Taktik ditemukan", tactics.length],
                ["Bukti dipilih", proof.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-panel-2 px-3 py-2.5">
                  <dt className="text-dim text-xs">{label}</dt>
                  <dd className="tabular mt-0.5 font-medium text-sm text-txt">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <section className="flex flex-col gap-2">
              <h2 className="font-semibold text-lg tracking-tight">
                Empat hal untuk diingat
              </h2>
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
                {ending.debrief.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="font-semibold text-lg tracking-tight">
                Jejak keputusan
              </h2>
              <div className="flex flex-col gap-2">
                {decisions.map((choice, index) => (
                  <div
                    key={`${index}-${choice.label}`}
                    className="rounded-xl bg-panel-2 p-3"
                  >
                    <p className="text-sm">
                      <strong className="font-medium">
                        {choice.verdict === "benar"
                          ? "Langkah aman"
                          : "Langkah berisiko"}
                        :
                      </strong>{" "}
                      {choice.label}
                    </p>
                    <p className="mt-1 text-dim text-sm">{choice.rationale}</p>
                  </div>
                ))}
                {decisions.length === 0 && (
                  <p className="text-sm">Belum ada keputusan.</p>
                )}
              </div>
            </section>

            {proof.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="font-semibold text-lg tracking-tight">
                  Bukti latihan yang dipilih
                </h2>
                <ul className="list-disc pl-5 text-sm">
                  {REPORT_ARTIFACTS.filter((item) =>
                    proof.includes(item.id),
                  ).map((item) => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              </section>
            )}

            {collection}

            <div className="flex flex-wrap gap-2 border-line border-t pt-5">
              <Button
                data-pressable
                variant={emergency ? "outline" : "default"}
                className="h-11"
                onClick={reset}
              >
                Coba jalur lain
              </Button>
              <Button asChild variant="outline" className="h-11" data-pressable>
                <Link href="/belajar/10">Pelajari pola ini</Link>
              </Button>
              <Button
                asChild
                variant={emergency ? "default" : "outline"}
                className={cn("h-11", emergency && "order-first")}
                data-pressable
              >
                <Link href="/darurat">Buka mode darurat</Link>
              </Button>
              <Button asChild variant="outline" className="h-11" data-pressable>
                <Link href="/simulasi">Semua simulasi</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  const task = active.type === "tool_task" ? active : null;
  const tool = task && (
    <Card className="rounded-[24px] ring-0 shadow-[var(--appnext-shadow-ambient)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          {task.tool === "isolation" ? (
            <WifiOff aria-hidden="true" className="size-4 text-dim" />
          ) : task.tool === "permissions" ? (
            <KeyRound aria-hidden="true" className="size-4 text-dim" />
          ) : (
            <FileWarning aria-hidden="true" className="size-4 text-dim" />
          )}
          <CardTitle
            ref={promptRef}
            tabIndex={-1}
            role="heading"
            aria-level={2}
            className="text-lg outline-none"
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
            <p className="text-sm">
              Pilih sedikitnya dua bukti aman. Jangan masukkan data nyata atau
              kode rahasia.
            </p>
            {REPORT_ARTIFACTS.map((item) => (
              <Button
                key={item.id}
                data-pressable
                variant={proof.includes(item.id) ? "secondary" : "outline"}
                className="h-auto justify-start whitespace-normal px-4 py-3 text-left"
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
                {item.label}
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
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">{MISSION.title}</h1>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1">
          <Card className="rounded-[24px] ring-0 shadow-[var(--appnext-shadow-ambient)]">
            <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      Mode {mode === "santai" ? "santai" : "tantangan"}
                    </Badge>
                    <Badge variant="outline">
                      {paused ? "Dijeda" : "Berlangsung"}
                    </Badge>
                  </div>
                  <p className="text-dim text-sm">
                    Tahap {active.chapter ?? 1} dari {MISSION.chapters.length} ·{" "}
                    <span className="font-medium text-txt">
                      {MISSION.chapters[(active.chapter ?? 1) - 1]}
                    </span>
                  </p>
                </div>
                <Button
                  data-pressable
                  variant="outline"
                  className="h-11 w-11 shrink-0 sm:h-10 sm:w-auto"
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
                  <span className="hidden sm:inline">
                    {paused ? "Lanjutkan misi" : "Jeda"}
                  </span>
                </Button>
              </div>

              <div className="flex gap-1" aria-hidden="true">
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

              <div className="grid grid-cols-2 gap-4">
                <Meter
                  label="Panik"
                  value={panic}
                  max={scenario.hud.panic.max}
                  danger={panic >= 70}
                />
                <Meter
                  label="Intrusi"
                  value={intrusion}
                  max={scenario.hud.intrusion.max}
                  danger={intrusion >= 70}
                />
              </div>

              <div className="flex flex-col gap-2 border-line border-t pt-3">
                <p className="text-dim text-sm">
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
                  className="h-11 sm:h-10"
                  disabled={paused || breathingUsed}
                  onClick={() => {
                    setPanic(Math.max(0, panic - 15));
                    setBreathingUsed(true);
                  }}
                >
                  <Wind aria-hidden="true" />
                  Tarik napas{" "}
                  {breathingUsed ? "· sudah digunakan" : "· kurangi panik 15"}
                </Button>
              </div>
            </CardContent>
          </Card>
          {paused && (
            <Alert role="status" className="border-line">
              <AlertTitle>Misi dijeda</AlertTitle>
              <AlertDescription>
                Pesan dan tekanan berhenti hingga kamu melanjutkan.
              </AlertDescription>
            </Alert>
          )}
        </aside>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <Card className="rounded-[24px] ring-0 shadow-[var(--appnext-shadow-ambient)]">
            <CardHeader className="border-line border-b">
              <div className="flex items-center gap-2">
                <MessageSquare aria-hidden className="size-4 text-dim" />
                <CardTitle role="heading" aria-level={2} className="text-lg">
                  {MISSION.contact}
                </CardTitle>
                <Badge variant="outline">Fiktif</Badge>
              </div>
              <CardDescription>{MISSION.contactDetail}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div
                ref={transcriptRef}
                role="log"
                aria-label="Percakapan latihan"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to focus and scroll the transcript.
                tabIndex={0}
                className="flex max-h-96 flex-col gap-3 overflow-y-auto rounded-2xl px-0.5 py-1"
              >
                {transcript.map((entry) =>
                  entry.kind === "reply" ? (
                    <div
                      key={`reply-${entry.id}`}
                      className="ml-auto flex w-fit max-w-[min(90%,34rem)] shrink-0 flex-col gap-1 rounded-2xl rounded-br-md border border-brand-line bg-brand-soft px-3.5 py-2.5"
                      data-kind="reply"
                    >
                      <p className="appnext-chat-meta">Raka · Kamu</p>
                      <p className="text-[15px] leading-relaxed">
                        {entry.text}
                      </p>
                    </div>
                  ) : (
                    <div
                      key={entry.node.id}
                      className="appnext-chat flex w-fit max-w-[min(90%,34rem)] shrink-0 flex-col gap-2"
                      data-kind={
                        entry.node.speaker === MISSION.contact
                          ? "incoming"
                          : "system"
                      }
                    >
                      <p className="appnext-chat-meta">{entry.node.speaker}</p>
                      <p className="text-[15px] leading-relaxed text-txt">
                        {entry.node.text}
                      </p>
                      {entry.node.attachment && (
                        <>
                          <div className="flex items-start gap-2 rounded-lg bg-panel-2 px-3 py-2.5">
                            <FileWarning
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-danger"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-txt">
                                {entry.node.attachment.name}
                              </p>
                              <p className="text-dim text-xs">
                                {entry.node.attachment.detail}
                              </p>
                            </div>
                          </div>
                          <Button
                            data-pressable
                            variant="outline"
                            className="h-auto w-fit whitespace-normal px-3 py-2 text-left"
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
                          </Button>
                          {attachmentOpen.includes(entry.node.id) && (
                            <div className="flex flex-col gap-1 rounded-lg bg-panel-2 p-3">
                              <p className="font-medium text-sm text-txt">
                                {entry.node.attachment.name}
                              </p>
                              <p className="text-dim text-sm">
                                {entry.node.attachment.detail}. Ini contoh,
                                tidak ada unduhan.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ),
                )}
                {active.type === "message" && !paused && (
                  <p aria-hidden="true" className="text-dim text-sm">
                    {active.speaker === MISSION.contact
                      ? "Pengirim sedang mengetik…"
                      : "Catatan latihan sedang disiapkan…"}
                  </p>
                )}
              </div>

              {active.type === "message" && (
                <Button
                  data-pressable
                  variant="outline"
                  disabled={paused}
                  className="h-11 w-fit"
                  onClick={() => reveal(active)}
                >
                  Tampilkan pesan sekarang
                </Button>
              )}

              {latest?.rationale && (
                <Alert
                  role="status"
                  data-tone={latest.verdict === "salah" ? "danger" : "safe"}
                  variant={
                    latest.verdict === "salah" ? "destructive" : "default"
                  }
                  className="border-line"
                >
                  <AlertTitle>
                    {latestTactic
                      ? `Taktik terungkap: ${latestTactic.name}`
                      : "Penjelasan pilihan"}
                  </AlertTitle>
                  <AlertDescription>{latest.rationale}</AlertDescription>
                </Alert>
              )}

              {active.type === "choice" && (
                <div className="flex flex-col gap-3 border-line border-t pt-4">
                  <p className="font-medium text-dim text-xs uppercase tracking-wide">
                    Giliranmu
                  </p>
                  <h2
                    ref={promptRef}
                    tabIndex={-1}
                    className="font-semibold text-lg tracking-tight outline-none"
                  >
                    {active.prompt}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {active.choices.map((choice, index) => (
                      <Button
                        key={choice.label}
                        data-pressable
                        variant="outline"
                        disabled={paused}
                        className="h-auto justify-start gap-3 whitespace-normal px-4 py-3 text-left"
                        onClick={() => choose(choice)}
                      >
                        <span
                          aria-hidden="true"
                          className="grid size-6 shrink-0 place-items-center rounded-full bg-panel-2 font-medium text-xs"
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="min-w-0">{choice.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {tool}
          {collection}
        </div>
      </div>
    </div>
  );
}
