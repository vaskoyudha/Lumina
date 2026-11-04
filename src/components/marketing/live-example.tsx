import { ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Live example — the page's strongest asset.
 *
 * A real Indonesian APK scam message, and the result the engine actually
 * produces for it. Wired to `scoreText()` at build time, so it cannot drift
 * from the product. If the engine changes, this section changes with it.
 */
export function LiveExample({ score, risk }: { score: number; risk: string }) {
  const transcript = [
    {
      from: "pelaku",
      text: "Selamat siang Bu, ini undangan pernikahan anak kami.",
    },
    {
      from: "pelaku",
      text: "Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim, isinya lengkap dengan lokasi acara.",
    },
    { from: "korban", text: "Ini penipuan bukan?" },
  ];

  return (
    <section className="bg-[#F4F4F4] py-16 sm:py-20">
      <div className="appnext-container">
        <div className="max-w-[62ch]">
          <h2 className="appnext-h2">
            Ini pesan yang masuk ke WhatsApp ibu-ibu.
          </h2>
          <p className="appnext-lead mt-3">
            Lumina membaca teksnya, menemukan tiga tanda bahaya, lalu
            menjelaskannya dengan kata-kata yang bisa dimengerti — bukan skor
            tanpa alasan.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="appnext-card overflow-hidden p-0">
            <div className="flex items-center gap-2 border-[#EEEEEE] border-b bg-white px-4 py-3">
              <span className="size-2 rounded-full bg-[#1BAB49]" />
              <p className="text-[12px] font-medium text-[#121212]">
                Pesan masuk
              </p>
              <p className="ml-auto text-[11px] text-[#606060]">+62 8xx-xxxx</p>
            </div>
            <ul className="flex flex-col gap-2.5 bg-[#F4F4F4] px-4 py-5">
              {transcript.map((line, index) => (
                <li
                  key={`${line.from}-${index}`}
                  className={
                    line.from === "pelaku"
                      ? "max-w-[85%] self-start rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5"
                      : "max-w-[85%] self-end rounded-2xl rounded-br-md bg-[#121212] px-3.5 py-2.5"
                  }
                >
                  <p
                    className={
                      line.from === "pelaku"
                        ? "text-[13px] leading-relaxed text-[#121212]"
                        : "text-[13px] leading-relaxed text-white"
                    }
                  >
                    {line.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="appnext-card flex flex-col justify-center p-5">
            <div className="flex items-baseline gap-3">
              <p className="text-[52px] font-medium leading-none tracking-[-1.8px] text-[#000]">
                {score}
                <span className="ml-1 text-[16px] font-light text-[#606060]">
                  /100
                </span>
              </p>
              <span className="rounded-full border border-[#FF5D5D]/40 bg-[#FF5D5D]/10 px-2.5 py-1 text-[11px] font-medium text-[#B42626]">
                {risk}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F4F4F4]">
              <div
                className="h-full rounded-full bg-[#FF5D5D]"
                style={{ width: `${score}%` }}
              />
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-[#121212]">
              <span className="font-medium">Jangan instal file itu.</span> APK
              di luar Play Store bisa membaca SMS OTP dan membuka m-banking
              tanpa kamu sadari.
            </p>

            <ol className="mt-3 flex flex-col gap-1.5 text-[12px] text-[#606060]">
              <li>1. Hapus file dari penyimpanan, bukan hanya dari chat.</li>
              <li>2. Cek mutasi rekening dan SMS OTP hari ini.</li>
              <li>
                3. Konfirmasi ke pengirim lewat nomor yang kamu sudah kenal.
              </li>
            </ol>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/belajar/10"
                data-pressable
                className="inline-flex items-center gap-1 rounded-full bg-[#1BAB49]/10 px-3 py-1.5 text-[12px] font-medium text-[#0F7A34]"
              >
                Pelajari pola ini
                <ArrowRight aria-hidden className="size-3" />
              </Link>
              <Link
                href="/simulasi"
                data-pressable
                className="inline-flex items-center gap-1 rounded-full bg-[#F4F4F4] px-3 py-1.5 text-[12px] font-medium text-[#606060]"
              >
                Coba simulasi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
