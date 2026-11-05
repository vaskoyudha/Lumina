# Lumina — Rencana Produk dan Pembagian Kerja

Empat orang. Enam hari kerja. Satu produk yang bisa dipakai juri dalam lima
menit. Submission **10 November 2026**.

Dokumen ini sumber kebenaran produk. `AGENTS.md` memuat aturan teknis yang
mengikat. Kalau keduanya bertentangan, dokumen ini yang menang dan `AGENTS.md`
yang diperbaiki.

---

## 1. Bentuk produk

Empat permukaan, satu loop. Companion adalah pintu masuk, bukan tab keempat.

```
   masuk lewat sini
        │
        ▼
  COMPANION (AI Agent)  ── "ini penipuan bukan?"
        │                 bicara, bukan formulir
        │ memanggil agent deteksi sebagai tool
        ▼
  Skor + alasan + modul terkait
        │
        ├──────────────► BELAJAR   modul menjelaskan polanya
        ├──────────────► SIMULASI  menguji di bawah tekanan
        └──────────────► DARURAT   untuk yang sedang kena sekarang
```

**Alurnya:** companion mengenali → modul menjelaskan polanya → simulasi menguji
di bawah tekanan. Mode darurat adalah pintu keluar untuk orang yang benar-benar
sedang kena sekarang.

| Stream | Pemilik | Memegang | Perjalanan pengguna yang selesai |
|---|---|---|---|
| **A · Companion** | A | Asisten percakapan + agent deteksi di baliknya | "Saya cerita ke asisten dan paham ini penipuan" |
| **B · Belajar** | B | Modul, kuis, jalur adaptif | "Saya selesai modul dan membuktikan saya paham" |
| **C · Simulasi** | C | FIRST90: runner, deck tools, meter | "Saya selamat dari roleplay krisis" |
| **D · Darurat + Shell** | D | Mode darurat, PDF, nav, design tokens | "Teman saya kena sekarang dan saya punya checklist" |

---

## 2. Aturan yang menentukan segalanya

**Jangan membagi per frontend / backend.**

Pembagian itu membuat tiga orang menunggu satu orang, dan menghasilkan produk di
mana setiap fitur setengah jadi sampai hari terakhir.

**Bagi per fitur vertikal.** Setiap stream memiliki potongannya dari model data,
lewat API, sampai piksel. Bisa dikirim sendiri. Kalau dua stream lain tertinggal,
demo tetap jalan.

---

## 3. Companion — spesifikasi

Companion adalah **orkestrator**, bukan penilai. Ia tidak pernah mengarang skor.

```
pengguna bicara
      ▼
Companion (LLM: bahasa, empati, alur percakapan)
      │ memanggil tool
      ├──► Message Agent       urgensi palsu, otoritas, iming-iming, minta OTP
      ├──► Link Agent          domain mirip, tautan pendek, usia domain
      ├──► Identity Agent      nomor pengirim, SPF/DKIM/DMARC
      ├──► Conversation Agent  tanda bahaya menumpuk, tahap eskalasi
      ├──► Evidence Agent      susun EvidenceBundle
      └──► Scoring             gabungkan jadi 0-100
      ▼
jawaban dalam bahasa manusia + skor + alasan + modul terkait
```

### LLM adalah suara, bukan hakim

Agent deteksi deterministik memutuskan skor; LLM hanya menjelaskannya. Alasannya
bukan kemurnian — alasannya demo. LLM bisa bilang "sepertinya aman" untuk pesan
yang jelas meminta OTP, di depan juri. Deteksi deterministik tidak pernah.

Konsekuensi praktis:

a. Skor, `risk`, dan `signals` **selalu** dari `src/lib/scoring/score.ts`.
b. LLM boleh memilih kalimat, urutan penjelasan, dan nada.
c. Kalau LLM mati atau kena rate limit, companion jatuh ke mode template.
   **Demo tidak boleh bergantung pada API pihak ketiga yang hidup.**

### Perilaku companion

a. Selalu ada minimal satu alasan konkret dengan kutipan. "Ini berbahaya" bukan
   jawaban; "Ini minta kode OTP — bank tidak pernah memintanya" adalah jawaban.
b. Tidak pernah menyalahkan korban.
c. Eskalasi otomatis ke Darurat kalau uang sudah ditransfer, OTP sudah diberikan,
   atau korban sedang ditelepon pelaku.
d. Tidak menjawab di luar topik.
e. Bahasa Indonesia, campur boleh; balas dalam bahasa yang dipakai pengguna.
f. Tidak menyimpan. Tidak ada akun. Percakapan hilang saat tab ditutup.

### Antarmuka

Bukan halaman chat kosong. Tiga bagian:

- **Kiri:** percakapan, dengan **kartu hasil** muncul di dalam aliran.
- **Kanan:** panel bukti hidup — signal muncul satu per satu, dengan indikator
  agent mana yang sedang jalan. Panel inilah yang membuat produk terasa sistem
  agent, bukan chatbot.
- **Bawah:** tiga tombol konteks — "Pelajari pola ini", "Coba simulasi",
  "Ini sedang terjadi".

---

## 4. Kontrak — satu-satunya permukaan yang dibagi

Beku setelah disepakati. Mengubah satu berarti memberi tahu tiga orang lain
**sebelum** commit. Tipe hidup di `src/lib/contracts/`.

### `ScoreResult` — milik A, dipakai B

```ts
type Risk = "bersih" | "rendah" | "mencurigakan" | "tinggi";

interface Signal {
  label: string;     // "Domain baru berusia 12 hari"
  weight: number;    // 0..1
  evidence: string;  // kutipan dari input pengguna
  agent?: AgentId;   // untuk panel bukti
}

interface ScoreResult {
  score: number;                 // 0..100
  risk: Risk;                    // diturunkan dari score, jangan dihitung ulang
  signals: Signal[];             // minimal 1, urut bobot terbesar
  modus: string;                 // id dari modus.json
  advice: string[];              // 1..4 langkah, kalimat perintah
  relatedModule: number | null;  // 1..12
  hardOverride: boolean;         // indikator keras aktif?
}
```

| score | risk |
|---|---|
| 0–14 | bersih |
| 15–39 | rendah |
| 40–69 | mencurigakan |
| 70–100 | tinggi |

Aturan keras: permintaan OTP/PIN/password memaksa `risk: "tinggi"` apa pun
skornya.

### `EvidenceBundle` — milik A, dipakai D

```ts
interface EvidenceBundle {
  artifacts: { id; label; kind; value; capturedAt }[];
  timeline: { at: string; what: string }[];
  narrative: string; // 2-4 kalimat, siap masuk PDF
}
```

A menyediakannya; D memakainya untuk PDF. Kalau A belum siap, D meng-hardcode
satu contoh — **bentuk tipenya** yang penting.

### Skema skenario — milik C, dipakai penulis konten

```jsonc
{
  "scenario": { "id": "L1-kurir-apk", "level": 1, "title": "...", "difficulty": "mudah" },
  "hud": {
    "panic":     { "start": 35, "max": 100, "fail_at": 100, "fail_message": "..." },
    "intrusion": { "start": 0, "max": 100, "rate_per_second": 0.35, "fail_message": "..." },
    "timer_seconds": 420
  },
  "tools": [ { "id": "isolation", "name": "Device Isolation", "unlocked_at": "n04" } ],
  "nodes": [ /* message | choice | tool_task | ending */ ],
  "scoring": { "weights": {}, "grades": [] }
}
```

| type | wajib punya | perilaku |
|---|---|---|---|
| `message` | `speaker`, `text`, `next` | muncul setelah `delay_ms` |
| `choice` | `prompt`, `choices[]` | tombol; tiap choice punya `verdict`, `rationale`, `effects`, `next` |
| `tool_task` | `tool`, `ui`, `on_success` | panel interaktif di dek kanan |
| `ending` | `variant`, `title`, `text`, `debrief[]` | layar akhir |

Skenario gagal kalau: ada `next` menunjuk node tak ada · ada node tak tercapai
dari awal · ada `tool` dipakai tapi tak dideklarasikan · `grades` tidak urut
`min` menurun.

### `modus.json` — milik A, dibaca B

Satu sumber kebenaran untuk 12 modus (`src/data/modus.json`, divalidasi `zod`).
B tidak menulis ulang daftar ini. `scenarioId: null` berarti modul itu tidak
punya simulasi.

### Design tokens — milik D, dipakai semua

Lokasi: `src/app/globals.css`, namespace `--lumina-*`.

```css
--lumina-bg:#0b0f14; --lumina-panel:#121821; --lumina-panel-2:#182130;
--lumina-line:#243043; --lumina-txt:#e6edf6; --lumina-dim:#8b9bb0;
--lumina-safe:#37d6a0; --lumina-danger:#ff5d5d; --lumina-warn:#ffb340;
```

Warna merah meter harus terbaca dari belakang ruangan. **Update 5 November:**
pemilik produk memilih **light mode** untuk seluruh aplikasi; larangan itu
ternyata terpenuhi di terang juga — `#C81E1E` di atas putih = 5.7:1 dan meter
dibuat solid setebal 8px. Nilai token lama (gelap) tidak lagi dipakai; nama
token `--lumina-*` dipertahankan agar tidak ada komponen yang perlu ditulis
ulang.

**Catatan kontrak:** rencana menyebut token hijau sebagai `--accent`. shadcn/ui
sudah memakai `--accent` sebagai surface hover netral, jadi memakainya akan
membuat semua hover jadi hijau. Karena itu nilainya identik tetapi dinamai
`--lumina-safe` / `bg-safe`. Ini satu-satunya penyesuaian nama token yang
disepakati.

### Routing

| Path | Stream | Isi |
|---|---|---|
| `/` | D | Home: tiga pilar + tombol darurat |
| `/companion` | A | Percakapan + panel bukti |
| `/belajar` | B | Daftar modul |
| `/belajar/[modul]` | B | Satu modul + kuis |
| `/simulasi` | C | Daftar skenario |
| `/simulasi/[id]` | C | Runner |
| `/darurat` | D | Triage + PDF |

### Tiga handoff nyata

1. **A → B**: `ScoreResult.relatedModule` → `/belajar/{no}`
2. **B → C**: modul selesai → `unlocksScenario` → `/simulasi/{id}`
3. **A → D**: `EvidenceBundle` → PDF

Selain ini tidak ada ketergantungan. Kalau handoff tertunda, **hardcode nilainya**
dan tinggalkan `TODO(stream-X)`.

---

## 5. Brief per stream

### A · Companion

Urutan bangun:

1. `modus.json` — 12 entri dari tabel IASC. ✅ selesai.
2. `scoring.ts` + `message.ts` — satu agent jalan penuh. Input teks →
   `ScoreResult` valid. ✅ selesai, teruji di Node.
3. **Panel bukti kanan** dengan data hardcoded. ✅ kerangka jadi.
4. Lapisan percakapan: template-based dulu, lalu LLM kalau waktu cukup.
5. `link.ts` + daftar domain resmi. ✅ selesai.
6. `evidence.ts` → `EvidenceBundle` untuk D. Koordinasi hari ke-2.

Agent yang belum dikerjakan mengembalikan `signals: []` yang jujur. **Jangan
mengarang temuan.**

Cut kalau mepet: deteksi tautan → cut. LLM → cut, pakai template.

### B · Belajar

1. `progress.ts` — `{ completedModules, badges, missedPatterns }` di localStorage.
2. **Modul 10 (File APK WhatsApp)** duluan, bukan modul 1. Angka IASC paling
   tajam dan tersambung ke skenario yang ada.
3. `Quiz.tsx` — komponen yang menentukan apakah ini terasa kursus atau artikel.
4. `ModuleList` — 12 kartu, 11 berstatus "segera". ✅ jadi, digenerate dari
   `modus.json`.
5. Modul 1, 2, 7 kalau waktu tersisa.
6. `adaptive.ts` paling akhir; kalau tidak selesai, urutkan saja.

Struktur satu modul lengkap: anatomi (langkah 1..5) · contoh pesan Indonesia
dianonimkan dengan bagian berbahaya ditandai · checklist 5 tanda bahaya · kuis
3-5 soal dengan penjelasan tiap jawaban salah · langkah lapor berurutan.

Risiko: menulis konten itu lambat — satu modul bagus 2-3 jam. Kuis "apa itu
phishing?" tidak menguji apa pun; kuis yang baik menampilkan pesan dan bertanya
"apa yang kamu lakukan sekarang?".

### C · Simulasi FIRST90

Stream paling berisiko dan paling menentukan.

**Sumber aslinya belum ada di mesin ini.** Rencana menyebut
`/root/FIRST90/app/` (runner vanilla, 33 pemeriksaan lulus, tiga tool deck) dan
`design/scenario.level1.json`. Keduanya harus dipulihkan sebelum port dimulai;
kalau tidak, Level 1 dibangun dari skema kontrak di §4.

Urutan bangun:

1. Port runner: vanilla → state machine React. Level 1 bisa dimainkan sebelum
   menyentuh apa pun.
2. `validate.ts` — edge rusak menyebabkan layar kosong di tengah demo. Pasang di
   build.
3. Poles layar akhir. `debrief` empat kalimat itulah yang diingat juri.
4. Level 2 hanya kalau 1-3 benar-benar selesai.

Tiga hal yang membuat ini bukan visual novel: deck benar-benar melakukan sesuatu ·
meter bergerak saat pemain berpikir · jawaban salah mengajari (`rationale`
muncul seketika, tidak memblokir cerita).

Cut berurutan: Level 2-4 → timer → tool isolasi → grading.
**Jangan pernah cut:** debrief, rationale, layar akhir.

Risiko: setiap `setTimeout` butuh cleanup saat unmount, atau callback menembak
ke komponen mati dan scene berikutnya jalan dua kali.

### D · Darurat + Shell

Stream terluas dan paling tidak glamor. Kerjakan shell hari pertama, karena tiga
orang terblokir pada tampilan yang konsisten sampai token ada.

Hari pertama: `globals.css` tokens · `layout.tsx` + nav (4 tujuan, jalan di
380px) · `page.tsx`. ✅ selesai.

Lalu halaman darurat: `triage.ts` (3 modus tersering) ✅ · numbered checklist ✅ ·
`pdf.ts` (`@react-pdf/renderer`) · `ReportPreview`.

Mengapa mode darurat adalah fitur terpenting: tiga stream lain adalah latihan.
Ini satu-satunya yang berguna jam 11 malam ketika seseorang benar-benar sedang
ditipu. Juri bertanya "apa dampak nyatanya?" — jawabannya di halaman ini.

Yang membuatnya kredibel: tanpa gamifikasi · urutan bernomor · PDF yang bisa
dibawa ke bank (kronologi, nomor rekening pelaku, kolom tanda tangan) · tombol ke
kanal resmi, bukan form tiruan.

---

## 6. Rencana masing-masing

Wajib menjawab empat hal, ditulis sebelum menulis kode. Simpan di
`docs/plans/stream-<X>.md`.

1. **Versi terkecil yang jalan end to end** — jalur terpendek dari klik
   pengguna sampai melihat hasil.
2. **Yang dicut kalau waktu habis** — tulis hari pertama, bukan hari keenam.
3. **Yang dibutuhkan dari stream lain, dan kapan** — nama, apa, tanggal.
4. **Cara tahu ini selesai** — kriteria yang bisa diperiksa orang lain.

```
Nama: ____________  Stream: ____________  Tanggal: ________

1. Versi terkecil:
   -

2. Yang saya cut:
   -

3. Yang saya butuh (nama, apa, tanggal):
   -

4. Selesai berarti:
   -
```

---

## 7. Timeline — 6 hari kerja + 1 buffer

Hari ini 4 November.

**Hari 0 (hari ini) — kontrak saja, tanpa kode fitur.** Semua baca dokumen ini.
Semua isi §5. D kirim tokens hari ini juga.

> **Gate 0:** repo ter-scaffold, empat folder ada, token ada, nav merender
> halaman kosong di lima rute. ✅ **selesai.**

**Hari 1 — satu jalur tipis per stream.** Jelek boleh, jalan wajib.

| | Target | Status |
|---|---|---|
| A | tempel teks → scan → `ScoreResult` valid | ✅ plus UI |
| B | `progress.ts` + modul 10 + list page | list page ✅, modul 10 belum |
| C | runner Level 1 jalan dari pesan pertama sampai choice 1 | belum |
| D | nav + home + token, lima rute terjangkau | ✅ |

> **Gate 1:** lima rute render, tanpa error console, di lebar ponsel.

**Hari 2 — slice vertikal menutup.** Loop lengkap satu kali.

| | Target |
|---|---|
| A | panel bukti render signal nyata; companion mode template jalan |
| B | kuis jalan, modul 10 bisa diselesaikan, badge muncul |
| C | tiga tool deck berfungsi, layar akhir tampil |
| D | `/darurat` render, PDF menghasilkan file nyata |

Handoff hari ini: A kirim bentuk `EvidenceBundle` supaya D bisa bikin template
PDF.

> **Gate 2:** mainkan loop dalam satu sesi — companion → belajar → simulasi →
> darurat — dengan tautan hardcoded. Jelek. Harus lengkap.

**Hari 3 — loop jadi nyata, bukan hardcoded.** Ganti setiap handoff dengan
kontrak asli.

> **Gate 3:** klik seluruh loop tanpa nilai hardcoded tersisa.

**Hari 4 — kedalaman, bukan keluasan.**

| | Tambahan bernilai tertinggi |
|---|---|
| A | LLM sungguhan kalau sempat |
| B | modul 1, 2, 7 |
| C | poles ending + debrief. **Jangan** mulai Level 2 |
| D | checklist dua modus lain + preview laporan |

> **Gate 4:** loop penuh, konten nyata, mobile, tanpa error.

**Hari 5 — demo, dilatih.** Tidak ada fitur baru. Jalankan demo lima kali di
laptop presentasi, ukur waktunya, tulis skrip 90 detik.

**Hari 6 — buffer.** Untuk yang rusak. Kalau tidak ada yang rusak, untuk dokumen
submission.

**Hari 7 (10 Nov) — submit.** Tanpa perubahan kode.

---

## 8. Yang tidak dikerjakan siapa pun

Tulis di dinding. Kalau ada yang mulai membangun, hentikan.

> **Pengecualian tercatat (5 November):** butir (a) sengaja dilanggar untuk akun
> demo. Login dibangun sebagai fasad — tabel akun literal, cookie bertanda
> tangan, tanpa database dan tanpa penyimpanan server. Karena tidak ada yang
> disimpan, janji privasi §11.7 tetap utuh, tetapi kalimat "tanpa akun" harus
> dihapus dari presentasi. Rincian keputusan:
> `.opencode/plan/2026-11-04-lumina-landing-auth.md`.
>
> Butir (b) **tidak** dikecualikan: tidak ada database, progres tetap di
> `localStorage`.

a. Akun, login, reset password
b. Database apa pun — progres di localStorage
c. Crypto Agent (Fase 2)
d. Lebih dari satu skenario simulasi yang berfungsi
e. 12 modul selesai — satu modul lengkap mengalahkan dua belas stub
f. i18n — Bahasa Indonesia saja

---

## 9. Aturan yang menjaga ini tidak runtuh

a. **Umumkan sebelum mengubah kontrak.** Di grup chat, sebelum commit.
b. **Jangan pernah memblokir menunggu stream lain.** Hardcode, tinggalkan `TODO`.
c. **Gate bukan rapat status.** Empat orang membuka aplikasi bersama dan
   mengklik.
d. **Potong dengan berisik.** Cut yang dideklarasikan adalah keputusan; lubang
   diam adalah yang membuat demo terlihat belum jadi.
e. **Tidak ada dependensi baru setelah hari 3.**

---

## 10. "Selesai" pada 10 November

Bukan: empat stream lengkap.

Tapi: seseorang duduk di laptop, bicara ke companion tentang pesan mencurigakan,
paham kenapa berbahaya, mempelajari pola di baliknya, bertahan di roleplay, dan —
di tab darurat — menghasilkan laporan yang bisa ia bawa ke bank.

Kalau perjalanan itu bekerja dan tiga modul masih stub, kamu menang. Kalau setiap
stream "90% selesai" dan perjalanannya putus di tengah, kamu tidak.

---

## 11. Lampiran — cakupan proposal

### 11.1 Tujuh AI Agents → Stream A

| Agent | Status | Di kode |
|---|---|---|
| Message Agent | **Wajib** | ✅ `lib/scoring/message.ts` |
| Link Agent | Wajib kalau waktu | ✅ `lib/scoring/link.ts` |
| Identity Agent | Wajib kalau waktu | ⏳ direncanakan |
| Conversation Agent | Opsional | ⏳ |
| Evidence Agent | **Wajib** (dipakai D) | ⏳ kontrak ada |
| Learning Agent | Opsional | ⏳ |
| Scoring Orchestrator | **Wajib** | ✅ `lib/scoring/score.ts` |
| Crypto Agent | **Fase 2 — jangan bangun** | — |

### 11.2 Dua belas modus → A (deteksi) + B (kurikulum)

Satu tabel, dua pemakai, disimpan sebagai `src/data/modus.json`.

| No | Modus | Laporan IASC | Kerugian | Punya simulasi |
|---|---|---|---|---|
| 1 | Jual-beli online palsu | 53.928 | ±Rp988 M | — |
| 2 | Mengaku pihak lain (fake call) | 31.299 | ±Rp1,31 T | L4 (cut) |
| 3 | Investasi bodong & kripto | 19.850 | ±Rp1,09 T | — |
| 4 | Lowongan kerja & tugas berbayar | 18.220 | ±Rp656 M | L3 (cut) |
| 5 | Undian & hadiah palsu | 15.477 | ±Rp189,9 M | — |
| 6 | Media sosial & love scam | 14.229 | ±Rp491 M | — |
| 7 | Phishing tautan & akun | 13.386 | ±Rp507 M | L2 (cut) |
| 8 | Social engineering & share screen | 9.436 | ±Rp361 M | — |
| 9 | Pinjol fiktif & teror data | 4.793 | ±Rp40,6 M | L3 (cut) |
| 10 | File APK via WhatsApp | 3.684 | ±Rp134 M | **L1 — dibangun** |
| 11 | Quishing QRIS & QR palsu | peringatan OJK | — | — |
| 12 | Musiman & catut institusi | momen tahunan | — | — |

Urutan pengerjaan modul: 10 → 1 → 2 → 7. Sisanya "segera".

### 11.3 Delapan fitur per jenis penipuan → Stream A

| Fitur | Status |
|---|---|
| Cek Pesan & Percakapan | **Wajib** — inti companion ✅ |
| Cek File APK | **Wajib** — jalur demo ✅ |
| Cek Tautan & Cek Resmi | Wajib kalau waktu ✅ |
| Cek QR/QRIS | Opsional |
| Cek Nomor & Pengirim | Opsional |
| Panduan Investasi & Kripto | Opsional |
| Tombol Lapor Cepat | **Wajib** — milik D |
| Umpan Balik Hasil | Opsional |

### 11.4 Learning curve lima level → Stream B

| Level | Isi | Status |
|---|---|---|
| 1 | Mengenali Tanda Bahaya Dasar | modul 10 |
| 2 | Memahami Taktik Manipulasi | modul 1-2 |
| 3 | Menghadapi Skema Spesifik | modul 3-6 |
| 4 | Simulasi Percakapan Nyata | terhubung ke C |
| 5 | Menjadi Pelindung Komunitas | badge + ringkasan |

Kemajuan disimpan sebagai profil anonim di perangkat — **tanpa akun**.

### 11.5 Tiga contoh kasus → bahan demo

| Contoh | Isi | Dipakai |
|---|---|---|
| 1. APK undangan pernikahan | skor 94/100 Risiko Tinggi | **Demo utama** |
| 2. Tugas like & top-up | skor 88/100 | Cadangan |
| 3. WhatsApp "akun diblokir" | skor 92/100 | **Demo kedua** |

> **Catatan kejujuran:** engine saat ini mengukur contoh 2 sebesar **85/100**,
> bukan 88. Angka di presentasi mengikuti hasil ukur, bukan dokumen proposal
> (§11.8). Selisih ini dicatat di `src/lib/scoring/score.test.ts`.

Siapkan ketiganya sebagai tombol "coba contoh" di companion — ✅ sudah.

### 11.6 Tech stack dan janji privasi

| Bagian | Pilihan | Konsekuensi |
|---|---|---|
| Frontend | Next.js 16 + Tailwind v4 | App Router, semua stream |
| UI | shadcn/ui, base radix | komposisi, bukan markup sendiri |
| AI agents & skor | TypeScript, rule + deterministic | **tanpa ML berbayar** |
| Data eksternal | blocklist, domain resmi RI | boleh gagal tanpa memblokir UI |
| Privasi | OCR/QR **di perangkat**; tanpa simpan default | tidak ada upload, tidak ada penyimpanan |
| Fase 2 | model klasifikasi Python + Crypto Agent | **jangan dibangun** |

Dua janji privasi yang mengikat:

a. **Konten pengguna tidak dikirim ke AI pihak ketiga.** Kalau A memakai LLM,
   kirim hanya hasil sinyal, atau beri tahu pengguna secara eksplisit. Titik
   paling rawan — **putuskan di hari 1**.
b. **Tanpa simpan default.** Percakapan hilang saat tab ditutup.

Yang sengaja tidak dibuat: persona honeypot, akun berbayar, bot Telegram.

### 11.7 Target keberhasilan → kriteria gate

| Target | Cara menguji |
|---|---|
| Mengenali ≥90% contoh penipuan Indonesia | 20 contoh, 18 harus `mencurigakan`/`tinggi` |
| Salah tanda konten sah <5% | 20 pesan sah, maksimal 1 salah tanda |
| Analisis <2 detik | ukur dari submit sampai kartu hasil, tanpa link agent |
| Kemampuan pengguna naik terukur | kuis sebelum vs sesudah modul |

Kalau target 1 dan 2 tidak tercapai di Gate 4, **turunkan klaim di presentasi** —
jangan turunkan kejujuran. Juri lebih menghargai "kami mengukur 82% pada 20
contoh, ini batasnya" daripada klaim 90% yang runtuh saat didemokan.

### 11.8 Referensi data

OJK (IASC, Satgas PASTI) · Kementerian Komunikasi dan Digital · BSSN · Polri ·
URLhaus (abuse.ch) · SPF/DKIM/DMARC.

---

## 12. Ringkasan pembagian akhir

| Proposal bilang | Stream | Bangun? |
|---|---|---|
| 7 AI Agents | A | 4 wajib, 2 kalau waktu, 1 fase 2 |
| Companion percakapan | A | **Wajib** — pintu masuk |
| 12 modus | A + B | semua di data, 4 modul ditulis |
| 8 fitur per modus | A | 3 wajib, 4 opsional, 1 cut |
| Learning curve 5 level | B | level 1-3, level 4 via C |
| 12 modul kurikulum | B | 4 lengkap, 8 "segera" |
| Radar/Kalender/Sosialisasi | B | opsional, murah |
| Simulasi roleplay | C | **Level 1 saja** |
| Mode darurat + PDF | D | **Wajib** |
| Crypto Agent | — | jangan |