"use client";

import { BookOpen, CircleAlert, Sparkles } from "lucide-react";
import * as React from "react";
import {
  type HighlightDetail,
  highlightQuoteKey,
  highlightSegments,
} from "@/lib/companion/highlights";
import { cn } from "@/lib/utils";

export function DetectionText({
  text,
  highlights,
  activeQuote,
  onSelect,
  className,
}: {
  text: string;
  highlights: readonly HighlightDetail[];
  activeQuote?: string | null;
  onSelect?: (quote: string) => void;
  className?: string;
}) {
  const [localActive, setLocalActive] = React.useState<string | null>(null);
  const segments = React.useMemo(
    () => highlightSegments(text, highlights),
    [text, highlights],
  );
  const items = React.useMemo(() => {
    let offset = 0;
    return segments.map((segment) => {
      const key = `${offset}:${segment.quote ?? "text"}`;
      offset += segment.text.length;
      return { segment, key };
    });
  }, [segments]);
  const hasHighlight = segments.some((segment) => segment.quote !== null);
  if (!hasHighlight) return <>{text}</>;

  const active = activeQuote === undefined ? localActive : activeQuote;
  const activeKey = active ? highlightQuoteKey(active) : null;

  return (
    <span className={className}>
      {items.map(({ segment, key }) => {
        if (!segment.quote) {
          return <React.Fragment key={key}>{segment.text}</React.Fragment>;
        }
        const isActive =
          activeKey !== null && activeKey === highlightQuoteKey(segment.quote);
        const fromAgent = segment.details.some(
          (detail) => detail.source === "agent",
        );
        return (
          <button
            key={key}
            type="button"
            data-evidence={segment.quote}
            data-highlight-source={fromAgent ? "agent" : "detector"}
            aria-label={`Temuan: ${segment.details
              .map((detail) => detail.title)
              .join(", ")}. Kutipan: ${segment.quote}`}
            aria-pressed={isActive}
            onClick={() => {
              setLocalActive((current) =>
                current === segment.quote ? null : segment.quote,
              );
              onSelect?.(segment.quote as string);
            }}
            className={cn(
              "inline cursor-pointer rounded-[3px] border-0 px-0.5 text-inherit [font:inherit] leading-[inherit]",
              "underline decoration-dotted underline-offset-2 transition-colors duration-100",
              fromAgent
                ? "bg-danger/10 decoration-danger/50 hover:bg-danger/20"
                : "bg-warn/15 decoration-warn/60 hover:bg-warn/25",
              isActive &&
                (fromAgent
                  ? "bg-danger/20 decoration-solid"
                  : "bg-warn/35 decoration-solid"),
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
            )}
          >
            {segment.text}
          </button>
        );
      })}
    </span>
  );
}

export function HighlightExplanation({
  details,
  quote,
  className,
}: {
  details: readonly HighlightDetail[];
  quote: string;
  className?: string;
}) {
  if (details.length === 0) return null;

  return (
    <section
      aria-label="Penjelasan sorotan"
      className={cn(
        "w-full max-w-[85%] rounded-[12px] border border-line bg-panel px-3 py-2.5 text-left shadow-rest",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen aria-hidden className="size-3.5 text-brand" />
        <span className="font-medium text-[11px] text-txt">
          Penjelasan sorotan
        </span>
        <span className="rounded-full bg-warn/15 px-1.5 py-0.5 font-mono text-[9.5px] text-warn">
          “{quote}”
        </span>
      </div>

      <div className="mt-1.5 flex flex-col gap-2">
        {details.map((detail, index) => (
          <div
            key={`${detail.source}-${detail.title}-${index}`}
            className="border-line border-t pt-2 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <p
                data-detail-title
                className="font-medium text-[11.5px] text-txt"
              >
                {detail.title}
              </p>
              <span
                data-detail-source
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9.5px]",
                  detail.source === "agent"
                    ? "bg-danger/10 text-danger"
                    : "bg-warn/15 text-warn",
                )}
              >
                {detail.source === "agent"
                  ? (detail.agent ?? "Sorotan agen")
                  : "Aturan pemeriksa"}
              </span>
              {detail.pattern ? (
                <span
                  data-detail-pattern
                  className="rounded-full border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-[9px] text-dim"
                >
                  {detail.pattern}
                </span>
              ) : null}
            </div>

            <p
              data-detail-reason
              className="mt-0.5 text-[10.5px] leading-relaxed text-dim"
            >
              {detail.reason}
            </p>
            {detail.target ? (
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-dim">
                <span className="font-medium text-txt/80">Yang diincar: </span>
                {detail.target}
              </p>
            ) : null}
            {detail.watchout ? (
              <p
                data-detail-watchout
                className="mt-0.5 flex items-start gap-1 text-[10.5px] leading-relaxed text-warn"
              >
                <CircleAlert aria-hidden className="mt-0.5 size-3 shrink-0" />
                <span>
                  <span className="font-medium">Perhatikan: </span>
                  {detail.watchout}
                </span>
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-1.5 flex items-center gap-1 text-[9.5px] text-dim">
        <Sparkles aria-hidden className="size-2.5" />
        Klik sorotan lain untuk membandingkan indikasi pada pesan ini.
      </p>
    </section>
  );
}
