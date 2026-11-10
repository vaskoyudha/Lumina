# Report template screenshots

Captured 2026-11-10 for `docs/report-template.md`.

Provenance:

a. App: `codex/report-template` worktree, production build served with
   `npm run build && npm start -- -p 3200`.
b. Browser: headless Chromium (Playwright 1.64), viewport `1440×1000` and
   `380×2400`, device scale 1.
c. Scenario: phishing message ("Halo, ini dari BCA…"), report card opened,
   fields filled (Sari / 081234567890 / Rp1.500.000 / kronologi), IASC OJK
   selected for the call action.
d. Assertions during capture: `a[href="tel:157"]` exists;
   `document.documentElement.scrollWidth === window.innerWidth` at 380px.

| File | Size | Shows |
|---|---|---|
| `01-verdict.png` | 1440×1000 | verdict, "Kalau sudah terlanjur", Komdigi + IASC |
| `02-template-desktop.png` | 1440×1000 | expanded builder on the Komdigi channel |
| `03-template-380.png` | 380×900 | 380px explanation context |
| `04-report-card-desktop.png` | element | full report card, IASC: Salin · Rapikan · Telepon 157 · WhatsApp · Email · Formulir |
| `05-report-card-380.png` | element | full report card at 380px |
| `06-page-380.png` | 380×2400 | page context at 380px |

To recapture, rerun the same scenario at the two viewports and overwrite these
files; do not retouch them by hand. The local review copies in
`.opencode/shots/report-template/` are git-ignored; this directory is the
committed record.
