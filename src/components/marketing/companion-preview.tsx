import { Mascot } from "@/components/brand/mascot";
import {
  CompanionSidebarPreview,
  PreviewComposer,
  PreviewFrame,
  PreviewHeader,
  PreviewScenarioCards,
} from "@/components/marketing/companion-preview-chrome";

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
 *
 * Shared chrome lives in `companion-preview-chrome.tsx`, so the animated hero
 * demo renders the identical header, sidebar, composer, and cards.
 *
 * `lc-preview` is the one deliberate exception: it remaps the app's
 * `--lumina-*` chrome to the active landing theme, so the print turns warm on
 * cream, cool on paper and dark on black instead of staying a white island.
 * The machine itself is untouched; the mapping lives in `landing-tokens.css`.
 * The primary-fill text also uses `text-bg` instead of the live `text-white`,
 * because that fill inverts to a light colour in the black theme.
 */
export function CompanionPreview({ compact = false }: { compact?: boolean }) {
  return (
    <PreviewFrame>
      <CompanionSidebarPreview />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PreviewHeader />

        <div className="flex min-h-0 flex-1 flex-col items-center justify-start py-4">
          <div className="flex w-full max-w-[520px] flex-col items-center">
            <div className="mb-2 flex items-center justify-center">
              <Mascot className="pointer-events-none h-[94px] w-[129px] select-none" />
            </div>

            <h3 className="text-center font-semibold text-[24px] leading-[1.2] tracking-[-0.025em] sm:text-[26px]">
              <span className="bg-[linear-gradient(90deg,var(--lumina-brand-glow)_0%,var(--lumina-brand-ink-soft)_50%,var(--lumina-brand-glow)_100%)] bg-clip-text text-transparent">
                Periksa sebelum
              </span>
            </h3>
            <p className="mt-0.5 text-center font-semibold text-[24px] leading-[1.22] tracking-[-0.025em] text-ink sm:text-[26px]">
              kamu percaya.
            </p>

            <div className="mt-5 w-full">
              <PreviewComposer />
            </div>

            <PreviewScenarioCards compact={compact} />
          </div>
        </div>
      </div>
    </PreviewFrame>
  );
}
