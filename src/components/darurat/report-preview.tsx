import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { REPORT_STATEMENT, type ReportModel } from "@/lib/darurat/report";

/**
 * ReportPreview — the same model the PDF renders, shown before download (§5-D).
 *
 * No score, no gamification. This is a document being prepared, not a result
 * being celebrated.
 */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-dim text-xs sm:text-sm">{label}</dt>
      <dd className="break-words text-sm text-txt">{value}</dd>
    </div>
  );
}

export function ReportPreview({ model }: { model: ReportModel }) {
  return (
    <Card aria-labelledby="pratinjau-laporan">
      <CardHeader>
        <CardTitle id="pratinjau-laporan" role="heading" aria-level={2}>
          Pratinjau laporan
        </CardTitle>
        <CardDescription>
          Data yang sama akan masuk ke PDF. Periksa sekali lagi sebelum diunduh.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <section
          aria-labelledby="laporan-pelapor"
          className="flex flex-col gap-2"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 id="laporan-pelapor" className="font-medium text-sm text-txt">
              Pelapor
            </h3>
            <Badge variant="outline" className="text-[0.65rem]">
              <FileText aria-hidden className="size-3" />
              Laporan pengguna
            </Badge>
          </div>
          <dl className="flex flex-col gap-1.5">
            <Row label="Nama" value={model.reporter.name} />
            <Row label="Nomor HP" value={model.reporter.phone} />
            <Row label="Modus" value={model.incident.modus} />
          </dl>
        </section>

        <Separator />

        <section
          aria-labelledby="laporan-kejadian"
          className="flex flex-col gap-2"
        >
          <h3 id="laporan-kejadian" className="font-medium text-sm text-txt">
            Kejadian
          </h3>
          <dl className="flex flex-col gap-1.5">
            <Row label="Waktu" value={model.incident.at} />
            <Row label="Kerugian" value={model.incident.loss} />
            <Row label="Bank / e-wallet" value={model.incident.bank} />
            <Row label="Rekening pelaku" value={model.incident.account} />
          </dl>
          <p className="mt-1 text-dim text-sm leading-relaxed">
            {model.narrative}
          </p>
        </section>

        <Separator />

        <section
          aria-labelledby="laporan-kronologi"
          className="flex flex-col gap-2"
        >
          <h3 id="laporan-kronologi" className="font-medium text-sm text-txt">
            Kronologi
          </h3>
          {model.chronology.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {model.chronology.map((line, index) => (
                <li key={line} className="flex gap-2.5 text-sm">
                  <span className="tabular shrink-0 text-dim">
                    {index + 1}.
                  </span>
                  <span className="break-words text-txt">{line}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-danger text-sm">
              Kronologi masih kosong. Isi minimal satu baris agar laporan bisa
              dipakai bank.
            </p>
          )}
        </section>

        <Separator />

        <section
          aria-labelledby="laporan-bukti"
          className="flex flex-col gap-2"
        >
          <h3 id="laporan-bukti" className="font-medium text-sm text-txt">
            Bukti yang disimpan
          </h3>
          <ul className="flex flex-col gap-2">
            {model.artifacts.map((artifact) => (
              <li key={artifact.id} className="text-sm">
                <p className="text-txt">{artifact.label}</p>
                <p className="break-words text-dim text-xs">{artifact.value}</p>
              </li>
            ))}
          </ul>
          <p className="text-dim text-xs">
            Bukti fisik (tangkapan layar, mutasi) tetap harus dibawa terpisah.
            PDF ini merangkum, bukan menggantikan bukti asli.
          </p>
        </section>

        <Separator />

        <section
          aria-labelledby="laporan-pernyataan"
          className="flex flex-col gap-3"
        >
          <h3 id="laporan-pernyataan" className="font-medium text-sm text-txt">
            Pernyataan dan tanda tangan
          </h3>
          <p className="text-dim text-sm leading-relaxed">{REPORT_STATEMENT}</p>

          <div className="mt-2 grid gap-8 sm:grid-cols-2">
            <p className="text-sm text-txt">
              {model.incident.place}, {model.incident.at}
            </p>
            <div>
              <p className="text-dim text-xs">Tanda tangan pelapor</p>
              <div aria-hidden className="mt-10 border-line border-b" />
              <p className="mt-1 font-medium text-sm text-txt">
                {model.reporter.name}
              </p>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
