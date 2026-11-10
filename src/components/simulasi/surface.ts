/**
 * Surface recipes ported from the supplied simulation reference
 * (`lumina_simulation.tsx`). Each value is the reference's own gradient,
 * border and shadow, kept in one place so the middle column and the right
 * rail cannot drift apart again.
 *
 * The reference draws a narrow, borderless-feeling card: a near-white warm
 * paper that only deepens to peach at the bottom edge. The right rail is
 * almost white, and the accent tints live on nested subcards, not on the
 * outer container.
 */

/** Main content card: pale warm paper deepening to peach. */
export const SURFACE_MAIN =
  "rounded-[22px] border border-[#f4e5da] bg-[linear-gradient(180deg,#fdf8f4_0%,#fcf4ed_55%,#f9ebe0_100%)] shadow-[0_6px_24px_rgba(175,110,65,0.06)]";

/** Panel card on the listing/briefing: near-white, thin warm border. */
export const SURFACE_PANEL =
  "rounded-[20px] border border-[#f5e6dc] bg-[linear-gradient(180deg,rgba(255,253,251,0.96)_0%,rgba(253,248,244,0.98)_100%)] shadow-[0_6px_24px_rgba(175,110,65,0.06)]";

/** Right-rail container: almost white, holding nested subcards. */
export const SURFACE_RAIL =
  "rounded-[22px] border border-[#f5e6dc] bg-[linear-gradient(180deg,rgba(255,252,249,0.86)_0%,rgba(253,246,240,0.92)_100%)] p-2.5 shadow-[0_6px_24px_rgba(175,110,65,0.05)]";

/** Nested card inside a rail container: crisp white sheet. */
export const SURFACE_SUBCARD =
  "rounded-[18px] border border-[#f3e6dc] bg-[linear-gradient(180deg,#ffffff_0%,#fdf9f6_100%)]";

/** Numbered row bar inside the result card. */
export const SURFACE_ROW =
  "rounded-[9px] bg-[linear-gradient(90deg,#fbf8f6_0%,#f5f3f1_55%,#faf6f3_100%)]";

/** Warm notice: safe step, summary note. */
export const SURFACE_NOTE =
  "rounded-[14px] border border-[#f9decb] bg-[linear-gradient(135deg,#feede2_0%,#fdf2ea_60%,#feefe5_100%)]";

/** Danger notice: risky step, warning. */
export const SURFACE_WARN =
  "rounded-[14px] border border-[#f7d2d2] bg-[linear-gradient(135deg,#fde8ea_0%,#fce1de_55%,#f9dbd2_100%)]";

/** Tip notice: amber safety tip. */
export const SURFACE_TIP =
  "rounded-[14px] border border-[#f8dec6] bg-[linear-gradient(135deg,#feefe2_0%,#fde6d0_55%,#fbdac0_100%)]";

/** Top alert banner inside a card ("Pola terakhir"). */
export const SURFACE_ALERT =
  "rounded-[14px] border border-[#fbdac6] bg-[linear-gradient(90deg,#ffede1_0%,#fff2e9_62%,#fde4d3_100%)]";

/** Primary flame action. */
export const SURFACE_FLAME =
  "bg-[linear-gradient(180deg,#ff7a18_0%,#f25c05_60%,#e04f00_100%)] text-white shadow-[0_2px_6px_rgba(242,92,5,0.3)] hover:brightness-105";

/** Soft peach secondary action ("Tarik napas"). */
export const SURFACE_SOFT =
  "border border-[#f5decb] bg-[linear-gradient(180deg,#fef5ed_0%,#fce8d8_100%)]";

/** Muted neutral pill ("FNTF", meta badges). */
export const SURFACE_MUTED =
  "border border-[#e5dbd1] bg-[linear-gradient(180deg,#f8f3ee_0%,#f1e8e0_100%)]";

/** Number badge in a numbered row. */
export const SURFACE_BADGE =
  "bg-[linear-gradient(180deg,#fde8d8_0%,#fbd9c2_100%)] text-[#e65808]";
