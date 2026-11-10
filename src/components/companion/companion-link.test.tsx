/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionChat } from "@/components/companion/companion-chat";

jest.mock("@/lib/companion/history", () => ({
  listConversationHistory: jest.fn(async () => ({
    ok: true,
    conversations: [],
  })),
  saveConversationHistory: jest.fn(async () => ({ ok: true })),
}));

jest.mock("next/navigation", () => ({
  usePathname: () => "/companion",
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  );
  return { __esModule: true, default: MockLink };
});

jest.setTimeout(20_000);

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  let answerStep = 0;
  fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/link/verify") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          verdict: {
            verdict: "Safe",
            score: 98,
            badReasons: [],
            goodReasons: ["Domain lama."],
            incomplete: false,
            domain: "example.com",
          },
        }),
      };
    }
    if (url === "/api/companion/answer") {
      answerStep += 1;
      if (answerStep === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            text: "",
            toolCalls: [
              {
                id: "ask-1",
                name: "ask_link_check",
                arguments: { url: "https://example.com" },
              },
            ],
          }),
        };
      }
      if (answerStep === 2) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            text: "",
            toolCalls: [
              {
                id: "check-1",
                name: "check_link",
                arguments: { url: "https://example.com" },
              },
            ],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          text: "Tautan itu aman menurut pemindai.",
          toolCalls: [],
        }),
      };
    }
    return { ok: false, status: 503, body: null, json: async () => ({}) };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

it("asks before sending a link to the phishing scanner", async () => {
  const user = userEvent.setup();
  render(<CompanionChat />);

  await user.type(
    screen.getByPlaceholderText(/tempel pesan/i),
    "tolong cek tautan https://example.com aman?",
  );
  await user.click(screen.getByRole("button", { name: /^kirim$/i }));

  expect(
    (
      await screen.findAllByText(
        /periksa tautan ini dengan pemindai phishing\?/i,
      )
    ).length,
  ).toBeGreaterThan(0);
  expect(screen.getAllByText("https://example.com").length).toBeGreaterThan(0);
  expect(screen.getByText("Proses")).toBeInTheDocument();
  expect(
    screen.getByText("Menunggu persetujuan sebelum URL dikirim ke pemindai"),
  ).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.some(([url]) => String(url) === "/api/link/verify"),
  ).toBe(false);

  const firstAnswer = fetchMock.mock.calls.find(
    ([url]) => String(url) === "/api/companion/answer",
  );
  expect(
    (JSON.parse(String(firstAnswer?.[1]?.body)) as { linkApproved?: string })
      .linkApproved,
  ).toBeUndefined();

  await user.click(screen.getByRole("button", { name: /ya, periksa/i }));

  expect(
    await screen.findByText(/tautan itu aman menurut pemindai/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Memindai example.com dengan url.vet"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Menyusun jawaban dari hasil pemindaian"),
  ).toBeInTheDocument();
  expect(screen.getAllByText("98/100").length).toBeGreaterThan(0);
  expect(
    fetchMock.mock.calls.filter(([url]) => String(url) === "/api/link/verify"),
  ).toHaveLength(1);

  const approved = fetchMock.mock.calls
    .filter(([url]) => String(url) === "/api/companion/answer")
    .map(
      ([, init]) =>
        JSON.parse(String((init as RequestInit).body)) as {
          linkApproved?: string;
        },
    )
    .find((body) => body.linkApproved);
  expect(approved?.linkApproved).toBe("https://example.com");
});
