"use client";

import { Loader2, Play, Send, Terminal, Wrench } from "lucide-react";
import * as React from "react";
import type {
  StudioProcessStep,
  StudioResponse,
  StudioToolRecord,
} from "@/lib/studio/contracts";

interface Turn {
  role: "user" | "assistant";
  text: string;
  tools?: StudioToolRecord[];
  process?: StudioProcessStep[];
  error?: string;
}

const EXAMPLES = [
  "Buat file index.html berisi halaman profil sederhana, lalu tampilkan isinya.",
  "Cari semua TODO di workspace dan ringkas hasilnya.",
  "Buat skrip Python yang menghitung bilangan prima, jalankan, dan perbaiki bila gagal.",
];

function toolTitle(tool: StudioToolRecord): string {
  const args = tool.arguments;
  const path = typeof args.path === "string" ? args.path : "";
  const url = typeof args.url === "string" ? args.url : "";
  const pattern = typeof args.pattern === "string" ? args.pattern : "";
  switch (tool.name) {
    case "read":
      return `Membaca ${path || "berkas"}`;
    case "write":
      return `Menulis ${path || "berkas"}`;
    case "edit":
      return `Mengedit ${path || "berkas"}`;
    case "ls":
      return `Melihat isi ${path || "workspace"}`;
    case "grep":
      return `Mencari ${pattern ? `“${pattern}”` : "teks"}`;
    case "bash":
      return "Menjalankan perintah";
    case "check_url":
      return `Memeriksa ${url || "tautan"}`;
    default:
      return tool.name;
  }
}

function ProcessTimeline({ steps }: { steps: StudioProcessStep[] }) {
  return (
    <details
      open
      className="rounded-xl border border-line bg-panel-2 px-3 py-2 text-[12px]"
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 font-medium">
        <Wrench aria-hidden className="size-3.5" />
        Proses
        <span className="font-normal text-dim">{steps.length} langkah</span>
      </summary>
      <ol className="mt-2 flex flex-col gap-2">
        {steps.map((step, index) => (
          <li key={`${step.kind}-${index}`} className="flex gap-2">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-[10px] font-medium text-dim">
              {index + 1}
            </span>
            {step.kind === "thought" ? (
              <p className="pt-0.5 text-[12px] leading-relaxed text-dim italic">
                {step.text}
              </p>
            ) : (
              <details className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-2 py-1.5">
                <summary className="flex cursor-pointer select-none items-center gap-2">
                  {step.tool.name === "bash" ? (
                    <Terminal aria-hidden className="size-3.5 shrink-0" />
                  ) : (
                    <Wrench aria-hidden className="size-3.5 shrink-0" />
                  )}
                  <span className="min-w-0 truncate font-medium">
                    {toolTitle(step.tool)}
                  </span>
                  <span className="ml-auto shrink-0 font-normal text-dim">
                    {step.tool.result.ok ? "selesai" : "gagal"} · {step.tool.ms}{" "}
                    ms
                  </span>
                </summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                  {step.tool.result.output ||
                    step.tool.result.error ||
                    "(tanpa output)"}
                </pre>
              </details>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

export function StudioChat() {
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [question, setQuestion] = React.useState("");
  const [running, setRunning] = React.useState(false);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || running) return;
    const history = turns
      .filter((turn) => turn.text.trim().length > 0)
      .slice(-8)
      .map((turn) => ({ role: turn.role, text: turn.text }));
    setTurns((current) => [...current, { role: "user", text: prompt }]);
    setQuestion("");
    setRunning(true);

    try {
      const response = await fetch("/api/studio/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: prompt, history }),
      });
      if (!response.ok) {
        const status =
          response.status === 401
            ? "Sesi berakhir. Masuk kembali untuk memakai Studio."
            : response.status === 403
              ? "Akun ini tidak ada di allowlist Studio."
              : "Studio tidak dapat menjawab sekarang.";
        setTurns((current) => [
          ...current,
          { role: "assistant", text: "", error: status },
        ]);
        return;
      }
      const body = (await response.json()) as StudioResponse;
      setTurns((current) => [
        ...current,
        {
          role: "assistant",
          text: body.text,
          tools: body.tools,
          process: body.process,
        },
      ]);
    } catch {
      setTurns((current) => [
        ...current,
        {
          role: "assistant",
          text: "",
          error: "Koneksi ke Studio terputus.",
        },
      ]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <p className="text-[11px] font-medium tracking-wide text-dim uppercase">
          Lumina Studio
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Coding agent
        </h1>
        <p className="mt-2 text-[13px] text-dim">
          Agen ini dapat membaca, menulis, mengedit, mencari, dan menjalankan
          perintah di workspace terisolasi. Tidak ada akses jaringan atau berkas
          host.
        </p>
      </header>

      <div className="flex min-h-[360px] flex-col gap-4 rounded-2xl border border-line bg-panel p-4">
        {turns.length === 0 ? (
          <div className="flex flex-1 flex-col justify-center gap-3 py-8">
            <p className="text-sm text-dim">Mulai dengan salah satu contoh:</p>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => void send(example)}
                  className="rounded-xl border border-line bg-panel-2 px-3 py-2 text-left text-[13px] text-txt transition-colors hover:border-brand-edge hover:bg-brand-tint"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((turn, index) => (
          <div
            key={`${turn.role}-${index}`}
            className={
              turn.role === "user"
                ? "self-end rounded-2xl bg-brand-soft px-3.5 py-2.5 text-[14px] text-txt"
                : "flex max-w-full flex-col gap-2"
            }
          >
            {turn.text ? (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                {turn.text}
              </p>
            ) : null}
            {turn.error ? (
              <p className="text-[12px] text-danger">{turn.error}</p>
            ) : null}
            {turn.process?.length ? (
              <ProcessTimeline steps={turn.process} />
            ) : (
              turn.tools?.map((tool) => (
                <details
                  key={tool.id}
                  className="rounded-xl border border-line bg-panel-2 px-3 py-2 text-[12px]"
                >
                  <summary className="flex cursor-pointer select-none items-center gap-2 font-medium">
                    {tool.name === "bash" ? (
                      <Terminal aria-hidden className="size-3.5" />
                    ) : (
                      <Wrench aria-hidden className="size-3.5" />
                    )}
                    <span>{tool.name}</span>
                    <span className="font-normal text-dim">
                      {tool.result.ok ? "selesai" : "gagal"} · {tool.ms} ms
                    </span>
                  </summary>
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
                    {tool.result.output ||
                      tool.result.error ||
                      "(tanpa output)"}
                  </pre>
                </details>
              ))
            )}
          </div>
        ))}

        {running ? (
          <p className="flex items-center gap-2 text-[12px] text-dim">
            <Loader2 aria-hidden className="size-3.5 animate-spin" />
            Agen sedang bekerja…
          </p>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(question);
        }}
        className="flex items-end gap-2 rounded-2xl border border-line bg-panel p-2"
      >
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(question);
            }
          }}
          rows={2}
          maxLength={8000}
          placeholder="Minta agen membuat, mengubah, atau memeriksa sesuatu…"
          className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-[14px] outline-none"
        />
        <button
          type="submit"
          disabled={running || question.trim().length === 0}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-ink text-bg transition-opacity disabled:opacity-40"
          aria-label="Kirim"
        >
          {running ? (
            <Play aria-hidden className="size-4" />
          ) : (
            <Send aria-hidden className="size-4" />
          )}
        </button>
      </form>
    </div>
  );
}
