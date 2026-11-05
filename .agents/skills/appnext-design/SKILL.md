---
name: appnext-design
description: Use when building or restyling any surface in this repo — page, section, card, feature band, or app showcase — that should read like the AppNext SaaS/Framer template. Carries the measured palette, type scale, shape and elevation of https://appnext.framer.website/ and the light-token contract the whole app now sits on.
---

# AppNext design system

Full provenance and every measured value: `docs/design-system/appnext.md`.
Tokens: `src/styles/appnext-tokens.css`.

Extracted 2026-11-04 from the live DOM by reading computed styles — not from
screenshots, not from raw HTML. The numbers are measurements, so treat them as
facts rather than starting points to improve.

## Scope rule, first

AppNext is **light-first**, and since 2026-11-04 Lumina ships light too — the
whole app is one `body.appnext` subtree. The token namespaces still do not
merge: `.appnext` remaps `--lumina-*` *inside itself*, and the original dark
values stay under `.dark` in `globals.css` for legacy subtrees.

```tsx
// installed once, in src/app/layout.tsx
<body className="appnext">…</body>

// inside it, use the container and tokens as before
<div className="appnext-container">…</div>
```

Do not add a second `.appnext` wrapper, do not re-declare `--lumina-*` in
`@theme`, and do not add new `.dark` subtrees. The history: this style used to
be opt-in per page and products kept dark tokens — the team reversed that on
2026-11-04 so every screen reads in daylight. Read `AGENTS.md` → "Dua sistem
desain" before changing the ground.

## The five rules that define the look

Getting these wrong is what makes a clone read as "generic AI site" instead of
this template:

a. **Tracking inverts with size.** Display pulls in hard (`−3.6px` at 120px,
   `−0.8px` at 72px). Body pushes out slightly (`+0.16px` at 16px,
   `+0.18px` at 18px). Set tracking per size; never one global value.
b. **Weight inverts with size.** Big type is light (300–400), small type is
   regular-to-medium (400–500). Resist "bigger = bolder".
c. **Body copy is `#606060`, weight 300.** It carries the page — 3,214 uses in
   the source. Headings are `#000`. `#121212` is for dark surfaces, not for
   text.
d. **One accent.** `#1BAB49` green, plus pale blue tints (`#EBF9FF`,
   `#40C6FF`, `#044680`) used sparingly. No second brand colour, no gradients.
e. **Cards are white with a 24px radius and the ambient shadow, no border.**
   Borders belong to `#EEEEEE` dividers only, never to cards.

## Palette

| Token | Value | Use |
|---|---|---|
| `--appnext-ink` | `#000000` | headings |
| `--appnext-ink-2` | `#121212` | dark surface, primary button |
| `--appnext-muted` | `#606060` | body text |
| `--appnext-surface` | `#F4F4F4` | alternating band |
| `--appnext-line` | `#EEEEEE` | dividers |
| `--appnext-white` | `#FFFFFF` | ground, cards |
| `--appnext-accent` | `#1BAB49` | the only saturated accent |
| `--appnext-tint` | `#EBF9FF` | pale wash |
| `--appnext-blue` | `#40C6FF` | light accent |
| `--appnext-blue-deep` | `#044680` | deep accent |

## Type scale

| Class / tag | Size / lh / weight / tracking |
|---|---|
| `.appnext-display` | 120 / 1.1 / 400 / −3.6px |
| `.appnext-hero` | 72 / 1 / 300 / −0.8px |
| `h1` | 42 / 1.1 / 500 / −0.42px |
| `h2` | 34 / 1.2 / 500 / normal |
| `h3` | 28 / 1.3 / 400 / normal |
| `.appnext-lead` | 20 / 1.4 / 400 / −0.3px |
| `body` / `p` | 16 / 1.5 / 300 / +0.16px |
| `.appnext-caption` | 14 / 1.5 / 400 / +0.14px |

Below 767px the source drops display to 49px and hero to 42px, and h1 to 34px.
The token file already handles this; do not re-declare it in a page.

## Shape and elevation

| Token | Value |
|---|---|
| `--appnext-r-pill` | 100px — actions only |
| `--appnext-r-card` | 24px |
| `--appnext-r-md` | 16px |
| `--appnext-r-phone` | 42px 42px 40px 40px |
| `--appnext-shadow-ambient` | three-stop layered shadow, cards at rest |
| `--appnext-shadow-soft` | three-stop, floating panels |
| `--appnext-shadow-ring` | `0 0 0 1px #000 inset`, selected |

Pick one elevation per surface. A card with both a `#EEEEEE` border and the
ambient shadow reads as two competing systems.

## Components that exist

- shadcn `Button` for every action, styled as the AppNext pill: 56px tall,
  24px padding, 12px label, `rounded-full`. Primary fill `#121212`, secondary
  white with the ambient shadow. Use `accent-deep` `#0e7c36` for a green
  action; `#1BAB49` with white text is only 3.01:1.
- shadcn `Card` for card surfaces: white, 24px radius, ambient shadow, no
  border. `.appnext-tokens.css` removes the primitive's 1px ring unlayered.
- `.appnext-container` — 1200px max, 24px inline padding.

That is the whole component set the source justifies. If a surface needs
something else, compose from these rather than inventing a new shadow or radius.

## Layout rhythm

Content sits in a **1200px** container on a **1280px** page. Sections alternate
white and `#F4F4F4`; the bento band is the `#F4F4F4` one. Section heights in the
source run 975 / 1051 / 1067 / 1619px — generous, not compressed. Small cards
are 484px tall.

## What this system refuses

Reproduce its restraint. The source has no gradient text, no glowing orbs, no
glassmorphism over content, no dark mode, no icon library, no eyebrow pill above
headings, and no accent border rails. Three-equal-card grids appear only inside
a bento band that already varies tile size, never as the page's main composition.

## Where it belongs in this repo

Everywhere. The companion, the learning module, the simulation runner and the
emergency page all use these tokens, because the team decided on 2026-11-04 that
every surface ships light. Marketing/template pages are no longer a special
case — they simply are the same ground.

The thing that must survive the change is *legibility*, not the palette's
provenance: the risk meter and small status text use the measured deep values
(`--appnext-danger #dc2626`, `--appnext-warn-deep #b45309`,
`--appnext-accent-deep #0e7c36`), never the pale brand green on white.