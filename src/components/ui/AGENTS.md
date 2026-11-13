# src/components/ui — shadcn/radix registry primitives

## OVERVIEW
The shadcn registry (base **radix**, style `radix-nova`, `rsc: true`). Every file is imported individually as `@/components/ui/<kebab-name>`; there is no barrel. Treat this as generated code, not hand-authored UI.

## STRUCTURE
- Registry primitives: `button`, `card`, `dialog`, `dropdown-menu`, `field`, `tabs`, `sheet`, `checkbox`, `input`, `label`, `textarea`, `progress`, `separator`, `skeleton`, `alert`, `avatar`, `badge`, `collapsible`, `accordion`, `empty`, `sonner`.
- `glass-folder.tsx` — custom canvas/fBm component with **zero importers**; not a registry primitive.
- `field.tsx` carries generated `biome-ignore-all` headers.

## WHERE TO LOOK
| Task | File | Notes |
|---|---|---|
| Add a primitive | `components.json` | Use `npx shadcn@latest add`; aliases under `@/components/ui` |
| Variant styling | `button.tsx:66`, `badge.tsx:48` | `cva` variants + `data-slot` |
| Form layout | `field.tsx` | `Field`, `FieldGroup`, `FieldLabel`, `FieldError` |
| Toaster | `sonner.tsx:45` | Mounted by the root layout |

## CONVENTIONS (different from root)
- All primitives use the unified `radix-ui` package; base is **radix**, so composition is `asChild`, **not** `render`.
- `cn` resolves to the installed `cn` package (via `src/lib/utils.ts`); newer files import `{ cn } from "cn"` directly. Both are acceptable in registry output.
- Styling flows through `data-slot` attributes and `cva`; do not add bespoke wrappers.
- Biome relaxes `a11y.useSemanticElements`, `suspicious.noDoubleEquals`, `noArrayIndexKey` only for this directory.

## ANTI-PATTERNS (THIS DIRECTORY)
- Do not hand-edit primitives except genuine registry fixes; regenerate instead.
- Do not add dependencies on `glass-folder.tsx`; it is dead weight.
- Do not remove the generated `biome-ignore-all` headers in `field.tsx` — that reintroduces lint noise.
- Do not switch composition to `render` (that is base-ui, not radix).
- Do not hardcode hex colors; registry primitives use semantic token classes.
