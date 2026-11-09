"use client";

import { CheckCheck, FileWarning } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./whatsapp-chat.css";

export type ChatAttachment = {
  name: string;
  detail: string;
  action?: ReactNode;
};

export function ChatBubble({
  direction,
  text,
  time,
  attachment,
  ticks = false,
  className,
}: {
  direction: "incoming" | "outgoing";
  text: string;
  time: string;
  attachment?: ChatAttachment;
  ticks?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "wa-row",
        direction === "outgoing" ? "is-out" : "is-in",
        className,
      )}
      data-direction={direction}
    >
      <div className="wa-bubble">
        <p className="wa-text">{text}</p>
        {attachment && (
          <div className="wa-file">
            <FileWarning
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-danger"
            />
            <div className="min-w-0">
              <p className="wa-file__name">{attachment.name}</p>
              <p className="wa-file__detail">{attachment.detail}</p>
            </div>
          </div>
        )}
        {attachment?.action && (
          <div className="wa-file__actions">{attachment.action}</div>
        )}
        <span className="wa-meta">
          <time>{time}</time>
          {ticks && (
            <CheckCheck
              aria-hidden="true"
              data-testid="wa-ticks"
              className="size-3.5"
            />
          )}
        </span>
      </div>
    </div>
  );
}

export function ChatSystem({ text, time }: { text: string; time: string }) {
  return (
    <div className="wa-system" role="note">
      {text}
      <span className="wa-system__time">{time}</span>
    </div>
  );
}
