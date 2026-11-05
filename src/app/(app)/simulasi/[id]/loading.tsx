import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSimulation() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      aria-label="Memuat latihan"
      className="sim-page sim-loading mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
    >
      <p className="sim-page-level">Level 1 · Misi interaktif</p>
      <h1 className="sim-page-title">
        Siapkan diri. Pesan masuk sebentar lagi.
      </h1>
      <Card className="sim-loading-card">
        <CardHeader>
          <CardTitle className="text-xl">Menyiapkan misi…</CardTitle>
        </CardHeader>
        <CardContent aria-hidden="true" className="grid gap-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </section>
  );
}
