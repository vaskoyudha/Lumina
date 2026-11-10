import { AGENT_IDENTITIES } from "@/lib/agents/identities";
import type { Explanation } from "@/lib/companion/explain";
import type { OrchestratorEvent } from "@/lib/contracts/orchestrator";
import type { Signal } from "@/lib/contracts/score";

/**
 * Agent-generated highlights are deliberately narrower than general evidence:
 * a highlight must quote text that really appears in the checked message. This
 * keeps the teaching overlay tied to what the reader can see, not to a tool
 * payload the reader never saw.
 */
export interface HighlightDetail {
  quote: string;
  title: string;
  reason: string;
  pattern?: string;
  watchout?: string;
  target?: string;
  source: "agent" | "detector";
  /** Human label of the agent that produced this point, when it has one. */
  agent?: string;
  /** Ranking weight; detector signals use their scorer weight. */
  weight?: number;
}

export interface HighlightSegment {
  text: string;
  quote: string | null;
  details: HighlightDetail[];
}

interface HighlightGroup {
  quote: string;
  details: HighlightDetail[];
  weight: number;
}

interface HighlightMatch {
  start: number;
  end: number;
  quote: string;
  details: HighlightDetail[];
  weight: number;
}

const MIN_QUOTE_LENGTH = 3;
/** An agent highlight should name a phrase, not paste the whole message. */
const MAX_AGENT_QUOTE_LENGTH = 72;

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Shared by the renderer and the evidence panel when comparing quotes. */
export function highlightQuoteKey(value: string): string {
  return normalize(value);
}

function signalDetail(signal: Signal): HighlightDetail | null {
  const quote = signal.evidence?.trim();
  if (!quote || quote.length < MIN_QUOTE_LENGTH || signal.weight <= 0) {
    return null;
  }
  return {
    quote,
    title: signal.label,
    reason: "Sinyal ini muncul dari aturan pemeriksa deterministik.",
    source: "detector",
    weight: Math.max(1, signal.weight),
  };
}

function tacticDetail(
  tactic: Explanation["tactics"][number],
): HighlightDetail | null {
  const quote = tactic.evidence?.trim();
  if (!quote || quote.length < MIN_QUOTE_LENGTH) return null;
  return {
    quote,
    title: tactic.nama,
    reason: tactic.cara,
    pattern: tactic.tanda,
    watchout: tactic.pembeda,
    target: tactic.sasaran,
    source: "detector",
    weight: 1.2,
  };
}

function agentDetails(
  events: readonly OrchestratorEvent[] | undefined,
  signals: readonly Signal[] | undefined,
): HighlightDetail[] {
  const details: HighlightDetail[] = [];
  const weightByLabel = new Map(
    (signals ?? []).map((signal) => [
      normalize(signal.label),
      Math.max(1, signal.weight),
    ]),
  );
  for (const event of events ?? []) {
    if (event.type !== "agent_result" || event.status !== "selesai") continue;
    for (const point of event.points) {
      const quote = point.quote?.trim();
      if (
        !quote ||
        quote.length < MIN_QUOTE_LENGTH ||
        quote.length > MAX_AGENT_QUOTE_LENGTH ||
        quote.includes("\n")
      ) {
        continue;
      }
      details.push({
        quote,
        title: point.point,
        reason: point.reason,
        pattern: point.pattern,
        watchout: point.watchout,
        source: "agent",
        agent: `${AGENT_IDENTITIES[event.agent].displayName} · ${event.label}`,
        weight: weightByLabel.get(normalize(point.signal)) ?? 1,
      });
    }
  }
  return details;
}

/**
 * Builds the teaching details for one checked message. Agent points win over
 * generic detector copy for the same quote; detector tactics fill the quotes
 * the agents did not cover, so the feature still works when the orchestrator
 * is disabled or a specialist fails.
 */
export function collectHighlights(input: {
  text: string;
  signals?: readonly Signal[];
  explanation?: Explanation | null;
  events?: readonly OrchestratorEvent[];
}): HighlightDetail[] {
  const haystack = normalize(input.text);
  if (!haystack) return [];

  const groups = new Map<string, HighlightGroup>();
  const add = (detail: HighlightDetail, weight: number) => {
    const key = normalize(detail.quote);
    if (!key || !haystack.includes(key)) return;
    const current = groups.get(key);
    if (current) {
      const duplicate = current.details.some(
        (item) =>
          item.source === detail.source &&
          normalize(item.title) === normalize(detail.title),
      );
      if (!duplicate) current.details.push(detail);
      current.weight = Math.max(current.weight, weight);
      return;
    }
    groups.set(key, {
      quote: detail.quote,
      details: [detail],
      weight,
    });
  };

  for (const detail of agentDetails(input.events, input.signals)) {
    add(detail, detail.weight ?? 1);
  }

  const tacticQuotes = new Set<string>();
  for (const tactic of input.explanation?.tactics ?? []) {
    const detail = tacticDetail(tactic);
    if (!detail) continue;
    tacticQuotes.add(normalize(detail.quote));
    add(detail, detail.weight ?? 1.2);
  }

  for (const signal of input.signals ?? []) {
    const detail = signalDetail(signal);
    if (!detail) continue;
    if (tacticQuotes.has(normalize(detail.quote))) continue;
    add(detail, detail.weight ?? 1);
  }

  return [...groups.values()].flatMap((group) => group.details);
}

/**
 * Normalise text while keeping a map from every normalised code unit back to
 * the original string. Lowercasing can expand (`İ` -> `i` + combining dot),
 * so using the lowercased string's indices directly would shift spans.
 */
function normalizeWithMap(value: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (/\s/.test(character)) {
      if (!text || text.endsWith(" ")) continue;
      text += " ";
      map.push(index);
      continue;
    }
    const lower = character.toLowerCase();
    if (!lower) continue;
    for (let offset = 0; offset < lower.length; offset += 1) {
      text += lower[offset];
      map.push(index);
    }
  }
  let start = 0;
  while (start < text.length && text[start] === " ") start += 1;
  let end = text.length;
  while (end > start && text[end - 1] === " ") end -= 1;
  return { text: text.slice(start, end), map: map.slice(start, end) };
}

function findOccurrences(
  text: string,
  quote: string,
): { start: number; end: number }[] {
  const haystack = normalizeWithMap(text);
  const needle = normalize(quote);
  if (!needle || !haystack.text) return [];

  const matches: { start: number; end: number }[] = [];
  let from = 0;
  while (from <= haystack.text.length - needle.length) {
    const at = haystack.text.indexOf(needle, from);
    if (at === -1) break;
    const start = haystack.map[at];
    const last = haystack.map[at + needle.length - 1];
    if (start !== undefined && last !== undefined) {
      const end = last + 1;
      if (normalize(text.slice(start, end)) === needle) {
        matches.push({ start, end });
      }
    }
    from = at + needle.length;
  }
  return matches;
}

function matchRank(match: HighlightMatch): number {
  return match.details.some((detail) => detail.source === "detector") ? 0 : 1;
}

/**
 * Turns the checked message into segments. A quote is kept as a highlight even
 * when it appears several times; detector spans outrank agent-only spans so the
 * evidence panel always has a `data-evidence` target. When an agent quote is
 * contained in a detector span, its teaching detail is attached to that span
 * instead of deleting the detector highlight.
 */
export function highlightSegments(
  text: string,
  details: readonly HighlightDetail[],
): HighlightSegment[] {
  if (!text) return [];
  const groups = new Map<string, HighlightGroup>();

  for (const detail of details) {
    const quote = detail.quote.trim();
    if (quote.length < MIN_QUOTE_LENGTH) continue;
    const key = normalize(quote);
    if (!key) continue;
    const current = groups.get(key);
    if (current) {
      const duplicate = current.details.some(
        (item) =>
          item.source === detail.source &&
          normalize(item.title) === normalize(detail.title),
      );
      if (!duplicate) current.details.push(detail);
      current.weight = Math.max(current.weight, detail.weight ?? 1);
      continue;
    }
    groups.set(key, {
      quote,
      details: [detail],
      weight: detail.weight ?? 1,
    });
  }

  const matches: HighlightMatch[] = [];
  for (const group of groups.values()) {
    for (const occurrence of findOccurrences(text, group.quote)) {
      matches.push({
        start: occurrence.start,
        end: occurrence.end,
        quote: group.quote,
        details: group.details,
        weight: group.weight,
      });
    }
  }

  if (matches.length === 0) {
    return [{ text, quote: null, details: [] }];
  }

  matches.sort(
    (a, b) =>
      matchRank(a) - matchRank(b) ||
      b.weight - a.weight ||
      b.end - b.start - (a.end - a.start) ||
      a.start - b.start,
  );

  const accepted: HighlightMatch[] = [];
  for (const match of matches) {
    const sameRange = accepted.find(
      (other) => other.start === match.start && other.end === match.end,
    );
    if (sameRange) {
      for (const detail of match.details) {
        if (
          !sameRange.details.some(
            (item) =>
              item.source === detail.source &&
              normalize(item.title) === normalize(detail.title),
          )
        ) {
          sameRange.details.push(detail);
        }
      }
      sameRange.weight = Math.max(sameRange.weight, match.weight);
      continue;
    }
    const overlap = accepted.find(
      (other) => match.start < other.end && match.end > other.start,
    );
    if (!overlap) {
      accepted.push({ ...match });
      continue;
    }
    for (const detail of match.details) {
      if (
        !overlap.details.some(
          (item) =>
            item.source === detail.source &&
            normalize(item.title) === normalize(detail.title),
        )
      ) {
        overlap.details.push(detail);
      }
    }
    overlap.weight = Math.max(overlap.weight, match.weight);
  }

  accepted.sort((a, b) => a.start - b.start);
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const match of accepted) {
    if (match.start > cursor) {
      segments.push({
        text: text.slice(cursor, match.start),
        quote: null,
        details: [],
      });
    }
    const visible = text.slice(match.start, match.end);
    segments.push({
      text: visible,
      quote: visible,
      details: match.details,
    });
    cursor = match.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), quote: null, details: [] });
  }
  return segments;
}
