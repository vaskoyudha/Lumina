"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  L1_KURIR_APK,
  type ScenarioChoice,
  type ScenarioNode,
  type ToolId,
} from "@/lib/simulasi/scenario";

const SCENARIO = L1_KURIR_APK;
type HistoryEntry = { speaker: string; text: string };
type ReportArtifact = "pesan" | "nama-file" | "izin";
type Permission = "SMS" | "aksesibilitas";
const artifacts: { id: ReportArtifact; label: string }[] = [
  { id: "pesan", label: "Tangkapan layar pesan" },
  { id: "nama-file", label: "Nama file APK" },
  { id: "izin", label: "Daftar izin yang diminta" },
];

function Meter({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "warn" | "danger";
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-base">{label}</span>
        <span className="tabular text-xl font-bold">
          {Math.round(value)} / {max}
        </span>
      </div>
      <Progress
        value={percent}
        max={100}
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`h-5 bg-panel-2 ${tone === "danger" ? "[&_[data-slot=progress-indicator]]:bg-danger" : "[&_[data-slot=progress-indicator]]:bg-warn"}`}
      />
    </div>
  );
}

export function Runner() {
  const [activeId, setActiveId] = useState(SCENARIO.start);
  const [visited, setVisited] = useState<string[]>([SCENARIO.start]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [panic, setPanic] = useState(SCENARIO.hud.panic.start);
  const [intrusion, setIntrusion] = useState(SCENARIO.hud.intrusion.start);
  const [feedbackChoice, setFeedbackChoice] = useState<ScenarioChoice | null>(
    null,
  );
  const [panicFailure, setPanicFailure] = useState(false);
  const [isolated, setIsolated] = useState(false);
  const [revoked, setRevoked] = useState<Permission[]>([]);
  const [reportArtifacts, setReportArtifacts] = useState<ReportArtifact[]>([]);
  const [reportComplete, setReportComplete] = useState(false);
  const [wrongChoices, setWrongChoices] = useState<ScenarioChoice[]>([]);
  const activeNode = SCENARIO.nodes.find((node) => node.id === activeId);
  const failure = panicFailure
    ? SCENARIO.hud.panic.fail_message
    : intrusion >= SCENARIO.hud.intrusion.max
      ? SCENARIO.hud.intrusion.fail_message
      : null;

  useEffect(() => {
    if (
      (activeNode?.type !== "choice" && activeNode?.type !== "tool_task") ||
      isolated ||
      failure
    )
      return;
    const interval = window.setInterval(() => {
      setIntrusion((current) =>
        Math.min(
          SCENARIO.hud.intrusion.max,
          current + SCENARIO.hud.intrusion.rate_per_second,
        ),
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeNode, failure, isolated]);

  function advance(next: string) {
    setVisited((current) =>
      current.includes(next) ? current : [...current, next],
    );
    setActiveId(next);
  }
  function choose(
    node: Extract<ScenarioNode, { type: "choice" }>,
    index: number,
  ) {
    const choice = node.choices[index];
    if (!choice || failure) return;
    setFeedbackChoice(choice);
    if (choice.verdict === "salah") {
      setWrongChoices((current) => [...current, choice]);
      const nextPanic = Math.min(
        SCENARIO.hud.panic.max,
        panic + (choice.panic ?? 15),
      );
      setPanic(nextPanic);
      if (nextPanic >= SCENARIO.hud.panic.fail_at) {
        setPanicFailure(true);
        return;
      }
    }
    advance(choice.next);
  }
  function reset() {
    setActiveId(SCENARIO.start);
    setVisited([SCENARIO.start]);
    setHistory([]);
    setPanic(SCENARIO.hud.panic.start);
    setIntrusion(SCENARIO.hud.intrusion.start);
    setFeedbackChoice(null);
    setPanicFailure(false);
    setIsolated(false);
    setRevoked([]);
    setReportArtifacts([]);
    setReportComplete(false);
    setWrongChoices([]);
  }
  function togglePermission(permission: Permission) {
    setRevoked((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission],
    );
  }
  function toggleArtifact(artifact: ReportArtifact) {
    setReportArtifacts((current) =>
      current.includes(artifact)
        ? current.filter((item) => item !== artifact)
        : [...current, artifact],
    );
  }
  const feedback = feedbackChoice?.rationale && (
    <Alert
      role="status"
      variant={feedbackChoice.verdict === "salah" ? "destructive" : "default"}
    >
      <AlertTitle>Penjelasan pilihan</AlertTitle>
      <AlertDescription>{feedbackChoice.rationale}</AlertDescription>
    </Alert>
  );
  const ending =
    activeNode?.type === "ending"
      ? activeNode
      : SCENARIO.nodes.find((node) => node.type === "ending");

  if (!activeNode)
    return (
      <Alert variant="destructive">
        <AlertTitle>Skenario tidak tersedia</AlertTitle>
      </Alert>
    );
  if (failure || activeNode.type === "ending") {
    return (
      <div className="grid gap-4 [&_a]:text-base [&_button]:text-base">
        {feedback}
        <Card>
          <CardHeader>
            <Badge
              variant={failure ? "destructive" : "secondary"}
              className="w-fit"
            >
              {failure ? "Simulasi berhenti" : "Selesai"}
            </Badge>
            <CardTitle className="text-2xl">
              {failure
                ? "Interaksi dihentikan"
                : activeNode.type === "ending"
                  ? activeNode.title
                  : "Interaksi dihentikan"}
            </CardTitle>
            <CardDescription className="text-base">
              {failure ?? (activeNode.type === "ending" ? activeNode.text : "")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <h2 className="font-semibold text-lg">Empat hal untuk diingat</h2>
            <ol className="grid list-decimal gap-3 pl-5 text-base">
              {ending?.debrief.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
            {wrongChoices.length > 0 && (
              <section className="grid gap-2">
                <h2 className="font-semibold text-lg">
                  Pilihan berisiko dalam latihan
                </h2>
                <ul className="grid list-disc gap-2 pl-5 text-base">
                  {wrongChoices.map((choice) => (
                    <li key={choice.label}>
                      {choice.label}: {choice.rationale}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {reportComplete && (
              <div>
                <h2 className="font-semibold text-lg">
                  Ringkasan bukti latihan
                </h2>
                <p className="text-base">
                  {artifacts
                    .filter((item) => reportArtifacts.includes(item.id))
                    .map((item) => item.label)
                    .join(", ")}
                  .
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                data-pressable
                className="min-h-11 text-base"
                onClick={reset}
              >
                Ulangi simulasi
              </Button>
              <Button
                asChild
                data-pressable
                variant="outline"
                className="min-h-11 text-base"
              >
                <Link href="/belajar/10">Pelajari pola ini</Link>
              </Button>
              <Button
                asChild
                data-pressable
                variant="outline"
                className="min-h-11 text-base"
              >
                <Link href="/darurat">Buka mode darurat</Link>
              </Button>
              <Button
                asChild
                data-pressable
                variant="outline"
                className="min-h-11 text-base"
              >
                <Link href="/simulasi">Semua simulasi</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  const currentTool = activeNode.type === "tool_task" ? activeNode : null;
  function toolDone(tool: ToolId) {
    return tool === "isolation"
      ? isolated
      : tool === "permissions"
        ? revoked.length === 2
        : reportComplete;
  }
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start [&_button]:text-base">
      <div className="grid min-w-0 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{SCENARIO.scenario.title}</CardTitle>
            <CardDescription className="text-base">
              Ini latihan; pilihan dan alat tidak mengubah perangkat nyata.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {feedback}
            {history.map((entry, index) => (
              <div key={`${entry.speaker}-${index}`} className="grid gap-1">
                <p className="text-base text-dim">{entry.speaker}</p>
                <p className="text-base">{entry.text}</p>
              </div>
            ))}
            {activeNode.type === "message" && (
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <p className="text-base text-dim">{activeNode.speaker}</p>
                  <p className="text-base">{activeNode.text}</p>
                </div>
                <Button
                  data-pressable
                  className="w-fit min-h-11 text-base"
                  onClick={() => {
                    setHistory((current) => [
                      ...current,
                      { speaker: activeNode.speaker, text: activeNode.text },
                    ]);
                    advance(activeNode.next);
                  }}
                >
                  Lanjut
                </Button>
              </div>
            )}
            {activeNode.type === "choice" && (
              <div className="grid gap-3">
                <h2 className="font-medium text-lg">{activeNode.prompt}</h2>
                {activeNode.choices.map((choice, index) => (
                  <Button
                    key={choice.label}
                    data-pressable
                    variant="outline"
                    className="h-auto min-h-12 justify-start whitespace-normal px-4 py-3 text-left text-base"
                    onClick={() => choose(activeNode, index)}
                  >
                    {choice.label}
                  </Button>
                ))}
              </div>
            )}
            {currentTool && (
              <div className="grid gap-2">
                <h2 className="font-medium text-lg">{currentTool.prompt}</h2>
                <p className="text-base text-dim">
                  Gunakan alat aktif di dek perangkat.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="text-lg">Dek perangkat</CardTitle>
          <CardDescription className="text-base">
            Alat latihan terbuka sesuai alur cerita.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Meter
            label="Panik"
            value={panic}
            max={SCENARIO.hud.panic.max}
            tone="danger"
          />
          <Meter
            label="Intrusi"
            value={intrusion}
            max={SCENARIO.hud.intrusion.max}
            tone="warn"
          />
          {SCENARIO.tools.map((tool) => {
            const done = toolDone(tool.id);
            const active = currentTool?.tool === tool.id;
            const unlocked = visited.includes(tool.unlocked_at);
            return (
              <section
                key={tool.id}
                className="grid min-w-0 gap-3 border-t border-line pt-4"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <h3 className="min-w-0 font-semibold text-base">
                    {tool.name}
                  </h3>
                  <Badge variant={done ? "secondary" : "outline"}>
                    {done
                      ? "Selesai"
                      : active
                        ? "Aktif"
                        : unlocked
                          ? "Terbuka"
                          : "Terkunci"}
                  </Badge>
                </div>
                {active && tool.id === "isolation" && (
                  <Button
                    data-pressable
                    className="h-auto min-h-12 whitespace-normal text-base"
                    onClick={() => {
                      setIsolated(true);
                      advance(currentTool.on_success);
                    }}
                  >
                    Aktifkan mode pesawat
                  </Button>
                )}
                {active && tool.id === "permissions" && (
                  <div className="grid gap-3">
                    <p className="text-base">
                      Pilih setiap izin untuk mencabutnya dalam latihan.
                    </p>
                    {(["SMS", "aksesibilitas"] as const).map((permission) => (
                      <Button
                        key={permission}
                        data-pressable
                        variant={
                          revoked.includes(permission) ? "secondary" : "outline"
                        }
                        aria-pressed={revoked.includes(permission)}
                        className="min-h-12 whitespace-normal text-base"
                        onClick={() => togglePermission(permission)}
                      >
                        Izin {permission}:{" "}
                        {revoked.includes(permission) ? "dicabut" : "aktif"}
                      </Button>
                    ))}
                    <Button
                      data-pressable
                      className="min-h-11 text-base"
                      disabled={revoked.length !== 2}
                      onClick={() => advance(currentTool.on_success)}
                    >
                      Selesai memeriksa izin
                    </Button>
                  </div>
                )}
                {active && tool.id === "report" && (
                  <div className="grid gap-3">
                    <p className="text-base">
                      Pilih contoh bukti aman. Jangan masukkan data atau kode
                      rahasia nyata.
                    </p>
                    {artifacts.map((artifact) => (
                      <Button
                        key={artifact.id}
                        data-pressable
                        variant={
                          reportArtifacts.includes(artifact.id)
                            ? "secondary"
                            : "outline"
                        }
                        aria-pressed={reportArtifacts.includes(artifact.id)}
                        className="h-auto min-h-12 justify-start whitespace-normal text-left text-base"
                        onClick={() => toggleArtifact(artifact.id)}
                      >
                        {artifact.label}
                      </Button>
                    ))}
                    <Button
                      data-pressable
                      className="min-h-11 text-base"
                      disabled={reportArtifacts.length === 0}
                      onClick={() => {
                        setReportComplete(true);
                        advance(currentTool.on_success);
                      }}
                    >
                      Siapkan laporan
                    </Button>
                  </div>
                )}
              </section>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
