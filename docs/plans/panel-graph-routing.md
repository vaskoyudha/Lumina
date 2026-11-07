# Panel bukti — rute ortogonal grafik agen (rencana)

Nama: Vasco · Stream: A · Tanggal: 7 November 2026

Rencana ini adalah revisi terukur setelah `571c81e` (kabel sudah dijangkarkan ke
port nyata, tetapi bentuknya masih salah). Hanya menyentuh
`src/components/companion/signal-panel.tsx`, satu modul geometri baru
`panel-wires.ts`, tesnya, dan dokumen ini. Tidak ada kode ditulis sebelum
disetujui.

## 0. Cacat yang diukur, bukan dikira

Diukur lewat CDP pada state kosong. 380px: kanvas 256×1242.6; root keluar
(128, 294.6); port masuk cabang x=16, port keluar x=243; cabang pertama masuk
(16, 360.6), terakhir keluar (243, 973.4); sintesis masuk (128, 1055.6); voice
masuk (128, 1133.8). 1440px: kanvas 367×1226.8, x port keluar 354. Kartu cabang
selalu di x=12..(width−12); root, sintesis, dan voice memakai lebar penuh.

| Objek | Nilai nyata | Akibat |
|---|---|---|
| Chevron `AgentNode` | 5px, x≈3–8, `border-l-brand` | Menunjuk ke kanan saat kabel datang dari kanan; ia juga menempati koridor yang sama dengan rel masuk. |
| Kurva root→cabang | kontrol y = 331.6 untuk cabang pertama | Ruas terakhir turun dari y=331.6 ke 360.6 di x≈16–40, di belakang kartu pertama (atas 338.6). |
| Kurva cabang→sintesis | (243, 421.4) → (128, 1055.6), kontrol y=1043.6 | Mengelewati separuh kanan kartu 2–5; sebagian besar kabel tidak terlihat. |
| Konvergensi 5 kurva | ujung sama, kontrol x hampir sama | Dalam 20px terakhir kelima garis berada dalam ~2px; terbaca satu garis tebal. |
| Ujung kabel | tidak ada `<marker>` atau poligon | Tidak ada kepala panah; arah hanya tersirat. |
| `muted` | opacity 25 + `strokeDasharray 4 4` | Segmen terpendek 5–9px; pola 4/4 hanya memunculkan satu garis putus, terbaca sebagai kabel hilang. |
| Warna kabel | semuanya `stroke-brand-strong` | `gagal`, `dilewati`, dan `pending` hanya beda opacity; warna tidak membawa arti. |
| Lebar node | cabang 12..244, root/sintesis/voice 0..256 | Tidak ada tepi bersama; rel imajiner x=4/362 tidak menyentuh port mana pun. |

## 1. Versi terkecil yang jalan end to end

a. **Satu modul geometri murni.** `panel-wires.ts` menerima ukuran kanvas dan
   titik port hasil ukur, mengembalikan `PanelWire[]`:
   `{ key, d, tone, head? }`. Tanpa DOM, tanpa React, tanpa dependensi. Tes unit
   memakai dua fixture (380 dan 1440) dan tidak butuh jsdom mengukur layout.

b. **Rel kiri dan rel kanan, bukan kurva bebas.** Rel masuk di `x=4`, rel balik
   di `x=width−4`, keduanya di gutter 12px milik `BranchList`. Batang root turun
   16px lalu berbelok ke kiri di `root.y+16`; rel kanan berjalan dari port keluar
   pertama ke `synthesisIn.y−24`, lalu berbelok ke kiri menuju sintesis. Semua
   belokan memakai radius 8 (`Q`), bukan `C`.

c. **Tap per cabang membawa status.** Rel bersama selalu `base` — rel tidak
   boleh menyala untuk salah satu cabang karena ia milik semua cabang. Yang
   diberi warna status adalah tap pendek: rel kiri → port masuk (dengan kepala
   panah) dan port keluar → rel kanan (tanpa kepala panah). Dengan begitu lima
   warna tidak pernah saling menimpa di satu garis.

d. **Kepala panah di port, bukan di rel.** Tujuh kepala: lima port masuk
   cabang, satu port masuk sintesis, satu port masuk voice. Kepala adalah
   poligon terisi, bukan marker, supaya warnanya ikut tone. Ujungnya berhenti
   tepat di tepi dot (`x−5` / `y−5`); batang path berhenti di pangkal kepala
   (`−11`), jadi tidak ada garis yang menembus dot.

e. **Matriks tone.** Semua kelas sudah ada di `globals.css`; tidak ada token
   atau keyframe baru.

   | Tone | Kelas garis | Tebal | Dipakai |
   |---|---|---|---|
   | `base` | `stroke-brand-edge` | 1.2 | rel, batang root, tap/drop `pending` |
   | `ran` | `stroke-brand-strong` | 1.5 | tap/drop stage yang melapor |
   | `live` | `stroke-brand-strong` + `motion-safe:animate-pulse` | 2 | hanya stage `berjalan` |
   | `skipped` | `stroke-dot` | 1.2 | cabang `dilewati` |
   | `failed` | `stroke-danger` | 1.5 | stage `gagal` |

   `pending`, `ran`, `live`, `skipped`, dan `failed` dipetakan dari `NodeStatus`
   yang sudah ada. Tidak ada keadaan kabel yang tidak berasal dari `AgentTrace`.

f. **Port ikut tone, ping hanya milik `live`.**

   | Status | Port masuk (berongga) | Port keluar (terisi) | Ping |
   |---|---|---|---|
   | `pending` | `border-dot` | `bg-dot` | tidak |
   | `ran` | `border-brand-strong` | `bg-brand-strong` | tidak |
   | `live` | `border-brand-strong` | `bg-brand-strong` | ya |
   | `skipped` | `border-dot-soft` | `bg-dot-soft` | tidak |
   | `failed` | `border-danger` | `bg-danger` | tidak |

   Port root tetap `brand-strong` (struktur, bukan status). Port sintesis
   `ran` bila ada trace, `pending` bila tidak. Chevron 5px dihapus; kontainer
   port digeser dari `-left-[9px]` ke `-left-[2px]` supaya pusat dot tetap di
   ±16px dan kontrak `data-port` tidak bergeser.

g. **Batang entry jadi solid.** `EntryPort` memakai `h-3 border-l border-dashed`;
   diganti `border-brand-edge` solid 1.2px. Ini satu-satunya garis putus yang
   tersisa di kanvas.

h. **Gambar tangan tata letak** (koordinat sesungguhnya tetap dari port):

   ```
            [ entry ]
               ·
           [ root ]            out (x, rootBottom)
               │ 16
       ┌───────┘                fan y = root.y + 16
       │ x=4  ← rel kiri
       ├──▶ [ message ] ────┐
       ├──▶ [ link ] ───────┤   x=width−4  ← rel kanan
       ├──▶ [ identity ] ───┤
       ├──▶ [ conversation ]┤
       └──▶ [ evidence ] ───┘
                            └──┐
                               ▼
                        [ synthesis ]
                               │
                               ▼
                           [ voice ]
   ```

## 2. Yang saya cut

a. **Semua pola putus-putus di kabel → cut.** Ini menggantikan §4f rencana
   sebelumnya. Segmen tap hanya 5–9px; pola 4/4 tidak bisa terbaca sebagai pola,
   dan status `dilewati` sudah membawa warna `stroke-dot` plus alasan di kartu.
   Satu-satunya garis putus yang dihapus juga di `EntryPort`.

b. **Kurva Bézier bebas → cut.** Kurva tidak punya jalur yang dijamin; ia bisa
   berjalan di belakang kartu tanpa terlihat. Rute ortogonal bisa diperiksa
   terhadap persegi kartu.

c. **Editor graf / drag node → cut.** Ini penggambar alur, bukan alat desain.

d. **Reveal berurutan per agen → cut, karena tidak jujur.** `scoreWithTrace`
   selesai dalam satu lintasan; animasi bertahap akan mengarang waktu.

e. **Token, keyframe, atau warna baru → cut.** `brand-edge`, `brand-strong`,
   `dot`, `dot-soft`, dan `danger` sudah ada. Tidak menyentuh `globals.css`
   milik D.

f. **Perubahan kontrak, skor, atau data jaringan → cut.** `AgentTrace`,
   `NodeStatus`, dan `scoreWithTrace` tetap beku. Grafik hanya membaca status.

g. **Layout alternatif untuk >5 agen → cut.** Rel mendukung jumlah cabang
   berapa pun, tetapi tidak ada kolom kedua atau penataan ulang.

## 3. Yang saya butuh (nama, apa, tanggal)

| Dari | Apa | Tanggal |
|---|---|---|
| D | Konfirmasi tidak ada perubahan `globals.css`; semua warna memakai token yang sudah ada | 7 Nov |
| B, C | Tidak tersentuh — tidak ada perubahan rute, konten, atau PDF | — |

## 4. Selesai berarti

a. Di 380px dan 1440px, ketujuh ujung kepala panah berada ≤1px dari tepi dot
   port yang dituju, diukur lewat CDP relatif kanvas — bukan dilihat mata.

b. Tidak ada garis yang berada di dalam persegi kartu, kecuali 4px pertama tap
   keluar yang memang keluar dari bawah dot (dot menutupinya). Rel kiri dan
   rel kanan tidak pernah memotong kartu.

c. Zoom 85/100/115: ujung kabel tidak bergeser, tebal garis tidak berubah
   (`vector-effect="non-scaling-stroke"`); kepala panah ikut skala kanvas dan
   itu dicatat sebagai perilaku yang disengaja.

d. Hanya satu sistem konektor: tidak ada chevron `border-l-brand`, tidak ada
   `strokeDasharray`, tidak ada spine CSS di `BranchList`; semua kabel lahir dari
   satu `<svg>` overlay.

e. Tes unit `panel-wires.test.ts` membuktikan: rel 4 dan `width−4`; tap masuk
   berakhir di `port.x−5` dengan kepala `right`; drop sintesis/voice berakhir di
   `port.y−5` dengan kepala `down`; matriks tone untuk kelima status; fixture
   tanpa port tidak melempar; lebar 0 menghasilkan daftar kosong.

f. `npm run verify` lulus (58 suite lama tetap hijau), termasuk tes `data-live`
   yang sudah ada: hanya stage `berjalan` yang menyalakan `data-live`, kabel
   2px + pulse, dan dot ping; `prefers-reduced-motion` mematikan denyut, bukan
   statusnya.

g. `dilewati` tetap abu-abu dan menyimpan alasannya; `gagal` memakai danger;
   tidak ada kabel yang menyala hanya karena node itu ada.

h. Tiga tangkapan layar disimpan di `.playwright-mcp/`: 380px, 1440px, dan satu
   state `voice: berjalan`.

## 5. Urutan kerja

1. `panel-wires.ts`: konstanta (`gutter 4`, `rootStub 16`, `elbow 8`, `head 6`,
   `halfHead 2.25`, `portEdge 5`, `returnGap 24`) + `buildPanelWires()`.
2. `panel-wires.test.ts`: dua fixture, matriks tone, kasus port hilang.
3. `signal-panel.tsx`: `useGraphWires` memanggil builder; `GraphWires` merender
   `tone` + poligon kepala; `sameWires` membandingkan tone dan kepala.
4. `signal-panel.tsx`: hapus chevron, geser kontainer port, pasang kelas tone
   port, solidkan batang entry. Atribut `data-node`/`data-port`/`data-status`/
   `data-live` tidak berubah.
5. Verifikasi CDP di 380/1440, zoom 85/100/115; simpan tangkapan layar.
6. `npm run verify`; commit hanya file panel, modul, tes, dan rencana ini.

## 6. Hubungan dengan `panel-graph-lines.md`

| Bagian lama | Status |
|---|---|
| §1a (kurva dari port terukur) | Diganti: jangkar tetap, bentuk jadi ortogonal. |
| §1c (trunk 8px lalu menyebar) | Diganti: batang 16px + rel kiri. |
| §1d (konvergensi kurva) | Diganti: rel kanan + drop sintesis. |
| §4d (tanpa kurva bersilangan) | Tetap, kini diperiksa terhadap persegi kartu. |
| §4f (`dilewati` putus-putus) | Diganti: abu-abu `stroke-dot`, tanpa dash. |
| §5.2–5.3 (hook + hapus spine) | Diganti: builder murni + renderer tone/kepala. |
| Sisanya (§0, §1b, §1e, §1f, §2, §4a–c/e/g, §5.1/5.4–5.6) | Tetap berlaku. |

## Batas

Tidak menyentuh `src/lib/contracts/*`, `src/lib/scoring/*`, `globals.css`,
`companion-chat.tsx`, rute, konten B/C, atau `src/components/ui/*`. Tidak ada
dependensi baru. Semua keadaan grafik berasal dari `AgentTrace` yang sudah beku;
tidak ada kabel yang mengarang progres.
