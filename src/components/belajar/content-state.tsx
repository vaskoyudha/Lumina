import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function ContentLoading() {
  return (
    <output
      className="mx-auto block w-full max-w-5xl space-y-5 p-6"
      aria-label="Memuat materi"
    >
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </output>
  );
}
export function ContentUnavailable({ empty = false }: { empty?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <Alert>
        <AlertTitle>
          {empty ? "Materi belum tersedia" : "Materi belum bisa dimuat"}
        </AlertTitle>
        <AlertDescription>
          <p>
            {empty
              ? "Materi sedang disiapkan. Silakan kembali sebentar lagi."
              : "Koneksi layanan sedang bermasalah. Muat ulang halaman untuk mencoba lagi."}
          </p>
          <Button asChild variant="outline" className="mt-3 min-h-11">
            <Link href="/companion">Kembali ke Companion</Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
