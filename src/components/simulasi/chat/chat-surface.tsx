"use client";

import { ArrowLeft, MoreVertical, Phone, Video } from "lucide-react";
import Link from "next/link";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import "./whatsapp-chat.css";

export function ChatSurface({
  contactName,
  status,
  notice,
  bodyRef,
  children,
  footer,
  className,
}: {
  contactName: string;
  status: string;
  notice?: string;
  bodyRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const initials = contactName.slice(0, 1).toUpperCase();

  return (
    <section
      className={cn("wa-chat", className)}
      aria-label={`Percakapan dengan ${contactName}`}
    >
      <header className="wa-chat__header">
        <Link
          href="/simulasi"
          aria-label="Kembali ke daftar simulasi"
          className="wa-chat__back"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </Link>
        <span aria-hidden="true" className="wa-chat__avatar">
          {initials}
        </span>
        <div className="wa-chat__identity">
          <p className="wa-chat__name">{contactName}</p>
          <p className="wa-chat__status" aria-live="polite">
            {status}
          </p>
        </div>
        <span className="wa-chat__fake">Fiktif</span>
        <span aria-hidden="true" className="wa-chat__actions">
          <Video className="size-5" />
          <Phone className="size-5" />
          <MoreVertical className="size-5" />
        </span>
      </header>
      <div
        ref={bodyRef}
        role="log"
        aria-label="Percakapan latihan"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to focus and scroll the transcript.
        tabIndex={0}
        className="wa-chat__body flex flex-col"
      >
        {notice && (
          <div className="wa-system" role="note">
            {notice}
          </div>
        )}
        {children}
      </div>
      {footer}
    </section>
  );
}
