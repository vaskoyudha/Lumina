import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSimulation() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat latihan"
      aria-live="polite"
      className="w-full"
    >
      <Skeleton className="h-8 w-36 rounded-full" />
      <p className="mt-6 text-dim text-sm">Level 1 · Misi interaktif</p>
      <h1 className="mt-2 max-w-prose font-semibold tracking-tight">
        Siapkan diri. Pesan masuk sebentar lagi.
      </h1>
      <Card className="mt-6 border border-line">
        <CardHeader>
          <CardTitle className="text-lg">Menyiapkan misi…</CardTitle>
        </CardHeader>
        <CardContent aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-40" />
        </CardContent>
      </Card>
    </section>
  );
}
