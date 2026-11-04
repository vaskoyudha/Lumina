# AppNext — extracted design system

Source: <https://appnext.framer.website/> · "AppNext — SaaS Framer Template for
AI, Business & Mobile Apps" · Framer 13ebf9e, published 25 Oct 2026.

Extracted **2026-11-04** from the live DOM by reading computed styles in a
browser, not from screenshots and not from the raw HTML (which is truncated and
carries no resolved values). Every number below is a measured value.

## Provenance

| What | How |
|---|---|
| Colours | `getComputedStyle` over every element with a client rect; counted by frequency |
| Type scale | same sweep, only leaf text nodes under 120 characters |
| Radii / shadows | distinct computed values across the document |
| Layout | distinct element widths in the 600–1800px band |
| Components | computed style of every visible `<a>` with a background |

Document height 16,621px at default viewport. Single `<h1>`.

Ignore two values that look like tokens but are browser defaults: the root
`font-family: "Times New Roman"` and `color: rgb(0, 0, 238)` on buttons — the
button label colour is set on child spans, and `rgb(0,0,238)` is the UA link
colour.

## Palette

| Token | Value | Use |
|---|---|---|
`ink` | `#000000` | headings, high-emphasis text |
`ink-2` | `#121212` | dark surfaces, primary button fill, hero overlay |
`muted` | `#606060` | body text, secondary copy (3,214 uses — the workhorse) |
`surface` | `#F4F4F4` | alternating section band (Bento features) |
`line` | `#EEEEEE` | borders, dividers |
`white` | `#FFFFFF` | page ground, cards |
`accent` | `#1BAB49` | the only saturated brand green |
`tint` | `#EBF9FF` | pale blue wash |
`blue` | `#40C6FF` | light blue accent |
`blue-deep` | `#044680` | deep blue accent |

Alpha steps used in the original: `ink-2` at 0.05 / 0.10 / 0.14 / 0.20 / 0.30 /
0.40, and `white` at 0.05 / 0.20 / 0.40 / 0.80. They are used for scrims,
disabled states, and glass on the hero, not as standalone colours.

The scheme is **light-first**. There is no dark mode in the source.

## Typography

Families, in order of use:

| Family | Role | Uses |
|---|---|---|
Stack Sans Headline | everything: headings and body | 2,706 |
Switzer | occasional accent | 2 |
Inter | loaded as fallback | — |

Body is set **light, not regular** — that is the system's signature:

| Token | Size / line-height / weight / tracking |
|---|---|
`display` | 120 / 132 / 400 / −3.6px |
`hero` | 72 / 72 / 300 / −0.8px |
`h1` | 42 / 46.2 / 500 / −0.42px |
`h2` | 34 / 40.8 / 500 / normal |
`h3` | 28 / 36.4 / 400 / normal |
`h3-tight` | 28 / 42 / 400 / −0.84px |
`lead` | 20 / 28 / 400 / −0.3px |
`body-lg` | 18 / 28.8 / 300 / +0.18px |
`body` | 16 / 24 / 300 / +0.16px |
`caption` | 14 / 21 / 400 / +0.14px |

The pattern is deliberate and easy to get wrong:

a. **Headings track negative, body tracks positive.** Display sizes pull in
   (`−3.6px` at 120px), while 14–18px body copy opens up slightly
   (`+0.14`–`+0.18px`).
b. **Weight inverts with size.** Big type is light (300–400); small type is
   regular-to-medium. Reading weight as "bigger = bolder" will look wrong here.
c. Line-height tightens as size grows: 1.1 at display, 1.3 at h2, 1.5 at body.

## Shape

| Token | Value | Use |
|---|---|---|
`pill` | 100px | every button |
`card` | 24px | feature cards, bento tiles |
`md` | 16px | panels |
`sm` | 12px | inputs |
`xs` | 8px, 6px, 4px, 2px | chips, small controls |
`phone` | 42px 42px 40px 40px | device screens |

Pills are for **actions**, not for status tags. Card radius is 24px, and the
phone-frame radius is asymmetric on purpose.

## Elevation

Three recipes, used instead of a single shadow scale:

```css
/* ambient — cards at rest */
box-shadow:
  0.06px 0.72px 0.73px -1.25px rgb(18 18 18 / 0.14),
  0.23px 2.75px 2.76px -2.5px rgb(18 18 18 / 0.13),
  1px 12px 12.04px -3.75px rgb(18 18 18 / 0.05);

/* soft drop — floating panels */
box-shadow:
  0 0.6px 1.57px -1.5px rgb(0 0 0 / 0.17),
  0 2.29px 5.95px -3px rgb(0 0 0 / 0.14),
  0 10px 26px -4.5px rgb(0 0 0 / 0.02);

/* ring — selected / focus */
box-shadow: 0 0 0 1px #000 inset;
```

Plus two one-offs: a blue glow `rgb(168 209 255 / 0.5) 0 0 20px` and a heavy
`rgb(0 0 0 / 0.1) 0 40px 40px`. Do not generalise those two.

## Layout

| Value | Meaning |
|---|---|
1200px | content max width (34 occurrences — this is the container) |
1280px | page/viewport width |

Section rhythm from the DOM: hero 975px, ticker band 150px, "Designed for"
1051px, "Features 01" 1067px, Logos 260px, "Bento features" 1619px. Alternating
white → `#F4F4F4` grounds the bento band; everything else sits on white.

## Components

**Button** — pill, 56px tall, 24px horizontal padding, 12px label.

| Variant | Fill | Text |
|---|---|---|
primary | `#121212` | `#FFFFFF` |
secondary | `#FFFFFF` | `#121212` |

The nav "Contact us" button is the same shape at 46px tall.

**Card** — white, 24px radius, ambient shadow, no border. Small cards run
484px tall; the bento band's container is 1299px wide inside a 1619px section.

**Device screens** — 629px tall, 42/42/40/40 radius, `object-fit: cover`.

## What this system does *not* contain

So nobody ports an invention:

a. No gradient text, no glowing orbs, no glassmorphism over content.
b. No dark mode.
c. No icon set of its own — icons are illustrative PNGs, not a library.
d. No accent border rails, no eyebrow pills, no three-equal-card grid as the
   page's main composition.

## Using it here

Tokens are available as a scoped stylesheet: `src/styles/appnext-tokens.css`,
applied with `className="appnext"` on a subtree. They are **not** merged into
Lumina's `--lumina-*` palette: Lumina is dark by requirement (the risk meter
must read from the back of the room), AppNext is light-first. Mixing them in one
token namespace would break both.

For building pages in this style, load the `appnext-design` skill.