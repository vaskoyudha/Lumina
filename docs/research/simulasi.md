# Riset pengalaman simulasi Person 3

Ditinjau 5 November 2026. Cakupan: satu skenario Level 1, bukan penambahan level.
Arahan pemilik stream: pengalaman simulasi boleh menjadi acuan bagi permukaan
lain. Perubahan ini tidak menyunting shell, token global, atau pekerjaan stream lain.

## Sumber primer dan keputusan desain

| Sumber | Pengamatan pada sumber | Penerapan di Lumina |
|---|---|---|
| [Be Scam Ready — pembuat game, Filament Games](https://www.filamentgames.com/project/be-scam-ready) | Skenario singkat dengan tokoh, pilihan, dan konsekuensi di lingkungan latihan. | Raka sedang menunggu hadiah untuk Ibu; pesan pengantar menciptakan taruhan yang dekat dengan keseharian. |
| [Be Scam Ready — situs game Google](https://bescamready.withgoogle.com/intl/en) | Pemain mengalami manipulasi dan mengumpulkan kartu taktik. | Kartu taktik dibuka setelah keputusan; kutipan chat dihubungkan dengan cara menolaknya. |
| [Bad News — Cambridge Social Decision-Making Lab](https://inoculation.science/inoculation-games/bad-news/) | Roleplay memakai dua meter dan konsekuensi pilihan untuk memperlihatkan teknik manipulasi. | Panik merespons pilihan, sedangkan intrusi hanya bergerak setelah aplikasi dan izin sensitif aktif. Tidak ada skor akurasi atau klaim peningkatan kemampuan yang belum diukur. |
| [W3C — Timing Adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html) | Batas waktu sebaiknya bisa dinonaktifkan atau dikendalikan. | Pilihan Santai sebelum mulai, kontrol jeda, serta jeda otomatis saat tab disembunyikan. |
| [Bank Indonesia — modus APK melalui WhatsApp](https://www.bi.go.id/id/publikasi/ruang-media/cerita-bi/Pages/modus-penipuan-online-apk.aspx) | Pemasangan APK dan pemberian izin memungkinkan akses ke data sensitif. | Menerima pesan saja tidak menaikkan intrusi. Jalur yang menolak APK tidak dipaksa mencabut izin aplikasi yang tak pernah dipasang. |
| [FTC — mengenali dan menghindari phishing](https://consumer.ftc.gov/articles/how-recognize-avoid-phishing-scams) | Verifikasi melalui kanal yang dicari sendiri, jangan mengikuti kontak yang disodorkan pesan. | Cek pesanan di aplikasi yang dibuka sendiri menghasilkan jalur berbeda dari bertanya kepada pengirim. |

Keputusan desain di kolom terakhir adalah interpretasi untuk produk ini, bukan
bukti bahwa versi Lumina sudah meningkatkan kemampuan pengguna. Sumber riset
menjadi inspirasi mekanik; cerita, percakapan, dan komponen dibuat untuk Lumina.

## Loop bermain

1. Briefing memberi peran, tujuan, perkiraan durasi, dan mode.
2. Chat muncul bertahap. Pemain dapat menampilkan pesan segera dan memeriksa
   jenis lampiran tanpa mengunduh atau memasang apa pun.
3. Pilihan mengubah jalur: verifikasi mandiri, terbawa desakan, atau pemasangan
   APK fiktif. Setiap pilihan memberi alasan langsung.
4. Jika akses aplikasi aktif, dek isolasi dan izin menjadi relevan. Setelah
   isolasi, intrusi berhenti; itu bukan jaminan perangkat sudah bersih.
5. Berkas bukti memerlukan dua item aman. Opsi OTP/PIN sengaja ditolak dengan
   penjelasan, tanpa meminta kode nyata.
6. Akhir misi membedakan pencegahan, awal pemulihan, dan kode telanjur dibagikan.
   Pemain melihat jejak keputusan, kartu taktik, serta empat poin debrief.
7. Coba jalur lain mengembalikan seluruh state ke briefing tanpa menyimpan data.

## Batas implementasi

Tetap satu ID publik: `/simulasi/L1-kurir-apk`. Tiga akhir adalah cabang dari misi
yang sama. Tidak ada akun, jaringan ke pelaku, unduhan APK, kode OTP nyata,
panggilan LLM, backend baru, atau dependensi tambahan.

Mode Tantangan adalah tekanan fiktif, bukan pengukuran infeksi. Mode Santai
mematikan kenaikan intrusi berbasis waktu. Panik tetap menjelaskan dampak pilihan;
tombol Tarik napas sekali per putaran memperlihatkan manfaat mengambil jeda.
Tidak ada waktu total, grading, ranking pemain, atau hadiah uang fiktif.

## Batas evaluasi

Pemeriksaan otomatis dapat membuktikan jalur, perubahan state, cleanup timer,
label aksesibel, serta layout pada ukuran yang diuji. Kesenangan bermain,
kejelasan cerita, dan kemampuan mengenali penipuan perlu ditinjau manusia.
Perkiraan durasi 3–5 menit adalah perkiraan membaca, bukan hasil uji pengguna.
