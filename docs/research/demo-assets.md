# Demo content per agent — sources and ready samples

One demo per mascot in the Agents overview. The first choice is always the
repo's own fixtures: they are already tuned to the deterministic engine, so a
screenshot shows a real finding instead of a staged one. External sources are
listed only where we need more volume or a different medium (screenshots,
multi-turn transcripts).

| Mascot | Agent | What the demo shows | Repo source |
|---|---|---|---|
| Bunny | `message` (Mochi) | urgency + authority + APK/OTP request in one message | `src/data/modul-10.ts:42-59`, `src/lib/scoring/score.test.ts:60-62` |
| Bear | `link` (Bubu) | shortened URL and brand-impersonating path | `src/lib/scoring/score.test.ts:60-62, 152-155` |
| Chick | `identity` (Piyo) | unknown sender claiming to be a bank officer | `src/lib/scoring/score.test.ts:159-161` |
| Dragon | `conversation` (Naga) | escalation across turns (benign → task pay → top-up) | `src/data/modus.json` modus 4, `src/lib/scoring/score.test.ts:108-110` |
| Panda | `evidence` (Bao) | timeline, quotes, and narrative from a finished run | `src/data/report-sample.ts:44-68` |

## 1. Mochi — message tone

Verbatim from `src/data/modul-10.ts` (the anonymised parcel sample):

```text
[WhatsApp] Nomor tak dikenal · baru saja
Selamat siang Bapak/Ibu, kami dari ekspedisi. Paket Anda tertahan,
silakan cek resi di aplikasi ini: Bukti-Pengiriman.apk (18 MB).
Instal untuk melihat foto paket Anda. Terima kasih.
```

Why it works: the engine fires APK, urgency, and authority signals on the same
paragraph. `score.test.ts` carries two shorter variants (`:81-83`, `:99-104`)
that isolate the APK signal for a before/after pair.

## 2. Bubu — link

Verbatim from `src/lib/scoring/score.test.ts:60-62`:

```text
Akun Anda akan diblokir dalam 2 jam. Verifikasi OTP sekarang di
bit.ly/verifikasi-wa
```

Second sample for a different link family (`:152-155`):

```text
Paket Anda tertahan di gudang kurir, nomor pelacakan tidak valid.
Konfirmasi alamat lewat bit.ly/kurircek untuk pembukaan kembali pengiriman.
```

Pair with `src/data/official-domains.json` when the demo needs to show a
"domain mirip merek" verdict.

## 3. Piyo — identity

Verbatim from `src/lib/scoring/score.test.ts:159-161`:

```text
Halo, saya petugas BNI. Ada transaksi anomali Rp1.900.000 di kartu ATM
Anda. Untuk pembatalannya saya perlu kode OTP yang masuk di HP Anda
sekarang.
```

The sender line matters as much as the text: show it as "Nomor tak dikenal"
with no institution badge, which is the gap the agent is designed to report.

## 4. Naga — conversation

A three-turn escalation composed from modus 4 in `src/data/modus.json`
("Lowongan kerja & tugas berbayar"). Mark this one as authored for the demo,
not scraped:

```text
T1 (pengirim): Kak, ada lowongan tugas online. Cuma like video,
               komisi Rp15.000 per tugas.
T2 (pengirim): Tiga tugas pertama sudah cair ya. Untuk tugas besar,
               kakak top up saldo Rp500.000 dulu.
T3 (pengirim): Kalau tidak top up sekarang, akun kakak diblokir dan
               komisi hangus.
```

`score.test.ts:108-110` is the single-turn version of the same pattern and can
be pasted as the "before escalation" shot.

## 5. Bao — evidence

Use `src/data/report-sample.ts` directly. The timeline is already written:

```text
2026-11-05 20:02 — Pelapor menerima file APK undangan pernikahan dari nomor tak dikenal.
2026-11-05 20:10 — Pelaku meminta kode OTP yang masuk lewat SMS.
2026-11-05 20:18 — Pelaku meminta transfer biaya administrasi ke rekening pribadi.
2026-11-05 20:31 — Pelapor menyadari permintaan itu penipuan dan menghubungi bank.
```

The matching narrative and the `/darurat` PDF export make this the one agent
that can be demonstrated as a document instead of a chat bubble.

## External sources, with licences

| Source | Format | Licence | Use for |
|---|---|---|---|
| [bopbi/indonesia-sms-spam-dataset](https://github.com/bopbi/indonesia-sms-spam-dataset) | raw SMS text, folders `evil-service`, `loan`, `prize`, `premium-sms`, `non-provider-promo` | **CC0-1.0** | volume for Mochi and Naga; safe to republish |
| [Kaggle — Indonesian + English SMS Spam/Ham](https://www.kaggle.com/datasets/crystalbaby/indonesian-english-sms-spamham-dataset) | CSV, 6,311 rows | **Apache-2.0** | balanced set for Mochi; needs Kaggle login |
| [ksnugroho/klasifikasi-spam-sms](https://github.com/ksnugroho/klasifikasi-spam-sms) | CSV, 1,143 rows (`normal` / `fraud` / `promo`) | **no licence declared** | reference only — do not commit the file |
| [OpenPhish](https://openphish.com/) / [URLhaus](https://urlhaus.abuse.ch/) | live URL feeds | free feeds; check current upstream terms | Bubu, if a fresh phishing URL is needed |
| [Kled — smishing screenshots](https://huggingface.co/datasets/useKled/phishing-text-messages) | 50k+ real SMS screenshots | **paid commercial licence** | visual reference only; not redistributable |
| [Figma — Fake WhatsApp Conversation](https://www.figma.com/community/widget/1572731790669169674/fake-whatsapp-conversation) | Figma widget | Figma Community terms | rendering chat mockups as images |
| [Figma — WhatsApp UI Screens](https://www.figma.com/community/file/874576344344319149/whatsapp-ui-screens) | Figma file | Figma Community terms | full-phone mockup frames |
| [Openverse API](https://api.openverse.org/) | CC/CC0 images | per item | peripheral photography (phone in hand) |

## How to turn them into pictures

a. **Render from the app (preferred).** Paste the sample into `/companion`,
   screenshot at 390px and 1440px, and crop the agent panel. The finding is
   real and the typography matches the product.
b. **Figma chat mockup.** The Fake WhatsApp Conversation widget produces a
   believable receiver screen from the transcripts above; export PNG at 2x.
c. **Stock photography** only as a background layer: Openverse or Unsplash,
   recorded in `public/images/ATTRIBUTION.md` following the existing pattern.

## Licence rules for this repo

a. Only CC0-1.0 and Apache-2.0 text may be committed under `src/data/`.
b. A dataset with no declared licence (ksnugroho) is never copied into the
   repo; reference it in a doc instead.
c. Attribution goes in the directory's `ATTRIBUTION.md`; Unsplash and CC0 do
   not require it, but the file already records every asset.
d. Keep demo text anonymised: no real phone numbers, account numbers, or names
   from third-party datasets.
