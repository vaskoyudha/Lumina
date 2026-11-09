import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilLoker } from "@/components/profil/profil-loker";
import { toggleSaved } from "@/lib/loker/saved";
import type { LokerView } from "@/lib/loker/types";

function posting(): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: null,
    salaryMax: null,
    salaryText: "Rp10-15 jt",
    tags: [],
    description: "Membangun antarmuka.",
    applyUrl: null,
    source: "Jobstreet",
    postedAt: null,
    fetchedAt: "2026-11-09T00:00:00.000Z",
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
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("ProfilLoker", () => {
  it("shows the honest empty state", async () => {
    render(<ProfilLoker />);
    expect(
      await screen.findByText(/belum ada lowongan tersimpan/i),
    ).toBeInTheDocument();
  });

  it("lists a saved posting and removes it", async () => {
    toggleSaved(posting());
    const user = userEvent.setup();
    render(<ProfilLoker />);

    expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText(/Sentinel: bersih/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /hapus frontend engineer/i }),
    );
    expect(screen.queryByText("Frontend Engineer")).not.toBeInTheDocument();
    expect(
      screen.getByText(/belum ada lowongan tersimpan/i),
    ).toBeInTheDocument();
  });
});
