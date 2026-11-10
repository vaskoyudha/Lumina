"use client";

import { useState } from "react";
import { useSite } from "@/components/marketing/site-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactCopy, contactEmails } from "@/lib/site";

const fieldClass =
  "h-auto rounded-xl border-ls-line-strong bg-ls-surface px-3.5 py-2.5 text-ls-ink text-xs placeholder:text-ls-ink-3 focus-visible:border-ls-accent-text focus-visible:ring-0 sm:text-sm";

const copyIcon = (
  <svg
    className="h-3.5 w-3.5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export function Contact() {
  const { showToast } = useSite();
  const [feedback, setFeedback] = useState<string | null>(null);

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      showToast(`${email} disalin`);
    } catch {
      showToast(`Salin manual: ${email}`);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const greeting = name.length > 0 ? name : "teman";
    const summary =
      message.length > 0
        ? "pesanmu sudah dibaca di peramban ini. Demo ini belum mengirim data ke server."
        : "tulis sedikit konteks supaya kami bisa menjawab lebih tepat.";
    setFeedback(
      `Terima kasih, ${greeting}! ${summary.charAt(0).toUpperCase()}${summary.slice(1)}`,
    );
    showToast(`Pesan dari ${greeting} tercatat di peramban ini`);
    form.reset();
  }

  return (
    <section id="section-contact" className="border-ls-line border-t">
      <div className="contact-band px-4 pt-20 pb-16 text-white sm:px-8 sm:pt-24 sm:pb-20">
        <div className="mx-auto grid max-w-[1680px] grid-cols-1 items-center gap-8 lg:grid-cols-12">
          <div data-reveal className="space-y-4 lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-amberwarm-300/25 bg-espresso-950/80 px-3.5 py-1 font-semibold text-[11px] text-amberwarm-200 uppercase tracking-widest">
              <span>☺</span>
              <span>{contactCopy.headerBadge}</span>
            </div>
            <h2 className="font-medium text-3xl tracking-tight sm:text-5xl">
              {contactCopy.headerTitle}
            </h2>
            <p className="max-w-md text-amberwarm-100/80 text-xs leading-relaxed sm:text-sm">
              {contactCopy.headerBody}
            </p>
          </div>

          <div data-reveal className="space-y-3.5 lg:col-span-6">
            {contactEmails.map((email) => (
              <div
                key={email.value}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amberwarm-50 p-3.5 text-espresso-950 shadow-md sm:px-5"
              >
                <span className="font-medium text-espresso-900 text-xs sm:text-sm">
                  {email.label}
                </span>
                <Button
                  type="button"
                  data-copy-email={email.value}
                  onClick={() => copyEmail(email.value)}
                  className="h-auto gap-2 rounded-full bg-amberwarm-200 px-3.5 py-1.5 font-semibold text-espresso-950 text-xs transition-colors hover:bg-amberwarm-300"
                >
                  <span>{email.value}</span>
                  {copyIcon}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-ls-surface-alt px-4 pt-28 pb-24 sm:px-8">
        <div className="mx-auto grid max-w-[1680px] grid-cols-1 items-center gap-10 lg:grid-cols-12">
          <div data-reveal className="space-y-6 lg:col-span-5">
            <div>
              <span className="mb-3 inline-block rounded-full border border-ls-line-strong bg-ls-card px-3.5 py-1 font-semibold text-[11px] text-ls-ink-2 uppercase tracking-wider">
                {contactCopy.formBadge}
              </span>
              <h3 className="font-semibold text-3xl text-ls-ink leading-tight sm:text-4xl">
                {contactCopy.formTitle}
              </h3>
              <p className="mt-2.5 text-ls-ink-2 text-xs leading-relaxed sm:text-sm">
                {contactCopy.formBody}
              </p>
            </div>

            <div className="divide-y divide-dashed divide-ls-line-strong pt-6 text-xs sm:pt-12 sm:text-sm">
              {contactCopy.info.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <span className="inline-flex items-center gap-2.5 text-ls-ink-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-ls-line bg-ls-card text-ls-ink-2">
                      {row.icon}
                    </span>
                    <span>{row.label}</span>
                  </span>
                  <span className="text-right font-semibold text-ls-ink">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal className="lg:col-span-7">
            <div className="contact-bg-card rounded-3xl p-3 shadow-lg sm:p-5">
              <form
                id="contact-form"
                onSubmit={handleSubmit}
                className="space-y-4 rounded-2xl bg-ls-card p-6 shadow-md sm:p-8"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label
                      htmlFor="contact-name"
                      className="mb-1.5 gap-1 font-semibold text-ls-ink text-xs"
                    >
                      Nama lengkap <span className="text-danger">*</span>
                    </Label>
                    <Input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      placeholder="Nama depan"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <Label
                      htmlFor="contact-company"
                      className="mb-1.5 font-semibold text-ls-ink text-xs"
                    >
                      Nama komunitas atau instansi
                    </Label>
                    <Input
                      id="contact-company"
                      name="company"
                      type="text"
                      placeholder="Opsional"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <Label
                    htmlFor="contact-email"
                    className="mb-1.5 gap-1 font-semibold text-ls-ink text-xs"
                  >
                    Email <span className="text-danger">*</span>
                  </Label>
                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    placeholder="nama@email.com"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="contact-message"
                    className="mb-1.5 font-semibold text-ls-ink text-xs"
                  >
                    Apa yang bisa kami bantu?
                  </Label>
                  <Textarea
                    id="contact-message"
                    name="message"
                    rows={4}
                    required
                    placeholder="Tulis pertanyaanmu di sini."
                    className={`${fieldClass} min-h-24 py-2.5`}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox id="contact-privacy" defaultChecked required />
                  <Label
                    htmlFor="contact-privacy"
                    className="block text-ls-ink-2 text-xs font-normal leading-snug"
                  >
                    {contactCopy.consent}
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="h-auto w-full justify-between rounded-full bg-ls-accent py-2.5 pr-2 pl-5 font-semibold text-ls-accent-ink text-xs shadow-sm transition-all hover:bg-ls-accent-strong active:scale-[0.99] sm:text-sm"
                >
                  <span>{contactCopy.submit}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ls-solid text-ls-solid-ink text-xs">
                    »
                  </span>
                </Button>

                <output
                  id="contact-form-feedback"
                  aria-live="polite"
                  className={
                    feedback
                      ? "block rounded-xl border border-ls-line-strong bg-ls-accent-soft p-3 font-medium text-ls-accent-text text-xs"
                      : "hidden rounded-xl border border-ls-line-strong bg-ls-accent-soft p-3 font-medium text-ls-accent-text text-xs"
                  }
                >
                  {feedback}
                </output>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
