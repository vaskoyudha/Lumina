import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSimulation() {
  return (
    <section
      aria-busy="true"
      aria-label="Memuat latihan"
      aria-live="polite"
      className="appnext-container min-w-0 py-6 sm:py-8"
    >
      <p className="appnext-caption">Level 1 · Misi interaktif</p>
      <h1 className="mt-2 max-w-prose">
        Siapkan diri. Pesan masuk sebentar lagi.
      </h1>
      <Card className="mt-6 gap-0 rounded-[var(--appnext-r-card)] py-0 shadow-[var(--appnext-shadow-ambient)]">
        <CardHeader className="py-6">
          <CardTitle className="text-xl">Menyiapkan misi…</CardTitle>
        </CardHeader>
        <CardContent aria-hidden="true" className="grid gap-4 pb-6">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </section>
  );
}
