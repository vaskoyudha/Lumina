"use client";

import { useState } from "react";
import { useSite } from "@/components/marketing/site-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bookingCopy } from "@/lib/site";

export function BookingModal({
  program,
  onClose,
}: {
  program: string | null;
  onClose: () => void;
}) {
  const { showToast } = useSite();
  const [format, setFormat] = useState<string>(bookingCopy.formats[0]);
  const [day, setDay] = useState<string>(bookingCopy.days[0]);
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const selected =
    program && program.length > 0 ? program : bookingCopy.waitlistProgram;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmed(bookingCopy.feedback(email));
    showToast(bookingCopy.toast);
  }

  return (
    <Dialog
      open={program !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setConfirmed(null);
          setEmail("");
        }
      }}
    >
      <DialogContent
        id="booking-modal"
        aria-labelledby="booking-modal-title"
        className="max-w-md gap-0 overflow-hidden rounded-3xl border border-ls-line bg-ls-card p-6 ring-0 sm:max-w-md sm:p-7"
      >
        <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-ls-accent px-3 py-1 text-[10px] font-bold tracking-wider text-ls-accent-ink uppercase">
          <span aria-hidden="true">☺</span>
          <span>{bookingCopy.badge}</span>
        </div>

        <DialogTitle
          id="booking-modal-title"
          className="font-display text-2xl font-semibold text-ls-ink"
        >
          {bookingCopy.title}
        </DialogTitle>
        <DialogDescription className="mt-1 text-xs text-ls-ink-2">
          {bookingCopy.body}
        </DialogDescription>

        <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <Label
              htmlFor="booking-program"
              className="text-xs font-semibold text-ls-ink-2"
            >
              {bookingCopy.programLabel}
            </Label>
            <Input
              id="booking-program"
              type="text"
              readOnly
              value={selected}
              className="h-9 rounded-xl border-ls-line-strong bg-ls-surface px-3.5 text-xs font-medium text-ls-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="booking-format"
                className="text-xs font-semibold text-ls-ink-2"
              >
                {bookingCopy.formatLabel}
              </Label>
              <select
                id="booking-format"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
                className="h-9 w-full rounded-xl border border-ls-line-strong bg-ls-surface px-3 text-xs text-ls-ink"
              >
                {bookingCopy.formats.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="booking-date"
                className="text-xs font-semibold text-ls-ink-2"
              >
                {bookingCopy.dayLabel}
              </Label>
              <select
                id="booking-date"
                value={day}
                onChange={(event) => setDay(event.target.value)}
                className="h-9 w-full rounded-xl border border-ls-line-strong bg-ls-surface px-3 text-xs text-ls-ink"
              >
                {bookingCopy.days.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label
              htmlFor="booking-email"
              className="text-xs font-semibold text-ls-ink-2"
            >
              Email kamu <span className="text-danger">*</span>
            </Label>
            <Input
              id="booking-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="kamu@contoh.com"
              className="h-9 rounded-xl border-ls-line-strong bg-ls-surface px-3.5 text-xs text-ls-ink"
            />
          </div>

          <Button
            type="submit"
            className="group h-auto w-full justify-between rounded-full border-ls-solid-line bg-ls-solid px-5 py-2.5 text-xs font-semibold text-ls-solid-ink shadow-md transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-ls-solid-hover active:scale-[0.98]"
          >
            <span>{bookingCopy.submit}</span>
            <span className="flex size-6 items-center justify-center rounded-full bg-ls-card text-xs font-bold text-ls-ink-2">
              »
            </span>
          </Button>

          {confirmed ? (
            <output className="block rounded-xl border border-ls-line-strong bg-ls-accent-soft p-3 text-xs font-medium text-ls-accent-text">
              {confirmed}
            </output>
          ) : null}
        </form>
      </DialogContent>
    </Dialog>
  );
}
