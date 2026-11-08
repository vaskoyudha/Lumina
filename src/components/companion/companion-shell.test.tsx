import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("CompanionChat · shell", () => {
  it("opens on a new-chat state with the scenario track and composer", () => {
    render(<CompanionChat />);

    expect(
      screen.getByRole("heading", { level: 1, name: /periksa sebelum/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /kamu percaya/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/pesan/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /apk undangan/i }),
    ).toBeInTheDocument();
  });

  it("titles the session from the first message", async () => {
    const user = userEvent.setup();
    render(<CompanionChat />);

    await user.click(screen.getByRole("button", { name: /akun diblokir/i }));

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

    await user.click(screen.getByRole("button", { name: /apk undangan/i }));
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
    expect(screen.getByText(/apk undangan/i)).toBeInTheDocument();
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

  it("shows the five detection agents in the main panel when the sidebar option is pressed", async () => {
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
      "Evidence Agent",
    ]) {
      expect(viewScope.getByText(agent)).toBeInTheDocument();
    }
    // The diagram's short names are aliases; the canonical labels above stay
    // beside them so the overview still matches the evidence panel.
    for (const display of ["Nada", "Jejak", "Sidik", "Alur", "Bukti"]) {
      expect(viewScope.getByText(display)).toBeInTheDocument();
    }
    expect(viewScope.getByText("Orkestrator")).toBeInTheDocument();

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

    // All five briefs are visible at once; selection only highlights one.
    for (const purpose of [
      /membaca nada pesan/i,
      /membongkar setiap tautan/i,
      /memeriksa identitas pengirim/i,
      /membandingkan pesan dengan giliran/i,
      /merangkum temuan menjadi kutipan/i,
    ]) {
      expect(screen.getByText(purpose)).toBeInTheDocument();
    }

    const nada = screen.getByRole("button", { name: /lihat detail nada/i });
    await user.click(nada);
    expect(nada).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /lihat detail jejak/i }),
    ).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getAllByRole("link", { name: "Companion" })[0]);

    expect(screen.getByText("Panel bukti")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Detail agen" }),
    ).not.toBeInTheDocument();
  });
});
