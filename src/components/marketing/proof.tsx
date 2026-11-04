import { MODUS } from "@/lib/modus";

/**
 * Proof — sourced figures only, read from `modus.json`.
 *
 * No invented "99% accuracy". Every number here comes from the IASC data the
 * proposal already cites, and the note says so.
 */
export function Proof() {
  const apk = MODUS.find((m) => m.no === 10);
  const totalReports = MODUS.reduce((sum, m) => sum + (m.laporan ?? 0), 0);
  const totalLaporan = new Intl.NumberFormat("id-ID").format(totalReports);

  const figures = [
    {
      value: totalLaporan,
      label: "laporan penipuan digital tercatat di data IASC",
      note: "dari 12 modus yang kami tangani",
    },
    {
      value: apk?.laporan
        ? new Intl.NumberFormat("id-ID").format(apk.laporan)
        : "3.684",
      label: "laporan khusus file APK lewat WhatsApp",
      note: `estimasi kerugian ${apk?.kerugian ?? "±Rp134 M"}`,
    },
    {
      value: "12",
      label: "modus penipuan dipetakan ke kurikulum",
      note: "satu modul lengkap, sisanya bertahap",
    },
  ];

  return (
    <section className="appnext-container py-16 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <h2 className="appnext-h2">Angkanya dari OJK, bukan dari kami.</h2>
          <p className="appnext-lead mt-3">
            Kami tidak memakai klaim akurasi yang belum diukur. Yang ada di
            halaman ini adalah jumlah laporan dan estimasi kerugian dari data
            IASC yang sudah ada di proposal.
          </p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-3">
          {figures.map((figure) => (
            <div key={figure.label} className="appnext-card p-5">
              <dd className="text-[34px] font-medium leading-none tracking-[-1px] text-[#000]">
                {figure.value}
              </dd>
              <dt className="mt-2 text-[13px] leading-snug text-[#606060]">
                {figure.label}
              </dt>
              <p className="mt-2 text-[11px] text-[#606060]/80">
                {figure.note}
              </p>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-6 text-[11px] text-[#606060]">
        Sumber: OJK (IASC, Satgas PASTI), Kementerian Komunikasi dan Digital,
        BSSN, Polri. Data lengkap per modus ada di{" "}
        <code className="text-[#121212]">src/data/modus.json</code>.
      </p>
    </section>
  );
}
