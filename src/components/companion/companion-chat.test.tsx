import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionChat } from "@/components/companion/companion-chat";

/**
 * This suite renders the whole conversation client and runs the full
 * deterministic pipeline. The full run executes it beside ~60 other suites on
 * 12 cores, where Jest's 5 s default measures the scheduler rather than the
 * component; 15 s still fails a genuine hang.
 */
jest.setTimeout(15_000);

/**
 * These render the real conversation component. The Evidence Agent is only
 * honest if the *rendered* panel shows the bundle it claims to have built, so
 * every assertion here is about something a judge can point at on screen.
 */

jest.mock("next/link", () => {
  const Link = ({
    children,
    href,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  return { __esModule: true, default: Link };
});

/**
 * Paste, not type. Every test here asserts what the engine and the panel do
 * with a message; simulating ~100 keystrokes adds seconds of wall clock that
 * no assertion reads, and under the full parallel run that cost pushed this
 * suite past its timeout. The controlled textarea receives the same event.
 */
async function enterMessage(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  await user.click(screen.getByLabelText(/pesan/i));
  await user.paste(text);
}

describe("CompanionChat · evidence panel", () => {
  it("shows the extracted artifact without faking a detector", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));

    // The artifact label is the panel's, not the score card's: it names the
    // file the message asked the user to open.
    expect(
      await screen.findByText(/berkas APK yang dikirim atau diminta dibuka/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/bukti tercatat/i)).toBeInTheDocument();

    // Every agent in the panel now runs, so the old "belum aktif" label must be
    // gone. Honesty moved to the coverage line: a stage with nothing to inspect
    // is named as skipped, with the reason, rather than wearing a green tick.
    expect(screen.queryByText(/belum aktif/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/\d+ dari 5 agen memeriksa pesan ini/i),
    ).toBeInTheDocument();
  });

  it("surfaces the combination finding when two vectors agree", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await enterMessage(
      user,
      "Selamat Anda menang hadiah utama Rp25.000.000. Untuk pencairan, bayar biaya admin Rp350.000 lebih dulu ya.",
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    // The finding itself, on the result card and again in the panel.
    expect(
      (
        await screen.findAllByText(
          /hadiah tetapi meminta pembayaran lebih dulu/i,
        )
      ).length,
    ).toBeGreaterThan(0);

    // And the panel credits it to a real agent.
    const findings = within(
      screen.getByRole("list", { name: /temuan terdeteksi/i }),
    );
    expect(findings.getByText("Conversation Agent")).toBeInTheDocument();
  });

  it("names the modus instead of printing its internal id", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));

    // The score card names it and the panel repeats it, on purpose: the panel
    // is read on its own when the transcript has scrolled away.
    expect(
      (await screen.findAllByText("File APK via WhatsApp")).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("apk-whatsapp")).not.toBeInTheDocument();
  });

  it("records the recipient name from a QRIS sticker typed into the chat", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await enterMessage(
      user,
      "Barang sudah dikemas, bayar sisa ongkir via QRIS pada stiker ini (nama penerima a.n. Hadi Wibowo).",
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    expect(
      (await screen.findAllByText(/nama penerima yang disebut/i)).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Hadi Wibowo").length).toBeGreaterThan(0);
  });
});

describe("CompanionChat · an honest zero", () => {
  it("does not report a finding when nothing was recognised", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    // The engine answers an unrecognised message with a single weight-0
    // placeholder so the panel is never empty. That placeholder is not a
    // finding, and counting it printed "1 temuan" beside a 0/100 "Bersih"
    // verdict — the panel contradicting its own score.
    //
    // 215 characters: above PASTE_LENGTH, so the engine runs, but it contains
    // no finding, link, phone, number, or money word. The card must read
    // 0/100 "Bersih" and the panel must say "0 temuan".
    const BENIGN_PASTE =
      "besok pagi aku mau ke kampus lebih awal untuk mengurus surat keterangan " +
      "aktif kuliah, lalu siangnya mampir ke perpustakaan mengembalikan buku " +
      "yang sudah lewat tenggat dua hari. setelah itu kita makan siang bareng ya";

    await enterMessage(user, BENIGN_PASTE);
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    const panel = await screen.findByRole("list", {
      name: /temuan terdeteksi/i,
    });
    const card = panel.closest("[data-slot='card']") ?? document.body;

    // The verdict is rendered as a number and a unit in separate text nodes,
    // so assert each half inside the panel rather than the joined string.
    expect(
      within(card as HTMLElement).getByText("0", { selector: "p" }),
    ).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("/100")).toBeInTheDocument();
    expect(
      within(card as HTMLElement).getByText(/^0 temuan$/),
    ).toBeInTheDocument();
    expect(
      within(card as HTMLElement).queryByText(/^1 temuan$/),
    ).not.toBeInTheDocument();
  });
});

describe("CompanionChat · a question is not a bad message", () => {
  it("answers a question about a scam without a score card or a trace", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await enterMessage(user, "apa itu pinjol?");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    // The evidence panel always lists every agent by name, so the transcript is
    // addressed by its own log: this turn must add no agent row to it.
    const log = await screen.findByRole("log", { name: /percakapan/i });

    // The measured defect: this message used to score 70/tinggi, showing a red
    // card about the person asking the question.
    expect(
      await within(log).findByText(/Dijawab sebagai pertanyaan/i),
    ).toBeInTheDocument();
    expect(within(log).queryByText(/70\/100/)).not.toBeInTheDocument();
    expect(within(log).queryByText("Message Agent")).not.toBeInTheDocument();
    expect(
      within(log).queryByText("Scoring Orchestrator"),
    ).not.toBeInTheDocument();
  });

  it("lets the reader turn the question into a check with one tap", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await enterMessage(user, "apa itu pinjol?");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    const retry = await screen.findByRole("button", {
      name: /periksa sebagai pesan/i,
    });
    await user.click(retry);

    // Forced lane: the engine runs and the trace appears in the transcript,
    // because the reader asked for a verdict rather than an explanation.
    const log = await screen.findByRole("log", { name: /percakapan/i });
    expect(
      (await within(log).findAllByText("Message Agent")).length,
    ).toBeGreaterThan(0);
  });

  it("keeps the trace and the card on a message that is actually checked", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));

    const log = await screen.findByRole("log", { name: /percakapan/i });
    expect(
      (await within(log).findAllByText("Message Agent")).length,
    ).toBeGreaterThan(0);
    expect(
      within(log).queryByText(/Dijawab sebagai pertanyaan/i),
    ).not.toBeInTheDocument();
  });
});

describe("CompanionChat · verdict before voice", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    // The language layer never answers. The deterministic verdict must already
    // be on screen; waiting for the model is a presentation bug, not a check.
    fetchMock.mockImplementation(() => new Promise(() => undefined));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders the score card while the model is still writing", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));

    const log = await screen.findByRole("log", { name: /percakapan/i });
    expect(
      await within(log).findByText("File APK via WhatsApp"),
    ).toBeInTheDocument();
    expect(within(log).getByText(/menyusun jawaban/i)).toBeInTheDocument();
  });
});

describe("CompanionChat · privacy copy matches the wire", () => {
  it("says the full checked message stays on the device", () => {
    render(<CompanionChat />);

    expect(
      screen.getByText(/isi pesan lengkap tidak dikirim/i),
    ).toBeInTheDocument();
  });
});

describe("CompanionChat · a follow-up answers from the verdict it followed", () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("posts the prior verdict's digest on a lanjutan turn", async () => {
    // jsdom has no Response, so the stub exposes only what the clients read.
    const calls: { url: string; body: unknown }[] = [];
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      calls.push({
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return Promise.resolve({
        ok: false,
        status: 503,
        body: null,
        json: async () => ({ error: "not-configured" }),
      });
    });

    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));

    // The result card is the signal that the check finished and `busy` is back
    // to false, so the follow-up can be sent.
    await screen.findAllByText("File APK via WhatsApp");

    await enterMessage(user, "kenapa berbahaya?");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    await waitFor(() => {
      expect(calls.some((call) => call.url === "/api/companion/answer")).toBe(
        true,
      );
    });

    const answer = calls.find((call) => call.url === "/api/companion/answer");
    const body = answer?.body as {
      lane: string;
      digest: { score: number; risk: string } | null;
    };

    expect(body.lane).toBe("lanjutan");
    expect(body.digest).not.toBeNull();
    expect(typeof body.digest?.score).toBe("number");
    expect(typeof body.digest?.risk).toBe("string");
  });
});
