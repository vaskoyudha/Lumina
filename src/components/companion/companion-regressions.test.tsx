import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionChat } from "@/components/companion/companion-chat";
import { saveConversationHistory } from "@/lib/companion/history";
import { AnswerRequestSchema } from "@/lib/contracts/answer";

jest.setTimeout(15000);
jest.mock("@/lib/companion/history", () => ({
  listConversationHistory: jest.fn(async () => ({
    ok: true,
    conversations: [],
  })),
  saveConversationHistory: jest.fn(async () => ({ ok: true })),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
  usePathname: () => "/companion",
}));
const originalFetch = global.fetch;
let fetchMock: jest.Mock;
beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = jest.fn(async (url: string) =>
    url === "/api/companion/answer"
      ? {
          ok: true,
          json: async () => ({
            text: "Penjelasan untuk apa itu pinjol.",
            toolCalls: [],
          }),
        }
      : url === "/api/companion/vision"
        ? {
            ok: true,
            json: async () => ({
              ok: true,
              text: "Selamat, kamu mendapat hadiah undian.",
            }),
          }
        : {
            ok: false,
            status: 503,
            json: async () => ({ error: "not-configured" }),
          },
  );
  global.fetch = fetchMock as typeof fetch;
});
afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

async function send(text: string) {
  const requests = fetchMock.mock.calls.length;
  const field = screen.getByRole("textbox", { name: "Pesan" });
  fireEvent.change(field, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: /^kirim$/i }));
  await waitFor(() =>
    expect(fetchMock.mock.calls.length).toBeGreaterThan(requests),
  );
  await waitForIdle();
}
async function waitForIdle() {
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: /^kirim$/i })
        .querySelector(".animate-spin"),
    ).toBeNull(),
  );
}
it("removes the original question and its answer from model history after a forced check", async () => {
  const user = userEvent.setup();
  render(<CompanionChat />);
  await send("apa itu pinjol?");
  await user.click(
    await screen.findByRole("button", { name: /periksa sebagai pesan/i }),
  );
  await waitForIdle();
  await send("halo");
  const calls = fetchMock.mock.calls.filter(
    ([url]) => url === "/api/companion/answer",
  );
  const body = JSON.parse(String(calls.at(-1)?.[1]?.body));
  expect(body.lane).toBe("obrolan");
  expect(JSON.stringify(body.history)).not.toContain("pinjol");
});
it("uses the latest clean verdict without tactics from an older APK check", async () => {
  render(<CompanionChat />);
  await send("Buka Undangan-Pernikahan.apk sekarang.");
  await send(
    "Rapat tim membahas agenda kegiatan perpustakaan dan pembagian ruangan pada pekan depan. ".repeat(
      3,
    ),
  );
  await send("kenapa?");
  const calls = fetchMock.mock.calls.filter(
    ([url]) => url === "/api/companion/answer",
  );
  const body = JSON.parse(String(calls.at(-1)?.[1]?.body));
  expect(body.lane).toBe("lanjutan");
  expect(body.digest.risk).toBe("bersih");
  expect(body.tactics).toEqual([]);
});
it("retains transcript image URLs until unmount and uses OCR as local conversation context", async () => {
  const revoke = jest.spyOn(URL, "revokeObjectURL");
  const user = userEvent.setup();
  const { container, unmount } = render(<CompanionChat />);
  const input = container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  await user.upload(
    input,
    new File([new Uint8Array([137, 80, 78, 71])], "hadiah.png", {
      type: "image/png",
    }),
  );
  await user.click(screen.getByRole("button", { name: /^kirim$/i }));
  await waitForIdle();
  const image = screen.getByRole("img", { name: "hadiah.png" });
  const url = image.getAttribute("src");
  expect(revoke).not.toHaveBeenCalledWith(url);
  await send("Transfer biaya admin ke rekening ini sekarang.");
  expect(
    (await screen.findAllByText(/Pola bicara bertahap:/)).length,
  ).toBeGreaterThan(0);
  unmount();
  expect(revoke).toHaveBeenCalledWith(url);
});
it("keeps the data-transfer notice visible for sighted users", () => {
  render(<CompanionChat />);
  expect(screen.getByText(/Isi pesan lengkap.*tidak dikirim/)).toBeVisible();
  expect(screen.getByText(/Isi pesan lengkap.*tidak dikirim/)).not.toHaveClass(
    "sr-only",
  );
});
it("keeps a tool-only response out of subsequent model history", async () => {
  let replies = 0;
  fetchMock.mockImplementation(async (url: string) => {
    if (url === "/api/companion/answer")
      return {
        ok: true,
        json: async () =>
          ++replies === 1
            ? {
                text: "",
                toolCalls: [
                  {
                    id: "job",
                    name: "job_search",
                    arguments: { query: "React" },
                  },
                ],
              }
            : { text: "Sama-sama.", toolCalls: [] },
      };
    return { ok: false, json: async () => ({ error: "not-configured" }) };
  });
  render(<CompanionChat />);
  await send("cari lowongan React");
  await waitFor(() =>
    expect(
      fetchMock.mock.calls.some(
        ([url]) => url === "/api/companion/tools/summary",
      ),
    ).toBe(true),
  );
  await send("terima kasih");
  const calls = fetchMock.mock.calls.filter(
    ([url]) => url === "/api/companion/answer",
  );
  const body = JSON.parse(String(calls.at(-1)?.[1]?.body));
  expect(AnswerRequestSchema.safeParse(body).success).toBe(true);
  expect(
    body.history.every((turn: { text: string }) => turn.text.trim().length > 0),
  ).toBe(true);
});
it("explains an oversized concept question without sending an invalid model request", async () => {
  render(<CompanionChat />);
  fireEvent.change(screen.getByRole("textbox", { name: "Pesan" }), {
    target: { value: `Apa itu ${"pola ".repeat(450)}?` },
  });
  fireEvent.click(screen.getByRole("button", { name: /^kirim$/i }));
  expect(
    await screen.findByText(/Pertanyaan maksimal 2.000 karakter/),
  ).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});
it("includes agents with findings in real history and reopens their conversation", async () => {
  render(<CompanionChat />);
  await send("Buka Undangan-Pernikahan.apk sekarang.");
  const newChat = screen.getAllByRole("button", {
    name: "Percakapan baru",
  })[0];
  if (!newChat) throw new Error("New conversation control missing");
  fireEvent.click(newChat);
  const menu = screen.getByRole("button", { name: "Menu riwayat Mochi" });
  fireEvent.click(menu);
  fireEvent.click(screen.getByRole("button", { name: "Buka percakapan" }));
  expect(screen.getByRole("log", { name: "Percakapan" })).toHaveTextContent(
    "Buka Undangan-Pernikahan.apk sekarang.",
  );
});

it("persists public topic labels without copying checked messages or attachment names", async () => {
  render(
    <CompanionChat
      session={{
        nama: "Anggota",
        email: "member@example.test",
      }}
    />,
  );
  await send("Buka Undangan-Pribadi-Rahasia.apk sekarang.");
  await waitFor(() => expect(saveConversationHistory).toHaveBeenCalled());
  const input = jest.mocked(saveConversationHistory).mock.calls.at(-1)?.[0];
  expect(input?.title).toMatch(/^Pemeriksaan(:| pesan)/);
  expect(JSON.stringify(input)).not.toContain("Undangan-Pribadi-Rahasia");
  expect(Object.keys(input ?? {}).sort()).toEqual([
    "id",
    "risk",
    "title",
    "turns",
  ]);
});

it("explains that a check is needed when the model opens a report without a verdict", async () => {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      text: "",
      toolCalls: [{ id: "report", name: "report_draft", arguments: {} }],
    }),
  });
  render(<CompanionChat />);
  await send("buatkan laporan");
  expect(
    await screen.findByText(/Periksa pesan yang mencurigakan terlebih dahulu/),
  ).toBeVisible();
});
