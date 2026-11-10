# Landing render check — 2026-11-10

Viewport captures of `/` taken from `npm run dev` at `http://localhost:3000` while
the landing truth-alignment work was in the working tree.

- Desktop: **1440 × 1000** CSS px, 1× DPR.
- Mobile: **380 × 900** CSS px, 2× DPR, touch emulation.
- Theme: default cream (`--ls-*`), light color scheme.
- Captures are viewport shots, not full-page; Next.js dev overlays were removed
  before each capture.

## What this pass verifies

a. Copy matches the shipped product: eight detector agents, 29/29 scam messages
   caught, 25/29 scored high immediately, 0/28 legitimate messages flagged
   (corpus of 57); twelve written learning modules; Simulation Level 1
   (APK kurir) playable; reporting/PDF replaced by `/komunitas`.
b. Navigation points at real routes: `/belajar`, `/simulasi`, `/komunitas`,
   `/companion`.
c. No horizontal overflow: document `scrollWidth` is 1430 at a 1440 viewport and
   380 at a 380 viewport.
d. The transformation section uses a viewport-neutral instruction, and the FAQ
   band is mounted so `#section-faq` resolves.
e. Footer email addresses wrap at 380 instead of being clipped by the panel.

## Files

| File | Viewport | Section | Shows |
|---|---|---|---|
| `desktop-01-hero.png` | 1440 | Hero | Nav routes, community chip, headline, primary CTA, live companion preview |
| `desktop-02-transformation.png` | 1440 | `#section-transformation` | Condition chips, outcome chips, and the “Kenali modusnya” CTA |
| `desktop-03-footer.png` | 1440 | Footer | Link columns, newsletter form, footer wordmark |
| `mobile-01-hero.png` | 380 | Hero | Compact header, full headline wrap, CTA pair, preview panel |
| `mobile-02-features.png` | 380 | Features | Section intro and live “Tanya” preview with carousel controls |
| `mobile-03-gallery.png` | 380 | Benefits | “Apa yang kamu dapat” intro and live verification preview |
| `mobile-04-transformation.png` | 380 | `#section-transformation` | Stacked condition chips and the mobile instruction |
| `mobile-05-numbers.png` | 380 | Measured numbers | 25/29 high-score card on the narrow layout |
| `mobile-06-pricing.png` | 380 | `#section-pricing` | Free plan card, feature list, price block |
| `mobile-07-faq.png` | 380 | `#section-faq` | Category tabs and expanded “Apa itu Lumina?” answer |
| `mobile-08-contact.png` | 380 | `#section-contact` | Contact band with copyable emails, plus form intro |
| `mobile-09-footer.png` | 380 | Footer | Two-column footer at 380 with wrapped email addresses |

## Regenerating

1. Start the dev server and open `/` in a Chromium session.
2. Set the viewport (`1440x1000` or emulated `380x900x2,mobile,touch`).
3. Scroll to the section: `#section-transformation`, `#section-pricing`,
   `#section-faq`, `#section-contact`, or the document end for the footer. The
   Powder sections have no ids; use the section heading position.
4. Remove the dev overlay (`nextjs-portal`) before capturing.
5. Save a viewport screenshot to this directory.

These images document behaviour and copy at one point in time; they are not a
golden-image baseline.
