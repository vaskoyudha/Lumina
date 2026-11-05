const STEPS = [
  {
    title: "Ceritakan",
    body: "Tempel pesan, tautan, atau ceritakan telepon yang kamu terima. Tidak perlu tahu istilah teknisnya.",
  },
  {
    title: "Pahami",
    body: "Lumina menunjuk kalimat mana yang berbahaya dan kenapa. Bank tidak pernah minta OTP — itu contohnya.",
  },
  {
    title: "Bertindak",
    body: "Dapatkan langkah berurutan: apa yang harus dilakukan sekarang, ke mana melapor, dan modul mana yang menjelaskan polanya.",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="cara-kerja" className="appnext-container py-16 sm:py-20">
      <div className="max-w-[58ch]">
        <h2 className="appnext-h2">Tiga langkah, tanpa formulir rumit.</h2>
      </div>

      <ol className="mt-8 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative">
            <span className="text-[12px] font-medium tracking-[0.1em] text-[#1BAB49]">
              0{index + 1}
            </span>
            <h3 className="mt-2 text-[20px] font-medium text-[#000]">
              {step.title}
            </h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#606060]">
              {step.body}
            </p>
            {index < STEPS.length - 1 ? (
              <span
                aria-hidden
                className="mt-4 hidden h-px w-full bg-[#EEEEEE] sm:block"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
