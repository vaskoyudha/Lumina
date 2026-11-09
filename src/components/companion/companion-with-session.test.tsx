jest.mock("@/lib/auth/server-session", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/loker/store", () => ({ loadCorpus: jest.fn() }));
jest.mock("@/components/companion/companion-chat", () => ({
  CompanionChat: (props: {
    corpus: { postings: unknown[]; total: number; capped: boolean };
  }) => (
    <div
      data-testid="chat"
      data-total={props.corpus.total}
      data-count={props.corpus.postings.length}
      data-capped={String(props.corpus.capped)}
    />
  ),
}));

import { render, screen } from "@testing-library/react";
import { CompanionWithSession } from "@/components/companion/companion-with-session";
import { getSession } from "@/lib/auth/server-session";
import { loadCorpus } from "@/lib/loker/store";
import type { LokerView } from "@/lib/loker/types";

function posting(): LokerView {
  return {
    urlKey: "https://example.com/1",
    title: "Frontend Engineer",
    company: "PT Maju",
    location: "Jakarta",
    salaryMin: null,
    salaryMax: null,
    salaryText: null,
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

describe("CompanionWithSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes the capped corpus to the chat", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    jest.mocked(loadCorpus).mockResolvedValue({
      postings: [posting()],
      total: 5,
    });

    render(await CompanionWithSession({ searchParams: Promise.resolve({}) }));
    const chat = screen.getByTestId("chat");
    expect(chat).toHaveAttribute("data-total", "5");
    expect(chat).toHaveAttribute("data-count", "1");
    expect(chat).toHaveAttribute("data-capped", "true");
  });

  it("falls back to an empty corpus when the database is unavailable", async () => {
    jest.mocked(getSession).mockResolvedValue(null);
    jest.mocked(loadCorpus).mockRejectedValue(new Error("down"));

    render(await CompanionWithSession({ searchParams: Promise.resolve({}) }));
    const chat = screen.getByTestId("chat");
    expect(chat).toHaveAttribute("data-total", "0");
    expect(chat).toHaveAttribute("data-count", "0");
    expect(chat).toHaveAttribute("data-capped", "false");
  });
});
