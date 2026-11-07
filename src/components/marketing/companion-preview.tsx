import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Download,
  GraduationCap,
  ImageIcon,
  LifeBuoy,
  Link2,
  Lock,
  LogIn,
  MessageSquare,
  PanelLeftClose,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  SquarePen,
  Swords,
  Workflow,
} from "lucide-react";
import { LuminaLogo } from "@/components/brand/lumina-logo";
import { SCENARIOS } from "@/components/companion/scenarios";

/**
 * A static, non-interactive print of the companion's empty state for the hero
 * and closing CTA.
 *
 * Every class below is copied from the live surfaces (`companion-chat.tsx`,
 * `session-sidebar.tsx`, `nav-rail.tsx`, `composer.tsx`, `scenario-cards.tsx`)
 * so the marketing image cannot drift from the product it is selling. The
 * controls are spans on purpose: the card is a screenshot, not a second
 * entrance to the app, and it must not add tab stops or focus rings to the
 * landing page.
 */
export function CompanionPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex h-full w-full select-none flex-col">
      <div className="-mx-2 -mt-2 -mb-2 flex min-h-0 w-[calc(100%+16px)] flex-1 overflow-hidden rounded-[20px] bg-panel p-2">
        <CompanionSidebarPreview />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex w-full shrink-0 items-center justify-between gap-2">
            <div className="flex h-[32px] min-w-0 items-center gap-1.5 rounded-full border border-edge bg-panel px-2.5 shadow-rest">
              <span
                aria-hidden
                className="relative grid size-[22px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-soft-2 via-brand-glow to-brand-strong"
              >
                <Sparkles className="size-2.5 text-white" strokeWidth={2} />
              </span>
              <span className="truncate font-medium text-[12px] text-txt">
                Percakapan baru
              </span>
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-dim/50"
              />
              <ChevronDown
                aria-hidden
                strokeWidth={1.9}
                className="size-3 shrink-0 text-ink-faint"
              />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <span className="hidden size-[32px] place-items-center rounded-full bg-chip text-ink-soft lg:grid">
                <Link2 aria-hidden strokeWidth={1.7} className="size-4" />
              </span>
              <span className="hidden h-[32px] items-center gap-1.5 rounded-full bg-chip px-3 text-[12px] font-medium text-ink-soft lg:flex">
                <Download aria-hidden strokeWidth={1.7} className="size-3.5" />
                Ekspor percakapan
              </span>
              <span className="grid size-8 place-items-center rounded-full bg-chip text-ink-mute lg:hidden">
                <SquarePen aria-hidden strokeWidth={1.6} className="size-3.5" />
              </span>
              <span className="flex h-[32px] items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 text-[11.5px] text-brand-ink lg:hidden">
                <Workflow aria-hidden strokeWidth={1.6} className="size-3.5" />
                <span className="hidden sm:inline">Agen</span>
              </span>
              <span className="hidden h-[32px] items-center rounded-full border border-ink-line bg-ink px-3.5 text-[12px] font-medium text-bg lg:inline-flex">
                Mode darurat
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-start py-4">
            <div className="flex w-full max-w-[520px] flex-col items-center">
              <div className="mb-2 flex items-center justify-center">
                {/* biome-ignore lint/performance/noImgElement: a fixed 104x94 PNG with transparency; next/image adds no value here */}
                <img
                  src="/images/companion-orb.png"
                  alt="Orb Lumina"
                  width={104}
                  height={94}
                  className="pointer-events-none h-[94px] w-[104px] object-contain [filter:hue-rotate(132deg)_saturate(1.45)]"
                />
              </div>

              <h3 className="text-center font-semibold text-[24px] leading-[1.2] tracking-[-0.025em] sm:text-[26px]">
                <span className="bg-[linear-gradient(90deg,var(--lumina-brand-glow)_0%,var(--lumina-brand-ink-soft)_50%,var(--lumina-brand-glow)_100%)] bg-clip-text text-transparent">
                  Periksa sebelum
                </span>
              </h3>
              <p className="mt-0.5 text-center font-semibold text-[24px] leading-[1.22] tracking-[-0.025em] text-ink sm:text-[26px]">
                kamu percaya.
              </p>

              <div className="mt-5 w-full rounded-[18px] border border-brand-line bg-brand-tint p-[5px] shadow-[0_4px_24px_color-mix(in_oklab,var(--lumina-brand-glow)_8%,transparent)]">
                <div className="rounded-[14px] border border-brand-line/70 bg-panel px-3.5 pt-3 pb-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.015)]">
                  <p className="mb-1.5 min-h-[41px] text-[12.5px] text-ink-faint leading-relaxed">
                    Tempel pesan, lampirkan tangkapan layar, atau tulis
                    pertanyaanmu…
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="grid size-[29px] shrink-0 place-items-center rounded-[8px] bg-chip text-ink-mute">
                        <ImageIcon
                          aria-hidden
                          strokeWidth={1.6}
                          className="size-3.5"
                        />
                      </span>
                      <span className="hidden truncate text-[10.5px] text-ink-faint sm:inline">
                        Enter mengirim · Shift+Enter baris baru
                      </span>
                    </div>

                    <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-soft-2 via-brand-glow to-brand-strong text-white opacity-40 ring-2 ring-brand-line shadow-[0_2px_8px_color-mix(in_oklab,var(--lumina-brand-glow)_45%,transparent)]">
                      <ArrowUp
                        aria-hidden
                        strokeWidth={2.2}
                        className="size-[15px]"
                      />
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

              <ul
                aria-label="Contoh kasus"
                className={`mt-3.5 hidden w-full grid-cols-1 gap-2.5 max-[809.98px]:grid sm:grid-cols-3 ${
                  compact ? "" : "min-[1366px]:grid"
                }`}
              >
                {SCENARIOS.map((scenario) => {
                  const Icon = scenario.icon;
                  return (
                    <li key={scenario.id}>
                      <span className="flex h-full min-h-[129px] w-full flex-col justify-between rounded-[15px] border border-edge-soft bg-panel p-3.5 text-left shadow-rest">
                        <span className="grid size-6 place-items-center text-ink-mute">
                          <Icon
                            aria-hidden
                            strokeWidth={1.6}
                            className="size-4"
                          />
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

              <p
                className={`mt-4 text-center text-[11px] text-ink-faint leading-[1.45] ${
                  compact
                    ? "hidden max-[809.98px]:block"
                    : "hidden max-[809.98px]:block 2xl:block"
                }`}
              >
                Lumina membaca pesan, bukan mengadili orang.{" "}
                <span className="font-medium text-brand-chip-ink underline underline-offset-2">
                  Pelajari cara kerjanya
                </span>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SIDEBAR_DESTINATIONS = [
  { label: "Companion", icon: MessageSquare, active: true, emergency: false },
  { label: "Belajar", icon: GraduationCap, active: false, emergency: false },
  { label: "Simulasi", icon: Swords, active: false, emergency: false },
  { label: "Darurat", icon: LifeBuoy, active: false, emergency: true },
] as const;

function CompanionSidebarPreview() {
  return (
    <div className="-ml-2 hidden w-[220px] shrink-0 flex-col justify-between border-line border-r bg-bg px-2 pt-2 pb-1 min-[1280px]:flex">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3.5 flex items-center gap-1.5 px-1.5">
          <span className="min-w-0 flex-1">
            <LuminaLogo className="h-[24px] w-auto" />
          </span>
          <span className="grid size-6 shrink-0 place-items-center rounded-[6px] text-ink-faint">
            <PanelLeftClose aria-hidden strokeWidth={1.7} className="size-4" />
          </span>
        </div>

        <span className="flex h-[38px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-ink-line bg-ink font-medium text-[12.5px] text-white shadow-rest">
          <Plus aria-hidden strokeWidth={2} className="size-4" />
          Percakapan baru
        </span>

        <span className="relative mt-2.5 flex h-[34px] items-center rounded-[10px] border border-hairline bg-panel pr-2 pl-2.5 shadow-rest">
          <Search
            aria-hidden
            strokeWidth={1.7}
            className="size-3.5 shrink-0 text-ink-mute"
          />
          <span className="min-w-0 flex-1 px-2 text-[12px] text-ink-faint">
            Cari
          </span>
          <span className="grid h-[19px] min-w-[19px] shrink-0 place-items-center rounded-[5px] bg-brand-soft px-1 font-sans text-[10.5px] text-brand-ink-soft">
            ⌘K
          </span>
        </span>

        <span className="my-2.5 border-t border-txt/[0.06]" />

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          <div>
            <span className="flex w-full items-center gap-1.5 rounded-[7px] px-1.5 py-1 text-left font-medium text-[10.5px] text-ink-faint">
              <ChevronRight
                aria-hidden
                strokeWidth={2}
                className="size-3 shrink-0 rotate-90"
              />
              <span className="flex-1 truncate">Riwayat</span>
              <span className="shrink-0 tabular text-[10px] text-ink-faint">
                1
              </span>
            </span>
            <div className="space-y-3 pt-1.5">
              <div>
                <p className="mb-1 px-1.5 font-medium text-[10.5px] text-ink-faint">
                  Hari ini
                </p>
                <span className="flex w-full items-center gap-2 rounded-[7px] bg-panel px-1.5 py-[6px] text-left font-medium text-ink shadow-rest">
                  <span className="min-w-0 flex-1 truncate text-[12px] leading-[1.35]">
                    Percakapan baru
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="flex w-full items-center gap-1.5 rounded-[7px] px-1.5 py-1 text-left font-medium text-[10.5px] text-ink-faint">
              <ChevronRight
                aria-hidden
                strokeWidth={2}
                className="size-3 shrink-0 rotate-90"
              />
              <span className="flex-1 truncate">Menu</span>
              <span className="shrink-0 tabular text-[10px] text-ink-faint">
                4
              </span>
            </span>
            <div className="flex flex-col gap-0.5 pt-0.5">
              {SIDEBAR_DESTINATIONS.map(
                ({ label, icon: Icon, active, emergency }) => (
                  <span
                    key={label}
                    className={`flex min-w-0 items-center gap-2.5 rounded-[7px] px-2 py-[7px] ${
                      active
                        ? "bg-chip font-medium text-ink"
                        : emergency
                          ? "text-danger"
                          : "text-ink-soft"
                    }`}
                  >
                    <Icon
                      aria-hidden
                      strokeWidth={1.75}
                      className="size-[15px] shrink-0"
                    />
                    <span className="truncate font-medium text-[12.5px] leading-[1.5]">
                      {label}
                    </span>
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <span className="flex min-h-9 items-center justify-center gap-1.5 rounded-[8px] border border-hairline bg-panel font-medium text-[11.5px] text-ink-soft">
          <LogIn aria-hidden strokeWidth={1.8} className="size-3.5" />
          Masuk
        </span>
        <span className="flex min-h-9 items-center justify-center rounded-[8px] border border-ink-line bg-ink font-medium text-[11.5px] text-bg">
          Daftar
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2.5 rounded-[12px] border border-hairline bg-panel p-2 shadow-rest">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-brand-soft text-brand-ink">
          <Lock aria-hidden strokeWidth={1.8} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-[11.5px] text-txt leading-[1.3]">
            Riwayat di tab ini
          </span>
          <span className="block truncate font-light text-[10.5px] text-ink-faint leading-[1.4]">
            Tutup tab, hilang.
          </span>
        </span>
      </div>
    </div>
  );
}
