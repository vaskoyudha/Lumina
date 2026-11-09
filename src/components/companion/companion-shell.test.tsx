import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import { CompanionChat } from "@/components/companion/companion-chat";

/**
 * The chat shell, not the engine. These render the real component tree and
 * assert the things a screenshot cannot: that a session is created, that an
 * attachment becomes part of what gets scored, and that the panel follows the
 * conversation.
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

const APK_MESSAGE =
  "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim, isinya lengkap dengan lokasi acara.";
const BLOCKED_MESSAGE =
  "Akun Anda akan diblokir dalam 2 jam. Verifikasi OTP sekarang di bit.ly/verifikasi-wa agar akun tidak ditutup permanen.";

async function sendMessage(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  await user.click(screen.getByPlaceholderText(/tempel pesan/i));
  await user.paste(text);
  await user.click(screen.getByRole("button", { name: /^kirim$/i }));
}

describe("CompanionChat · shell", () => {
  it("opens on a new-chat state with the quick access and agent history cards", () => {
    render(<CompanionChat />);

    expect(
      screen.getByRole("heading", { level: 1, name: /periksa sebelum/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /kamu percaya/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/pesan/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /butuh apa lagi, tamu\?/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /riwayat agen/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /analisis iklan lowongan/i }),
    ).toBeInTheDocument();
  });

  it("titles the session from the first message", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendMessage(user, BLOCKED_MESSAGE);

    // The header and the sidebar entry both take the message as their title.
    await waitFor(() => {
      expect(
        screen.getAllByText(/akun anda akan diblokir/i).length,
      ).toBeGreaterThan(1);
    });
  });

  it("starts a second session instead of appending to the first", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await sendMessage(user, APK_MESSAGE);
    await waitFor(() => {
      expect(screen.getAllByText(/risiko tinggi/i).length).toBeGreaterThan(0);
    });

    // Both the sidebar and the header offer "new conversation" — the sidebar
    // one is canonical, the header copy is a convenience.
    await user.click(
      screen.getAllByRole("button", { name: /percakapan baru/i })[0],
    );

    // Back to the empty state, and the first session is still listed.
    expect(
      screen.getByRole("heading", { level: 1, name: /periksa sebelum/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /kamu percaya/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/selamat siang bu/i).length).toBeGreaterThan(0);
  });

  it("keeps blank new-chat screens out of history until a message is sent", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompanionChat />);

    const sidebar = container.querySelector("aside") as HTMLElement;
    const sidebarScope = within(sidebar);

    // Opening the app is not a conversation yet; neither is pressing the
    // button again while the screen is still blank.
    expect(sidebarScope.getByText(/belum ada percakapan/i)).toBeInTheDocument();

    const newChat = sidebarScope.getByRole("button", {
      name: /percakapan baru/i,
    });
    await user.click(newChat);
    await user.click(newChat);
    await user.click(newChat);

    expect(sidebarScope.getByText(/belum ada percakapan/i)).toBeInTheDocument();
    // Only the button carries that label; no empty thread row may join it.
    expect(sidebarScope.getAllByText("Percakapan baru")).toHaveLength(1);

    await sendMessage(user, BLOCKED_MESSAGE);

    await waitFor(() => {
      expect(
        sidebarScope.getAllByText(/akun anda akan diblokir/i).length,
      ).toBeGreaterThan(0);
    });
  });

  it("scores the attachment filename, because that is where the signal is", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompanionChat />);

    const input = container.querySelector<HTMLInputElement>("input[type=file]");
    expect(input).not.toBeNull();
    if (!input) return;

    const file = new File(["x"], "undangan-nikah.apk", {
      type: "application/vnd.android.package-archive",
    });
    await user.upload(input, file);

    // The filename alone must reach the APK detector — it is the strongest
    // signal in that family and it is not prose the user types.
    expect(await screen.findByText(/undangan-nikah\.apk/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^kirim$/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/risiko tinggi/i).length).toBeGreaterThan(0);
    });
  });

  it("lets an attachment be removed before sending", async () => {
    const user = userEvent.setup();
    const { container } = render(<CompanionChat />);

    const input = container.querySelector<HTMLInputElement>("input[type=file]");
    if (!input) return;

    await user.upload(
      input,
      new File(["x"], "bukti.png", { type: "image/png" }),
    );
    // An image preview carries its filename in `alt`, not as a text node.
    expect(await screen.findByAltText("bukti.png")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /hapus lampiran bukti\.png/i }),
    );

    await waitFor(() => {
      expect(screen.queryByAltText("bukti.png")).not.toBeInTheDocument();
    });
  });

  it("keeps the evidence panel honest before anything is checked", () => {
    render(<CompanionChat />);

    const panel = screen
      .getByText(/panel bukti/i)
      .closest("[data-slot='card']");
    expect(panel).not.toBeNull();
    if (panel) {
      expect(
        within(panel as HTMLElement).getByText(/belum ada yang diperiksa/i),
      ).toBeInTheDocument();
    }
  });

  it("shows every detection agent in the main panel when the sidebar option is pressed", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    const trigger = screen.getByRole("button", { name: /^agen/i });
    const sidebar = trigger.closest("aside");
    expect(sidebar).not.toBeNull();
    if (!sidebar) return;

    // The sidebar stays navigation: pressing the option must not unfold a list
    // inside it, because the overview belongs to the center column.
    const sidebarScope = within(sidebar as HTMLElement);
    expect(sidebarScope.queryByText("Message Agent")).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-current", "page");
    expect(sidebarScope.queryByText("Message Agent")).not.toBeInTheDocument();

    const view = screen
      .getByRole("heading", { name: "Agen pemeriksa" })
      .closest("section");
    expect(view).not.toBeNull();
    if (!view) return;

    const viewScope = within(view as HTMLElement);
    for (const agent of [
      "Message Agent",
      "Link Agent",
      "Identity Agent",
      "Conversation Agent",
      "Lowongan Agent",
      "Marketplace Agent",
      "QRIS Agent",
      "Evidence Agent",
    ]) {
      expect(viewScope.getByText(agent)).toBeInTheDocument();
    }
    // The diagram's short names are the mascots; the canonical labels above
    // stay beside them so the overview still matches the evidence panel.
    for (const display of [
      "Mochi",
      "Bubu",
      "Piyo",
      "Naga",
      "Kiko",
      "Lala",
      "Ruru",
      "Bao",
    ]) {
      expect(viewScope.getByText(display)).toBeInTheDocument();
    }
    expect(viewScope.getByText("Orkestrator")).toBeInTheDocument();
    // The subtitle must follow the registry, or it keeps claiming five
    // agents after the sequence grows.
    expect(
      viewScope.getByText(
        `${AGENT_SEQUENCE.length} agen, satu skor deterministik.`,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole("link", { name: "Companion" })[0]);
    expect(
      screen.queryByRole("heading", { name: "Agen pemeriksa" }),
    ).not.toBeInTheDocument();
  });

  it("lands directly on the agent overview when opened from another surface", () => {
    render(<CompanionChat initialPanel="agen" />);

    const view = screen
      .getByRole("heading", { name: "Agen pemeriksa" })
      .closest("section");
    expect(view).not.toBeNull();
    expect(screen.getByRole("button", { name: /^agen/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("swaps the evidence panel for agent detail only while the overview is open", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    expect(screen.getByText("Panel bukti")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Detail agen" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^agen/i }));

    expect(
      screen.getByRole("heading", { name: "Detail agen" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Panel bukti")).not.toBeInTheDocument();

    // All briefs are visible at once; selection only highlights one.
    for (const purpose of [
      /membaca nada pesan/i,
      /membongkar setiap tautan/i,
      /memeriksa identitas pengirim/i,
      /membandingkan pesan dengan giliran/i,
      /memeriksa tawaran kerja/i,
      /mengikuti alur jual-beli/i,
      /membaca payload qris/i,
      /merangkum temuan menjadi kutipan/i,
    ]) {
      expect(screen.getByText(purpose)).toBeInTheDocument();
    }

    const mochi = screen.getByRole("button", { name: /lihat detail mochi/i });
    await user.click(mochi);
    expect(mochi).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /lihat detail bubu/i }),
    ).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getAllByRole("link", { name: "Companion" })[0]);

    expect(screen.getByText("Panel bukti")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Detail agen" }),
    ).not.toBeInTheDocument();
  });

  it("opens the mobile navigation from a named button, not the history icon", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    const toggle = screen.getByRole("button", { name: /buka navigasi/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // The drawer is the navigation: all destinations are inside it.
    expect(screen.getByRole("link", { name: "Belajar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Simulasi" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Komunitas" }).length,
    ).toBeGreaterThan(0);

    // The scrim is the outside-tap target, separate from the header toggle.
    await user.click(screen.getByRole("button", { name: /tutup navigasi/i }));
    await waitFor(() =>
      expect(toggle).toHaveAttribute("aria-expanded", "false"),
    );
  });

  it("closes the mobile navigation drawer with Escape", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    const toggle = screen.getByRole("button", { name: /buka navigasi/i });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(toggle).toHaveAttribute("aria-expanded", "false"),
    );
  });
});
