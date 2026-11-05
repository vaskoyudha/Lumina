import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompanionChat } from "@/components/companion/companion-chat";

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

describe("CompanionChat · evidence panel", () => {
  it("shows the extracted file and stops calling the Evidence Agent inactive", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));

    // The artifact label is the panel's, not the score card's: it names the
    // file the message asked the user to open.
    expect(
      await screen.findByText(/berkas APK yang dikirim atau diminta dibuka/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/bukti tercatat/i)).toBeInTheDocument();

    // The trace card in the transcript also names every agent, so the panel's
    // rows are addressed by their own list rather than by the label alone.
    const panel = within(
      screen.getByRole("list", { name: /agent pada panel bukti/i }),
    );
    const evidenceRow = panel.getByText("Evidence Agent").closest("li");
    expect(evidenceRow).not.toBeNull();
    if (evidenceRow) {
      expect(
        within(evidenceRow as HTMLElement).queryByText(/belum aktif/i),
      ).not.toBeInTheDocument();
    }

    // The one agent we have not built stays labelled as such. Identity Agent
    // is listed last for exactly this reason: a panel of green ticks would be
    // claiming a detector we do not have.
    const identityRow = panel.getByText("Identity Agent").closest("li");
    expect(identityRow).not.toBeNull();
    if (identityRow) {
      expect(
        within(identityRow as HTMLElement).getByText(/belum aktif/i),
      ).toBeInTheDocument();
    }

    // And the Conversation Agent, which used to say "belum aktif", now runs:
    // it is the combination pass that pairs a deadline with a demand.
    const conversationRow = panel.getByText("Conversation Agent").closest("li");
    expect(conversationRow).not.toBeNull();
    if (conversationRow) {
      expect(
        within(conversationRow as HTMLElement).queryByText(/belum aktif/i),
      ).not.toBeInTheDocument();
    }
  });

  it("surfaces the combination finding when two vectors agree", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.type(
      screen.getByLabelText(/pesan/i),
      "Selamat Anda menang hadiah utama Rp25.000.000. Untuk pencairan, bayar biaya admin Rp350.000 lebih dulu ya.",
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    // The finding itself, in the result card the user reads.
    expect(
      await screen.findByText(/hadiah tetapi meminta pembayaran lebih dulu/i),
    ).toBeInTheDocument();

    // And the panel credits it to a real agent, with a count beside the name.
    const row = within(
      screen.getByRole("list", { name: /agent pada panel bukti/i }),
    )
      .getByText("Conversation Agent")
      .closest("li");
    expect(row).not.toBeNull();
    if (row) {
      expect(within(row as HTMLElement).getByText(/^1$/)).toBeInTheDocument();
    }
  });

  it("names the modus instead of printing its internal id", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));

    expect(
      await screen.findByText("File APK via WhatsApp"),
    ).toBeInTheDocument();
    expect(screen.queryByText("apk-whatsapp")).not.toBeInTheDocument();
  });

  it("records the recipient name from a QRIS sticker typed into the chat", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.type(
      screen.getByLabelText(/pesan/i),
      "Barang sudah dikemas, bayar sisa ongkir via QRIS pada stiker ini (nama penerima a.n. Hadi Wibowo).",
    );
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    expect(
      await screen.findByText(/nama penerima yang disebut/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Hadi Wibowo")).toBeInTheDocument();
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

    await user.type(screen.getByLabelText(/pesan/i), BENIGN_PASTE);
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    const panel = screen.getByRole("list", { name: /agent pada panel bukti/i });
    const card = panel.closest("[data-slot='card']") ?? document.body;

    expect(await screen.findByText(/0\/100/)).toBeInTheDocument();
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

    await user.type(screen.getByLabelText(/pesan/i), "apa itu pinjol?");
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

    await user.type(screen.getByLabelText(/pesan/i), "apa itu pinjol?");
    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    const retry = await screen.findByRole("button", {
      name: /periksa sebagai pesan/i,
    });
    await user.click(retry);

    // Forced lane: the engine runs and the trace appears in the transcript,
    // because the reader asked for a verdict rather than an explanation.
    const log = await screen.findByRole("log", { name: /percakapan/i });
    expect(await within(log).findByText("Message Agent")).toBeInTheDocument();
  });

  it("keeps the trace and the card on a message that is actually checked", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));

    const log = await screen.findByRole("log", { name: /percakapan/i });
    expect(await within(log).findByText("Message Agent")).toBeInTheDocument();
    expect(
      within(log).queryByText(/Dijawab sebagai pertanyaan/i),
    ).not.toBeInTheDocument();
  });
});
