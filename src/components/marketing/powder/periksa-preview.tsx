import { Check, CircleHelp, CreditCard, FileText } from "lucide-react";
import { ChatPreview } from "./chat-preview";
import { FourTickCrosshair } from "./measure-preview";

/**
 * Decorative print of Lumina's "Verify" surface for the Periksa slide:
 * a checked answer with inline citations and a sources rail.
 */

const BACKDROP =
  "/sites/powder-framer-website-4824bd20/root-8a5edab2/M3AKVBhu25GOh5mNc4l3oWTQ5TQ.jpg";

const CHECKS = ["SAML 2.0 + OIDC", "Managed through Admin \u2192 Security"];

const SOURCES = [
  {
    Icon: FileText,
    title: "Authentication Guide",
    count: 1,
    body: "SSO (SAML 2.0, OIDC) is supported on Business and Enterprise plans.",
  },
  {
    Icon: CreditCard,
    title: "Pricing & Plans",
    count: 2,
    body: "Feature availability by plan \u2014 Pro, Business, Enterprise.",
  },
  {
    Icon: CircleHelp,
    title: "Help Center",
    count: 3,
    body: "Step-by-step instructions for configuring SSO in Admin.",
  },
];

const CITATIONS = [
  { Icon: FileText, label: "Docs \u00b7 Authentication", count: 1 },
  { Icon: CreditCard, label: "Pricing \u00b7 Plans", count: 2 },
];

function ShowSources() {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-[var(--mp-line-3)] bg-[var(--mp-control)] px-3 py-[5px] text-[10.5px] font-medium text-[var(--mp-ink-2)]">
      <span className="grid size-[13px] place-items-center rounded-full bg-[var(--mp-ink)] text-[var(--mp-control)]">
        <Check aria-hidden="true" size={8} strokeWidth={3} />
      </span>
      Show Sources
    </span>
  );
}

function SourcesRail() {
  return (
    <div className="space-y-2">
      {SOURCES.map(({ Icon, title, count, body }) => (
        <div
          className="rounded-[9px] border border-[var(--mp-line)] bg-[var(--mp-card)] px-3 py-2.5"
          key={title}
        >
          <div className="flex items-center gap-2">
            <Icon
              aria-hidden="true"
              className="shrink-0 text-[var(--mp-muted)]"
              size={12}
              strokeWidth={1.6}
            />
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--mp-ink-2)]">
              {title}
            </span>
            <span className="grid size-[16px] shrink-0 place-items-center rounded-full border border-[var(--mp-line-2)] text-[9px] text-[var(--mp-muted)]">
              {count}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-[10px] leading-[1.45] text-[var(--mp-muted)]">
            {body}
          </p>
        </div>
      ))}
    </div>
  );
}

export function PeriksaPreview() {
  return (
    <ChatPreview
      rootClassName="periksa-preview"
      backdropSrc={BACKDROP}
      title="Verify"
      activeThread={0}
      headerExtra={<ShowSources />}
      aside={{
        title: "Sources",
        footer: "Add source",
        children: <SourcesRail />,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-1">
        <div className="flex shrink-0 justify-end">
          <span className="max-w-[72%] rounded-[14px] rounded-br-[4px] border border-[var(--mp-bubble-line)] bg-[var(--mp-bubble)] px-4 py-2 text-[11.5px] text-[var(--mp-ink)]">
            Do we support SSO on the Pro plan?
          </span>
        </div>

        <div className="shrink-0">
          <p className="text-[12px] leading-[1.5] text-[var(--mp-ink-2)]">
            SSO is available on{" "}
            <span className="font-medium">Business and Enterprise plans</span>.
            It&apos;s not included in Pro.
          </p>
          <ul className="mt-2 space-y-1.5">
            {CHECKS.map((item) => (
              <li
                className="flex items-center gap-2 text-[11.5px] text-[var(--mp-ink-3)]"
                key={item}
              >
                <Check
                  aria-hidden="true"
                  className="shrink-0 text-[var(--mp-muted)]"
                  size={11}
                  strokeWidth={2}
                />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CITATIONS.map(({ Icon, label, count }) => (
              <span
                className="flex items-center gap-1.5 rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)] px-2.5 py-[5px] text-[10.5px] text-[var(--mp-ink-3)]"
                key={label}
              >
                <Icon aria-hidden="true" size={10} strokeWidth={1.6} />
                {label}
                <span className="grid size-[14px] place-items-center rounded-full bg-[var(--mp-control-2)] text-[9px] text-[var(--mp-ink-2)]">
                  {count}
                </span>
              </span>
            ))}
            <span className="grid size-[22px] place-items-center rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)] text-[10px] text-[var(--mp-faint)]">
              +1
            </span>
          </div>
        </div>

        <div className="shrink-0 rounded-[10px] border border-[var(--mp-line)] bg-[var(--mp-card)] px-4 py-3">
          <span className="text-[12px] font-medium text-[var(--mp-ink-2)]">
            Key Details
          </span>
          <ul className="mt-2 space-y-2">
            <li className="flex items-center gap-2.5">
              <FourTickCrosshair className="shrink-0 text-[var(--mp-muted)]" />
              <span className="text-[11.5px] text-[var(--mp-ink-3)]">
                Set up SSO in Admin &gt; Security &gt; SSO
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <FourTickCrosshair className="shrink-0 text-[var(--mp-muted)]" />
              <span className="text-[11.5px] text-[var(--mp-ink-3)]">
                Contact sales to upgrade
              </span>
            </li>
          </ul>
        </div>
      </div>
    </ChatPreview>
  );
}
