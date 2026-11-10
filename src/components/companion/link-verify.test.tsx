import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LinkVerify } from "@/components/companion/link-verify";

const realFetch = global.fetch;

function json(body: unknown): Response {
  return { json: async () => body } as Response;
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = realFetch;
});

describe("LinkVerify", () => {
  it("sends nothing until the reader asks", () => {
    render(<LinkVerify url="https://evil.top/x" />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends only the URL and prints the verdict", async () => {
    const user = userEvent.setup();
    const fetchMock = jest.fn().mockResolvedValue(
      json({
        ok: true,
        verdict: {
          verdict: "Risky",
          score: 12,
          badReasons: ["Risky TLD"],
          goodReasons: [],
          incomplete: false,
          domain: "evil.top",
        },
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<LinkVerify url="https://evil.top/x" />);
    await user.click(screen.getByRole("button", { name: /periksa tautan/i }));

    expect(await screen.findByText("Berisiko")).toBeInTheDocument();
    expect(screen.getByText("12/100")).toBeInTheDocument();
    expect(screen.getByText("Risky TLD")).toBeInTheDocument();
    expect(
      screen.getByText(/hanya tautan ini yang dikirim/i),
    ).toBeInTheDocument();

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      url: "https://evil.top/x",
    });
  });

  it("explains a scanner timeout", async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        json({ ok: false, error: "upstream-timeout" }),
      ) as unknown as typeof fetch;

    render(<LinkVerify url="https://evil.top/x" />);
    await user.click(screen.getByRole("button", { name: /periksa tautan/i }));

    expect(
      await screen.findByText(/melewati batas waktu/i),
    ).toBeInTheDocument();
  });
});
