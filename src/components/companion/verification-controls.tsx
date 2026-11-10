"use client";
import { useEffect, useRef, useState } from "react";
import type { Attachment } from "@/components/companion/composer";
import { Button } from "@/components/ui/button";
import {
  enrichScore,
  type PublicVerification,
  requestFileReputation,
} from "@/lib/companion/enrich";
import { scoreWithTrace, type TracedScore } from "@/lib/scoring/score";
import { inspectFileMetadata, sha256File } from "@/lib/verify/file";
import { imageForensics } from "@/lib/verify/image-forensics";
import { planEnrichment } from "@/lib/verify/plan";
export function VerificationControls({
  text,
  initial,
  attachments,
  onResult,
}: {
  text: string;
  initial: TracedScore;
  attachments: Attachment[];
  onResult: (scored: TracedScore) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [results, setResults] = useState<PublicVerification[]>([]);
  const controls = useRef(new Set<AbortController>());
  useEffect(
    () => () => {
      for (const c of controls.current) c.abort();
    },
    [],
  );
  const plan = planEnrichment({ text, localRisk: initial.result.risk });
  async function verify(mode: "direct" | "cached") {
    setBusy(true);
    const control = new AbortController();
    controls.current.add(control);
    const timer = setTimeout(() => control.abort(), 3000);
    try {
      const result = await enrichScore(text, initial, control.signal, mode);
      if (control.signal.aborted) return;
      onResult(result.scored);
      setResults(result.verifications);
      setNote(
        result.scored.trace.stages.find((s) => s.id === "verify")?.note ?? null,
      );
    } finally {
      clearTimeout(timer);
      controls.current.delete(control);
      setBusy(false);
    }
  }
  async function verifyFile(attachment: Attachment) {
    setBusy(true);
    const control = new AbortController();
    controls.current.add(control);
    const timer = setTimeout(() => control.abort(), 3000);
    try {
      const sha256 = await sha256File(attachment.file);
      if (control.signal.aborted) return;
      const response = await requestFileReputation(
        sha256,
        attachment.name,
        control.signal,
      );
      if (control.signal.aborted) return;
      const local = inspectFileMetadata(attachment);
      if (response.signals.length || local.length)
        onResult(
          scoreWithTrace({
            text,
            extraSignals: [
              ...initial.result.signals.filter((s) => s.weight > 0),
              ...local,
              ...response.signals,
            ],
          }),
        );
      setNote(response.note);
    } catch {
      setNote(
        "Berkas belum bisa dihitung hash-nya; tidak ada isi berkas yang dikirim.",
      );
    } finally {
      clearTimeout(timer);
      controls.current.delete(control);
      setBusy(false);
    }
  }
  async function inspectImage(attachment: Attachment) {
    setBusy(true);
    try {
      const image = await createImageBitmap(attachment.file);
      if (image.width * image.height > 4_000_000) {
        image.close();
        setNote("Gambar terlalu besar untuk pemeriksaan lokal ini.");
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      let comparison: ImageData | undefined;
      if (blob) {
        const compressed = await createImageBitmap(blob);
        ctx.drawImage(compressed, 0, 0);
        comparison = ctx.getImageData(0, 0, image.width, image.height);
        compressed.close();
      }
      image.close();
      const found = imageForensics(pixels, comparison);
      setNote(
        found
          ? `${found.label} (${found.confidence}): ${found.reasons.join("; ")}. ${found.note}`
          : "Pemeriksaan gambar lokal selesai. Hasil terbatas ini tidak membuktikan keaslian gambar.",
      );
    } catch {
      setNote("Pemeriksaan gambar lokal belum tersedia pada browser ini.");
    } finally {
      setBusy(false);
    }
  }
  if (!plan.urls.length && !attachments.length) return null;
  return (
    <section
      aria-label="Verifikasi opsional"
      className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-panel p-3 text-sm"
    >
      <p className="text-dim">
        Verifikasi opsional mengirim URL atau hash ke layanan reputasi. Isi
        pesan dan berkas tidak dikirim.
      </p>
      <div className="flex flex-wrap gap-2">
        {plan.urls.length > 0 && (
          <>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() => void verify("direct")}
            >
              Periksa fakta publik URL
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() => void verify("cached")}
            >
              Reputasi tersimpan saja
            </Button>
          </>
        )}
        {attachments.slice(0, 2).map((a) => (
          <Button
            key={a.id}
            variant="outline"
            className="min-h-11 max-w-full whitespace-normal text-left"
            disabled={busy}
            onClick={() => void verifyFile(a)}
          >
            Periksa hash {a.name}
          </Button>
        ))}
        {process.env.NEXT_PUBLIC_IMAGE_FORENSICS === "on" &&
          attachments
            .filter((a) => a.type.startsWith("image/"))
            .slice(0, 1)
            .map((a) => (
              <Button
                key={`image-${a.id}`}
                variant="outline"
                className="min-h-11"
                disabled={busy}
                onClick={() => void inspectImage(a)}
              >
                Indikasi edit (eksperimental)
              </Button>
            ))}
      </div>
      {note && (
        <p className="break-words text-dim" aria-live="polite">
          {note}
        </p>
      )}
      {results.map((r, i) => (
        <div key={`${r.status}-${i}`} className="text-xs text-dim">
          <p>
            {r.domainAgeDays !== null && r.domainAgeDays !== undefined
              ? `Usia domain: ${r.domainAgeDays} hari. `
              : ""}
            {r.tls?.issuer ? `Penerbit TLS: ${r.tls.issuer}. ` : ""}
          </p>
          {r.blocklists?.map((s) => (
            <p key={s.source}>
              Sumber: {s.source} —{" "}
              {s.status === "tidak tersedia"
                ? s.status
                : s.listed
                  ? "tercatat"
                  : "tidak ditemukan pada sumber ini"}
            </p>
          ))}
        </div>
      ))}
    </section>
  );
}
