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

    await user.click(
      screen.getByRole("button", { name: /apk undangan pernikahan/i }),
    );

    // The artifact label is the panel's, not the score card's: it names the
    // file the message asked the user to open.
    expect(
      await screen.findByText(/berkas APK yang dikirim atau diminta dibuka/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/bukti tercatat/i)).toBeInTheDocument();

    const evidenceRow = screen.getByText("Evidence Agent").closest("li");
    expect(evidenceRow).not.toBeNull();
    if (evidenceRow) {
      expect(
        within(evidenceRow as HTMLElement).queryByText(/belum aktif/i),
      ).not.toBeInTheDocument();
    }

    // The agents that really are unbuilt stay labelled as such.
    expect(screen.getByText("Conversation Agent")).toBeInTheDocument();
    expect(screen.getAllByText(/belum aktif/i).length).toBeGreaterThan(0);
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
