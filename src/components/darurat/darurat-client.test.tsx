import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DaruratClient } from "@/components/darurat/darurat-client";

/**
 * Renders the real emergency tree: triage state, report form and preview.
 * Catches the things that would break at 11pm in front of a jury — a case tab
 * that does not swap the checklist, or a download button that produces an
 * empty document.
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

describe("DaruratClient", () => {
  it("shows all five situations, not just the first", () => {
    render(<DaruratClient />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    expect(screen.getByRole("tab", { name: /kode otp/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /sudah transfer uang/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /menginstal file apk/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /mengklik tautan/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /kerja atau tugas/i }),
    ).toBeInTheDocument();
  });

  it("swaps the whole checklist when a situation is selected", async () => {
    const user = userEvent.setup();
    render(<DaruratClient />);

    expect(
      screen.getByRole("heading", { name: /otp sudah diberikan/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /sudah transfer uang/i }));

    expect(
      screen.getByRole("heading", { name: /uang sudah ditransfer/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /otp sudah diberikan/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/minta pembekuan tujuan/i)).toBeInTheDocument();
  });

  it("keeps the PDF disabled until the fields a bank needs are filled", async () => {
    const user = userEvent.setup();
    render(<DaruratClient />);

    const download = screen.getByRole("button", {
      name: /unduh laporan pdf/i,
    });
    expect(download).toBeEnabled();

    const name = screen.getByLabelText(/nama lengkap/i);
    await user.clear(name);

    expect(download).toBeDisabled();
    expect(
      screen.getByText(/lengkapi dulu: nama pelapor/i),
    ).toBeInTheDocument();

    await user.type(name, "Rina");
    expect(download).toBeEnabled();
  });

  it("renders a preview with chronology, perpetrator account and signature", () => {
    render(<DaruratClient />);

    expect(
      screen.getByRole("heading", { name: /pratinjau laporan/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/kronologi/i).length).toBeGreaterThan(0);
    expect(screen.getByText("1234567890")).toBeInTheDocument();
    expect(screen.getByText(/tanda tangan pelapor/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rp2\.500\.000/).length).toBeGreaterThan(0);
  });

  it("updates the preview while the person types", async () => {
    const user = userEvent.setup();
    render(<DaruratClient />);

    const account = screen.getByLabelText(/nomor rekening pelaku/i);
    await user.clear(account);
    await user.type(account, "9876543210");

    expect(screen.getByText("9876543210")).toBeInTheDocument();
    expect(screen.queryByText("1234567890")).not.toBeInTheDocument();
  });

  it("offers a print fallback and official channels", () => {
    render(<DaruratClient />);

    expect(
      screen.getByRole("button", { name: /cetak checklist ini/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /iasc\.ojk\.go\.id/i }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: /iasc\.ojk\.go\.id/i })[0],
    ).toHaveAttribute("href", "https://iasc.ojk.go.id");
  });
});
