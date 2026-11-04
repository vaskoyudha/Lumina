---
name: appnext-design
description: Use when building or restyling a light-first marketing surface in this repo — a landing page, pricing section, feature band, or app showcase that should read like the AppNext SaaS/Framer template. Carries the measured palette, type scale, shape and elevation of https://appnext.framer.website/, scoped so it never touches Lumina's dark tokens.
---

# AppNext design system

Full provenance and every measured value: `docs/design-system/appnext.md`.
Tokens: `src/styles/appnext-tokens.css`.

Extracted 2026-11-04 from the live DOM by reading computed styles — not from
screenshots, not from raw HTML. The numbers are measurements, so treat them as
facts rather than starting points to improve.

## Scope rule, first

AppNext is **light-first**. Lumina is **dark by requirement** (the risk meter
has to read from the back of a room). Never merge the two token namespaces.

```tsx
// correct — isolated subtree
<div className="appnext">
  <div className="appnext-container">…</div>
</div>
```

Do not overwrite `--lumina-*`, do not add these to `@theme` in
`src/app/globals.css`, and do not apply `.appnext` to `body`. A page that needs
this style opts in explicitly.

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

- `.appnext-button` + `--primary` (`#121212` fill) or `--secondary` (white fill,
  ambient shadow). 56px tall, 24px padding, 12px label, pill.
- `.appnext-card` — white, 24px, ambient shadow.
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

Not on Lumina's product surfaces. If this style is used, it is for a marketing
or template page — a separate route, opt-in via `className="appnext"`. The
companion, the learning module, the simulation runner and the emergency page
keep the dark tokens, because those are used under pressure and in poor light.