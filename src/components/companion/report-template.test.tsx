import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportTemplate } from "@/components/companion/report-template";
import { REPORT_CHANNELS } from "@/data/tactics";
import { scoreText } from "@/lib/scoring/score";

const PHISH =
  "Halo, ini dari BCA. Akun Anda akan diblokir dalam 2 jam. " +
  "Verifikasi di https://bca-verif.xyz/login sekarang.";

function renderFor(
  text = PHISH,
  channels = REPORT_CHANNELS["phishing-tautan"],
) {
  const result = scoreText({ text });
  return render(<ReportTemplate result={result} channels={channels} />);
}

describe("ReportTemplate", () => {
  it("keeps the form closed until asked", () => {
    renderFor();
    expect(screen.queryByLabelText(/Nama pelapor/i)).not.toBeInTheDocument();
  });

  it("opens the form and shows the draft", async () => {
    const user = userEvent.setup();
    renderFor();

    await user.click(
      screen.getByRole("button", { name: /Buat template laporan/i }),
    );

    expect(screen.getByLabelText(/Nama pelapor/i)).toBeInTheDocument();
    expect(screen.getByText(/\[NAMA ANDA\]/)).toBeInTheDocument();
  });

  it("fills the draft with what the user typed", async () => {
    const user = userEvent.setup();
    renderFor();

    await user.click(
      screen.getByRole("button", { name: /Buat template laporan/i }),
    );
    await user.type(screen.getByLabelText(/Nama pelapor/i), "Sari");

    expect(screen.getByText(/Nama pelapor: Sari/)).toBeInTheDocument();
  });

  it("builds a real tel link and prints the number", async () => {
    const user = userEvent.setup();
    renderFor(undefined, [REPORT_CHANNELS["fake-call"][0]]);
    await user.click(
      screen.getByRole("button", { name: /Buat template laporan/i }),
    );

    const call = screen.getByRole("link", { name: /Telepon 157/i });
    expect(call).toHaveAttribute("href", "tel:157");
    expect(screen.getByText("157")).toBeInTheDocument();
  });

  it("builds a mailto link whose body carries the draft", async () => {
    const user = userEvent.setup();
    renderFor();
    await user.click(
      screen.getByRole("button", { name: /Buat template laporan/i }),
    );

    const mail = screen.getByRole("link", { name: /Email/i });
    const href = mail.getAttribute("href") ?? "";
    expect(href.startsWith("mailto:")).toBe(true);
    expect(decodeURIComponent(href)).toContain("[NAMA ANDA]");
  });

  it("tells the user to call the bank without inventing a number", async () => {
    const user = userEvent.setup();
    renderFor();
    await user.click(
      screen.getByRole("button", { name: /Buat template laporan/i }),
    );

    expect(screen.getByText(/nomor di belakang kartu/i)).toBeInTheDocument();
  });

  it("opens immediately and preselects a channel the model asked for", () => {
    const result = scoreText({ text: PHISH });
    render(
      <ReportTemplate
        result={result}
        channels={REPORT_CHANNELS["phishing-tautan"]}
        defaultOpen
        initialChannel="iasc"
      />,
    );

    expect(screen.getByLabelText(/Nama pelapor/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Telepon 157/i })).toHaveAttribute(
      "href",
      "tel:157",
    );
  });
});
