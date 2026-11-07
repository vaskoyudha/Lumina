"use client";

import { useState } from "react";
import { useSite } from "@/components/marketing/site-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scrollToId } from "@/lib/scroll";
import { brand, footerColumns, footerCopy } from "@/lib/site";

export function Footer() {
  const { showToast } = useSite();
  const [newsletterFeedback, setNewsletterFeedback] = useState<string | null>(
    null,
  );

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      showToast(`${email} disalin`);
    } catch {
      showToast(`Salin manual: ${email}`);
    }
  }

  function handleNewsletter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    setNewsletterFeedback(`✓ ${email} tercatat di peramban ini.`);
    showToast("Email tercatat di peramban ini");
    form.reset();
  }

  return (
    <footer className="cta-dark-bg px-3 pt-20 pb-20 text-white sm:px-6">
      <div className="mx-auto max-w-2xl px-4 pb-14 text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amberwarm-300/30 bg-espresso-800/90 px-3.5 py-1 font-semibold text-[10px] text-amberwarm-200 uppercase tracking-widest">
          <span>☺</span>
          <span>{footerCopy.badge}</span>
        </div>
        <h2 className="font-medium text-3xl leading-tight sm:text-4xl lg:text-[42px]">
          {footerCopy.title[0]}
          <br />
          {footerCopy.title[1]}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-amberwarm-100/75 text-xs leading-relaxed sm:text-sm">
          {footerCopy.body}
        </p>
        <div className="mt-7">
          <Button
            type="button"
            onClick={() => scrollToId("section-home")}
            className="h-auto gap-3 rounded-full bg-amberwarm-50 py-1.5 pr-1.5 pl-5 font-semibold text-espresso-950 text-xs shadow-lg transition-all hover:bg-amberwarm-100 active:scale-[0.97] sm:text-sm"
          >
            <span>{footerCopy.cta}</span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-espresso-800 text-white text-xs">
              »
            </span>
          </Button>
        </div>
      </div>

      <div className="footer-gradient mx-auto max-w-[1680px] overflow-hidden rounded-3xl border border-amberwarm-300/20 p-6 shadow-2xl sm:p-10">
        <div className="flex flex-col justify-between gap-6 pb-8 md:flex-row md:items-center">
          <h3 className="max-w-xs font-medium text-white text-xl leading-snug sm:text-2xl">
            {footerCopy.newsletterTitle}
          </h3>

          <form
            id="newsletter-form"
            onSubmit={handleNewsletter}
            className="flex w-full max-w-md items-center rounded-full border border-white/15 bg-espresso-950/85 p-1.5"
          >
            <Input
              id="newsletter-email"
              name="email"
              type="email"
              required
              placeholder={footerCopy.newsletterPlaceholder}
              aria-label="Email untuk kabar Lumina"
              className="h-auto flex-1 border-0 bg-transparent px-4 py-1.5 text-white text-xs placeholder:text-amberwarm-100/50 focus-visible:ring-0 sm:text-sm"
            />
            <Button
              type="submit"
              className="h-auto shrink-0 gap-2 rounded-full bg-amberwarm-50 py-1.5 pr-1.5 pl-4 font-semibold text-espresso-950 text-xs transition-all hover:bg-amberwarm-100"
            >
              <span>{footerCopy.newsletterCta}</span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-espresso-800 text-[10px] text-white">
                »
              </span>
            </Button>
          </form>
        </div>

        <output
          id="newsletter-feedback"
          aria-live="polite"
          className={
            newsletterFeedback
              ? "mb-4 block font-medium text-amberwarm-200 text-xs"
              : "hidden mb-4 font-medium text-amberwarm-200 text-xs"
          }
        >
          {newsletterFeedback}
        </output>

        <div className="relative my-2 flex items-center justify-center">
          <div className="w-full border-amberwarm-200/25 border-t border-dashed" />
          <span className="px-3 text-amberwarm-300/80">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M19.07 4.93l-2.12 2.12M7.05 16.95l-2.12 2.12" />
            </svg>
          </span>
          <div className="w-full border-amberwarm-200/25 border-t border-dashed" />
        </div>

        <div className="grid grid-cols-2 gap-6 py-8 text-xs sm:grid-cols-3 lg:grid-cols-5">
          {footerColumns.map((column) => (
            <div
              key={column.title}
              className="space-y-2.5 border-white/10 border-r border-dashed pr-4 last:border-r-0 last:pr-0"
            >
              <div className="font-semibold text-[10px] text-amberwarm-200/60 uppercase tracking-widest">
                {column.title}
              </div>
              <ul className="space-y-2 text-amberwarm-50/90">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    {link.copy ? (
                      <button
                        type="button"
                        data-copy-email={link.copy}
                        onClick={() => copyEmail(link.copy ?? "")}
                        className="text-left hover:text-white"
                      >
                        {link.label}
                      </button>
                    ) : link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:text-white"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <a
                        href={link.href}
                        onClick={(event) => {
                          event.preventDefault();
                          scrollToId(link.href.replace("#", ""));
                        }}
                        className="hover:text-white"
                      >
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="select-none pt-2 pb-1 text-center">
          <div className="wordmark-gradient font-bold font-display text-[clamp(84px,26vw,520px)] leading-[0.88] tracking-tight">
            {brand.name}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 text-[11px] text-amberwarm-100/70">
          <span>{footerCopy.copyright}</span>
          <span>{footerCopy.legal}</span>
        </div>
      </div>
    </footer>
  );
}
