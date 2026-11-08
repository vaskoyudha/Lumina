import { CircleDashed, Play, RefreshCw, Reply, Upload } from "lucide-react";
import { ChatPreview } from "./chat-preview";
import { FourTickCrosshair } from "./measure-preview";

/**
 * Decorative print of Lumina's "Execute" surface for the Langkah slide:
 * a prepared ticket, the suggested next actions, and an action preview rail.
 */

const BACKDROP =
  "/sites/powder-framer-website-4824bd20/root-8a5edab2/etZjwiSv1K58xyJBSdYWMrMCY3c.jpg";

const TICKET = ["Login loop on Safari", "Assigned to: Jane"];

const ACTIONS = [
  { label: "Send reply", Icon: Reply },
  { label: "Update CRM", Icon: Upload },
  { label: "Schedule", Icon: RefreshCw },
];

function NextActions() {
  return (
    <div className="flex items-center gap-1.5 rounded-[12px] border border-[var(--mp-line)] bg-[var(--mp-well)] p-1.5">
      {ACTIONS.map(({ label, Icon }) => (
        <span
          className="flex items-center gap-1.5 rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)] px-3 py-[6px] text-[10.5px] font-medium text-[var(--mp-ink-2)]"
          key={label}
        >
          <Icon
            aria-hidden="true"
            className="text-[var(--mp-muted)]"
            size={11}
            strokeWidth={1.7}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

function ActionPreviewRail() {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2.5 rounded-[9px] border border-[var(--mp-line)] bg-[var(--mp-card)] px-3 py-2.5">
        <Play
          aria-hidden="true"
          className="mt-[2px] shrink-0 text-[var(--mp-muted)]"
          size={12}
          strokeWidth={1.6}
        />
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-medium text-[var(--mp-ink-2)]">
            Login loop on Safari
          </span>
          <span className="mt-[2px] block truncate text-[10px] text-[var(--mp-muted)]">
            Assigned to: Jane
          </span>
        </span>
      </div>

      <div className="rounded-[9px] border border-[var(--mp-line)] bg-[var(--mp-card)] px-3 py-2.5">
        <div className="flex items-center gap-2">
          <CircleDashed
            aria-hidden="true"
            className="shrink-0 text-[var(--mp-muted)]"
            size={12}
            strokeWidth={1.6}
          />
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--mp-ink-2)]">
            Approval required
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-[1.45] text-[var(--mp-muted)]">
          Policy: Create tickets by default
        </p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="flex h-[26px] flex-1 items-center justify-center rounded-full bg-[var(--mp-ink)] text-[10.5px] font-medium text-[var(--mp-well)]">
            Confirm
          </span>
          <span className="flex h-[26px] flex-1 items-center justify-center rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)] text-[10.5px] font-medium text-[var(--mp-ink-3)]">
            Cancel
          </span>
        </div>
      </div>
    </div>
  );
}

export function LangkahPreview() {
  return (
    <ChatPreview
      rootClassName="langkah-preview"
      backdropSrc={BACKDROP}
      title="Execute"
      activeThread={2}
      aside={{
        title: "Action preview",
        footer: "Add action",
        children: <ActionPreviewRail />,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pt-1">
        <div className="flex shrink-0 justify-end">
          <span className="max-w-[68%] rounded-[14px] rounded-br-[4px] border border-[var(--mp-bubble-line)] bg-[var(--mp-bubble)] px-4 py-2 text-[11.5px] text-[var(--mp-ink)]">
            Create a bug ticket and notify the owner.
          </span>
        </div>

        <div className="shrink-0 rounded-[10px] border border-[var(--mp-line)] bg-[var(--mp-card)] px-4 py-3">
          <span className="text-[12px] font-medium text-[var(--mp-ink-2)]">
            Ticket Ready
          </span>
          <ul className="mt-3 space-y-2">
            {TICKET.map((item) => (
              <li className="flex items-center gap-2.5" key={item}>
                <FourTickCrosshair className="shrink-0 text-[var(--mp-muted)]" />
                <span className="text-[11.5px] text-[var(--mp-ink-3)]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <NextActions />
          <span className="text-[10.5px] text-[var(--mp-faint)]">
            Next Actions
          </span>
        </div>
      </div>
    </ChatPreview>
  );
}
