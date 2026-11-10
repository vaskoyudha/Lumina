import type { LokerView } from "@/lib/loker/types";
import {
  alasanRekomendasi,
  kalimatAlasan,
  kalimatRekomendasi,
  rekomendasiDari,
  rekomendasiUntuk,
  ringkasRekomendasi,
} from "@/lib/loker/verdict";

function posting(over: Partial<LokerView> = {}): LokerView {
  return {
    urlKey: "https://id.jobstreet.com/job/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Semarang",
    salaryMin: null,
    salaryMax: null,
    salaryText: null,
    tags: [],
    description: "React.",
    applyUrl: "https://id.jobstreet.com/job/1",
    source: "Jobstreet",
    postedAt: "2026-11-01",
    fetchedAt: "2026-11-10T00:00:00.000Z",
    companyEmail: "hr@maju.co.id",
    domainAgeDays: 400,
    employerKnown: true,
    sentinelStatus: "clean",
    sentinelFlags: [],
    trustScore: 100,
    trustLevel: "high",
    luminaScore: 0,
    luminaRisk: "bersih",
    luminaSignals: [],
    ...over,
  };
}

describe("rekomendasiDari", () => {
  it("treats a clean pair as safe and a low risk as not a caution", () => {
    expect(rekomendasiDari("clean", "bersih")).toBe("aman");
    expect(rekomendasiDari("clean", "rendah")).toBe("aman");
  });

  it("lets one suspicion decide for the caution", () => {
    expect(rekomendasiDari("suspicious", "bersih")).toBe("waspada");
    expect(rekomendasiDari("clean", "mencurigakan")).toBe("waspada");
  });

  it("reserves avoid for a rejection or the highest risk", () => {
    expect(rekomendasiDari("rejected", "bersih")).toBe("hindari");
    expect(rekomendasiDari("clean", "tinggi")).toBe("hindari");
  });
});

describe("alasanRekomendasi", () => {
  it("uses the engine's own labels, not a re-reading of the posting", () => {
    const alasan = alasanRekomendasi(
      posting({
        sentinelStatus: "suspicious",
        sentinelFlags: ["domain_baru"],
        luminaSignals: [{ label: "Meminta biaya pendaftaran", weight: 2 }],
        domainAgeDays: 4,
      }),
    );
    expect(alasan).toEqual([
      "Domain perusahaan masih baru",
      "Meminta biaya pendaftaran",
      "Domain lamaran baru berumur 4 hari",
    ]);
  });

  it("states the absence of findings instead of leaving the badge blank", () => {
    expect(alasanRekomendasi(posting())).toEqual([
      "Kedua penilaian tidak menemukan tanda penipuan.",
    ]);
    expect(alasanRekomendasi(posting({ sentinelStatus: "rejected" }))).toEqual([
      "Salah satu penilaian menolak lowongan ini.",
    ]);
  });

  it("keeps an informational signal out of the safe verdict", () => {
    const alasan = alasanRekomendasi(
      posting({
        luminaSignals: [
          { label: "Tautan tidak ada di daftar domain resmi", weight: 1 },
        ],
      }),
    );
    expect(alasan).toEqual(["Kedua penilaian tidak menemukan tanda penipuan."]);
  });

  it("caps the list so a card stays a card", () => {
    const alasan = alasanRekomendasi(
      posting({
        sentinelStatus: "suspicious",
        sentinelFlags: ["domain_baru", "email_pribadi"],
        luminaSignals: [
          { label: "A", weight: 1 },
          { label: "B", weight: 1 },
        ],
        domainAgeDays: 10,
      }),
    );
    expect(alasan).toHaveLength(3);
  });
});

describe("ringkasRekomendasi", () => {
  it("counts each level and keeps the total honest", () => {
    const ringkasan = ringkasRekomendasi([
      posting(),
      posting({ sentinelStatus: "suspicious" }),
      posting({ luminaRisk: "tinggi" }),
    ]);
    expect(ringkasan).toEqual({
      jumlah: 3,
      aman: 1,
      waspada: 1,
      hindari: 1,
    });
  });

  it("builds the offline sentence from the same counts", () => {
    expect(
      kalimatRekomendasi({ jumlah: 2, aman: 2, waspada: 0, hindari: 0 }),
    ).toMatch(/semuanya aman dilamar/);
    expect(
      kalimatRekomendasi({ jumlah: 3, aman: 1, waspada: 1, hindari: 1 }),
    ).toMatch(/1 aman dilamar, 1 perlu diperiksa, 1 sebaiknya dihindari/);
    expect(
      kalimatRekomendasi({ jumlah: 0, aman: 0, waspada: 0, hindari: 0 }),
    ).toMatch(/tidak ada lowongan/i);
  });
});

describe("rekomendasiUntuk", () => {
  it("reads the two stored verdicts only", () => {
    expect(rekomendasiUntuk(posting({ luminaRisk: "mencurigakan" }))).toBe(
      "waspada",
    );
  });
});

describe("kalimatAlasan", () => {
  it("joins the evidence with exactly one trailing period", () => {
    expect(kalimatAlasan(["Domain baru."])).toBe("Domain baru.");
    expect(kalimatAlasan(["Domain baru", "Email pribadi"])).toBe(
      "Domain baru; Email pribadi.",
    );
  });
});
