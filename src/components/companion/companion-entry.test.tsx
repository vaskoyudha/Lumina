import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import { CompanionEntry } from "@/components/companion/companion-entry";

/**
 * These render the real component tree. If a client boundary is missing, a
 * shadcn primitive is composed wrongly, or the contract shape drifts, these
 * fail — which a pure-TypeScript test never would.
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

describe("CompanionEntry", () => {
  it("renders the paste form with an explicit empty state", () => {
    render(<CompanionEntry />);

    expect(
      screen.getByRole("heading", {
        name: /ceritakan pesan yang kamu terima/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/isi pesan/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /periksa pesan/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/belum ada yang diperiksa/i)).toBeInTheDocument();
    // The empty panel must not claim findings it does not have.
    expect(screen.queryByText(/\d+ temuan/i)).not.toBeInTheDocument();
  });

  it("disables submit until there is input", async () => {
    const user = userEvent.setup();
    render(<CompanionEntry />);

    const submit = screen.getByRole("button", { name: /periksa pesan/i });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/isi pesan/i), "halo");
    expect(submit).toBeEnabled();
  });

  it("turns the demo APK example into a high-risk card on screen", async () => {
    const user = userEvent.setup();
    render(<CompanionEntry />);

    await user.click(
      screen.getByRole("button", { name: /apk undangan pernikahan/i }),
    );

    // Score card is rendered inline in the flow.
    const panel = screen.getByText(/kenapa/i).closest("section");
    expect(panel).not.toBeNull();

    expect(screen.getAllByText(/risiko tinggi/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\/100/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/kutipan:/i).length).toBeGreaterThan(0);
  });

  it("links the result to module 10 through the contract, not a hardcoded href", async () => {
    const user = userEvent.setup();
    render(<CompanionEntry />);

    await user.click(
      screen.getByRole("button", { name: /apk undangan pernikahan/i }),
    );

    const learn = screen.getByRole("link", { name: /pelajari pola ini/i });
    expect(learn).toHaveAttribute("href", "/belajar/10");
  });

  it("shows real detector findings in the evidence panel", async () => {
    const user = userEvent.setup();
    render(<CompanionEntry />);

    await user.click(
      screen.getByRole("button", { name: /akun diblokir|whatsapp/i }),
    );

    const panel = screen
      .getByText(/panel bukti/i)
      .closest("[data-slot='card']");
    expect(panel).not.toBeNull();
    if (panel) {
      const findings = within(panel as HTMLElement).getAllByText(/\d+ temuan/i);
      expect(findings.length).toBeGreaterThan(0);
    }
    // No agent is faked: the old "belum aktif" label is gone, and the coverage
    // line reports how many real detectors inspected this message.
    expect(screen.queryByText(/belum aktif/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(
          `\\d+ dari ${AGENT_SEQUENCE.length} agen memeriksa pesan ini`,
          "i",
        ),
      ),
    ).toBeInTheDocument();
  });

  it("clears the result when the input is reset", async () => {
    const user = userEvent.setup();
    render(<CompanionEntry />);

    await user.click(
      screen.getByRole("button", { name: /apk undangan pernikahan/i }),
    );
    expect(screen.getAllByText(/risiko tinggi/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /bersihkan/i }));
    expect(screen.queryByText(/risiko tinggi/i)).not.toBeInTheDocument();
    expect(screen.getByText(/belum ada yang diperiksa/i)).toBeInTheDocument();
  });
});
