"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import { ScoreCard } from "@/components/companion/score-card";
import { SignalPanel } from "@/components/companion/signal-panel";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { ScoreResult } from "@/lib/contracts/score";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { scoreText } from "@/lib/scoring/score";

/**
 * Stream A · Day-1 thin slice (§7 Hari 1): paste text -> deterministic
 * ScoreResult on screen. The conversation layer, the LLM, and the live
 * agent-by-agent panel land on day 2 on top of exactly this call.
 */

const EXAMPLES = [
  {
    id: "apk-undangan",
    label: "APK undangan pernikahan",
    text: "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim, isinya lengkap dengan lokasi acara.",
  },
  {
    id: "tugas-like",
    label: "Tugas like & top-up",
    text: "Halo kak, tugas hari ini tinggal like 10 video, komisi Rp15.000 sudah masuk. Untuk lanjut ke tugas berikutnya, kakak perlu top up saldo Rp500.000 dulu ya biar bisa ikut penarikan.",
  },
  {
    id: "akun-diblokir",
    label: "WhatsApp akun diblokir",
    text: "Akun Anda akan diblokir dalam 2 jam. Verifikasi OTP sekarang di bit.ly/verifikasi-wa agar akun tidak ditutup permanen.",
  },
] as const;

export function CompanionEntry() {
  const [text, setText] = React.useState("");
  const [result, setResult] = React.useState<ScoreResult | null>(null);
  /**
   * The exact text that produced `result`. The textarea stays editable after
   * "Periksa", and a bundle must never describe text that was not scored.
   */
  const [checkedText, setCheckedText] = React.useState("");
  /** Stamped in the handler; reading the clock during render breaks prerender. */
  const [checkedAt, setCheckedAt] = React.useState("");

  const run = React.useCallback((input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setCheckedText(trimmed);
    setCheckedAt(new Date().toISOString());
    setResult(scoreText({ text: trimmed }));
  }, []);

  const evidence = React.useMemo(
    () =>
      result && checkedText
        ? buildEvidenceBundle([{ text: checkedText, at: checkedAt, result }])
        : null,
    [result, checkedText, checkedAt],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="min-w-0">
        <h1 className="font-semibold text-2xl tracking-tight">
          Ceritakan pesan yang kamu terima
        </h1>
        <p className="mt-2 max-w-prose text-dim text-sm">
          Tempel isi pesan, tautan, atau deskripsi telepon yang kamu terima.
          Pesan itu diperiksa di perangkat ini dan tidak dikirim ke mana pun.
        </p>

        <form
          className="mt-5"
          onSubmit={(event) => {
            event.preventDefault();
            run(text);
          }}
        >
          <Field>
            <FieldLabel htmlFor="pesan">Isi pesan</FieldLabel>
            {/*
              Same raised-field treatment as the chat composer: white surface,
              hairline border, wide soft shadow that deepens on focus. The two
              surfaces are the same control and must not drift apart.
            */}
            <div className="rounded-md border border-field bg-panel p-2.5 shadow-rest transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-txt focus-within:shadow-lift">
              <Textarea
                id="pesan"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={7}
                placeholder='Contoh: "Selamat siang Bu, ini undangan pernikahan..."'
                className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            <FieldDescription>
              Tidak ada akun dan tidak ada unggahan ke server.
            </FieldDescription>
          </Field>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={text.trim().length === 0}
              className="h-10 px-4"
            >
              Periksa pesan
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Button>
            {text.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setText("");
                  setResult(null);
                  setCheckedText("");
                  setCheckedAt("");
                }}
                className="text-dim"
              >
                Bersihkan
              </Button>
            ) : null}
          </div>
        </form>

        <div className="mt-6">
          <h2 className="font-medium text-dim text-xs uppercase tracking-wide">
            Coba contoh
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <li key={example.id}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-line text-dim hover:text-txt"
                  onClick={() => {
                    setText(example.text);
                    run(example.text);
                  }}
                >
                  {example.label}
                </Button>
              </li>
            ))}
          </ul>
        </div>

        {result ? (
          <div className="mt-8">
            <ScoreCard result={result} />
          </div>
        ) : null}
      </div>

      <SignalPanel
        result={result}
        sequence={AGENT_SEQUENCE}
        evidence={evidence}
      />

      <p className="text-dim text-xs lg:col-span-2">
        Butuh bantuan sekarang?{" "}
        <Link
          href="/darurat"
          className="text-danger underline-offset-4 hover:underline"
        >
          Buka mode darurat
        </Link>{" "}
        — checklist berurutan dan laporan siap cetak.
      </p>
    </div>
  );
}
