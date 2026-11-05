"use client";

import { Download, Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { ReportPreview } from "@/components/darurat/report-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SAMPLE_BUNDLE, SAMPLE_REPORT_DRAFT } from "@/data/report-sample";
import {
  buildReportModel,
  missingReportFields,
  type ReportDraft,
} from "@/lib/darurat/report";

/**
 * ReportBuilder — a report someone can carry to a bank (§5-D).
 *
 * The PDF is rendered on the device. Nothing is posted, stored or logged.
 * Download stays disabled until the three fields a bank cannot work without
 * are filled, instead of producing a useless document.
 */

type DownloadStatus = "idle" | "loading" | "error";

export function ReportBuilder({ modus }: { modus: string }) {
  const [draft, setDraft] = useState<ReportDraft>(SAMPLE_REPORT_DRAFT);
  const [status, setStatus] = useState<DownloadStatus>("idle");

  const missing = missingReportFields(draft);
  const model = buildReportModel(draft, SAMPLE_BUNDLE, modus);

  function update<K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setStatus("idle");
  }

  async function handleDownload() {
    if (missing.length > 0) return;
    setStatus("loading");
    try {
      // Loaded on demand: @react-pdf/renderer never enters the main bundle.
      const { downloadReportPdf } = await import("@/lib/darurat/pdf");
      await downloadReportPdf({ draft, bundle: SAMPLE_BUNDLE, modus });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section aria-labelledby="laporan-bank" className="flex flex-col gap-5">
      <div>
        <h2 id="laporan-bank" className="font-semibold text-xl tracking-tight">
          Siapkan laporan untuk bank
        </h2>
        <p className="mt-2 max-w-prose text-dim text-sm">
          Bank meminta kronologi, nomor rekening pelaku, dan nominal. Isi
          datanya, periksa pratinjau, lalu unduh PDF. Berkas dibuat di perangkat
          ini dan tidak dikirim ke mana pun.
        </p>
      </div>

      <Alert className="border-line bg-panel">
        <Info aria-hidden />
        <AlertTitle>Data contoh dari sesi companion</AlertTitle>
        <AlertDescription>
          Nama, nomor rekening, dan kronologi di bawah masih contoh. Ganti
          dengan data sebenarnya sebelum dibawa ke bank.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Data laporan</CardTitle>
          <CardDescription>
            Hanya nama pelapor, rekening pelaku, dan kronologi yang wajib.
            Sisanya boleh dikosongkan dan akan tertulis “—”.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="reporter-name">Nama lengkap</FieldLabel>
                <Input
                  id="reporter-name"
                  autoComplete="name"
                  value={draft.reporterName}
                  onChange={(event) =>
                    update("reporterName", event.target.value)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="reporter-phone">Nomor HP</FieldLabel>
                <Input
                  id="reporter-phone"
                  type="tel"
                  autoComplete="tel"
                  value={draft.reporterPhone}
                  onChange={(event) =>
                    update("reporterPhone", event.target.value)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="incident-at">
                  Tanggal dan jam kejadian
                </FieldLabel>
                <Input
                  id="incident-at"
                  type="datetime-local"
                  value={draft.incidentAt}
                  onChange={(event) => update("incidentAt", event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="report-location">Kota</FieldLabel>
                <Input
                  id="report-location"
                  autoComplete="address-level2"
                  value={draft.location}
                  onChange={(event) => update("location", event.target.value)}
                />
                <FieldDescription>
                  Muncul di kolom tanda tangan.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="perpetrator-bank">
                  Bank / e-wallet pelaku
                </FieldLabel>
                <Input
                  id="perpetrator-bank"
                  value={draft.perpetratorBank}
                  onChange={(event) =>
                    update("perpetratorBank", event.target.value)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="perpetrator-account">
                  Nomor rekening pelaku
                </FieldLabel>
                <Input
                  id="perpetrator-account"
                  inputMode="numeric"
                  value={draft.perpetratorAccount}
                  onChange={(event) =>
                    update("perpetratorAccount", event.target.value)
                  }
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="loss-amount">Nominal kerugian</FieldLabel>
                <Input
                  id="loss-amount"
                  inputMode="numeric"
                  value={draft.lossAmount}
                  onChange={(event) => update("lossAmount", event.target.value)}
                />
                <FieldDescription>
                  Angka saja, tanpa titik. Contoh: 2500000.
                </FieldDescription>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="report-chronology">Kronologi</FieldLabel>
              <Textarea
                id="report-chronology"
                rows={5}
                value={draft.chronology}
                onChange={(event) => update("chronology", event.target.value)}
              />
              <FieldDescription>
                Satu kejadian per baris, dari yang paling awal. Sertakan jam
                kalau ingat.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="report-narrative">
                Ringkasan kejadian
              </FieldLabel>
              <Textarea
                id="report-narrative"
                rows={3}
                value={draft.narrative}
                onChange={(event) => update("narrative", event.target.value)}
              />
            </Field>

            <div className="flex flex-col gap-3 border-line border-t pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  className="h-10 bg-safe px-4 text-bg hover:bg-safe/90"
                  disabled={missing.length > 0 || status === "loading"}
                  onClick={handleDownload}
                >
                  {status === "loading" ? (
                    <Loader2
                      data-icon="inline-start"
                      aria-hidden
                      className="animate-spin"
                    />
                  ) : (
                    <Download data-icon="inline-start" aria-hidden />
                  )}
                  {status === "loading"
                    ? "Menyiapkan PDF…"
                    : "Unduh laporan PDF"}
                </Button>
                <p className="text-dim text-xs">
                  {missing.length > 0
                    ? `Lengkapi dulu: ${missing.join(", ")}.`
                    : "PDF siap diunduh. Tidak ada data yang dikirim."}
                </p>
              </div>

              <p aria-live="polite" className="sr-only">
                {status === "loading"
                  ? "Sedang menyiapkan PDF."
                  : status === "error"
                    ? "PDF gagal dibuat."
                    : ""}
              </p>

              {status === "error" ? (
                <Alert variant="destructive">
                  <AlertTitle>PDF gagal dibuat</AlertTitle>
                  <AlertDescription>
                    Coba lagi. Kalau tetap gagal, gunakan tombol cetak di atas
                    dan simpan halaman ini sebagai PDF.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <ReportPreview model={model} />
    </section>
  );
}
