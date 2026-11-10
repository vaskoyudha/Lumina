import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LokerCard } from "@/components/companion/loker-card";
import type { LokerView } from "@/lib/loker/types";

const posting = (over: Partial<LokerView> = {}): LokerView => ({
  urlKey: "https://id.jobstreet.com/job/1",
  title: "Frontend Engineer",
  company: "PT Maju",
  location: "Jakarta",
  salaryMin: null,
  salaryMax: null,
  salaryText: null,
  tags: [],
  description: "React.",
  applyUrl: "https://id.jobstreet.com/job/1",
  source: "Jobstreet",
  postedAt: "2026-11-01",
  fetchedAt: "2026-11-10T00:00:00.000Z",
  companyEmail: null,
  domainAgeDays: null,
  employerKnown: true,
  sentinelStatus: "clean",
  sentinelFlags: [],
  trustScore: 100,
  trustLevel: "high",
  luminaScore: 0,
  luminaRisk: "bersih",
  luminaSignals: [],
  ...over,
});

async function renderOpen(over: Partial<LokerView> = {}) {
  const user = userEvent.setup();
  render(
    <ul>
      <LokerCard
        posting={posting(over)}
        saved={false}
        onToggleSave={() => {}}
      />
    </ul>,
  );
  await user.click(screen.getByRole("button", { name: /lihat detail/i }));
  return user;
}

describe("LokerCard", () => {
  it("prints missing audit fields instead of inventing them", async () => {
    await renderOpen();
    expect(screen.getByText("Tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByText("Tidak diketahui")).toBeInTheDocument();
  });

  it("does not render an apply link for a non-http url", async () => {
    await renderOpen({ applyUrl: "mailto:hr@maju.co.id" });
    expect(
      screen.queryByRole("link", { name: /buka lamaran/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Tautan lamaran tidak tersedia."),
    ).toBeInTheDocument();
  });

  it("links to the real board posting", async () => {
    await renderOpen();
    expect(screen.getByRole("link", { name: /buka lamaran/i })).toHaveAttribute(
      "href",
      "https://id.jobstreet.com/job/1",
    );
  });

  it("recommends a clean posting and says what the engines found", async () => {
    await renderOpen();
    expect(screen.getByText("Aman dilamar")).toBeInTheDocument();
    expect(
      screen.getByText(/kedua penilaian tidak menemukan tanda penipuan/i),
    ).toBeInTheDocument();
  });

  it("downgrades the recommendation and lists the evidence for it", async () => {
    await renderOpen({
      sentinelStatus: "suspicious",
      sentinelFlags: ["domain_baru"],
      domainAgeDays: 4,
    });
    expect(screen.getByText("Periksa dulu")).toBeInTheDocument();
    // The flag appears twice on purpose: in the recommendation line and in the
    // expanded "Catatan Sentinel" list.
    expect(
      screen.getAllByText(/domain perusahaan masih baru/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/domain lamaran baru berumur 4 hari/i),
    ).toBeInTheDocument();
  });
});
