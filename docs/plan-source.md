# Lumina / FIRST90 — Team Planning (dokumen asli)

> Arsip. Ini dokumen rencana asli yang dibagikan ke tim, disimpan apa adanya.
> Versi yang dipakai sehari-hari ada di [`plan.md`](plan.md) — isinya sama,
> ditambah status implementasi dan catatan kontrak. Kalau keduanya berbeda,
> `plan.md` yang menang.


Four people. Six working days. One product judges can use in five minutes.

---

## 1. The shape of the product

Four surfaces, one loop. The companion is the front door, not a fourth tab.

```
                    ┌─────────────────────────┐
   masuk lewat sini │   COMPANION (AI Agent)  │  "ini penipuan bukan?"
                    │   bicara, bukan formulir │
                    └───────────┬─────────────┘
                                │  memanggil agent deteksi sebagai tool
                    ┌───────────▼─────────────┐
                    │  Skor + alasan + modul  │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        ┌──────────┐     ┌──────────┐     ┌──────────┐
        │ BELAJAR  │────▶│ SIMULASI │     │ DARURAT  │
        │  modul   │     │ roleplay │     │  nyata   │
        └──────────┘     └──────────┘     └──────────┘
```

**Alurnya:** companion mengenali → modul menjelaskan polanya → simulasi menguji di bawah tekanan. Mode darurat adalah pintu keluar untuk orang yang benar-benar sedang kena sekarang.

Empat stream, satu per orang:

| Stream | Person | Owns | User journey yang selesai |
|---|---|---|---|
| **A · Companion** | A | Asisten percakapan + agent deteksi di baliknya | "Saya cerita ke asisten dan paham ini penipuan" |
| **B · Belajar** | B | 12 modul, 1 lengkap, kuis, jalur adaptif | "Saya selesai modul dan membuktikan saya paham" |
| **C · Simulasi** | C | FIRST90: runner, deck tools, meter | "Saya selamat dari roleplay krisis" |
| **D · Darurat + Shell** | D | Mode darurat, PDF, nav, design tokens | "Teman saya kena sekarang dan saya punya checklist" |

---

## 2. Aturan yang menentukan segalanya

**Jangan membagi per frontend / backend.**

Pembagian itu membuat tiga orang menunggu satu orang, dan menghasilkan produk di mana setiap fitur setengah jadi sampai hari terakhir.

**Bagi per fitur vertikal.** Setiap stream memiliki potongannya dari model data, lewat API, sampai piksel. Bisa dikirim sendiri. Kalau dua stream lain tertinggal, demo tetap jalan.

---

## 3. AI Companion — spesifikasi

Ini yang membedakan Lumina dari pemeriksa skor. Bukan formulir tempel, tapi percakapan.

### Cara kerjanya

Companion adalah **orkestrator**, bukan penilai. Ia tidak pernah mengarang skor sendiri.

```
pengguna bicara
      │
      ▼
 Companion Agent (LLM: bahasa, empati, alur percakapan)
      │  memanggil tool
      ├──▶ Message Agent      urgensi palsu, otoritas, iming-iming, minta OTP
      ├──▶ Link Agent         domain mirip, tautan pendek, usia domain
      ├──▶ Identity Agent     nomor pengirim, SPF/DKIM/DMARC
      ├──▶ Conversation Agent tanda bahaya menumpuk, tahap eskalasi
      ├──▶ Evidence Agent     susun EvidenceBundle
      └──▶ Scoring            gabungkan jadi 0-100
      │
      ▼
 jawaban dalam bahasa manusia + skor + alasan + modul terkait
```

### Keputusan arsitektur yang penting

**LLM adalah suara, bukan hakim.** Agent deteksi deterministik yang memutuskan skor; LLM hanya menjelaskannya. Alasannya bukan kemurnian — alasannya demo. Kalau LLM yang menilai, ia bisa bilang "sepertinya aman" untuk pesan yang jelas-jelas minta OTP, di depan juri. Deteksi deterministik tidak pernah melakukan itu.

Konsekuensi praktis:
- Skor, `risk`, dan `signals` **selalu** datang dari `scoring.ts`. LLM tidak boleh mengubahnya.
- LLM boleh memilih kalimat, urutan penjelasan, dan nada.
- Kalau LLM mati atau kena rate limit, companion jatuh ke mode template: hasil deteksi tetap tampil, hanya tanpa percakapan. **Demo tidak boleh bergantung pada API pihak ketiga yang hidup.**

### Aturan perilaku companion

1. **Selalu ada minimal satu alasan konkret.** "Ini berbahaya" bukan jawaban. "Ini minta kode OTP — bank tidak pernah memintanya" adalah jawaban.
2. **Tidak pernah menyalahkan korban.** Pengguna yang sudah kena harus merasa dibantu, bukan dipermalukan.
3. **Eskalasi otomatis ke Darurat** kalau terdeteksi: uang sudah ditransfer, OTP sudah diberikan, atau korban sedang ditelepon pelaku. Jangan lanjut mengajar — langsung ke checklist.
4. **Tidak menjawab di luar topik.** Ditanya resep masakan, kembali ke: "Saya khusus membantu soal penipuan. Ada pesan atau tautan yang mencurigakan?"
5. **Bahasa Indonesia, campur boleh.** Pesan asli campur Inggris dan daerah; companion membalas dalam bahasa yang dipakai pengguna.
6. **Tidak menyimpan.** Tidak ada akun. Percakapan hilang saat tab ditutup, kecuali pengguna menyimpan sendiri.

### Antarmuka

Bukan halaman chat kosong. Tiga bagian:

- **Kiri:** percakapan. Pesan pengguna, balasan companion, dan **kartu hasil** yang muncul di dalam aliran percakapan (bukan pindah halaman).
- **Kanan:** panel bukti hidup — signal yang ditemukan muncul satu per satu saat agent selesai bekerja, dengan indikator agent mana yang sedang jalan.
- **Bawah:** tiga tombol konteks yang berubah sesuai situasi — "Pelajari pola ini" (→ Belajar), "Coba simulasi" (→ Simulasi), "Ini sedang terjadi" (→ Darurat).

Panel kanan yang membuat ini terasa seperti sistem agent, bukan chatbot. Juri melihat agent bekerja, bukan hanya membaca balasan.

### Batas stream A

Kamu **tidak** mengerjakan: isi modul, runner simulasi, PDF, navigasi. Tombol ke halaman lain cukup href; halaman tujuannya bukan urusanmu.

### Risiko

**Biaya API.** Percakapan panjang menghabiskan token. Batasi riwayat yang dikirim ke 6 giliran terakhir + ringkasan. Untuk demo, siapkan mode `?offline=1` yang memakai balasan template — kalau jaringan di venue buruk, kamu tetap tampil.

**Latensi.** Panel kanan harus menunjukkan progres saat agent bekerja, atau pengguna mengira aplikasi hang.

---

## 4. Kontrak — satu-satunya permukaan yang dibagi

Beku setelah disepakati. Mengubah satu berarti memberi tahu tiga orang lain **sebelum** commit, bukan sesudah.

### `ScoreResult` — milik A, dipakai B

```ts
type Risk = "bersih" | "rendah" | "mencurigakan" | "tinggi";

interface Signal {
  label: string;      // "Domain baru berusia 12 hari"
  weight: number;     // 0..1
  evidence: string;   // kutipan dari input pengguna
}

interface ScoreResult {
  score: number;                 // 0..100
  risk: Risk;                    // diturunkan dari score, jangan dihitung ulang di klien
  signals: Signal[];             // minimal 1, urut bobot terbesar
  modus: string;                 // id dari modus.json
  advice: string[];              // 1..4 langkah, kalimat perintah
  relatedModule: number | null;  // 1..12
}
```

| score | risk |
|---|---|
| 0–14 | bersih |
| 15–39 | rendah |
| 40–69 | mencurigakan |
| 70–100 | tinggi |

Aturan keras: permintaan OTP/PIN/password memaksa `risk: "tinggi"` apa pun skornya.

### `EvidenceBundle` — milik A, dipakai D

```ts
interface EvidenceBundle {
  artifacts: {
    id: string;
    label: string;                              // "Tiga SMS OTP BCA"
    kind: "text" | "screenshot" | "number" | "link" | "file";
    value: string;
    capturedAt: string;                         // ISO 8601
  }[];
  timeline: { at: string; what: string }[];
  narrative: string;                            // 2-4 kalimat, siap masuk PDF
}
```

A menyediakannya; D memakainya untuk PDF. Kalau A belum siap, D meng-hardcode satu contoh — **bentuk tipenya** yang penting.

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
  "nodes": [ /* lihat bawah */ ],
  "scoring": { "weights": {}, "grades": [] }
}
```

| type | wajib punya | perilaku |
|---|---|---|
| `message` | `speaker`, `text`, `next` | muncul di chat setelah `delay_ms` |
| `choice` | `prompt`, `choices[]` | tombol; tiap choice punya `verdict`, `rationale`, `effects`, `next` |
| `tool_task` | `tool`, `ui`, `on_success` | panel interaktif di dek kanan |
| `ending` | `variant`, `title`, `text`, `debrief[]` | layar akhir |

Skenario gagal kalau: ada `next` menunjuk node tak ada · ada node tak tercapai dari awal · ada `tool` dipakai tapi tak dideklarasikan · `grades` tidak urut `min` menurun.

Contoh kerja yang sudah divalidasi: `/root/FIRST90/design/scenario.level1.json` (12 node, 3 tool task, semua edge resolve).

### `modus.json` — milik A, dibaca B

Satu sumber kebenaran untuk 12 modus. B tidak menulis ulang daftar ini.

```jsonc
[
  { "id": "apk-whatsapp", "no": 10, "nama": "File APK via WhatsApp",
    "laporan": 3684, "kerugian": "±Rp134 M",
    "ciri": ["APK di luar Play Store", "Pengirim tak dikenal"],
    "scenarioId": "L1-kurir-apk" }
]
```

`scenarioId: null` berarti modul itu tidak punya simulasi. Itu boleh.

### Design tokens — milik D, dipakai semua

```css
--bg:#0b0f14; --panel:#121821; --panel2:#182130; --line:#243043;
--txt:#e6edf6; --dim:#8b9bb0;
--accent:#37d6a0;   /* aman / benar */
--danger:#ff5d5d;   /* bahaya / salah */
--warn:#ffb340;     /* mencurigakan */
```

Gelap bukan selera — warna merah meter harus terbaca dari belakang ruangan saat presentasi. Tidak ada warna hardcoded di komponen mana pun.

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

Query param disepakati: `/belajar?modul=10`, `/simulasi/L1-kurir-apk`.

### Tiga handoff nyata

1. **A → B**: `ScoreResult.relatedModule` → `/belajar?modul=N`
2. **B → C**: modul selesai → `unlocksScenario` → `/simulasi/[id]`
3. **A → D**: `EvidenceBundle` → PDF

Selain ini tidak ada ketergantungan. Kalau handoff tertunda, **hardcode nilainya** dan tinggalkan `TODO(stream-X)`. Jangan pernah memblokir stream sendiri.

---

## 5. Brief per stream

### A · Companion

**Bangun berurutan:**

1. `modus.json` — 12 entri dari tabel IASC. 45 menit, membuka jalan untuk B.
2. `scoring.ts` + `message.ts` — satu agent jalan penuh. Input teks → `ScoreResult` valid. Uji di console, belum ada UI.
3. **Panel bukti kanan** dengan data hardcoded. Bangun ini sebelum chat — panel inilah yang membuat produk terasa seperti sistem agent, dan paling sering dilewatkan tim lain.
4. Lapisan percakapan: template-based dulu (tanpa LLM), lalu LLM kalau waktu cukup.
5. `link.ts` — butuh daftar ~40 domain resmi bank/e-wallet/marketplace sebagai JSON.
6. `evidence.ts` → `EvidenceBundle` untuk D. Koordinasi hari ke-2.

Agent yang belum dikerjakan: kembalikan `signals: []` yang jujur. **Jangan mengarang temuan.** Skor yang mengaku mendeteksi empat hal padahal satu akan terlihat saat juri bertanya.

**Cut kalau mepet:** deteksi tautan → cut. LLM → cut, pakai template.

**Risiko:** latensi LLM; siapkan mode offline. Jangan blok UI menunggu link agent.

---

### B · Belajar

**Bangun berurutan:**

1. `progress.ts` — `{ completedModules, badges, missedPatterns }` di localStorage. Setengah jam.
2. **Modul 10 (File APK WhatsApp)** duluan, bukan modul 1. Angka IASC paling tajam (3.684 laporan) dan tersambung langsung ke skenario yang sudah ada.
3. `Quiz.tsx` — komponen yang menentukan apakah ini terasa kursus atau artikel.
4. `ModuleList` — 12 kartu, 11 berstatus "segera". Jujur lebih baik daripada pura-pura.
5. Modul 1, 2, 7 kalau waktu tersisa.
6. `adaptive.ts` paling akhir; kalau tidak selesai, urutkan saja.

**Struktur satu modul lengkap:** anatomi (langkah 1..5) · contoh pesan Indonesia dianonimkan dengan bagian berbahaya ditandai · checklist 5 tanda bahaya · kuis 3-5 soal dengan penjelasan tiap jawaban salah · langkah lapor berurutan.

**Cut kalau mepet:** modul 11-12 → cut. Adaptive → cut.

**Risiko:** menulis konten itu lambat — satu modul bagus 2-3 jam menulis serius. Jangan menulis enam modul setengah jadi. Kuis "apa itu phishing?" tidak menguji apa pun; kuis yang baik menampilkan pesan dan bertanya "apa yang kamu lakukan sekarang?".

---

### C · Simulasi FIRST90

Stream paling berisiko dan paling menentukan. Yang paling mungkin memakan seluruh minggu dan menghasilkan demo rusak.

**Sudah ada, pakai jangan bangun ulang:** `/root/FIRST90/app/` — runner penuh, vanilla JS, 33 pemeriksaan otomatis lulus, tiga tool deck berfungsi (sakelar isolasi, inspektur izin, penyusun laporan), dua jalur gagal. Baca `index.html` sebelum menulis komponen apa pun — ia menunjukkan setiap perilaku yang versi React butuhkan.

**Bangun berurutan:**

1. Port runner: vanilla → React state machine. Level 1 bisa dimainkan sebelum menyentuh apa pun.
2. `validate.ts` — edge rusak menyebabkan layar kosong di tengah demo. Pasang di build.
3. Poles layar akhir. `debrief` empat kalimat itulah yang diingat juri.
4. Level 2 hanya kalau 1-3 benar-benar selesai.

**Tiga hal yang membuat ini bukan visual novel:**
1. Deck benar-benar melakukan sesuatu — sakelar berbalik, izin dicabut, artefak dipilih. Kalau bisa diselesaikan dengan klik "next", itu prosa.
2. Meter bergerak saat pemain berpikir. Intrusion naik pada node keputusan. Itu seluruh mekanik ketegangannya.
3. Jawaban salah mengajari — `rationale` muncul seketika, merah, tidak memblokir cerita.

**Cut berurutan:** Level 2-4 → timer (sisakan dua meter) → tool isolasi (sisakan dua tool lain) → grading. **Jangan pernah cut:** debrief, rationale, layar akhir.

**Risiko:** setiap `setTimeout` butuh cleanup saat unmount, atau callback menembak ke komponen mati dan scene berikutnya jalan dua kali. Skenario adalah sumber kebenaran, bukan komponenmu — jangan special-case skenario di dalam komponen.

---

### D · Darurat + Shell

Stream terluas dan paling tidak glamor. Kerjakan shell hari pertama, karena tiga orang terblokir pada tampilan yang konsisten sampai token ada.

**Hari pertama, tiga hal:** `globals.css` tokens (setengah jam, membuka tiga orang) · `layout.tsx` + nav (4 tujuan, jalan di 380px) · `page.tsx` (satu layar, tiga kartu pilar, satu tombol darurat menonjol).

**Lalu halaman darurat:** `triage-data.ts` checklist untuk 3 modus tersering · `TriageChecklist` bernomor · `pdf.ts` (`@react-pdf/renderer`, pilih satu library hari pertama, jangan ganti) · `ReportPreview`.

**Mengapa mode darurat adalah fitur terpenting yang kamu punya:** tiga stream lain adalah latihan. Ini satu-satunya yang berguna jam 11 malam ketika seseorang benar-benar sedang ditipu. Juri bertanya "apa dampak nyatanya?" — jawabannya di halaman ini.

Yang membuatnya kredibel: tanpa gamifikasi (tak ada skor, tak ada "selamat!") · urutan bernomor, bukan daftar · PDF yang bisa dibawa ke bank (kronologi, nomor rekening pelaku, kolom tanda tangan) · tombol ke kanal resmi, bukan form tiruan.

**Cut kalau mepet:** PDF → cut, ganti print stylesheet. Triage modus tambahan → cut.

**Risiko:** PDF di browser menyebalkan (font Indonesia, tabel, page break). Shell terlalu ambisius mencuri waktu dari halaman darurat — home cukup satu layar.

---

## 6. Rencana masing-masing — diisi sendiri sebelum menulis kode

Jangan minta task list. Pemilik slice vertikal memutuskan sendiri cara memotongnya. Tulis di file terpisah per orang, atau di bagian ini dengan nama.

**Wajib menjawab empat hal:**

1. **Versi terkecil yang jalan end to end** — jalur terpendek dari klik pengguna sampai melihat hasil. Bangun itu dulu; bukan skema database, bukan struktur folder.
2. **Yang dicut kalau waktu habis** — tulis hari pertama, bukan hari keenam. Cut yang dideklarasikan adalah keputusan; yang diam adalah lubang di demo.
3. **Yang dibutuhkan dari stream lain, dan kapan** — nama, apa, tanggal. Kalau jawabannya "tidak ada", periksa lagi.
4. **Cara tahu ini selesai** — kriteria yang bisa diperiksa orang lain tanpa bertanya padamu.

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

Submission **10 November 2026**. Hari ini 4 November.

**Hari 0 (hari ini) — kontrak saja, tanpa kode fitur.** Semua baca dokumen ini. Semua isi bagian 6. D kirim tokens hari ini juga.

> **Gate 0:** repo ter-scaffold, empat folder ada, token ada, nav merender halaman kosong di lima rute.

**Hari 1 — satu jalur tipis per stream.** Jelek boleh, jalan wajib.

| | Target |
|---|---|
| A | tempel teks → scan hardcoded → `ScoreResult` valid di console |
| B | `progress.ts` + modul 10 ditulis + list page render |
| C | runner Level 1 jalan dari pesan pertama sampai choice 1 |
| D | nav + home + token, lima rute terjangkau |

> **Gate 1:** lima rute render, tanpa error console, di lebar ponsel.

**Hari 2 — slice vertikal menutup.** Loop lengkap satu kali, ujung ke ujung.

| | Target |
|---|---|
| A | panel bukti render signal nyata; companion mode template jalan |
| B | kuis jalan, modul 10 bisa diselesaikan, badge muncul |
| C | tiga tool deck berfungsi, layar akhir tampil |
| D | `/darurat` render, PDF menghasilkan file nyata |

*Handoff hari ini: A kirim bentuk `EvidenceBundle` (boleh hardcoded) supaya D bisa bikin template PDF.*

> **Gate 2:** mainkan loop dalam satu sesi — companion → belajar → simulasi → darurat — dengan tautan hardcoded. Jelek. Harus lengkap.

**Hari 3 — loop jadi nyata, bukan hardcoded.** Ganti setiap handoff dengan kontrak asli. A→B, B→C, A→D, plus `missedPatterns` dari simulasi ke jalur belajar.

> **Gate 3:** klik seluruh loop tanpa nilai hardcoded tersisa. Di sinilah kontrak biasanya ternyata salah — perbaiki kontraknya, bukan gejalanya.

**Hari 4 — kedalaman, bukan keluasan.**

| | Tambahan bernilai tertinggi |
|---|---|
| A | `link.ts` + daftar 40 domain resmi; LLM sungguhan kalau sempat |
| B | modul 1, 2, 7 |
| C | poles ending + debrief. **Jangan** mulai Level 2 |
| D | checklist dua modus lain + preview laporan |

> **Gate 4:** loop penuh, konten nyata, mobile, tanpa error.

**Hari 5 — demo, dilatih.** Tidak ada fitur baru. Jalankan demo lima kali di laptop presentasi, ukur waktunya, tulis skrip 90 detik. **Hari pemotongan:** apa pun yang belum selesai akhir hari 5 dipotong dari demo sepenuhnya.

**Hari 6 — buffer.** Untuk yang rusak. Kalau tidak ada yang rusak, untuk dokumen submission.

**Hari 7 (10 Nov) — submit.** Tanpa perubahan kode.

---

## 8. Yang tidak dikerjakan siapa pun

Tulis di dinding. Kalau ada yang mulai membangun, hentikan.

- Akun, login, reset password
- Database apa pun — progres di localStorage
- Crypto Agent (Fase 2)
- Lebih dari satu skenario simulasi yang berfungsi
- 12 modul selesai — satu modul lengkap mengalahkan dua belas stub
- i18n — Bahasa Indonesia saja

---

## 9. Aturan yang menjaga ini tidak runtuh

**Umumkan sebelum mengubah kontrak.** Di grup chat, sebelum commit.

**Jangan pernah memblokir menunggu stream lain.** Hardcode, tinggalkan `TODO`.

**Gate bukan rapat status.** Empat orang membuka aplikasi bersama dan mengklik. Kalau tidak bisa didemokan, tidak ada.

**Potong dengan berisik.** Cut yang dideklarasikan adalah keputusan. Lubang diam adalah yang membuat demo terlihat belum jadi.

**Tidak ada dependensi baru setelah hari 3.**

---

## 10. "Selesai" pada 10 November

Bukan: empat stream lengkap.

Tapi: seseorang duduk di laptop, bicara ke companion tentang pesan mencurigakan, paham kenapa berbahaya, mempelajari pola di baliknya, bertahan di roleplay, dan — di tab darurat — menghasilkan laporan yang bisa ia bawa ke bank.

Itu seluruh produknya. Empat stream ada untuk membuat satu perjalanan itu nyata.

Kalau perjalanan itu bekerja dan tiga modul masih stub, kamu menang. Kalau setiap stream "90% selesai" dan perjalanannya putus di tengah, kamu tidak.

---

## 11. Lampiran — isi proposal yang wajib masuk

Dokumen proposal (`Proposal_Lumina_Bahasa_Indonesia.pdf`) sudah ditulis dan diserahkan. Bagian ini memetakan isinya ke stream yang mengerjakan, supaya tidak ada yang hilang antara proposal dan produk.

**Aturan:** yang tidak ada di tabel ini tidak dibangun. Yang ada di tabel tapi tidak dibangun harus disebut sebagai "rencana", bukan didemokan seolah jadi.

### 11.1 Tujuh AI Agents → Stream A

| Agent | Tugas | Status di plan |
|---|---|---|
| Message Agent | urgensi palsu, otoritas palsu, iming-iming, ancaman, minta OTP/PIN | **Wajib** |
| Link Agent | domain mirip merek resmi, tautan pendek, blocklist, usia domain, tanda toko palsu | Wajib kalau waktu |
| Identity Agent | nomor/sender, kecocokan kontak resmi, SPF/DKIM/DMARC | Wajib kalau waktu |
| Conversation Agent | seluruh percakapan, tanda bahaya menumpuk, tahap eskalasi | Opsional |
| Evidence Agent | nomor HP, rekening/VA, e-wallet, tautan → draf laporan | **Wajib** (dipakai D) |
| Learning Agent | pola yang terlewat → modul/simulasi berikutnya | Opsional |
| Scoring Orchestrator | gabungkan temuan jadi 0–100; indikator keras → Risiko Tinggi | **Wajib** |
| Crypto Agent | honeypot, likuiditas terkunci | **Fase 2 — jangan dibangun** |

> Companion (di bagian 3) memanggil agent-agent ini sebagai tool. Ia bukan agent kedelapan; ia lapisan percakapan di atasnya.

### 11.2 Dua belas modus → Stream A (deteksi) + B (kurikulum)

Satu tabel, dua pemakai. Simpan sebagai `modus.json`.

| No | Modus | Laporan IASC | Kerugian | Ciri khas | Punya simulasi |
|---|---|---|---|---|---|
| 1 | Jual-beli online palsu | 53.928 | ±Rp988 M | harga terlalu murah; transfer di luar marketplace; DP dulu | — |
| 2 | Mengaku pihak lain (fake call) | 31.299 | ±Rp1,31 T | ngaku bank/polisi/kurir/keluarga; minta OTP; larang verifikasi | L4 (cut) |
| 3 | Investasi bodong & kripto | 19.850 | ±Rp1,09 T | janji untung pasti; penarikan dipersulit; diminta setor lagi | — |
| 4 | Lowongan kerja & tugas berbayar | 18.220 | ±Rp656 M | tugas like/subscribe; dibayar kecil dulu; top-up membesar | L3 (cut) |
| 5 | Undian & hadiah palsu | 15.477 | ±Rp189,9 M | "Anda menang"; wajib bayar admin/pajak dulu | — |
| 6 | Media sosial & love scam | 14.229 | ±Rp491 M | kenalan online; paket tertahan; pemerasan video call | — |
| 7 | Phishing tautan & akun | 13.386 | ±Rp507 M | tautan tiruan login bank/e-wallet | L2 (cut) |
| 8 | Social engineering & share screen | 9.436 | ±Rp361 M | "CS" palsu arahkan share screen / remote app | — |
| 9 | Pinjol fiktif & teror data | 4.793 | ±Rp40,6 M | pinjaman cepat; biaya di muka; ancaman sebar data | L3 (cut) |
| 10 | File APK via WhatsApp | 3.684 | ±Rp134 M | APK undangan/kurir/tilang; curi SMS/OTP/m-banking | **L1 — dibangun** |
| 11 | Quishing QRIS & QR palsu | peringatan OJK | — | stiker QRIS palsu; nama penerima tidak sesuai (prinsip PASTI) | — |
| 12 | Musiman & catut institusi | ikut momen tahunan | — | Ramadan, pajak, bansos, CPNS; bayar ke pribadi | — |

**Urutan pengerjaan modul:** 10 → 1 → 2 → 7. Empat modus dengan laporan terbanyak dan keterkaitan simulasi terkuat. Sisanya berstatus "segera" — jujur, bukan stub kosong.

### 11.3 Delapan fitur per jenis penipuan → Stream A

Proposal menjanjikan halaman khusus per modus, bukan satu pemeriksa umum. Di produk, ini adalah **pemilih modus** di companion yang mengubah agent mana yang dijalankan.

| Fitur | Modus | Isi | Status |
|---|---|---|---|
| Cek Pesan & Percakapan | fake call, phishing, social engineering | tempel chat; tanda bahaya per kalimat + tahap eskalasi | **Wajib** — inti companion |
| Cek File APK | APK WhatsApp | nama file undangan/kurir/tilang langsung dijelaskan | **Wajib** — jalur demo |
| Cek Tautan & Cek Resmi | jual-beli palsu, phishing, undian | periksa tautan, bandingkan domain resmi | Wajib kalau waktu |
| Cek QR/QRIS | quishing | lihat tujuan QR, cocokkan nama merchant (PASTI) | Opsional |
| Cek Nomor & Pengirim | fake call, love scam | nomor tak dikenal mengaku keluarga/instansi; spoofing, voice clone | Opsional |
| Panduan Investasi & Kripto | investasi bodong | checklist legalitas OJK/Bappebti | Opsional |
| Tombol Lapor Cepat | semua modus | draf laporan ke IASC, bank/e-wallet, Komdigi, Polri, CekRekening.id | **Wajib** — milik D |
| Umpan Balik Hasil | semua modus | tandai benar/keliru | Opsional (lihat 11.7) |

### 11.4 Learning curve lima level → Stream B

| Level | Isi | Status |
|---|---|---|
| 1 | Mengenali Tanda Bahaya Dasar | modul 10 |
| 2 | Memahami Taktik Manipulasi | modul 1-2 |
| 3 | Menghadapi Skema Spesifik | modul 3-6 |
| 4 | Simulasi Percakapan Nyata | terhubung ke Stream C |
| 5 | Menjadi Pelindung Komunitas | badge + ringkasan bisa dibagikan ke grup keluarga |

Kemajuan disimpan sebagai profil anonim di perangkat — **tanpa akun**. Itu janji proposal dan harus dipertahankan.

Dua belas modul persis mengikuti tabel 11.2. Setiap modul berisi: anatomi skema langkah demi langkah · contoh pesan Indonesia dianonimkan · checklist tanda bahaya · simulasi chat · kuis singkat · langkah lapor resmi.

**Badge Pola** (mis. Penjaga OTP, Pemburu Tautan) + ringkasan yang bisa dibagikan ke grup keluarga. Ini fitur sosial paling murah dan paling sering menang poin — satu halaman HTML yang bisa di-screenshot.

### 11.5 Radar Skema, Kalender Risiko, Paket Sosialisasi → Stream B

| Fitur | Isi | Status |
|---|---|---|
| Radar Skema | modus yang sedang ramai | Opsional — cukup daftar statis |
| Kalender Risiko | momen rawan: Ramadan, musim pajak, Harbolnas | Opsional — komponen tanggal sederhana |
| Paket Sosialisasi | kartu edukasi 1 halaman, poster digital, skrip 5 menit untuk guru/kader/RT-RW/lansia | **Murah, berdampak** — tiga halaman cetak |

Ketiganya murni edukasi dan **tidak mengubah skor deteksi**. Jangan campur dengan engine.

### 11.6 Tiga contoh kasus → bahan demo

Proposal memakai tiga contoh. Dua di antaranya harus bisa dijalankan hidup saat presentasi.

| Contoh | Isi | Dipakai untuk |
|---|---|---|
| 1. APK undangan pernikahan | ibu terima "Undangan-Pernikahan.apk"; skor 94/100 Risiko Tinggi; saran: jangan instal, hapus, konfirmasi lewat nomor dikenal; buka modul 10 | **Demo utama** — jalur companion → skor → modul |
| 2. Tugas like & top-up | mahasiswa dibayar Rp15.000, lalu diminta top-up Rp500.000; skor 88/100; tunjukkan posisi dalam perjalanan penipuan | Cadangan |
| 3. WhatsApp "akun diblokir" | "Akun Anda akan diblokir dalam 2 jam, verifikasi OTP sekarang" + tautan pendek; skor 92/100 | **Demo kedua** — menunjukkan indikator keras OTP |

Siapkan ketiganya sebagai tombol "coba contoh" di companion. Juri tidak perlu mengetik.

### 11.7 Tech stack dan janji privasi → semua stream

| Bagian | Pilihan proposal | Konsekuensi untuk plan |
|---|---|---|
| Frontend | Next.js + Tailwind | dipakai semua; App Router |
| AI Agents & skor | TypeScript/Node, per agent | **tanpa ML berbayar** — rule + deterministic scoring |
| Data eksternal | blocklist URL, WHOIS/DNS, domain resmi RI | gratis-tepercaya, boleh gagal tanpa memblokir UI |
| Privasi | OCR/QR **di perangkat**; tanpa simpan default | tidak ada upload ke server untuk OCR; tidak ada penyimpanan percakapan |
| Fase 2 | model klasifikasi Python + Crypto Agent | **jangan dibangun** |

Dua janji privasi yang mengikat dan mudah dilanggar tanpa sadar:
- **Konten pengguna tidak dikirim ke AI pihak ketiga.** Kalau A memakai LLM untuk companion, kirim hanya hasil sinyal, atau beri tahu pengguna secara eksplisit. Ini titik paling rawan — putuskan di hari 1.
- **Tanpa simpan default.** Percakapan hilang saat tab ditutup.

**Yang sengaja tidak dibuat** (dari proposal, pertahankan): persona honeypot yang berpura-pura jadi korban untuk memancing penipu (risiko etis/hukum) dan akun berbayar. Masukan hanya lewat situs web — bukan bot Telegram.

### 11.8 Target keberhasilan → kriteria gate

Angka dari proposal, dipakai sebagai uji di Gate 4:

| Target | Cara menguji |
|---|---|
| Mengenali ≥90% contoh penipuan Indonesia yang disisihkan | siapkan 20 contoh, 18 harus dapat `risk: mencurigakan` atau `tinggi` |
| Kesalahan menandai konten sah <5% | 20 pesan sah (chat keluarga, promo resmi), maksimal 1 salah tanda |
| Analisis <2 detik | ukur dari submit sampai kartu hasil muncul, tanpa link agent |
| Kemampuan pengguna naik terukur | kuis "kenali penipuannya" sebelum vs sesudah modul |

Kalau target 1 dan 2 tidak tercapai di Gate 4, **turunkan klaim di presentasi** — jangan turunkan kejujuran. Juri lebih menghargai "kami mengukur 82% pada 20 contoh, ini batasnya" daripada klaim 90% yang runtuh saat didemokan.

### 11.9 Referensi data

OJK (IASC, Satgas PASTI) · Kementerian Komunikasi dan Digital · BSSN · Polri · URLhaus (abuse.ch) · SPF/DKIM/DMARC. Semua angka di tabel 11.2 berasal dari sini dan sudah ada di proposal.

---

## 12. Ringkasan pembagian akhir

| Proposal bilang | Stream | Bangun? |
|---|---|---|
| 7 AI Agents | A | 4 wajib, 2 kalau waktu, 1 fase 2 |
| Companion percakapan | A | **Wajib** — pintu masuk |
| 12 modus | A + B | semua di data, 4 modul ditulis |
| 8 fitur per modus | A | 3 wajib, 4 opsional, 1 (QR) cut |
| Learning curve 5 level | B | level 1-3, level 4 via C |
| 12 modul kurikulum | B | 4 lengkap, 8 "segera" |
| Radar/Kalender/Sosialisasi | B | opsional, murah |
| Simulasi roleplay | C | **Level 1 saja** |
| Mode darurat + PDF | D | **Wajib** |
| Crypto Agent | — | jangan |

Itu seluruh cakupan proposal, dipetakan ke empat orang dan enam hari.

