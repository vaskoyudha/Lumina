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
import type { ReactNode } from "react";
import { ThemedLuminaLogo } from "@/components/brand/lumina-logo";
import { CollapseIcon } from "./measure-preview";

/**
 * Shared shell for the chat-shaped product prints (Tanya, Periksa, Langkah).
 *
 * Like the Measure print, this is a picture of the product: the root is
 * `aria-hidden` and `pointer-events-none`, and the only real control is the
 * tab strip in `Features.tsx`. The palette comes from `--mp-*` in
 * `powder-theme.css`, which recolors with the active landing theme.
 */

type ThreadIconName = "chat" | "bars" | "play" | "doc" | "search";

type Thread = {
  title: string;
  time: string;
  icon: ThreadIconName;
  fade?: number;
};

const THREADS: Thread[] = [
  { title: "APK undangan pernikahan", time: "2 menit lalu", icon: "chat" },
  { title: "Tugas like dan top-up", time: "1 jam lalu", icon: "bars" },
  { title: "Akun diblokir 2 jam", time: "3 jam lalu", icon: "play" },
  { title: "Investasi untung tetap", time: "Kemarin", icon: "chat" },
  { title: "QRIS stiker palsu", time: "2 hari lalu", icon: "doc", fade: 0.68 },
  {
    title: "Kurir palsu minta OTP",
    time: "5 hari lalu",
    icon: "search",
    fade: 0.36,
  },
];

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

function PreviewSidebar({ active }: { active: number }) {
  return (
    <aside className="mp-sidebar w-[23.6%] shrink-0 flex-col justify-between border-r border-[var(--mp-line)]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-[62px] shrink-0 items-center justify-between px-[12%]">
          <ThemedLuminaLogo className="h-[20px] w-auto" />
          <span className="text-[var(--mp-muted)]">
            <CollapseIcon />
          </span>
        </div>

        <div className="px-[12%] pb-1">
          <span className="flex h-[28px] w-full items-center justify-center rounded-full border border-[var(--mp-line-3)] bg-[var(--mp-control)] text-[11.5px] font-medium text-[var(--mp-ink)]">
            Percakapan baru
          </span>
        </div>

        <div className="relative mt-3 min-h-0 flex-1 overflow-hidden px-[8%]">
          <div className="space-y-[3px]">
            {THREADS.map((thread, index) => {
              const isActive = index === active;
              return (
                <div
                  className={`flex items-start gap-2.5 rounded-[8px] px-2.5 py-[9px] ${
                    isActive
                      ? "border border-[var(--mp-line-2)] bg-[var(--mp-row)]"
                      : "border border-transparent"
                  }`}
                  key={thread.title}
                  style={{ opacity: thread.fade ?? 1 }}
                >
                  <span
                    className={`mt-[1px] ${
                      isActive
                        ? "text-[var(--mp-ink-3)]"
                        : "text-[var(--mp-faint)]"
                    }`}
                  >
                    <ThreadIcon name={thread.icon} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[11.5px] font-medium leading-[1.3] ${
                        isActive
                          ? "text-[var(--mp-ink)]"
                          : "text-[var(--mp-ink-3)]"
                      }`}
                    >
                      {thread.title}
                    </span>
                    <span
                      className={`mt-[2px] block text-[10px] leading-[1.3] ${
                        isActive
                          ? "text-[var(--mp-muted)]"
                          : "text-[var(--mp-faint)]"
                      }`}
                    >
                      {thread.time}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mp-fade-sidebar pointer-events-none absolute inset-x-0 bottom-0 h-8" />
        </div>
      </div>

      <div>
        <div className="mx-[8%] border-t border-[var(--mp-line)]" />
        <div className="flex items-center gap-2.5 px-[12%] py-3.5">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-avatar)] text-[10.5px] font-medium text-[var(--mp-ink-2)]">
            AL
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[11.5px] font-medium leading-tight text-[var(--mp-ink)]">
              Akun Lumina
            </span>
            <span className="mt-[2px] block truncate text-[10.5px] leading-tight text-[var(--mp-faint)]">
              Sesi di perangkat ini
            </span>
          </span>
        </div>
      </div>
    </aside>
  );
}

export function PreviewComposer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`shrink-0 rounded-[12px] border border-[var(--mp-line)] bg-[var(--mp-well)] px-4 py-3 ${className}`}
    >
      <span className="block text-[11.5px] text-[var(--mp-faint-2)]">
        Tulis pesan atau tempel tautan. Enter mengirim, Shift+Enter baris baru.
      </span>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-3 text-[var(--mp-faint-2)]">
          <Paperclip aria-hidden="true" size={13} strokeWidth={1.6} />
          <BarChart3 aria-hidden="true" size={13} strokeWidth={1.6} />
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
  );
}

type ChatPreviewProps = {
  rootClassName: string;
  backdropSrc: string;
  title: string;
  activeThread?: number;
  headerExtra?: ReactNode;
  aside?: {
    title: string;
    children: ReactNode;
    footer?: string;
  };
  composerWrapperClassName?: string;
  children: ReactNode;
};

export function ChatPreview({
  rootClassName,
  backdropSrc,
  title,
  activeThread = 1,
  headerExtra,
  aside,
  composerWrapperClassName = "mt-4",
  children,
}: ChatPreviewProps) {
  return (
    <div
      aria-hidden="true"
      className={`chat-preview ${rootClassName} pointer-events-none relative h-full w-full select-none overflow-hidden bg-[var(--mp-backdrop)] antialiased`}
    >
      <div className="absolute inset-0">
        {/* biome-ignore lint/performance/noImgElement: fixed decorative backdrop, not content */}
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          src={backdropSrc}
        />
      </div>

      <div className="mp-frame absolute inset-0 px-[6.2%] py-[3.6%]">
        <div className="ap-window flex h-full w-full overflow-hidden rounded-[12px] border border-[var(--mp-line-2)] shadow-[0_30px_90px_var(--mp-shadow)]">
          <PreviewSidebar active={activeThread} />

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-[var(--mp-line)] px-6">
              <span className="text-[17px] font-medium tracking-[-0.015em] text-[var(--mp-ink)]">
                {title}
              </span>
              <span className="flex items-center gap-3 text-[var(--mp-muted)]">
                {headerExtra}
                <Search aria-hidden="true" size={14} strokeWidth={1.6} />
                <span className="grid size-[26px] place-items-center rounded-full border border-[var(--mp-line-2)] bg-[var(--mp-row)]">
                  <Menu aria-hidden="true" size={12} strokeWidth={1.6} />
                </span>
              </span>
            </header>

            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col px-6 pt-2 pb-[28px]">
                <div className="flex min-h-0 flex-1 flex-col">{children}</div>
                <div className={composerWrapperClassName}>
                  <PreviewComposer />
                </div>
              </div>

              {aside ? (
                <aside className="mp-aside w-[220px] shrink-0 flex-col justify-between border-l border-[var(--mp-line)] bg-[var(--mp-insights)] px-4 py-4">
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="mb-3 flex shrink-0 items-center justify-between">
                      <span className="text-[13.5px] font-medium text-[var(--mp-ink)]">
                        {aside.title}
                      </span>
                      <X
                        aria-hidden="true"
                        className="text-[var(--mp-muted)]"
                        size={14}
                        strokeWidth={1.5}
                      />
                    </div>
                    <div className="relative min-h-0 flex-1 overflow-hidden">
                      {aside.children}
                    </div>
                  </div>
                  {aside.footer ? (
                    <span className="mt-3 flex h-[34px] shrink-0 items-center justify-center rounded-full border border-[var(--mp-line-3)] bg-[var(--mp-control)] text-[11.5px] font-medium text-[var(--mp-ink-2)]">
                      {aside.footer}
                    </span>
                  ) : null}
                </aside>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
