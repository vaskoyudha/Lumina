import {
  ArrowUp,
  Bot,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Download,
  GraduationCap,
  ImageIcon,
  Link2,
  Loader2,
  LogIn,
  MessageSquare,
  PanelLeftClose,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  SquarePen,
  Swords,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import { ThemedLuminaLogo } from "@/components/brand/lumina-logo";
import { SCENARIOS } from "@/components/companion/scenarios";

/**
 * Chrome shared by the static marketing print (`CompanionPreview`) and the
 * animated hero demo (`CompanionPreviewDemo`).
 *
 * Both surfaces must render the same header, sidebar, composer, and scenario
 * cards the live app renders, so the pieces live here instead of being copied
 * into each. The live app's classes are used verbatim; only the data changes.
 */

export type PreviewRisk = "bersih" | "rendah" | "mencurigakan" | "tinggi";

const RISK_DOT: Record<PreviewRisk, string> = {
  bersih: "bg-brand",
  rendah: "bg-brand",
  mencurigakan: "bg-warn",
  tinggi: "bg-danger",
};

export interface PreviewSession {
  title: string;
  risk?: PreviewRisk | null;
  time?: string;
}

export function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="lc-preview flex h-full w-full select-none flex-col">
      <div className="-mx-2 -mt-2 -mb-2 flex min-h-0 w-[calc(100%+16px)] flex-1 overflow-hidden rounded-[20px] bg-panel p-2">
        {children}
      </div>
    </div>
  );
}

export function PreviewHeader({
  title = "Percakapan baru",
  risk = null,
}: {
  title?: string;
  risk?: PreviewRisk | null;
}) {
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-2">
      <div className="flex h-10 min-w-0 items-center gap-1.5 rounded-full border border-brand-line bg-panel pr-2 pl-1.5 shadow-rest">
        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-soft">
          <Image
            alt=""
            src="/brand/companion-mascot.png"
            width={128}
            height={123}
            className="size-6 object-contain"
          />
        </span>
        <span className="truncate font-medium text-[12px] text-txt">
          {title}
        </span>
        <span
          aria-hidden
          className={`size-1.5 shrink-0 rounded-full ${
            risk ? RISK_DOT[risk] : "bg-dim/50"
          }`}
        />
        <ChevronDown
          aria-hidden
          strokeWidth={1.9}
          className="size-3 shrink-0 text-ink-faint"
        />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span className="hidden size-10 place-items-center rounded-full border border-line bg-panel text-ink-soft shadow-sm lg:grid">
          <Link2 aria-hidden strokeWidth={1.7} className="size-4" />
        </span>
        <span className="hidden h-10 items-center gap-1.5 rounded-full border border-line bg-panel px-4 text-xs font-medium text-txt shadow-sm lg:flex">
          <Download aria-hidden strokeWidth={1.7} className="size-3.5" />
          Ekspor percakapan
        </span>
        <span className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand-ink lg:hidden">
          <SquarePen aria-hidden strokeWidth={1.6} className="size-3.5" />
        </span>
        <span className="flex h-11 items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 text-[11.5px] text-brand-ink lg:hidden">
          <Workflow aria-hidden strokeWidth={1.6} className="size-3.5" />
          <span className="hidden sm:inline">Agen</span>
        </span>
        <span className="hidden h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-panel shadow-[0_10px_22px_-14px_color-mix(in_oklab,var(--lumina-brand)_85%,transparent)] lg:inline-flex">
          <Users aria-hidden strokeWidth={1.9} className="size-3.5" />
          Komunitas
        </span>
      </div>
    </div>
  );
}

export function PreviewComposer({
  value = "",
  placeholder = "Tempel pesan, lampirkan tangkapan layar, atau tulis pertanyaanmu…",
  sendable = false,
  busy = false,
  caret = false,
  className,
}: {
  value?: string;
  placeholder?: string;
  sendable?: boolean;
  busy?: boolean;
  caret?: boolean;
  className?: string;
}) {
  const filled = value.length > 0;

  return (
    <div
      className={`w-full rounded-[18px] border border-brand-line bg-brand-tint p-[5px] shadow-[0_4px_24px_color-mix(in_oklab,var(--lumina-brand-glow)_8%,transparent)] transition-[border-color,box-shadow] duration-200 ${
        sendable
          ? "border-brand-glow shadow-[0_6px_28px_color-mix(in_oklab,var(--lumina-brand-glow)_16%,transparent)]"
          : ""
      } ${className ?? ""}`}
    >
      <div className="rounded-[14px] border border-brand-line/70 bg-panel px-3.5 pt-3 pb-2.5 shadow-[0_1px_2px_color-mix(in_oklab,var(--lumina-txt)_3%,transparent)]">
        <p className="mb-1.5 min-h-[41px] text-[12.5px] leading-relaxed">
          {filled ? (
            <span className="text-ink">{value}</span>
          ) : (
            <span className="text-ink-faint">{placeholder}</span>
          )}
          {caret ? (
            <span
              aria-hidden
              className="ms-0.5 inline-block h-[13px] w-[1.5px] translate-y-[2px] animate-pulse bg-brand-strong align-baseline motion-reduce:hidden"
            />
          ) : null}
        </p>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="grid size-[29px] shrink-0 place-items-center rounded-[8px] bg-chip text-ink-mute">
              <ImageIcon aria-hidden strokeWidth={1.6} className="size-3.5" />
            </span>
            <span className="flex h-[29px] shrink-0 items-center gap-1 rounded-[8px] bg-chip px-2.5 text-[11px] text-ink-mute">
              <Briefcase aria-hidden strokeWidth={1.6} className="size-3.5" />
              <span className="hidden sm:inline">Cari lowongan</span>
            </span>
            <span className="hidden truncate text-[10.5px] text-ink-faint sm:inline">
              Enter mengirim · Shift+Enter baris baru
            </span>
          </div>

          <span
            className={`grid size-[30px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-soft-2 via-brand-glow to-brand-strong text-white ring-2 ring-brand-line shadow-[0_2px_8px_color-mix(in_oklab,var(--lumina-brand-glow)_45%,transparent)] transition-[opacity,transform] duration-200 ${
              sendable || busy ? "opacity-100" : "opacity-40"
            } ${sendable ? "scale-105" : ""}`}
          >
            {busy ? (
              <Loader2
                aria-hidden
                strokeWidth={2}
                className="size-[15px] animate-spin motion-reduce:animate-none"
              />
            ) : (
              <ArrowUp aria-hidden strokeWidth={2.2} className="size-[15px]" />
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="flex items-center gap-1.5 font-semibold text-[11.5px] text-ink-soft">
          <Sparkles
            aria-hidden
            strokeWidth={1.8}
            className="size-3.5 text-brand-ink-soft"
          />
          Tempel dari papan klip
        </span>

        <span className="flex h-[24px] items-center gap-1.5 rounded-full border border-brand-line bg-panel px-2.5 text-[11px] font-medium text-ink-soft shadow-rest">
          <Paperclip
            aria-hidden
            strokeWidth={1.8}
            className="size-3 -rotate-45 text-ink-mute"
          />
          Lampirkan berkas
        </span>
      </div>
    </div>
  );
}

export function PreviewScenarioCards({
  compact = false,
  activeId = null,
  className,
}: {
  compact?: boolean;
  activeId?: string | null;
  className?: string;
}) {
  return (
    <ul
      aria-label="Contoh kasus"
      className={`mt-3.5 hidden w-full grid-cols-1 gap-2.5 max-[809.98px]:grid sm:grid-cols-3 ${
        compact ? "" : "min-[1366px]:grid"
      } ${className ?? ""}`}
    >
      {SCENARIOS.map((scenario) => {
        const Icon = scenario.icon;
        const active = activeId === scenario.id;
        return (
          <li key={scenario.id}>
            <span
              className={`flex h-full min-h-[129px] w-full flex-col justify-between rounded-[15px] border p-3.5 text-left shadow-rest transition-[border-color,background-color] duration-300 ${
                active
                  ? "border-brand-glow bg-brand-tint"
                  : "border-edge-soft bg-panel"
              }`}
            >
              <span
                className={`grid size-6 place-items-center transition-colors duration-300 ${
                  active ? "text-brand-strong" : "text-ink-mute"
                }`}
              >
                <Icon aria-hidden strokeWidth={1.6} className="size-4" />
              </span>

              <span className="mt-2.5 block">
                <span className="block text-[12px] font-semibold text-txt">
                  {scenario.label}
                </span>
                <span className="mt-1 block text-[10.5px] text-ink-faint leading-[1.38]">
                  {scenario.hint}
                </span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const SIDEBAR_DESTINATIONS = [
  { label: "AI Companion", icon: MessageSquare, active: true },
  { label: "Belajar", icon: GraduationCap, active: false },
  { label: "Simulasi", icon: Swords, active: false },
  { label: "Komunitas", icon: UsersRound, active: false },
] as const;

export function CompanionSidebarPreview({
  sessions = [{ title: "Percakapan baru" }],
}: {
  sessions?: readonly PreviewSession[];
}) {
  return (
    <div className="-mt-2 -mb-2 -ml-2 hidden w-[228px] shrink-0 flex-col gap-2 border-line border-r bg-bg px-2.5 py-2.5 min-[1280px]:flex">
      <div className="flex min-h-0 flex-1 flex-col rounded-[20px] border border-white/80 bg-panel/95 px-2.5 pt-3 pb-2 shadow-panel backdrop-blur-md">
        <div className="mb-2.5 flex items-center gap-1.5 px-1">
          <span className="min-w-0 flex-1">
            <ThemedLuminaLogo className="h-[22px] w-auto" />
          </span>
          <span className="grid size-5 shrink-0 place-items-center rounded-[5px] text-ink-faint">
            <PanelLeftClose
              aria-hidden
              strokeWidth={1.7}
              className="size-3.5"
            />
          </span>
        </div>

        <span className="flex items-center justify-between gap-2 rounded-full border-0 bg-gradient-to-r from-brand-cta-from to-brand-cta-to py-1.5 pr-1 pl-3 font-semibold text-[11.5px] text-bg shadow-[inset_0_1px_0_0_var(--color-brand-edge),0_3px_0_0_var(--color-brand-ink)]">
          Percakapan baru
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-bg text-brand-ink">
            <Plus aria-hidden strokeWidth={2.8} className="size-3" />
          </span>
        </span>

        <div className="my-2 border-t border-txt/[0.06]" />

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <span className="flex h-[30px] items-center rounded-[9px] border border-hairline bg-panel pr-1.5 pl-2 shadow-rest">
            <Search
              aria-hidden
              strokeWidth={1.7}
              className="size-3 shrink-0 text-ink-mute"
            />
            <span className="min-w-0 flex-1 px-1.5 text-[11px] text-ink-faint">
              Cari percakapan
            </span>
            <span className="grid h-[17px] min-w-[17px] shrink-0 place-items-center rounded-[4px] border border-hairline bg-panel-2 px-1 font-sans text-[9.5px] text-ink-mute">
              ⌘K
            </span>
          </span>

          <div>
            <span className="block px-1.5 font-semibold text-[9px] text-ink-mute uppercase tracking-[0.12em]">
              Ruang kerja
            </span>
            <div className="mt-1 flex flex-col gap-px">
              {SIDEBAR_DESTINATIONS.map(({ label, icon: Icon, active }) => (
                <span
                  key={label}
                  className={`relative flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-[6px] ${
                    active
                      ? "nav-active-tint font-bold text-nav-active-ink"
                      : "font-semibold text-ink-soft"
                  }`}
                >
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute -left-2.5 top-1.5 bottom-1.5 w-1 rounded-r-full bg-nav-active-icon"
                    />
                  ) : null}
                  <Icon
                    aria-hidden
                    strokeWidth={1.8}
                    fill={active ? "currentColor" : "none"}
                    className={`size-3.5 shrink-0 ${active ? "text-nav-active-icon" : ""}`}
                  />
                  <span className="truncate text-[11px]">{label}</span>
                </span>
              ))}
              <span className="flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-[6px] font-semibold text-ink-soft">
                <Bot
                  aria-hidden
                  strokeWidth={1.8}
                  className="size-3.5 shrink-0"
                />
                <span className="truncate text-[11px]">Agen pemeriksa</span>
              </span>
            </div>
          </div>

          <div className="min-h-0">
            <span className="flex items-center gap-1 px-1.5 py-0.5 font-semibold text-[9px] text-ink-mute uppercase tracking-[0.12em]">
              <ChevronRight
                aria-hidden
                strokeWidth={2}
                className="size-2.5 rotate-90"
              />
              <span className="flex-1">Riwayat</span>
              <span className="rounded-full bg-panel-2 px-1.5 py-px tabular text-[8.5px] text-ink-mute normal-case tracking-normal">
                {sessions.length}
              </span>
            </span>
            <div className="mt-1 space-y-0.5">
              {sessions.map((session) => (
                <span
                  key={session.title}
                  className="flex min-h-8 w-full items-center gap-1.5 rounded-[8px] bg-panel px-1.5 py-1 shadow-rest"
                >
                  <span className="min-w-0 flex-1 truncate font-semibold text-[11px] leading-[1.35] text-ink">
                    {session.title}
                  </span>
                  {session.risk ? (
                    <span
                      aria-hidden
                      className={`size-1.5 shrink-0 rounded-full ${RISK_DOT[session.risk]}`}
                    />
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 rounded-[16px] border border-white/80 bg-panel/95 px-2.5 py-2 shadow-panel backdrop-blur-md">
        <div className="grid grid-cols-2 gap-1.5">
          <span className="flex min-h-8 items-center justify-center gap-1 rounded-[8px] border border-hairline bg-panel font-medium text-[10.5px] text-ink-soft">
            <LogIn aria-hidden strokeWidth={1.8} className="size-3" />
            Masuk
          </span>
          <span className="flex min-h-8 items-center justify-center rounded-[8px] border-0 bg-gradient-to-r from-brand-cta-from to-brand-cta-to font-semibold text-[10.5px] text-bg shadow-[inset_0_1px_0_0_var(--color-brand-edge),0_2px_0_0_var(--color-brand-ink)]">
            Daftar
          </span>
        </div>
      </div>
    </div>
  );
}
