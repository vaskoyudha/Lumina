import { LifeBuoy, type LucideIcon, ScanLine, ShieldCheck } from "lucide-react";
import type * as React from "react";
import { Card, CardContent } from "@/components/ui/card";

const HERO_SRC = "/images/hero.jpg";

const highlights: Array<{
  icon: LucideIcon;
  title: string;
  body: string;
}> = [
  {
    icon: ShieldCheck,
    title: "Pesan tetap di perangkat",
    body: "Teks yang kamu periksa tidak pernah dikirim ke server.",
  },
  {
    icon: ScanLine,
    title: "Skor dengan alasan",
    body: "Setiap angka lahir dari engine, bukan tebakan model.",
  },
  {
    icon: LifeBuoy,
    title: "Darurat tanpa akun",
    body: "Mode darurat selalu terbuka, bahkan tanpa masuk.",
  },
];

export function SignInPage({
  title,
  description,
  topSlot,
  footerSlot,
  children,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
  topSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 md:grid-cols-2">
      <section className="flex min-h-0 justify-center overflow-y-auto p-6 sm:p-10">
        <div className="my-auto flex w-full max-w-md flex-col gap-6">
          {topSlot}

          <header className="flex flex-col gap-2">
            <h1 className="font-semibold text-4xl leading-tight tracking-tight md:text-5xl">
              {title}
            </h1>
            <p className="text-muted-foreground">{description}</p>
          </header>

          <div className="auth-animate auth-delay-2">{children}</div>

          {footerSlot}
        </div>
      </section>

      <section className="relative hidden p-3 md:block">
        <div
          className="absolute inset-3 rounded-3xl bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_SRC})` }}
        />
        <div className="absolute inset-3 rounded-3xl bg-gradient-to-t from-foreground/45 via-foreground/5 to-transparent" />

        <div className="auth-slide-right auth-delay-3 absolute bottom-8 left-8 flex w-[min(19rem,calc(100%-4rem))] flex-col gap-3">
          {highlights.map((highlight, index) => (
            <Card
              key={highlight.title}
              className={`auth-animate auth-delay-${index + 4} gap-0 rounded-2xl border border-panel/50 bg-panel/85 py-3 text-txt shadow-lift ring-0 backdrop-blur-xl`}
            >
              <CardContent className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                  <highlight.icon aria-hidden className="size-4" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <p className="font-medium text-sm leading-snug">
                    {highlight.title}
                  </p>
                  <p className="text-dim text-xs leading-relaxed">
                    {highlight.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
