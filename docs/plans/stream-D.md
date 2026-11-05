# Stream D — Darurat + Shell

Nama: Person 4 · Stream: D · Tanggal: 5 November 2026

## 1. Versi terkecil yang jalan end to end

Orang yang sedang kena membuka `/darurat` → memilih situasi (OTP, transfer,
APK) → mengikuti checklist bernomor → mengisi laporan dari data sesi companion →
menekan **Unduh laporan PDF** → file PDF nyata tersimpan di perangkat, siap
dibawa ke bank. Tanpa akun, tanpa unggahan, tanpa server.

Jalur yang sudah ada dan yang ditutup di iterasi ini:

a. Shell: token `--lumina-*`, nav 4 tujuan di 380px, home tiga pilar. ✅
b. `triage.ts`: 3 situasi tersering, langkah bernomor, kanal resmi. ✅
c. `triage.ts`: +2 situasi (tautan phishing, lowongan kerja palsu) → 5. ✅
d. `pdf.tsx` (`@react-pdf/renderer`): kronologi, rekening pelaku, nominal,
   kolom tanda tangan. ✅
e. `ReportPreview`: pratinjau HTML dari data yang sama sebelum diunduh. ✅
f. `ReportBuilder`: formulir pendek, data contoh dari `EvidenceBundle`
   (`TODO(stream-A)`), unduh PDF di perangkat. ✅

## 2. Yang saya cut

Ditulis sekarang, bukan hari keenam:

a. **PDF di server / API route → cut.** PDF dirender di perangkat. Tidak ada
   data korban yang meninggalkan browser, sesuai janji privasi §11.6.
b. **Penyimpanan draf laporan → cut.** Tidak ada localStorage, tidak ada akun.
   Tutup tab, data hilang — sama seperti companion.
c. **Tanda tangan digital / e-signature → cut.** Yang diminta bank adalah kolom
   tanda tangan basah; PDF menyediakan garis dan nama.
d. **Checklist 12 modus → cut.** Lima situasi yang paling sering (dan paling
   mendesak) mengalahkan dua belas daftar setengah jadi.
e. **Formulir pengaduan tiruan → cut.** Tombol selalu menuju kanal resmi
   (IASC OJK, CekRekening, Komdigi, Patroli Siber), bukan form kita.

## 3. Yang saya butuh (nama, apa, tanggal)

a. **A · `EvidenceBundle` nyata.** Kontrak sudah beku di
   `src/lib/contracts/evidence.ts`. Sampai `evidence.ts` mengirim bundle asli,
   D memakai `src/data/report-sample.ts` dan menandainya `TODO(stream-A)`.
   Dibutuhkan **6 November**, sesuai handoff resmi A → D.
b. **A · teks kronologi tanpa menyalahkan korban.** D hanya menampilkan; tidak
   mengubah kalimat A.
c. **Tidak ada dari B atau C.** Halaman darurat tidak bergantung pada modul
   atau runner.

## 4. Selesai berarti

Bisa diperiksa orang lain tanpa bertanya:

a. `npm run verify` lulus — typecheck, lint, test, build.
b. `/darurat` menampilkan 5 situasi; memilih situasi mengganti seluruh
   checklist, bukan hanya judul.
c. Tombol **Unduh laporan PDF** menghasilkan file `laporan-lumina-*.pdf` yang
   bisa dibuka, dengan kronologi, nomor rekening pelaku, nominal, dan kolom
   tanda tangan.
d. Pratinjau di layar memuat data yang sama dengan PDF — tidak ada dua sumber.
e. Unduh nonaktif sampai nama pelapor, rekening pelaku, dan kronologi terisi.
   Tidak ada laporan tanpa identitas yang bisa dipakai bank.
f. Di 380px tidak ada scroll horizontal; target sentuh ≥ 40px; kontrol
   ikon-saja punya nama aksesibel.
g. Tidak ada warna hardcoded: semua dari `--lumina-*` / utility token.

## Batas

Saya tidak mengerjakan: engine skor, konten modul, runner simulasi. Halaman
darurat hanya membaca `EvidenceBundle`; ia tidak menghitung atau menggeser skor.
