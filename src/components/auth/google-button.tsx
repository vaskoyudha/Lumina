import { Button } from "@/components/ui/button";

export function GoogleButton({ intent }: { intent: "masuk" | "daftar" }) {
  return (
    <div className="flex flex-col gap-3">
      <Button
        asChild
        variant="outline"
        className="h-12 w-full rounded-full text-sm"
      >
        <a href={`/api/auth/google?intent=${intent}`}>
          <span aria-hidden className="font-semibold text-lg">
            G
          </span>
          {intent === "daftar" ? "Daftar dengan Google" : "Masuk dengan Google"}
        </a>
      </Button>
      <p className="text-center text-dim text-xs leading-relaxed">
        Dengan melanjutkan, kamu mengizinkan Lumina menyimpan nama dan email
        dari Google untuk akunmu.
      </p>
      <div className="flex items-center gap-3 text-dim text-xs">
        <span aria-hidden className="h-px flex-1 bg-line" />
        atau dengan email
        <span aria-hidden className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
