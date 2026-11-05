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
      screen.getByRole("heading", { name: /periksa sebelum kamu percaya/i }),
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
      screen.getByRole("heading", { name: /periksa sebelum kamu percaya/i }),
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
});
