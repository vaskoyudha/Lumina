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
import {
  L1_KURIR_APK,
  type ScenarioNode,
  type ToolId,
} from "@/lib/simulasi/scenario";

const SCENARIO = L1_KURIR_APK;

type HistoryEntry = { speaker: string; text: string };
type ReportArtifact = "pesan" | "nama-file" | "izin";

function Meter({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "warn" | "danger";
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-base">{label}</span>
        <span className="tabular text-base font-semibold">
          {Math.round(value)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        className="h-3 overflow-hidden rounded-full bg-panel-2"
      >
        <div
          className={`h-full transition-[width] duration-200 ease-out ${tone === "danger" ? "bg-danger" : "bg-warn"}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export function Runner() {
  const [activeId, setActiveId] = useState(SCENARIO.start);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [panic, setPanic] = useState(SCENARIO.hud.panic.start);
  const [intrusion, setIntrusion] = useState(SCENARIO.hud.intrusion.start);
  const [rationale, setRationale] = useState<string | null>(null);
  const [isolated, setIsolated] = useState(false);
  const [permissionsRevoked, setPermissionsRevoked] = useState(false);
  const [reportArtifacts, setReportArtifacts] = useState<ReportArtifact[]>([]);

  const activeNode = SCENARIO.nodes.find((node) => node.id === activeId);

  useEffect(() => {
    if (activeNode?.type !== "choice" || isolated) return;
    const interval = window.setInterval(() => {
      setIntrusion((current) =>
        Math.min(
          SCENARIO.hud.intrusion.max,
          current + SCENARIO.hud.intrusion.rate_per_second,
        ),
      );
    }, 1000);
    return () => window.clearInterval(interval);
  }, [activeNode, isolated]);

  function advance(next: string) {
    setActiveId(next);
  }

  function choose(
    node: Extract<ScenarioNode, { type: "choice" }>,
    choiceIndex: number,
  ) {
    const choice = node.choices[choiceIndex];
    if (!choice) return;
    if (choice.verdict === "salah") {
      setPanic((current) =>
        Math.min(SCENARIO.hud.panic.max, current + (choice.panic ?? 15)),
      );
      setRationale(choice.rationale ?? null);
    } else {
      setRationale(null);
    }
    advance(choice.next);
  }

  function reset() {
    setActiveId(SCENARIO.start);
    setHistory([]);
    setPanic(SCENARIO.hud.panic.start);
    setIntrusion(SCENARIO.hud.intrusion.start);
    setRationale(null);
    setIsolated(false);
    setPermissionsRevoked(false);
    setReportArtifacts([]);
  }

  function completeTool(tool: ToolId, next: string) {
    if (tool === "isolation") setIsolated(true);
    if (tool === "permissions") setPermissionsRevoked(true);
    advance(next);
  }

  function toggleArtifact(artifact: ReportArtifact) {
    setReportArtifacts((current) =>
      current.includes(artifact)
        ? current.filter((item) => item !== artifact)
        : [...current, artifact],
    );
  }

  if (!activeNode)
    return (
      <Alert variant="destructive">
        <AlertTitle>Skenario tidak tersedia</AlertTitle>
      </Alert>
    );

  if (activeNode.type === "ending") {
    return (
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit">
              Selesai
            </Badge>
            <CardTitle className="text-2xl">{activeNode.title}</CardTitle>
            <CardDescription className="text-base">
              {activeNode.text}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <h2 className="font-semibold text-lg">Empat hal untuk diingat</h2>
            <ol className="grid list-decimal gap-3 pl-5 text-base">
              {activeNode.debrief.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button data-pressable onClick={reset}>
                Ulangi
              </Button>
              <Button asChild data-pressable variant="outline">
                <Link href="/simulasi">Coba simulasi lain</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="grid min-w-0 gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{SCENARIO.scenario.title}</CardTitle>
            <CardDescription className="text-base">
              Pilih langkah dengan tenang. Setiap keputusan memberi dampak.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {history.map((entry, index) => (
              <div
                key={`${entry.speaker}-${index}`}
                className="grid gap-1 border-l-2 border-line pl-3"
              >
                <p className="text-sm text-dim">{entry.speaker}</p>
                <p className="text-base">{entry.text}</p>
              </div>
            ))}
            {activeNode.type === "message" && (
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <p className="text-sm text-dim">{activeNode.speaker}</p>
                  <p className="text-base">{activeNode.text}</p>
                </div>
                <Button
                  data-pressable
                  className="w-fit"
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
                    className="h-auto min-h-12 justify-start whitespace-normal px-4 py-3 text-left"
                    onClick={() => choose(activeNode, index)}
                  >
                    {choice.label}
                  </Button>
                ))}
              </div>
            )}
            {activeNode.type === "tool_task" && (
              <div className="grid gap-3">
                <h2 className="font-medium text-lg">{activeNode.prompt}</h2>
                {activeNode.tool === "isolation" && (
                  <Button
                    data-pressable
                    variant={isolated ? "secondary" : "outline"}
                    onClick={() =>
                      completeTool("isolation", activeNode.on_success)
                    }
                  >
                    {isolated
                      ? "Perangkat terisolasi"
                      : "Aktifkan mode pesawat"}
                  </Button>
                )}
                {activeNode.tool === "permissions" && (
                  <div className="grid gap-3">
                    <Alert variant="destructive">
                      <AlertTitle>Izin berisiko terdeteksi</AlertTitle>
                      <AlertDescription>
                        Akses SMS dan aksesibilitas tidak dibutuhkan untuk
                        melihat bukti kirim.
                      </AlertDescription>
                    </Alert>
                    <Button
                      data-pressable
                      variant={permissionsRevoked ? "secondary" : "outline"}
                      onClick={() =>
                        completeTool("permissions", activeNode.on_success)
                      }
                    >
                      {permissionsRevoked
                        ? "Izin berisiko dicabut"
                        : "Cabut izin SMS dan aksesibilitas"}
                    </Button>
                  </div>
                )}
                {activeNode.tool === "report" && (
                  <div className="grid gap-3">
                    {(["pesan", "nama-file", "izin"] as const).map(
                      (artifact) => (
                        <label
                          key={artifact}
                          className="flex min-h-12 items-center gap-3 rounded-md border border-line bg-panel-2 px-3 text-base"
                        >
                          <input
                            type="checkbox"
                            checked={reportArtifacts.includes(artifact)}
                            onChange={() => toggleArtifact(artifact)}
                          />
                          {artifact === "pesan"
                            ? "Tangkapan layar pesan"
                            : artifact === "nama-file"
                              ? "Nama file APK"
                              : "Daftar izin yang diminta"}
                        </label>
                      ),
                    )}
                    <Button
                      data-pressable
                      disabled={reportArtifacts.length === 0}
                      onClick={() =>
                        completeTool("report", activeNode.on_success)
                      }
                    >
                      Siapkan laporan
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {rationale && (
          <Alert variant="destructive">
            <AlertTitle>Pilihan berisiko</AlertTitle>
            <AlertDescription>{rationale}</AlertDescription>
          </Alert>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dek perangkat</CardTitle>
          <CardDescription className="text-base">
            Alat akan tersedia saat dibutuhkan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <Meter label="Panik" value={panic} tone="danger" />
          <Meter label="Intrusi" value={intrusion} tone="warn" />
          <div className="grid gap-2 border-t border-line pt-4">
            {SCENARIO.tools.map((tool) => {
              const isActive =
                activeNode.type === "tool_task" && activeNode.tool === tool.id;
              const done =
                (tool.id === "isolation" && isolated) ||
                (tool.id === "permissions" && permissionsRevoked) ||
                (tool.id === "report" &&
                  reportArtifacts.length > 0 &&
                  activeNode.id === "ending");
              return (
                <div
                  key={tool.id}
                  className="flex min-w-0 items-center justify-between gap-2"
                >
                  <span className="min-w-0 text-base">{tool.name}</span>
                  <Badge variant={done ? "secondary" : "outline"}>
                    {done ? "Selesai" : isActive ? "Gunakan" : "Tersedia"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
