import {
  BarChart3,
  CircleHelp,
  FileCheck2,
  Link2,
  type LucideIcon,
  Mail,
  UserRoundPlus,
} from "lucide-react";
import { ChatPreview } from "./chat-preview";

/**
 * Decorative print of Lumina's "Ask" surface for the Tanya slide.
 * The shell (sidebar, header, composer) lives in `chat-preview.tsx`.
 */

const BACKDROP =
  "/sites/powder-framer-website-4824bd20/root-8a5edab2/Wg0HPMEvwBAB4NYqAHbCXOgrijs.jpg";

const ACTIONS: { label: string; Icon: LucideIcon }[] = [
  { label: "Answer a question", Icon: CircleHelp },
  { label: "Summarize this link", Icon: Link2 },
  { label: "Write a draft email", Icon: Mail },
  { label: "Create a report", Icon: BarChart3 },
  { label: "Check a policy", Icon: FileCheck2 },
  { label: "Find a contact", Icon: UserRoundPlus },
];

export function AskPreview() {
  return (
    <ChatPreview
      rootClassName="ask-preview"
      backdropSrc={BACKDROP}
      title="Ask"
      activeThread={1}
      composerWrapperClassName="mx-auto mt-4 w-full max-w-[440px]"
    >
      <div className="flex h-full flex-col items-center justify-center">
        <div className="w-full max-w-[440px]">
          <div className="text-center">
            <h3 className="ap-title text-[22px] font-medium tracking-[-0.02em] text-[var(--mp-ink)]">
              What do you want to do?
            </h3>
            <p className="ap-sub mt-2 text-[12px] text-[var(--mp-muted)]">
              Ask anything and I&apos;ll handle the busywork.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-2.5 gap-y-2.5">
            {ACTIONS.map(({ label, Icon }) => (
              <span
                className="ap-action flex items-center gap-3 rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)] px-3.5 py-[7px]"
                key={label}
              >
                <span className="grid size-[18px] shrink-0 place-items-center rounded-full border border-[var(--mp-line-3)] text-[var(--mp-muted)]">
                  <Icon aria-hidden="true" size={10} strokeWidth={1.7} />
                </span>
                <span className="truncate text-[11.5px] font-medium text-[var(--mp-ink-2)]">
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </ChatPreview>
  );
}
