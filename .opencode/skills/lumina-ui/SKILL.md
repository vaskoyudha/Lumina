---
name: lumina-ui
description: Use for ANY visual change in this repo — building a page, section, card, form, meter, or chat surface, or restyling an existing one. Enforces the frozen token palette, shadcn/ui-only composition, and the demo-readability bar (red meter legible from the back of the room).
---

# Lumina UI

This is the project's visual contract. It exists because four people ship in
six days and an inconsistent surface reads as "unfinished" to the judge before
any code is read.

## Use shadcn/ui components, never hand-rolled markup

`src/components/ui/` already holds the primitives. Reach for them first, and
compose. Hand-writing a styled `div` when a component exists is the single
biggest source of drift here.

| Need | Component |
|---|---|
| action | `Button` (`variant`, `size`) |
| grouping | `Card` + `CardHeader/CardTitle/CardDescription/CardContent/CardFooter` |
| status tag | `Badge` (`variant="secondary"` / `"outline"`) |
| feedback / warning | `Alert` (+ `AlertTitle`, `AlertDescription`) |
| form layout | `FieldGroup` + `Field` + `FieldLabel` + `FieldDescription` |
| long text input | `Textarea`, `Input` |
| divider | `Separator` |
| empty state | `Empty` (+ `EmptyTitle`, `EmptyDescription`) |
| loading | `Skeleton`, `Progress` |

To add a missing primitive: `npx shadcn@latest add <name>`. Then **read the
added file** and fix what the registry gets wrong (see `shadcn-ui` skill).

**Linking with a Button uses `asChild`**, because this project is on the Radix
base, not Base UI:

```tsx
<Button asChild variant="outline">
  <Link href="/darurat">Buka mode darurat</Link>
</Button>
```

`render={<Link/>}` type-checks against Base UI and fails here.

## Colour: tokens only

The palette lives in `src/app/globals.css` as `--lumina-*` and is exposed as
Tailwind utilities. Use those names. A raw hex, `bg-red-500`, or `text-emerald-600`
is a defect: it breaks the risk bands and fails review.

| Token utility | Meaning |
|---|---|
| `bg-bg` | page background |
| `bg-panel` | card / raised surface |
| `bg-panel-2` | nested surface, hover, input fill |
| `border-line` | the only border colour |
| `text-txt` | primary text |
| `text-dim` | secondary text |
| `text-safe` / `bg-safe` | safe, correct, primary positive action |
| `text-warn` / `bg-warn` | suspicious |
| `text-danger` / `bg-danger` | danger, emergency |

`--accent` is shadcn's neutral hover surface, **not** the green. The green is
`--lumina-safe`. Keep that distinction; renaming it breaks every component's
hover state.

Risk colour comes from the band, never from the raw number:

```tsx
import { RISK_TOKEN } from "@/lib/contracts/score";
const token = RISK_TOKEN[result.risk]; // "safe" | "warn" | "danger"
```

## The bar this has to clear

The demo is read from across a room, sometimes projected, sometimes on a phone
held by one hand. So:

a. The score meter and any panic/intrusion meter must be legible at a distance —
   height, contrast, and a colour that survives projector washout.
b. Numerals that change use `.tabular` (tabular figures) so digits do not jitter.
c. Body text stays at `16px` or larger on phones. The emergency page is used
   one-handed, at night, by someone frightened.
d. Emergency surfaces carry no gamification: no score, no badge, no "selamat!".
   Numbered steps only.

## Interaction floor

- Every pressable element gets `data-pressable` and the global press feedback
  already defined in `globals.css` (`scale(0.97)` on `:active`).
- Specify transitions by property: `transition-[width]`, `transition-[transform,opacity]`.
  `transition-all` is banned and `biome`/review will reject it.
- Interactive transitions stay at or under `250ms`, `ease-out`. Never `ease-in`.
- Motion respects `prefers-reduced-motion`; the global stylesheet handles this —
  do not add animations that bypass it.
- Every icon-only control needs an accessible name.

## Layout

- Left-align by default. Centred stacks are reserved for nothing here.
- `gap-*` on flex/grid, never `space-x-*` or `space-y-*`.
- `size-*` when width equals height.
- Body measure stays inside `max-w-prose` or `~65-75ch`.
- The shell must work at **380px**. Test the narrow width before claiming a page
  is done: nav wraps, tables become rows, nothing scrolls horizontally.

## What this skill refuses

No purple/indigo gradients, no glowing orbs, no glassmorphism over content, no
eyebrow pill above a heading, no three-identical-card feature grid as the main
composition, no giant filler metrics ("99% accurate"), no accent border rails as
decoration, no icon-in-a-rounded-square toppers.

Real numbers are welcome when they are sourced: IASC complaint counts, loss
estimates, measured latency. Invented ones are not.