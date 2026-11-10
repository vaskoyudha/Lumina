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

const APK =
  "Buka Undangan-Pernikahan.apk sekarang sebelum undangan kedaluwarsa.";

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/companion/voice") {
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => {
            let sent = false;
            return {
              read: async () => {
                if (sent) return { done: true, value: undefined };
                sent = true;
                return {
                  done: false,
                  value: new TextEncoder().encode("Jangan buka berkas itu."),
                };
              },
            };
          },
        },
      };
    }
    if (url === "/api/companion/answer") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          text: "Saya buka template laporannya.",
          toolCalls: [{ id: "report-1", name: "report_draft", arguments: {} }],
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

it("offers report_draft only after a verdict exists", async () => {
  const user = userEvent.setup();
  render(<CompanionChat />);

  await user.type(screen.getByPlaceholderText(/tempel pesan/i), APK);
  await user.click(screen.getByRole("button", { name: /^kirim$/i }));
  await screen.findByText(/Jangan buka berkas itu/i);

  await user.type(
    screen.getByPlaceholderText(/tempel pesan/i),
    "tolong buatkan laporan",
  );
  await user.click(screen.getByRole("button", { name: /^kirim$/i }));

  expect(
    await screen.findByText(/Saya buka template laporannya/i),
  ).toBeInTheDocument();
  expect(
    (await screen.findAllByRole("button", { name: /buat template laporan/i }))
      .length,
  ).toBeGreaterThan(0);

  const answerCall = fetchMock.mock.calls.find(
    ([url]) => String(url) === "/api/companion/answer",
  );
  const body = JSON.parse(String(answerCall?.[1]?.body)) as {
    hasVerdict: boolean;
  };
  expect(body.hasVerdict).toBe(true);
});
