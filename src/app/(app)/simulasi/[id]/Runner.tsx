"use client";

import { ArrowRight, Coffee, Package, Shield, Zap } from "lucide-react";
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

type Message = Extract<ScenarioNode, { type: "message" }>;
type Ending = Extract<ScenarioNode, { type: "ending" }>;
type Mode = "santai" | "tantangan";
type TranscriptEntry =
  | { kind: "message"; node: Message }
  | { kind: "reply"; id: string; text: string };
const button = "min-h-11 h-auto whitespace-normal text-base";
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
    <div className="sim-meter" data-tone={danger ? "danger" : "warn"}>
      <div className="flex justify-between gap-2 text-base">
        <span>{label}</span>
        <strong className="tabular">
          {Math.round(value)} / {max}
        </strong>
      </div>
      <Progress
        value={(value / max) * 100}
        max={100}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
        className={`h-4 bg-panel-2 ${danger ? "[&_[data-slot=progress-indicator]]:bg-danger" : "[&_[data-slot=progress-indicator]]:bg-warn"}`}
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
  const [visited, setVisited] = useState<string[]>([scenario.start]);
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
    setVisited((current) => [...current, node.next]);
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
    setVisited((current) => [...current, choice.next]);
    setActiveId(choice.next);
  }
  function advance(next: string) {
    if (!paused && !ended) {
      activeRef.current = next;
      setVisited((current) => [...current, next]);
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
    setVisited([scenario.start]);
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
    <section className="sim-side-panel grid gap-3">
      <Button
        data-pressable
        variant="outline"
        className={`${button} sim-tactics-toggle justify-between`}
        aria-expanded={collectionOpen}
        onClick={() => setCollectionOpen(!collectionOpen)}
      >
        Koleksi taktik · {tactics.length} ditemukan{" "}
        <span aria-hidden="true">{collectionOpen ? "−" : "+"}</span>
      </Button>
      {collectionOpen &&
        (tacticCards.length ? (
          tacticCards.map((tactic) => (
            <Card key={tactic.id} className="sim-tactic-card">
              <CardHeader>
                <CardTitle role="heading" aria-level={3} className="text-base">
                  {tactic.name}
                </CardTitle>
                <CardDescription className="text-base">
                  “{tactic.quote}”
                </CardDescription>
              </CardHeader>
              <CardContent className="text-base">{tactic.lesson}</CardContent>
            </Card>
          ))
        ) : (
          <p className="text-base text-dim">
            Taktik yang kamu temukan akan muncul di sini.
          </p>
        ))}
    </section>
  );

  if (!started)
    return (
      <section className="sim-briefing">
        <div className="sim-briefing-intro">
          <div className="sim-parcel-art" aria-hidden="true">
            <Package size={82} strokeWidth={1.5} />
            <span>✦</span>
          </div>
          <p className="sim-briefing-label">
            <span>Briefing misi</span> · {MISSION.duration}
          </p>
          <h2>Siap jadi pemeran utama?</h2>
          <p>
            {MISSION.role} · {MISSION.context}
          </p>
          <p>
            <strong>Tujuan:</strong> {MISSION.objective}
          </p>
          <p>
            Semua pesan dan alat di sini fiktif. Latihan tidak mengubah
            perangkat atau mengirim laporan.
          </p>
        </div>
        <div className="sim-briefing-choices">
          <h2>Pilih cara bermain</h2>
          <Button
            data-pressable
            variant="outline"
            aria-pressed={mode === "santai"}
            data-selected={mode === "santai"}
            data-mode="santai"
            className={`${button} sim-mode-ticket`}
            onClick={() => setMode("santai")}
          >
            <Coffee aria-hidden="true" />
            <span>Santai · tanpa tekanan waktu otomatis</span>
          </Button>
          <Button
            data-pressable
            variant="outline"
            aria-pressed={mode === "tantangan"}
            data-selected={mode === "tantangan"}
            data-mode="tantangan"
            className={`${button} sim-mode-ticket`}
            onClick={() => setMode("tantangan")}
          >
            <Zap aria-hidden="true" />
            <span>Tantangan · tekanan naik jika akses aplikasi terbuka</span>
          </Button>
          <Button
            data-pressable
            className={`${button} sim-start-button`}
            onClick={() => setStarted(true)}
          >
            Mulai misi <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </section>
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
        className="sim-ending"
        data-outcome={failure ? "failure" : ending.variant}
      >
        <Card>
          <CardHeader>
            <Badge
              variant={failure ? "destructive" : "secondary"}
              data-tone={failure ? "danger" : undefined}
              className="w-fit"
            >
              {failure ? "Misi dihentikan" : "Misi selesai"}
            </Badge>
            <CardTitle
              ref={endingRef}
              tabIndex={-1}
              role="heading"
              aria-level={2}
              className="text-2xl outline-none"
            >
              {failure ? "Berhenti dan ambil langkah aman" : ending.title}
            </CardTitle>
            <CardDescription className="text-base">
              {failure ?? ending.text}
            </CardDescription>
          </CardHeader>
          <CardContent className="sim-ending-content grid gap-5">
            {failure && latest?.rationale && (
              <Alert
                role="status"
                data-tone={latest.verdict === "salah" ? "danger" : undefined}
                variant={latest.verdict === "salah" ? "destructive" : "default"}
              >
                <AlertTitle>Penjelasan pilihan</AlertTitle>
                <AlertDescription className="text-base">
                  {latest.rationale}
                </AlertDescription>
              </Alert>
            )}
            <section>
              <h2 className="font-semibold text-lg">Empat hal untuk diingat</h2>
              <ol className="grid list-decimal gap-2 pl-5 text-base">
                {ending.debrief.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </section>
            <section className="grid gap-2">
              <h2 className="font-semibold text-lg">Jejak keputusan</h2>
              {decisions.map((choice, index) => (
                <div
                  key={`${index}-${choice.label}`}
                  className="sim-decision-entry grid gap-1"
                >
                  <p className="text-base">
                    <strong>
                      {choice.verdict === "benar"
                        ? "Langkah aman"
                        : "Langkah berisiko"}
                      :
                    </strong>{" "}
                    {choice.label}
                  </p>
                  <p className="text-base text-dim">{choice.rationale}</p>
                </div>
              ))}
              {decisions.length === 0 && (
                <p className="text-base">Belum ada keputusan.</p>
              )}
            </section>
            {proof.length > 0 && (
              <section>
                <h2 className="font-semibold text-lg">
                  Bukti latihan yang dipilih
                </h2>
                <ul className="list-disc pl-5 text-base">
                  {REPORT_ARTIFACTS.filter((item) =>
                    proof.includes(item.id),
                  ).map((item) => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              </section>
            )}
            {collection}
            <div className="sim-end-actions flex flex-wrap gap-3">
              <Button
                data-pressable
                variant={emergency ? "outline" : "default"}
                className={button}
                onClick={reset}
              >
                Coba jalur lain
              </Button>
              <Button
                asChild
                data-pressable
                variant="outline"
                className={button}
              >
                <Link href="/belajar/10">Pelajari pola ini</Link>
              </Button>
              <Button
                asChild
                data-pressable
                variant={emergency ? "default" : "outline"}
                className={`${button} ${emergency ? "order-first" : ""}`}
              >
                <Link href="/darurat">Buka mode darurat</Link>
              </Button>
              <Button
                asChild
                data-pressable
                variant="outline"
                className={button}
              >
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
    <Card className="sim-tool-panel min-w-0">
      <CardHeader>
        <CardTitle
          ref={promptRef}
          tabIndex={-1}
          role="heading"
          aria-level={2}
          className="text-lg outline-none"
        >
          {scenario.tools.find((item) => item.id === task.tool)?.name}
        </CardTitle>
        <CardDescription className="text-base">{task.prompt}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {task.tool === "isolation" && (
          <Button
            data-pressable
            className={button}
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
            <p className="text-base">
              Cabut kedua izin pada perangkat latihan.
            </p>
            {PERMISSIONS.map((permission) => (
              <div key={permission.id} className="grid gap-1">
                <Button
                  data-pressable
                  variant={
                    revoked.includes(permission.id) ? "secondary" : "outline"
                  }
                  className={`${button} sim-tool-option`}
                  disabled={paused}
                  aria-pressed={revoked.includes(permission.id)}
                  onClick={() => setRevoked(toggle(revoked, permission.id))}
                >
                  Cabut izin {permission.label}
                </Button>
                <p className="text-base text-dim">{permission.detail}</p>
              </div>
            ))}
            <Button
              data-pressable
              className={button}
              disabled={paused || revoked.length !== PERMISSIONS.length}
              onClick={() => advance(task.on_success)}
            >
              Selesai memeriksa izin
            </Button>
          </>
        )}
        {task.tool === "report" && (
          <>
            <p className="text-base">
              Pilih sedikitnya dua bukti aman. Jangan masukkan data nyata atau
              kode rahasia.
            </p>
            {REPORT_ARTIFACTS.map((item) => (
              <Button
                key={item.id}
                data-pressable
                variant={proof.includes(item.id) ? "secondary" : "outline"}
                className={`${button} sim-tool-option justify-start`}
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
                <AlertDescription className="text-base">
                  Jangan sertakan OTP atau PIN dalam laporan.
                </AlertDescription>
              </Alert>
            )}
            <Button
              data-pressable
              className={button}
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
    <div className="grid min-w-0 gap-4">
      <Card className="sim-hud">
        <CardContent className="grid gap-4 pt-4">
          <div className="sim-hud-header flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-base">{MISSION.title}</p>
              <p className="text-base text-dim">
                {mode === "santai" ? "Santai" : "Tantangan"} ·{" "}
                {paused ? "Dijeda" : "Sedang berlangsung"}
              </p>
            </div>
            <Button
              data-pressable
              variant="outline"
              className={button}
              onClick={() => {
                pausedRef.current = !paused;
                setPaused(!paused);
              }}
            >
              {paused ? "Lanjutkan misi" : "Jeda"}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Meter
              label="Panik"
              value={panic}
              max={scenario.hud.panic.max}
              danger
            />
            <Meter
              label="Intrusi"
              value={intrusion}
              max={scenario.hud.intrusion.max}
            />
          </div>
          <p className="text-base text-dim">
            {!compromised
              ? "Belum ada akses"
              : isolated
                ? "Terputus"
                : "Akses aplikasi terbuka"}{" "}
            {mode === "santai" ? " · tekanan waktu mati" : " · mode Tantangan"}
          </p>
          <Button
            data-pressable
            variant="outline"
            className={`${button} sim-mission-controls w-fit`}
            disabled={paused || breathingUsed}
            onClick={() => {
              setPanic(Math.max(0, panic - 15));
              setBreathingUsed(true);
            }}
          >
            Tarik napas{" "}
            {breathingUsed ? "· sudah digunakan" : "· kurangi panik 15"}
          </Button>
        </CardContent>
      </Card>
      <section
        className="sim-chapters flex flex-wrap gap-2"
        aria-label="Bab misi"
      >
        {MISSION.chapters.map((chapter, index) => (
          <Badge
            key={chapter}
            variant={active.chapter === index + 1 ? "secondary" : "outline"}
            className="sim-chapter text-base"
            data-active={active.chapter === index + 1}
            aria-current={active.chapter === index + 1 ? "step" : undefined}
          >
            {index + 1}. {chapter}
          </Badge>
        ))}
      </section>
      {paused && (
        <Alert role="status">
          <AlertTitle>Misi dijeda</AlertTitle>
          <AlertDescription className="text-base">
            Pesan dan tekanan berhenti hingga kamu melanjutkan.
          </AlertDescription>
        </Alert>
      )}
      <div className="sim-play-grid grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)] lg:items-start">
        <div className="grid min-w-0 gap-4">
          <Card className="sim-phone min-w-0">
            <CardHeader className="sim-phone-header">
              <span className="sim-phone-avatar" aria-hidden="true">
                <Package />
              </span>
              <div>
                <CardTitle role="heading" aria-level={2} className="text-lg">
                  {MISSION.contact}
                </CardTitle>
                <CardDescription className="text-base">
                  {MISSION.contactDetail}
                </CardDescription>
                <span className="sim-phone-status">Percakapan latihan</span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div
                ref={transcriptRef}
                role="log"
                aria-label="Percakapan latihan"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to focus and scroll the transcript.
                tabIndex={0}
                className="sim-transcript flex max-h-96 flex-col gap-3 overflow-y-auto p-1 pr-2"
              >
                {transcript.map((entry) =>
                  entry.kind === "reply" ? (
                    <Card
                      key={`reply-${entry.id}`}
                      className="sim-bubble ml-auto w-fit max-w-[90%] shrink-0"
                      data-kind="reply"
                    >
                      <CardContent className="grid gap-1 p-3">
                        <p className="font-semibold text-base">Raka · Kamu</p>
                        <p className="text-base">{entry.text}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card
                      key={entry.node.id}
                      className="sim-bubble w-fit max-w-[90%] shrink-0"
                      data-kind={
                        entry.node.speaker === MISSION.contact
                          ? "incoming"
                          : "system"
                      }
                    >
                      <CardContent className="grid gap-2 p-3">
                        <p className="font-semibold text-base">
                          {entry.node.speaker}
                        </p>
                        <p className="text-base">{entry.node.text}</p>
                        {entry.node.attachment && (
                          <>
                            <Button
                              data-pressable
                              variant="outline"
                              className={`${button} sim-attachment w-fit`}
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
                              <Alert>
                                <AlertTitle>
                                  {entry.node.attachment.name}
                                </AlertTitle>
                                <AlertDescription className="text-base">
                                  {entry.node.attachment.detail}. Ini contoh,
                                  tidak ada unduhan.
                                </AlertDescription>
                              </Alert>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ),
                )}
                {active.type === "message" && !paused && (
                  <p
                    className="sim-typing text-base text-dim"
                    aria-hidden="true"
                  >
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
                  className={`${button} w-fit`}
                  onClick={() => reveal(active)}
                >
                  Tampilkan pesan sekarang
                </Button>
              )}
              {latest?.rationale && (
                <Alert
                  role="status"
                  className="sim-feedback"
                  data-tone={latest.verdict === "salah" ? "danger" : "safe"}
                  variant={
                    latest.verdict === "salah" ? "destructive" : "default"
                  }
                >
                  <AlertTitle>
                    {latestTactic
                      ? `Taktik terungkap: ${latestTactic.name}`
                      : "Penjelasan pilihan"}
                  </AlertTitle>
                  <AlertDescription className="text-base">
                    {latest.rationale}
                  </AlertDescription>
                </Alert>
              )}
              {active.type === "choice" && (
                <div className="sim-choice-panel grid gap-3">
                  <h2
                    ref={promptRef}
                    tabIndex={-1}
                    className="font-semibold text-lg outline-none"
                  >
                    {active.prompt}
                  </h2>
                  {active.choices.map((choice, index) => (
                    <Button
                      key={choice.label}
                      data-pressable
                      variant="outline"
                      disabled={paused}
                      className={`${button} sim-choice-button justify-start text-left`}
                      onClick={() => choose(choice)}
                    >
                      <span aria-hidden="true">
                        {String.fromCharCode(65 + index)}
                      </span>
                      {choice.label}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <aside className="grid min-w-0 gap-4">
          {tool}
          <Card className="sim-side-panel">
            <CardHeader>
              <CardTitle role="heading" aria-level={2} className="text-lg">
                <Shield aria-hidden="true" /> Status perangkat latihan
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-base">
              {!compromised ? (
                <p>
                  Belum ada akses aplikasi; isolasi dan pemeriksaan izin tidak
                  diperlukan pada jalur ini.
                </p>
              ) : (
                <>
                  <p>
                    Isolasi:{" "}
                    {isolated
                      ? "Terputus"
                      : visited.includes(
                            scenario.tools.find(
                              (item) => item.id === "isolation",
                            )?.unlocked_at ?? "",
                          )
                        ? "Siap digunakan"
                        : "Belum tersedia"}
                  </p>
                  <p>
                    Izin sensitif:{" "}
                    {revoked.length === PERMISSIONS.length
                      ? "Keduanya dicabut"
                      : `${revoked.length} dari ${PERMISSIONS.length} dicabut`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          {collection}
        </aside>
      </div>
    </div>
  );
}
