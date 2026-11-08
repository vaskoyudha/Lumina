import type * as React from "react";

const HERO_SRC = "/images/hero.jpg";

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
      <section className="flex min-h-0 justify-center overflow-y-auto p-6 sm:p-8">
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
          className="absolute inset-3 rounded-3xl bg-cover"
          style={{
            backgroundImage: `url(${HERO_SRC})`,
            backgroundPosition: "82% center",
          }}
        />
        <div className="absolute inset-3 rounded-3xl bg-gradient-to-t from-foreground/45 via-foreground/5 to-transparent" />
      </section>
    </div>
  );
}
