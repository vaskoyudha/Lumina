---
name: shadcn-ui
description: Use when adding, updating, or debugging a component from shadcn/ui in this repo — running the CLI, resolving a missing primitive, checking composition rules, or fixing what the registry generated.
---

# shadcn/ui in this repo

Installed configuration, from `components.json`:

| Field | Value |
|---|---|
| style | `radix-nova` |
| base | `radix` (so `asChild`, **not** `render`) |
| icon library | `lucide-react` |
| aliases | `@/components`, `@/components/ui`, `@/lib/utils`, `@/hooks` |
| CSS file | `src/app/globals.css` |
| Tailwind | v4 (`@theme inline`, no `tailwind.config.js`) |
| RSC | yes — anything with state, effects, or handlers needs `"use client"` |

## Adding a component

```bash
npx shadcn@latest add <name> --yes
```

Then do all three, every time:

1. **Read the file** it generated.
2. **Fix the import of `cn`.** The registry writes `import { cn } from "cn"`
   (an npm package) rather than the project's `@/lib/utils`. Both work today,
   but the project alias is the one to keep for consistency. If you touch a file,
   prefer `@/lib/utils`.
3. **Check `transition-all`.** The registry emits it in `button`, `badge`, and
   `progress`. Replace with explicit properties:
   `transition-[transform,background-color,border-color,color,opacity]`.

Then run `npx tsc --noEmit` and `npx jest` — adding a primitive has broken the
type check before (a Base-UI API leaking into a Radix project).

## Composition rules that actually bite

```tsx
// Items live inside their Group.
<SelectItem> inside <SelectGroup>

// Dialog / Sheet / Drawer need a Title, always.
<DialogTitle className="sr-only">…</DialogTitle>

// Button has no loading prop. Compose it.
<Button disabled><Spinner data-icon="inline-start" /> Menyimpan…</Button>

// Icons inside components carry no sizing class.
<Button><SearchIcon data-icon="inline-start" />Cari</Button>
```

`TabsTrigger` must be inside `TabsList`. `Avatar` always needs `AvatarFallback`.
Overlay components manage their own `z-index`; do not add one.

## Which registry

Ask before assuming. `@shadcn` is the default registry here, but community
registries (`@magicui`, `@tailwind`, `@bundui`, owner/repo) are also valid — and
third-party registries hardcode `@/components/ui/...` paths that may need
rewriting to this project's aliases. Never pick a registry on the user's behalf
when they named none.

## Updating without losing local edits

```bash
npx shadcn@latest add <name> --dry-run     # what would change
npx shadcn@latest add <name> --diff <file> # what changed versus local
```

Read the diff per file. No local changes → overwrite. Local changes → merge by
hand, preserving the local edit.

## Checking what exists

`npx shadcn@latest info --json` returns the resolved project config and the
installed component list. Read it before `add` so you do not reinstall or import
something that is not there.

Installed today: `alert badge button card empty field input label progress
separator skeleton textarea`.