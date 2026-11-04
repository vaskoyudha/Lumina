import type { QuizQuestion } from "@/components/belajar/quiz";

/**
 * Modul 10 — File APK via WhatsApp. The one fully written module (§5-B step 2,
 * §11.2 build order). Content is anonymised Indonesian; no real names or
 * numbers. Written against the anatomy/checklist/quiz/report shape in plan §5.
 */
export interface MessageSegment {
  text: string;
  /** Segment the learner should learn to distrust — rendered in danger colour. */
  berbahaya: boolean;
}

export interface ModuleContent {
  no: number;
  anatomi: { judul: string; teks: string }[];
  contohPesan: MessageSegment[];
  contohJudul: string;
  checklist: string[];
  kuis: QuizQuestion[];
  lapor: string[];
  scenarioId: string | null;
}

export const MODUL_10: ModuleContent = {
  no: 10,
  anatomi: [
    {
      judul: "Kontak awal dari nomor tak dikenal",
      teks: "Pesan masuk dari nomor yang tidak ada di kontak, sering dengan foto profil kosong atau logo instansi. Sapaan umum: “Yth. Bapak/Ibu”, tanpa menyebut nama kamu.",
    },
    {
      judul: "Umpan berupa file .apk",
      teks: "Pesan berisi lampiran berekstensi .apk yang menyamar sebagai undangan pernikahan, bukti pengiriman paket, surat tilang, atau dokumen resmi. File itu bukan dokumen — itu aplikasi Android.",
    },
    {
      judul: "Korban diminta instal dan memberi izin",
      teks: "Pelaku mengarahkan korban menginstal file itu lalu mengizinkan akses SMS, notifikasi, dan aksesibilitas. Izin itulah kuncinya: sekali diberikan, aplikasi bisa membaca kode OTP yang masuk lewat SMS.",
    },
    {
      judul: "Data dicuri dari dalam HP korban sendiri",
      teks: "Malware membaca SMS OTP, notifikasi perbankan, dan kadang layar m-banking. Pelaku tidak perlu membobol bank — mereka memakai HP korban sebagai jembatan masuk.",
    },
    {
      judul: "Uang bergerak tanpa terasa",
      teks: "Pelaku mentransfer atau mengubah data rekening dari sesi yang sudah terautentikasi. Korban baru sadar ketika saldo berkurang atau ada notifikasi transaksi yang tidak ia lakukan.",
    },
  ],
  contohJudul: "Contoh pesan (dianonimkan) — bagian merah yang berbahaya",
  contohPesan: [
    { text: "Selamat siang Bapak/Ibu, kami dari ekspedisi. ", berbahaya: false },
    {
      text: "Paket Anda tertahan, silakan cek resi di aplikasi ini: ",
      berbahaya: true,
    },
    { text: "Bukti-Pengiriman.apk (18 MB)", berbahaya: true },
    {
      text: ". Instal untuk melihat foto paket Anda. Terima kasih.",
      berbahaya: true,
    },
  ],
  checklist: [
    "File berekstensi .apk dikirim lewat chat, bukan dari Play Store",
    "Pengirim nomor tak dikenal, tidak bisa ditelepon balik, atau mengaku instansi",
    "Diminta menginstal lalu mengizinkan akses SMS / notifikasi / aksesibilitas",
    "Bahasa mendesak: “sekarang”, “hari ini juga”, “kalau tidak, paket hangus”",
    "Nama file tidak masuk akal — undangan atau resi kok berupa aplikasi?",
  ],
  kuis: [
    {
      id: "apk-q1",
      prompt:
        "Nomor asing mengirim Undangan-Pernikahan.apk. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Buka, mungkin dari kerabat yang nomornya baru" },
        { id: "b", label: "Instal dan buka undangannya" },
        {
          id: "c",
          label:
            "Hapus tanpa instal, lalu konfirmasi ke pengirim lewat nomor yang kamu kenal",
        },
      ],
      correctId: "c",
      rationale:
        "Undangan asli tidak pernah berupa aplikasi. File .apk di luar Play Store bisa membaca SMS OTP begitu izin diberikan — hapus, jangan pernah instal dari chat.",
    },
    {
      id: "apk-q2",
      prompt:
        "“Kurir” mengirim Paket-Kurir.apk supaya kamu bisa melacak paket. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Instal, supaya paket cepat sampai" },
        {
          id: "b",
          label: "Cek resi lewat aplikasi resmi ekspedisi atau marketplace, abaikan file itu",
        },
        { id: "c", label: "Balas chat dan minta kurir datang langsung" },
      ],
      correctId: "b",
      rationale:
        "Ekspedisi resmi tidak membagikan aplikasi lewat chat. Pelacakan selalu lewat aplikasi resmi atau situs resmi — file .apk dari “kurir” adalah malware yang menyamar.",
    },
    {
      id: "apk-q3",
      prompt:
        "Kakakmu sendiri mengirim file APK itu lewat WhatsApp. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Langsung instal, ini dari keluarga" },
        { id: "b", label: "Teruskan ke grup keluarga supaya semua tahu" },
        {
          id: "c",
          label: "Telepon kakakmu lewat nomor biasa dan tanya dulu sebelum menyentuh file itu",
        },
      ],
      correctId: "c",
      rationale:
        "Nomor keluarga bisa dibajak dan dipakai menyebar file yang sama. Konfirmasi lewat kanal berbeda (telepon biasa) memutus rantai itu — jangan instal hanya karena pengirimnya dikenal.",
    },
    {
      id: "apk-q4",
      prompt:
        "Kamu sudah terlanjur menginstal APK itu dan sempat memberi izin SMS. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Diamkan saja, mungkin tidak terjadi apa-apa" },
        { id: "b", label: "Terus pakai HP seperti biasa sambil menunggu" },
        {
          id: "c",
          label:
            "Matikan data/Wi-Fi, hapus aplikasi itu, cek mutasi rekening, lalu hubungi bank lewat nomor resmi",
        },
      ],
      correctId: "c",
      rationale:
        "Mematikan koneksi menghentikan malware mengirim data keluar. Setelah aplikasi dihapus, periksa mutasi dan hubungi bank lewat nomor resmi di kartu atau situs bank — jangan pakai nomor dari chat pelaku.",
    },
  ],
  lapor: [
    "Hapus file .apk itu dari chat dan dari folder unduhan — jangan dibuka.",
    "Kalau sempat terinstal: matikan data/Wi-Fi, hapus aplikasinya, cabut semua izin SMS dan aksesibilitas.",
    "Hubungi bank atau e-wallet lewat nomor resmi, minta blokir sementara dan cek mutasi terakhir.",
    "Laporkan nomor pelaku ke IASC (iasc.ojk.go.id) dan blokir nomornya di WhatsApp.",
  ],
  scenarioId: "L1-kurir-apk",
};
