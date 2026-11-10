/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionChat } from "@/components/companion/companion-chat";
import * as scoring from "@/lib/scoring/score";

jest.mock("@/lib/scoring/score", () => {
  const actual = jest.requireActual<typeof scoring>("@/lib/scoring/score");
  return { ...actual, scoreWithTrace: jest.fn(actual.scoreWithTrace) };
});

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

let fetchMock: jest.Mock;
const originalFetch = global.fetch;

beforeEach(() => {
  jest.mocked(scoring.scoreWithTrace).mockClear();
  fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/api/companion/answer") {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          text: "Berkas itu berisi kode undangan.",
          toolCalls: [],
        }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

async function upload(
  container: HTMLElement,
  file: File,
): Promise<HTMLInputElement> {
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement | null;
  if (!input) throw new Error("file input missing");
  await userEvent.setup().upload(input, file);
  return input;
}

it("reads a text attachment on the device and sends only its text for a content question", async () => {
  const user = userEvent.setup();
  const { container } = render(<CompanionChat />);
  await upload(
    container,
    new File(["Kode undangan: RAHASIA-42"], "catatan.txt", {
      type: "text/plain",
    }),
  );

  await user.type(
    screen.getByPlaceholderText(/tempel pesan/i),
    "apa isi berkas ini?",
  );
  await user.click(screen.getByRole("button", { name: /^kirim$/i }));

  expect(
    await screen.findByText("Berkas itu berisi kode undangan."),
  ).toBeInTheDocument();
  expect(scoring.scoreWithTrace).not.toHaveBeenCalled();

  const answer = fetchMock.mock.calls.find(
    ([url]) => String(url) === "/api/companion/answer",
  );
  const body = JSON.parse(String(answer?.[1]?.body)) as {
    contentQuestion: boolean;
    attachmentContext: { kind: string; text: string }[];
  };
  expect(body.contentQuestion).toBe(true);
  expect(body.attachmentContext).toEqual([
    { kind: "text", text: "Kode undangan: RAHASIA-42" },
  ]);
  expect(JSON.stringify(body)).not.toContain("catatan.txt");
  expect(
    fetchMock.mock.calls.some(
      ([url]) => String(url) === "/api/companion/voice",
    ),
  ).toBe(false);
});

it("does not score a text attachment that the user asks about", async () => {
  const user = userEvent.setup();
  const { container } = render(<CompanionChat />);
  await upload(
    container,
    new File(["Jangan transfer ke rekening ini"], "pesan.txt", {
      type: "text/plain",
    }),
  );

  await user.type(
    screen.getByPlaceholderText(/tempel pesan/i),
    "jelaskan isi lampiran ini",
  );
  await user.click(screen.getByRole("button", { name: /^kirim$/i }));

  await screen.findByText("Berkas itu berisi kode undangan.");
  expect(scoring.scoreWithTrace).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === "/api/companion/answer",
      ),
    ).toBe(true),
  );
});
