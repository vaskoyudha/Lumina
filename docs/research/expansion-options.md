# Expansion options — research synthesis (8 Nov 2026)

Four parallel research passes: job scams, marketplace scams, QRIS/quishing, and the
Indonesian anti-scam landscape. The short conclusion: the five detectors are not
the gap. The gap is **context objects** (a job ad, a seller, a QR) and
**explainability**, not another agent.

## What the research says

a. **Fake jobs are the loudest local wave.** SEEK/Jobstreet reports Indonesia is
   APAC's largest job-scam market — 62% of regional job scams and 38% of all
   regional scam attempts. Kemnaker's own red flags: implausible salary, free-mail
   recruiter, fee for administration/training/uniform, chat-only interview.
   [detik](https://finance.detik.com/berita-ekonomi-bisnis/d-8219789/ini-modus-penipuan-lowongan-yang-jerat-banyak-pencari-kerja-ri) ·
   [Kemnaker](https://kemnaker.go.id/news/detail/kemnaker-minta-masyarakat-selektif-terhadap-informasi-lowongan-pekerjaan) ·
   [Komdigi: 7,908 fake overseas ads removed Jan–Aug 2026](https://portal.komdigi.go.id/kanal-publik/berita-kini/10526)

b. **QRIS fraud is physical and cheap.** Sticker swaps at warungs and fake
   donation QRs; the Istiqlal case used a *genuinely issued* QRIS, so a valid CRC
   proves formatting, not legitimacy.
   [Katadata](https://katadata.co.id/digital/fintech/68efdcb9e8f66/viral-pedagang-di-bandung-jadi-korban-penipuan-qris-palsu-ini-ciri-cirinya) ·
   [BBC Indonesia](https://www.bbc.com/indonesia/articles/clw15qp47x5o) ·
   [ANTARA: QR bayar vs QR transfer](https://www.antaranews.com/berita/4925241/hati-hati-penipuan-qris-kenali-perbedaan-qr-bayar-dan-qr-transfer)

c. **Local competitors are verdict-first.** cekrekening.id, Kredibel, IC4,
   Truecaller, Whoscall all return a label ("reported", "risk level", "unsafe")
   with little or no reasoning. Nobody local shows per-signal reasons plus a
   "this would look safer if…" line. That is Lumina's white space, and the
   explainability literature backs it.
   [cekrekening.id](https://cekrekening.id/) · [kredibel.com](https://www.kredibel.com/) ·
   [IC4 launch](https://www.cnnindonesia.com/teknologi/20250226153536-192-1202710/aplikasi-baru-bisa-cegah-penipuan-siber-cek-phishing-hingga-apk) ·
   [WISP 2025 XAI nudges](https://aisel.aisnet.org/cgi/viewcontent.cgi?article=1004&context=wisp2025)

d. **Distribution is WhatsApp-shaped.** 90.8% of adult Indonesian internet users
   use WhatsApp monthly; a PWA share target is the only intake improvement that
   is honestly reachable in 48 hours.
   [APJII via detik](https://inet.detik.com/telecommunication/d-8047759/survei-apjii-pengguna-internet-indonesia-2025-tembus-229-juta-jiwa) ·
   [Chrome share_target](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)

## Options, ranked for the 48-hour window

| # | Option | Why it is worth it | Effort | Reuse |
|---|---|---|---|---|
| 1 | **Cek Lowongan** | Matches the loudest 2026 local wave; demo writes itself | S | `scoreText` + `extraSignals`, modus 4 |
| 2 | **Explainability v2** (reason + counterfactual + next step) | Cheapest differentiator vs verdict-first competitors | S | `scoreWithTrace` |
| 3 | **Cek QRIS (paste payload)** | TLV + CRC-16 parse is ~100 LOC, no dependency, visually strong | S/M | new pure-TS parser, modus 11 |
| 4 | **PWA share target** | "Bagikan ke Lumina" from WhatsApp; real distribution | S | manifest + `/share` route |
| 5 | **IASC-ready evidence packet** | Turns the existing PDF into something fileable | S/M | `lib/darurat/pdf`, evidence bundle |
| 6 | **Cek Toko/Penjual** | Covers modus 1; more noisy signals than jobs | M | `scoreText`, modus 1 |
| 7 | **Guardian second opinion** | Privacy-safe share of verdict only | M | `wa.me` link, digest |
| 8 | **Platform reputation API** | Highest coverage, but needs a server and scraping | L | none |

## Concrete rule packs

### Cek Lowongan (S)

High precision, near-zero false positives:

- Fee demand: `biaya (administrasi|pendaftaran|pelatihan|seragam|tes kesehatan|akomodasi)`,
  `deposit|setoran|jaminan|top ?up|tambahan saldo` inside a money phrase.
- Pay-to-earn: `(like|subscribe|follow|rating|ulasan|komisi|misi|tugas harian)`
  co-occurring with `deposit|top ?up|saldo`.
- Personal payment rail: `DANA|OVO|GoPay|ShopeePay|LinkAja` or
  `transfer ke rekening pribadi/atas nama`.
- Early sensitive data: `KTP|selfie KTP|PIN|OTP|nomor rekening|kartu ATM`
  before an offer letter.
- Overseas placement + travel fee: `luar negeri|visa|tiket pesawat|paspor`
  with `biaya|ditanggung pelamar`.
- Brand impersonation: brand token + `wa.me|t.me|forms.gle|bit.ly|blogspot`
  or a domain absent from `official-domains.json`.

Noisy, weight lower: free-mail recruiter (`@gmail|yahoo|outlook|hotmail`),
shortener/forms URL, "langsung diterima / tanpa interview", salary for an
entry-level role above ~Rp10–15 juta, missing PT name/address.

Sources: [Kemnaker](https://kemnaker.go.id/news/detail/kemnaker-minta-masyarakat-selektif-terhadap-informasi-lowongan-pekerjaan) ·
[ANTARA Telegram task scam](https://www.antaranews.com/berita/5540731/diskominfo-waspada-penipuan-tawaran-kerja-lewat-grup-telegram) ·
[IC3 2024 employment fraud](https://www.ic3.gov/AnnualReport/Reports/2024_IC3Report.pdf)

### Cek QRIS (S/M)

Parse the pasted EMVCo payload, never a decoder dependency:

- TLV walk: `[2-digit tag][2-digit length][value]`; required `00, 52, 53, 58, 59, 60, 63`
  plus at least one `26–51` merchant template.
- CRC-16/CCITT (`poly 0x1021`, init `0xFFFF`) over everything up to `6304`.
- QRIS specifics: tag `51` GUI `ID.CO.QRIS.WWW`, NMID `ID\d{13}`.
- Payload containing `http://`, `https://`, `wa.me`, or any URI scheme → quishing,
  not a payment.
- `53 ≠ 360` or `58 ≠ ID` → cross-border/odd.
- Merchant name (tag 59) vs typed signboard name token overlap → possible
  sticker swap.
- Banner: a valid CRC only proves formatting; the merchant name is what the
  payer must match.

Sources: [EMVCo MPM v1.1](https://mvallim.github.io/emv-qrcode/docs/EMVCo-Merchant-Presented-QR-Specification-v1.1.pdf) ·
[BCA: official QRIS is not a URL](https://www.bca.co.id/id/informasi/awas-modus/2024/11/25/12/09/tips-aman-transaksi-qris) ·
[BI QRIS](https://www.bi.go.id/id/fungsi-utama/sistem-pembayaran/ritel/kanal-layanan/qris/default.aspx)

`BarcodeDetector` is optional only: Chrome Android yes, Safari off by default,
Firefox no. [caniuse](https://caniuse.com/mdn-api_barcodedetector)

### Cek Toko/Penjual (M)

Low-noise rules: payment off-platform, personal rekening, gift-card/crypto,
QRIS "refund" trap, domain typo-squat against the five marketplaces. Medium:
DP/pre-order, price under ~40% of category median, fake-resi language, urgency.
High-FP: new account, no badge, no address — show as weighted context, never a
verdict on its own.

Sources: [Tokopedia warning](https://www.tokopedia.com/help/article/waspada-terhadap-modus-penipuan-online) ·
[Shopee help](https://help.shopee.co.id/portal/4/article/72689) ·
[NCSC shopping guidance](https://www.ncsc.gov.uk/guidance/shopping-online-securely)

## The 48-hour shortlist

Build **one** of 1–3, plus **2** if there is a free afternoon, because
explainability lifts every surface already shipped.

1. **Cek Lowongan** — a preset entry in the companion, not a sixth agent. It
   seeds `scoreText` with the ad text and attaches field-derived signals via
   `extraSignals`. No contract change, no dependency, local-only.
2. **Explainability v2** — for every fired signal add one plain sentence and one
   counterfactual ("tidak ada permintaan biaya, dan domain pengirim cocok dengan
   perusahaan"). Research links show this improves both detection and trust.
3. **Cek QRIS** — only if someone has the appetite for a TLV parser; it is the
   most impressive demo per line of code, but also the most new logic.

Do **not** build now: WhatsApp bot (Business API + server + per-message cost),
browser extension (store review), platform reputation API (scraping + privacy
tension), live-call analysis.

## Honesty notes

- No Indonesian job-scam text corpus was found; the only open datasets are
  English (EMSCAD, CC0). Rules, not a trained model, are the right call.
- `kredibel` account screening is commercial/API-only; `cekrekening.id` has no
  documented bulk API. A static curated list plus manual deep links is the
  honest offline substitute.
- QRIS tag-51 sub-field positions are community-verified, not in the EMVCo
  spec — treat NMID extraction as best-effort and say so in the UI.
- Distribution claims from vendor blogs are marked as such in the source list.
