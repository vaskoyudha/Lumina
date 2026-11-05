import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

/**
 * Privacy — answers the objection a judge raises first about any product that
 * reads private messages. Plain sentences, no badge, no icon row.
 */
export function PrivacyNote() {
  return (
    <section className="bg-[#F4F4F4] py-16 sm:py-20">
      <div className="appnext-container grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h2 className="appnext-h2">Pesan yang kamu periksa tidak dikirim.</h2>
          <p className="appnext-lead mt-3">
            Pemeriksaan berjalan di perangkat ini. Untuk menyusun jawaban,
            pertanyaanmu dan ringkasan temuan dikirim ke model — pesan yang kamu
            periksa tidak pernah ikut. Tidak ada riwayat di server, dan tidak
            ada yang tersimpan setelah tab ditutup.
          </p>

          <ul className="mt-5 flex flex-col gap-2 text-[14px] leading-relaxed text-[#606060]">
            <li>
              <span className="text-[#121212]">
                Tanpa akun untuk memeriksa.
              </span>{" "}
              Companion terbuka langsung. Akun demo hanya untuk memperlihatkan
              alur yang sudah selesai.
            </li>
            <li>
              <span className="text-[#121212]">Tanpa penyimpanan server.</span>{" "}
              Sesi demo hanya cookie bertanda tangan di perangkat ini.
            </li>
            <li>
              <span className="text-[#121212]">Skor deterministik.</span> Angka
              datang dari aturan yang bisa diperiksa, bukan dari model bahasa
              yang bisa keliru menilai.
            </li>
          </ul>
        </div>

        <div className="appnext-card p-6">
          <Lock aria-hidden className="size-5 text-[#1BAB49]" />
          <p className="mt-3 text-[15px] leading-relaxed text-[#121212]">
            &ldquo;Kalau produk ini membaca pesan saya, ke mana datanya
            pergi?&rdquo;
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[#606060]">
            Ke mana-mana tidak. Tidak ada endpoint yang menerima isi pesan. Yang
            tersimpan di perangkat hanya progres belajar, dan itu bisa dihapus
            dengan membersihkan data situs.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="appnext-container py-16 text-center sm:py-20">
      <h2 className="appnext-h2 mx-auto max-w-[22ch] text-balance">
        Coba dengan pesan yang benar-benar kamu terima.
      </h2>
      <p className="appnext-lead mx-auto mt-3 max-w-[48ch]">
        Butuh sepuluh detik. Tidak perlu mendaftar, dan pesan yang kamu periksa
        tidak pernah dikirim ke server.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/companion"
          data-pressable
          className="appnext-button appnext-button--primary group gap-2"
        >
          Periksa pesan
          <ArrowRight
            aria-hidden
            className="arrow-nudge arrow-nudge--right size-4"
          />
        </Link>
        <Link
          href="/masuk"
          data-pressable
          className="appnext-button bg-[#F4F4F4] text-[#121212]"
        >
          Lihat akun demo
        </Link>
      </div>
    </section>
  );
}
