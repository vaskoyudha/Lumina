jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock("@/lib/loker/scan-client", () => ({
  triggerScan: jest.fn(),
  pollScan: jest.fn(),
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LokerTool } from "@/components/companion/loker-tool";
import { pollScan, triggerScan } from "@/lib/loker/scan-client";
import type { LokerCorpus, LokerView, ScanStatus } from "@/lib/loker/types";

const mockRefresh = jest.fn();

function posting(over: Partial<LokerView> = {}): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: 10_000_000,
    salaryMax: 15_000_000,
    salaryText: "Rp10-15 jt",
    tags: ["React"],
    description: "Membangun antarmuka React.",
    applyUrl: "https://example.com/1",
    source: "Jobstreet",
    postedAt: "2026-11-01",
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
    ...over,
  };
}

const corpus: LokerCorpus = {
  postings: [
    posting(),
    posting({
      urlKey: "https://example.com/2",
      title: "Backend Engineer",
      company: "PT Mundur",
      sentinelStatus: "suspicious",
      sentinelFlags: ["Biaya pendaftaran"],
      luminaRisk: "rendah",
    }),
  ],
  total: 2,
  capped: false,
};

const baseProps = {
  corpus,
  initialArgs: { query: "" },
  summaryState: "done" as const,
  canRefresh: false,
  saved: [],
  onToggleSave: jest.fn(),
};

describe("LokerTool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(triggerScan).mockResolvedValue("failed");
    jest.mocked(pollScan).mockResolvedValue(null);
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue({ status: 204 }) as unknown as typeof fetch;
  });

  it("prints both verdicts and the disagreement copy", () => {
    render(<LokerTool {...baseProps} />);
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByText(/Sentinel: bersih/)).toBeInTheDocument();
    expect(screen.getByText(/Sentinel: mencurigakan/)).toBeInTheDocument();
    expect(screen.getAllByText(/Lumina: rendah/)).toHaveLength(1);
    expect(
      screen.getByText(
        /penilaian berbeda: sentinel mencurigakan, lumina rendah/i,
      ),
    ).toBeInTheDocument();
  });

  it("hides flagged postings when the toggle is on", async () => {
    const user = userEvent.setup();
    render(<LokerTool {...baseProps} />);
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /opsi lanjutan/i }));
    await user.click(
      screen.getByRole("checkbox", { name: /sembunyikan yang ditandai/i }),
    );
    expect(screen.queryByText("Backend Engineer")).not.toBeInTheDocument();
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
  });

  it("narrows the list from the keyword field", async () => {
    const user = userEvent.setup();
    render(<LokerTool {...baseProps} />);
    await user.type(screen.getByLabelText(/kata kunci lowongan/i), "Backend");
    expect(screen.getByText("Backend Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Frontend Engineer")).not.toBeInTheDocument();
  });

  it("prints the honest cap instead of pretending to show everything", () => {
    render(
      <LokerTool
        {...baseProps}
        corpus={{ postings: [posting()], total: 9, capped: true }}
      />,
    );
    expect(
      screen.getByText(/menampilkan 1 lowongan terbaru dari 9 hasil pindai/i),
    ).toBeInTheDocument();
  });

  it("shows the honest empty state", () => {
    render(<LokerTool {...baseProps} initialArgs={{ query: "tidak-ada" }} />);
    expect(
      screen.getByText(/tidak ada lowongan yang cocok/i),
    ).toBeInTheDocument();
  });

  it("saves a posting through the card action", async () => {
    const user = userEvent.setup();
    const onToggleSave = jest.fn();
    render(<LokerTool {...baseProps} onToggleSave={onToggleSave} />);
    await user.click(
      screen.getByRole("button", { name: /simpan frontend engineer/i }),
    );
    expect(onToggleSave).toHaveBeenCalledWith(corpus.postings[0]);
  });

  it("asks for a fresh login when the session is gone", async () => {
    const user = userEvent.setup();
    jest.mocked(triggerScan).mockResolvedValue("unauthorized");
    render(<LokerTool {...baseProps} canRefresh />);
    await user.click(
      screen.getByRole("button", { name: /pindai ulang lowongan/i }),
    );
    expect(
      await screen.findByText(/sesi berakhir\. masuk lagi untuk memindai/i),
    ).toBeInTheDocument();
    // The results already on screen were never removed.
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
  });

  it("explains the rate limit instead of calling it a failure", async () => {
    const user = userEvent.setup();
    jest.mocked(triggerScan).mockResolvedValue("rate-limited");
    render(<LokerTool {...baseProps} canRefresh />);
    await user.click(
      screen.getByRole("button", { name: /pindai ulang lowongan/i }),
    );
    expect(
      await screen.findByText(/batas pindai tercapai/i),
    ).toBeInTheDocument();
  });

  it("clears the running state after a completed scan without hiding results", async () => {
    const user = userEvent.setup();
    jest.mocked(triggerScan).mockResolvedValue("started");
    jest.mocked(pollScan).mockResolvedValue({
      id: 1,
      startedAt: "2026-11-09T00:00:00.000Z",
      finishedAt: "2026-11-09T00:01:00.000Z",
      status: "ok",
      found: 2,
      added: 2,
      dropped: 0,
      exitCode: 0,
      providerErrors: [],
      postings: 2,
    } as ScanStatus);
    render(<LokerTool {...baseProps} canRefresh />);
    await user.click(
      screen.getByRole("button", { name: /pindai ulang lowongan/i }),
    );
    // Back to idle "Pindai ulang" (no longer "Memindai…"), and results remain.
    expect(
      await screen.findByRole("button", { name: /pindai ulang lowongan/i }),
    ).toHaveTextContent(/pindai ulang/i);
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
  });

  it("keeps the running state when polling times out mid-scan", async () => {
    const user = userEvent.setup();
    jest.mocked(triggerScan).mockResolvedValue("started");
    jest.mocked(pollScan).mockImplementation(async (onTick) => {
      onTick({
        status: "running",
        found: 0,
        added: 0,
        dropped: 0,
        finishedAt: null,
        postings: 2,
      });
      return null;
    });
    render(<LokerTool {...baseProps} canRefresh />);
    await user.click(
      screen.getByRole("button", { name: /pindai ulang lowongan/i }),
    );
    expect(
      await screen.findByText(/pindai berjalan di latar belakang/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pindai gagal dimulai/i)).not.toBeInTheDocument();
  });

  it("does not claim a finished result while the scan is still running", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        status: "running",
        found: 0,
        added: 0,
        dropped: 0,
        finishedAt: null,
        postings: 2,
      }),
    }) as unknown as typeof fetch;
    jest.mocked(pollScan).mockImplementation(async (onTick) => {
      onTick({
        status: "running",
        found: 0,
        added: 0,
        dropped: 0,
        finishedAt: null,
        postings: 2,
      });
      return null;
    });
    render(<LokerTool {...baseProps} canRefresh />);
    expect(
      await screen.findByText(/pindai berjalan di latar belakang/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/pindai terakhir:/i)).not.toBeInTheDocument();
  });

  it("refreshes the snapshot while postings land mid-scan", async () => {
    const user = userEvent.setup();
    jest.mocked(triggerScan).mockResolvedValue("started");
    jest.mocked(pollScan).mockImplementation(async (onTick) => {
      onTick({
        status: "running",
        found: 0,
        added: 0,
        dropped: 0,
        finishedAt: null,
        postings: 5,
      });
      return null;
    });
    render(<LokerTool {...baseProps} canRefresh />);
    await user.click(
      screen.getByRole("button", { name: /pindai ulang lowongan/i }),
    );
    // The scan is still running, but rows are already in the corpus, so the
    // card pulls a fresh RSC snapshot instead of waiting for the final status.
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(
      screen.getByText(/pindai berjalan di latar belakang/i),
    ).toBeInTheDocument();
  });

  it("does not refresh while the corpus size is unchanged", async () => {
    const user = userEvent.setup();
    jest.mocked(triggerScan).mockResolvedValue("started");
    jest.mocked(pollScan).mockImplementation(async (onTick) => {
      onTick({
        status: "running",
        found: 0,
        added: 0,
        dropped: 0,
        finishedAt: null,
        postings: 2,
      });
      return null;
    });
    render(<LokerTool {...baseProps} canRefresh />);
    await user.click(
      screen.getByRole("button", { name: /pindai ulang lowongan/i }),
    );
    expect(
      await screen.findByText(/pindai berjalan di latar belakang/i),
    ).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
