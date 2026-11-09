import type { ModuleContent } from "@/data/modul-schema";

/**
 * Modul 6 — Media sosial & love scam. Facts from `modus.json` (14.229 laporan,
 * ±Rp491 M). The example is a DM thread; the scheme hides behind intimacy, so
 * the dangerous lines are the requests for money, not the compliments.
 */

export const MODUL_06 = {
  no: 6,
  ringkasan:
    "Kenalan online membangun kedekatan dengan cepat memakai identitas dan foto palsu. Setelah korban percaya, muncul kebutuhan darurat: paket tertahan, biaya medis, atau tiket perjalanan. Uang dikirim ke rekening pihak ketiga, lalu pelaku menghilang atau memeras.",
  tujuan: [
    "Mengenali pola love scam dari kecepatan kedekatan dan permintaan uang.",
    "Menjelaskan mengapa menolak video call dan bertemu adalah tanda bahaya.",
    "Memutus hubungan finansial tanpa menyalahkan diri sendiri.",
  ],
  poinKunci: [
    "Kedekatan yang dipaksakan cepat adalah taktik, bukan takdir.",
    "Orang yang benar-benar peduli tidak meminta uang ke rekening pihak ketiga.",
    "Foto profil bisa dicuri; verifikasi lewat video call dan pertemuan nyata.",
    "Pemerasan setelah hubungan berakhir tetap harus dilaporkan, bukan dibayar.",
  ],
  estimasiMenit: 8,
  anatomi: [
    {
      judul: "Kontak pertama datang dengan pujian berlebihan",
      teks: "Akun baru menyukai dan mengomentari semua unggahan, lalu mengajak chat pribadi. Perhatiannya intens dan cepat, jauh sebelum ada alasan untuk percaya.",
    },
    {
      judul: "Identitas dibangun dari foto dan cerita curian",
      teks: "Foto profil diambil dari orang lain, profesi dibuat menarik, dan cerita hidup disusun agar simpati tumbuh. Akun sering menghindari video call dengan alasan sinyal atau pekerjaan.",
    },
    {
      judul: "Hubungan dijalin tanpa pertemuan nyata",
      teks: "Hubungan berjalan berbulan-bulan lewat chat, tetapi selalu ada alasan untuk tidak bertemu. Komunikasi diarahkan ke satu kanal agar pelaku bisa mengontrol cerita.",
    },
    {
      judul: "Kebutuhan darurat muncul tepat saat kepercayaan tinggi",
      teks: "Paket hadiah tertahan di bea cukai, biaya rumah sakit, atau tiket pulang. Nominalnya besar, waktunya mendesak, dan korban merasa harus menolong orang yang dicintainya.",
    },
    {
      judul: "Uang dikirim, lalu pelaku menghilang atau memeras",
      teks: "Pembayaran diminta ke rekening teman atau agen, bukan nama pelaku. Setelah uang masuk, pelaku menghilang; bila korban menolak, ancaman menyebarkan foto atau percakapan dipakai.",
    },
  ],
  contohJudul: "Contoh percakapan (dianonimkan) — bagian merah yang berbahaya",
  contohJenis: "pesan",
  contohSumber: "DM Instagram · akun baru · foto profil tidak konsisten",
  contohIsi: [
    { text: "Hai, aku lihat profilmu, kita cocok. ", berbahaya: false },
    {
      text: "Aku sedang di luar negeri, butuh bantuan biaya bea cukai paket untukmu. ",
      berbahaya: true,
    },
    { text: "Kirim ke rekening temanku dulu ya.", berbahaya: true },
  ],
  checklist: [
    "Mengaku sayang atau serius terlalu cepat, sebelum pernah bertemu",
    "Menolak video call, bertemu, atau memperlihatkan wajah secara langsung",
    "Meminta uang untuk paket, biaya medis, tiket, atau bea cukai",
    "Rekening tujuan atas nama pihak ketiga, bukan nama orang yang kamu kenal",
    "Cerita berubah-ubah dan selalu ada alasan untuk menunda pertemuan",
  ],
  kuis: [
    {
      id: "love-q1",
      prompt:
        "Kenalan online mengaku sayang setelah dua hari dan meminta uang untuk paket. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Kirim uang karena hubungannya terasa tulus" },
        {
          id: "b",
          label: "Tolak, berhenti mengirim uang, dan verifikasi identitasnya",
        },
        { id: "c", label: "Kirim setengahnya sebagai tanda percaya" },
      ],
      correctId: "b",
      rationale:
        "Kedekatan yang dipaksakan cepat adalah bagian dari taktik. Permintaan uang untuk paket adalah pola love scam yang paling sering dilaporkan.",
    },
    {
      id: "love-q2",
      prompt:
        "Orang itu selalu menolak video call dengan alasan sinyal buruk. Apa yang kamu lakukan sekarang?",
      options: [
        { id: "a", label: "Percaya saja karena chat-nya konsisten" },
        {
          id: "b",
          label:
            "Anggap identitasnya belum terverifikasi dan jangan kirim uang",
        },
        { id: "c", label: "Minta foto baru sebagai bukti" },
      ],
      correctId: "b",
      rationale:
        "Foto bisa dicuri dan cerita bisa dilatih. Video call bukan jaminan mutlak, tetapi penolakan berulang adalah alasan kuat untuk tidak mempercayai permintaan finansial.",
    },
    {
      id: "love-q3",
      prompt:
        "Rekening yang diminta atas nama teman pelaku, bukan namanya sendiri. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label: "Kirim karena katanya rekening pribadinya bermasalah",
        },
        {
          id: "b",
          label: "Berhenti; rekening pihak ketiga adalah tanda bahaya",
        },
        { id: "c", label: "Minta rekening lain yang juga atas nama teman" },
      ],
      correctId: "b",
      rationale:
        "Rekening pihak ketiga mempersulit penelusuran dan melindungi identitas pelaku. Tidak ada alasan sah untuk meminta uangmu masuk ke nama orang lain.",
    },
    {
      id: "love-q4",
      prompt:
        "Setelah kamu menolak mengirim uang, pelaku mengancam menyebarkan fotomu. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Jangan bayar; simpan bukti ancaman dan laporkan ke platform serta polisi",
        },
        { id: "b", label: "Bayar supaya ancamannya berhenti" },
        { id: "c", label: "Hapus akun dan berharap masalahnya hilang" },
      ],
      correctId: "a",
      rationale:
        "Membayar pemerasan tidak menghentikan ancaman; ia menandakan korban masih bisa ditekan. Bukti ancaman adalah dasar laporan dan penghapusan konten.",
    },
    {
      id: "love-q5",
      prompt:
        "Kamu sudah mengirim uang ke rekening pihak ketiga. Apa yang kamu lakukan sekarang?",
      options: [
        {
          id: "a",
          label:
            "Simpan semua bukti, lapor bank, IASC, dan polisi; jangan kirim lagi",
        },
        { id: "b", label: "Cari pelaku lewat akun lain untuk meminta kembali" },
        { id: "c", label: "Diamkan karena takut diketahui keluarga" },
      ],
      correctId: "a",
      rationale:
        "Bukti chat, rekening, dan transfer adalah dasar penelusuran. Rasa takut membuat pelaku bebas mengulangi pola yang sama pada orang lain.",
    },
  ],
  lapor: [
    "Hentikan semua transfer dan jangan menuruti permintaan uang atau ancaman.",
    "Simpan tangkapan layar percakapan, profil, rekening tujuan, dan bukti transfer.",
    "Laporkan akun ke platform media sosial dan bank penerima untuk penelusuran.",
    "Laporkan ke IASC dan polisi setempat; sertakan bukti pemerasan bila ada.",
  ],
  scenarioId: null,
} satisfies ModuleContent;
