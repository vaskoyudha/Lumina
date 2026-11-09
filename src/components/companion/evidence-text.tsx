"use client";

import * as React from "react";
import type { Signal } from "@/lib/contracts/score";
import { cn } from "@/lib/utils";

/**
 * Turns a message and its real detector signals into a flat list of text
 * segments. A segment with `evidence` is an exact substring of the message;
 * the rest is untouched text.
 *
 * The helper is pure so the risky part — overlapping and repeated quotes —
 * can be tested without a browser.
 */
export interface EvidenceSegment {
  text: string;
  evidence: string | null;
  labels: string[];
}

interface EvidenceMatch {
  start: number;
  end: number;
  evidence: string;
  labels: string[];
  weight: number;
}

export function evidenceSegments(
  text: string,
  signals: readonly Signal[],
): EvidenceSegment[] {
  const lowerText = text.toLowerCase();
  const matches: EvidenceMatch[] = [];

  for (const signal of signals) {
    if (signal.weight <= 0) continue;

    const quote = signal.evidence?.trim();
    // A one- or two-character quote would light up half the message. The
    // shortest useful finding here is "OTP", "PIN", or "APK".
    if (!quote || quote.length < 3) continue;

    const lowerQuote = quote.toLowerCase();
    let from = 0;
    while (from <= lowerText.length - lowerQuote.length) {
      const start = lowerText.indexOf(lowerQuote, from);
      if (start === -1) break;

      matches.push({
        start,
        end: start + quote.length,
        evidence: quote,
        labels: [signal.label],
        weight: signal.weight,
      });
      from = start + quote.length;
    }
  }

  if (matches.length === 0) {
    return [{ text, evidence: null, labels: [] }];
  }

  /*
   * Stronger evidence wins an overlap. Sorting by weight first means a 0.9
   * APK finding is not hidden by a 0.2 context trait that starts earlier.
   */
  matches.sort(
    (a, b) =>
      b.weight - a.weight ||
      b.end - b.start - (a.end - a.start) ||
      a.start - b.start,
  );

  const accepted: EvidenceMatch[] = [];
  for (const match of matches) {
    const sameRange = accepted.find(
      (other) => other.start === match.start && other.end === match.end,
    );
    if (sameRange) {
      sameRange.labels = [...new Set([...sameRange.labels, ...match.labels])];
      continue;
    }

    const overlaps = accepted.some(
      (other) => match.start < other.end && match.end > other.start,
    );
    if (!overlaps) accepted.push({ ...match });
  }

  accepted.sort((a, b) => a.start - b.start);

  const segments: EvidenceSegment[] = [];
  let cursor = 0;
  for (const match of accepted) {
    if (match.start > cursor) {
      segments.push({
        text: text.slice(cursor, match.start),
        evidence: null,
        labels: [],
      });
    }
    segments.push({
      text: text.slice(match.start, match.end),
      evidence: match.evidence,
      labels: match.labels,
    });
    cursor = match.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), evidence: null, labels: [] });
  }

  return segments;
}

export function EvidenceText({
  text,
  signals,
  activeEvidence,
  onSelect,
  className,
}: {
  text: string;
  signals: readonly Signal[];
  activeEvidence?: string | null;
  onSelect?: (evidence: string) => void;
  className?: string;
}) {
  const [selectedEvidence, setSelectedEvidence] = React.useState<string | null>(
    null,
  );
  const segments = React.useMemo(
    () => evidenceSegments(text, signals),
    [text, signals],
  );
  const items = React.useMemo(() => {
    let offset = 0;
    return segments.map((segment) => {
      const key = `${offset}:${segment.evidence ?? "text"}`;
      offset += segment.text.length;
      return { segment, key };
    });
  }, [segments]);
  const hasEvidence = segments.some((segment) => segment.evidence !== null);

  if (!hasEvidence) return <>{text}</>;

  return (
    <span className={className}>
      {items.map(({ segment, key }) => {
        if (segment.evidence === null) {
          return <React.Fragment key={key}>{segment.text}</React.Fragment>;
        }

        const active =
          activeEvidence !== undefined
            ? activeEvidence === segment.evidence
            : selectedEvidence === segment.evidence;
        return (
          <button
            key={key}
            type="button"
            data-evidence={segment.evidence}
            aria-label={`Temuan: ${segment.labels.join(", ")}`}
            aria-pressed={active}
            onClick={() => {
              setSelectedEvidence((current) =>
                current === segment.evidence ? null : segment.evidence,
              );
              onSelect?.(segment.evidence as string);
            }}
            className={cn(
              "inline cursor-pointer rounded-[3px] border-0 bg-warn/15 px-0.5 text-inherit [font:inherit] leading-[inherit]",
              "underline decoration-warn/60 decoration-dotted underline-offset-2",
              "transition-colors duration-100 hover:bg-warn/25",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
              active && "bg-warn/35 decoration-solid",
            )}
          >
            {segment.text}
          </button>
        );
      })}
    </span>
  );
}
