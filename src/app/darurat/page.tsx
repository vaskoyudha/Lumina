import type { Metadata } from "next";
import { DaruratClient } from "@/components/darurat/darurat-client";

export const metadata: Metadata = {
  title: "Mode darurat",
  description:
    "Checklist berurutan untuk dipakai saat penipuan sedang terjadi: OTP, transfer, atau APK terpasang.",
};

export default function DaruratPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header className="max-w-prose">
        <p className="inline-flex items-center gap-1.5 rounded-md border border-danger/50 bg-danger/10 px-2 py-1 font-medium text-danger text-xs">
          Mode darurat
        </p>
        <h1 className="mt-3 font-semibold text-2xl tracking-tight sm:text-3xl">
          Ikuti urutannya, mulai dari yang paling mendesak.
        </h1>
        <p className="mt-2 text-dim text-sm">
          Tidak ada skor di halaman ini. Pilih situasi yang paling dekat dengan
          yang kamu alami, lalu kerjakan dari nomor satu.
        </p>
      </header>

      <div className="mt-8">
        <DaruratClient />
      </div>
    </div>
  );
}
