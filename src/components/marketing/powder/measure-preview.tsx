import {
  ArrowUp,
  BarChart3,
  FileText,
  Menu,
  MessageSquare,
  Mic,
  Paperclip,
  Play,
  Search,
  X,
  Zap,
} from "lucide-react";
import { ThemedLuminaLogo } from "@/components/brand/lumina-logo";

/**
 * Decorative print of Lumina's "Measure" surface for the Ukur slide.
 *
 * This is a picture of the dashboard, not a second entrance to it: every
 * control below is a span and the root is `aria-hidden` plus
 * `pointer-events-none`. The only real control is the tab strip in
 * `Features.tsx`, which swaps slides.
 *
 * The dark palette lives in `powder-theme.css` under `.measure-preview` so the
 * marketing section can show a dark product surface without adding a global
 * token set or hard-coding colour in this file.
 */

type ThreadIconName = "chat" | "bars" | "play" | "doc" | "search";

type Thread = {
  title: string;
  time: string;
  icon: ThreadIconName;
  active?: boolean;
  fade?: number;
};

const THREADS: Thread[] = [
  { title: "SSO for Pro plan?", time: "2 min ago", icon: "chat" },
  {
    title: "Weekly support report",
    time: "1h ago",
    icon: "bars",
    active: true,
  },
  { title: "Safari login loop issue", time: "3h ago", icon: "play" },
  { title: "Refund policy update", time: "Yesterday", icon: "chat" },
  {
    title: "Release notes v2.4",
    time: "2 days ago",
    icon: "doc",
    fade: 0.68,
  },
  {
    title: "Integrations overview",
    time: "5 days ago",
    icon: "search",
    fade: 0.36,
  },
];

const TOP_QUESTIONS = ["Processing fee?", "Refund rules?", "Invoice receipt?"];

const GAPS = [
  'No macro for "Invoices"',
  'Outdated "Invoices" article',
  "Missing FAQ examples",
];

type InsightSegment = { text: string; highlight?: boolean; warm?: boolean };

const INSIGHTS: InsightSegment[][] = [
  [
    { text: "Billing questions", highlight: true },
    { text: " rose " },
    { text: "28%", highlight: true },
    { text: " week over week." },
  ],
  [
    { text: "Average resolution time", highlight: true },
    { text: " increased by " },
    { text: "3.1 min", highlight: true },
    { text: " this week." },
  ],
  [
    { text: "Refund-related tickets made up " },
    { text: "22%", highlight: true },
    { text: " of all support volume." },
  ],
  [
    { text: "The top unresolved topic was " },
    { text: "invoice receipts", highlight: true },
    { text: ", with " },
    { text: "41 open threads.", highlight: true },
  ],
  [
    { text: "First-response time", highlight: true },
    { text: " was " },
    { text: "17% slower", highlight: true },
    { text: " than last week." },
  ],
  [
    { text: "63% of repeated questions", highlight: true },
    { text: " came from just " },
    { text: "3 topics.", highlight: true },
  ],
  [
    { text: "The " },
    { text: '"Invoices"', highlight: true },
    { text: " article was viewed " },
    { text: "214 times", highlight: true, warm: true },
    { text: ", but still led to 36 follow-up questions." },
  ],
];

export function PreviewLogo() {
  return <ThemedLuminaLogo className="h-[20px] w-auto" />;
}

export function CollapseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      height="14"
      viewBox="0 0 16 16"
      width="14"
    >
      <path
        d="M9.5 8H2.5M2.5 8L5.2 5.3M2.5 8L5.2 10.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
      <path
        d="M12.5 4.2V11.8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export function FourTickCrosshair({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      fill="none"
      height="12"
      viewBox="0 0 14 14"
      width="12"
    >
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.2"
        x1="7"
        x2="7"
        y1="1.2"
        y2="4.2"
      />
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.2"
        x1="7"
        x2="7"
        y1="9.8"
        y2="12.8"
      />
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.2"
        x1="1.2"
        x2="4.2"
        y1="7"
        y2="7"
      />
      <line
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.2"
        x1="9.8"
        x2="12.8"
        y1="7"
        y2="7"
      />
    </svg>
  );
}

function DashedCircle() {
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      height="12"
      viewBox="0 0 16 16"
      width="12"
    >
      <circle
        cx="8"
        cy="8"
        r="5.75"
        stroke="currentColor"
        strokeDasharray="2.3 2.3"
        strokeLinecap="round"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function ThreadIcon({ name }: { name: ThreadIconName }) {
  const props = { "aria-hidden": true, size: 13, strokeWidth: 1.5 } as const;

  switch (name) {
    case "bars":
      return <BarChart3 {...props} />;
    case "play":
      return <Play {...props} />;
    case "doc":
      return <FileText {...props} />;
    case "search":
      return <Search {...props} />;
    default:
      return <MessageSquare {...props} />;
  }
}

export function MeasurePreview() {
  return (
    <div
      aria-hidden="true"
      className="measure-preview pointer-events-none relative h-full w-full select-none overflow-hidden bg-[var(--mp-backdrop)] antialiased"
    >
      <div className="mp-sky absolute inset-0" />
      <div className="mp-frame absolute inset-0 px-[6.2%] py-[3.6%]">
        <div className="flex h-full w-full overflow-hidden rounded-[16px] border border-[var(--mp-line-2)] bg-[var(--mp-shell)] shadow-[0_30px_90px_var(--mp-shadow)]">
          <aside className="mp-sidebar w-[204px] shrink-0 flex-col justify-between border-r border-[var(--mp-line)] bg-[var(--mp-sidebar)]">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex h-[50px] shrink-0 items-center justify-between px-4">
                <PreviewLogo />
                <span className="text-[var(--mp-muted)]">
                  <CollapseIcon />
                </span>
              </div>

              <div className="mx-3 border-b border-[var(--mp-line)]" />

              <div className="px-3 pt-3 pb-2">
                <span className="flex h-[30px] w-full items-center justify-center rounded-full border border-[var(--mp-line-3)] bg-[var(--mp-control)] text-[11.5px] font-medium text-[var(--mp-ink)]">
                  New Chat
                </span>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden px-3 pt-0.5">
                <div className="space-y-[2px]">
                  {THREADS.map((thread) => (
                    <div
                      className={`flex items-start gap-2.5 rounded-[8px] px-2.5 py-2 ${
                        thread.active
                          ? "border border-[var(--mp-line-2)] bg-[var(--mp-row)]"
                          : "border border-transparent"
                      }`}
                      key={thread.title}
                      style={{ opacity: thread.fade ?? 1 }}
                    >
                      <span
                        className={`mt-[1px] ${
                          thread.active
                            ? "text-[var(--mp-ink-3)]"
                            : "text-[var(--mp-faint)]"
                        }`}
                      >
                        <ThreadIcon name={thread.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-[11.5px] font-medium leading-[1.3] ${
                            thread.active
                              ? "text-[var(--mp-ink)]"
                              : "text-[var(--mp-ink-3)]"
                          }`}
                        >
                          {thread.title}
                        </span>
                        <span
                          className={`mt-[2px] block text-[10px] leading-[1.3] ${
                            thread.active
                              ? "text-[var(--mp-muted)]"
                              : "text-[var(--mp-faint)]"
                          }`}
                        >
                          {thread.time}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mp-fade-sidebar pointer-events-none absolute inset-x-0 bottom-0 h-7" />
              </div>
            </div>

            <div>
              <div className="mx-3 border-t border-[var(--mp-line)]" />
              <div className="flex items-center gap-2.5 px-4 py-3.5">
                <span className="grid size-[30px] shrink-0 place-items-center rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-avatar)] text-[10.5px] font-medium text-[var(--mp-ink-2)]">
                  AK
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-medium leading-tight text-[var(--mp-ink)]">
                    Alex Carter
                  </span>
                  <span className="mt-[2px] block truncate text-[10.5px] leading-tight text-[var(--mp-faint)]">
                    Powder Pro
                  </span>
                </span>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col bg-[var(--mp-shell)]">
            <header className="flex h-[50px] shrink-0 items-center justify-between px-5">
              <span className="text-[17px] font-medium tracking-[-0.015em] text-[var(--mp-ink)]">
                Measure
              </span>
              <span className="flex items-center gap-3 text-[var(--mp-muted)]">
                <Search aria-hidden="true" size={14} strokeWidth={1.6} />
                <span className="grid size-[26px] place-items-center rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)]">
                  <Menu aria-hidden="true" size={12} strokeWidth={1.6} />
                </span>
              </span>
            </header>

            <div className="mx-5 border-b border-[var(--mp-line)]" />

            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col px-5 py-3">
                <div className="mb-2.5 flex shrink-0 justify-end">
                  <span className="max-w-[85%] rounded-[14px] rounded-br-[4px] border border-[var(--mp-bubble-line)] bg-[var(--mp-bubble)] px-4 py-2 text-[11.5px] text-[var(--mp-ink)]">
                    What slowed support down this week?
                  </span>
                </div>

                <div className="grid min-h-0 flex-1 grid-rows-2 grid-cols-2 gap-[3px]">
                  <div className="mp-card flex min-h-0 flex-col justify-between overflow-hidden rounded-[9px] border border-[var(--mp-line)] bg-[var(--mp-card)] px-4 py-3">
                    <span className="text-[12.5px] font-medium text-[var(--mp-ink-2)]">
                      Top Trend
                    </span>
                    <span className="mt-3 block">
                      <span className="block text-[24px] font-medium leading-none tracking-[-0.02em] text-[var(--mp-ink)]">
                        +28%
                      </span>
                      <span className="mt-1.5 block text-[11px] text-[var(--mp-faint)]">
                        Billing questions
                      </span>
                    </span>
                  </div>

                  <div className="mp-card flex min-h-0 flex-col justify-between overflow-hidden rounded-[9px] border border-[var(--mp-line)] bg-[var(--mp-card)] px-4 py-3">
                    <span className="text-[12.5px] font-medium text-[var(--mp-ink-2)]">
                      Impact
                    </span>
                    <span className="mt-3 block">
                      <span className="block text-[24px] font-medium leading-none tracking-[-0.02em] text-[var(--mp-ink)]">
                        3 min
                      </span>
                      <span className="mt-1.5 block text-[11px] text-[var(--mp-faint)]">
                        Average resolution time
                      </span>
                    </span>
                  </div>

                  <div className="mp-card flex min-h-0 flex-col overflow-hidden rounded-[9px] border border-[var(--mp-line)] bg-[var(--mp-card)] px-4 py-3">
                    <span className="text-[12.5px] font-medium text-[var(--mp-ink-2)]">
                      Top questions
                    </span>
                    <ul className="mp-list mt-auto space-y-[7px] pt-2">
                      {TOP_QUESTIONS.map((question) => (
                        <li
                          className="flex items-center gap-2.5"
                          key={question}
                        >
                          <FourTickCrosshair className="text-[var(--mp-muted)]" />
                          <span className="mp-list-item truncate text-[11.5px] text-[var(--mp-ink-3)]">
                            {question}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mp-card flex min-h-0 flex-col overflow-hidden rounded-[9px] border border-[var(--mp-line)] bg-[var(--mp-card)] px-4 py-3">
                    <span className="text-[12.5px] font-medium text-[var(--mp-ink-2)]">
                      Gaps
                    </span>
                    <ul className="mp-list mt-auto space-y-[7px] pt-2">
                      {GAPS.map((gap) => (
                        <li className="flex items-center gap-2.5" key={gap}>
                          <span className="text-[var(--mp-muted)]">
                            <DashedCircle />
                          </span>
                          <span className="mp-list-item truncate text-[11.5px] text-[var(--mp-ink-3)]">
                            {gap}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-2.5 shrink-0 rounded-[11px] border border-[var(--mp-line)] bg-[var(--mp-well)] px-4 py-2.5">
                  <span className="block text-[11.5px] text-[var(--mp-faint-2)]">
                    Ask anything. Type @ for mentions and / for shortcuts.
                  </span>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="flex items-center gap-3 text-[var(--mp-faint-2)]">
                      <Paperclip
                        aria-hidden="true"
                        size={13}
                        strokeWidth={1.6}
                      />
                      <BarChart3
                        aria-hidden="true"
                        size={13}
                        strokeWidth={1.6}
                      />
                      <Zap aria-hidden="true" size={13} strokeWidth={1.6} />
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="grid size-[24px] place-items-center rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)] text-[var(--mp-ink-3)]">
                        <Mic aria-hidden="true" size={12} strokeWidth={1.6} />
                      </span>
                      <span className="grid size-[24px] place-items-center rounded-full bg-[var(--mp-accent)] text-[var(--mp-well)]">
                        <ArrowUp aria-hidden="true" size={13} strokeWidth={2} />
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <aside className="mp-insights w-[220px] shrink-0 flex-col justify-between border-l border-[var(--mp-line)] bg-[var(--mp-insights)] px-4 py-4">
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="mb-3 flex shrink-0 items-center justify-between">
                    <span className="text-[13.5px] font-medium text-[var(--mp-ink)]">
                      Insights
                    </span>
                    <X
                      aria-hidden="true"
                      className="text-[var(--mp-muted)]"
                      size={14}
                      strokeWidth={1.5}
                    />
                  </div>

                  <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div className="divide-y divide-[var(--mp-line)]">
                      {INSIGHTS.map((segments, index) => (
                        <div
                          className="flex items-start gap-2.5 py-[8px]"
                          key={segments.map((segment) => segment.text).join("")}
                          style={{
                            opacity: index === INSIGHTS.length - 1 ? 0.55 : 1,
                          }}
                        >
                          <FourTickCrosshair className="mt-[2px] text-[var(--mp-muted)]" />
                          <p className="text-[10.5px] leading-[1.45] text-[var(--mp-muted)]">
                            {segments.map((segment) => (
                              <span
                                className={
                                  segment.warm
                                    ? "font-medium text-[var(--mp-warm)]"
                                    : segment.highlight
                                      ? "font-medium text-[var(--mp-ink-2)]"
                                      : undefined
                                }
                                key={segment.text}
                              >
                                {segment.text}
                              </span>
                            ))}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mp-fade-insights pointer-events-none absolute inset-x-0 bottom-0 h-7" />
                  </div>
                </div>

                <span className="mt-3 flex h-[34px] shrink-0 items-center justify-center rounded-full border border-[var(--mp-line-3)] bg-[var(--mp-control)] text-[11.5px] font-medium text-[var(--mp-ink-2)]">
                  Generate report PDF
                </span>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
