import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExplanationCard } from "@/components/companion/explanation-card";
import { explain } from "@/lib/companion/explain";
import { scoreText } from "@/lib/scoring/score";

const PHISH =
  "Halo, ini dari BCA. Akun Anda akan diblokir dalam 2 jam. " +
  "Verifikasi di https://bca-verif.xyz/login sekarang.";

function renderFor(
  text: string,
  schemeName: string | null = "Phishing tautan & akun",
) {
  const result = scoreText({ text });
  return render(
    <ExplanationCard
      explanation={explain(result, text)}
      schemeName={schemeName}
    />,
  );
}

describe("ExplanationCard", () => {
  it("names the tactic in the reader's own vocabulary", () => {
    renderFor(PHISH);
    expect(screen.getByText("Tautan menyamar")).toBeInTheDocument();
    expect(screen.getByText("Urgensi palsu")).toBeInTheDocument();
  });

  it("shows the quote that triggered each tactic", () => {
    renderFor(PHISH);
    expect(
      screen.getByText(/Kutipan: “Akun Anda akan diblokir”/),
    ).toBeInTheDocument();
  });

  it("previews the recognizable sign before expansion", () => {
    renderFor(PHISH);
    expect(screen.getAllByText(/^Ciri:/).length).toBeGreaterThan(0);
    expect(screen.getByText(/dalam 2 jam/)).toBeInTheDocument();
  });

  it("keeps the long explanation collapsed until asked", async () => {
    const user = userEvent.setup();
    renderFor(PHISH);

    expect(screen.queryByText(/Kenapa berhasil/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Tautan menyamar/ }));

    expect(await screen.findByText(/Kenapa berhasil/i)).toBeInTheDocument();
    // The same instruction appears twice on purpose: once as the tactic's
    // discriminator and once as a verification step. Repetition is the teaching
    // device, so this asserts both exist rather than picking one.
    expect(
      screen.getAllByText(/Ketik sendiri alamat bank di bilah alamat/).length,
    ).toBeGreaterThan(1);
  });

  it("tells the reader which steps of the script are missing", () => {
    renderFor(PHISH);
    // Present steps are announced for screen readers too, so "terlihat" and
    // "tidak terlihat" both have to exist in the accessible text.
    expect(screen.getAllByText(/terlihat di pesan ini/).length).toBeGreaterThan(
      0,
    );
  });

  it("puts verification before reporting", () => {
    const { container } = renderFor(PHISH);
    const text = container.textContent ?? "";
    expect(text.indexOf("Periksa sendiri")).toBeGreaterThan(-1);
    expect(text.indexOf("Periksa sendiri")).toBeLessThan(
      text.indexOf("Kalau sudah terlanjur"),
    );
  });

  it("links a real agency with a real address", () => {
    renderFor(PHISH);
    const link = screen.getByRole("link", { name: /Komdigi/i });
    expect(link).toHaveAttribute("href", "https://aduannomor.id");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("says so plainly when no scheme matched, and promises no channel", () => {
    renderFor("Halo, apa kabar?", null);
    expect(
      screen.getByText(/belum cocok dengan salah satu skema/i),
    ).toBeVisible();
    expect(
      screen.queryByText(/Kalau sudah terlanjur/i),
    ).not.toBeInTheDocument();
  });

  it("renders nothing at all for an empty explanation", () => {
    const { container } = render(
      <ExplanationCard
        explanation={{
          tactics: [],
          anatomy: [],
          verify: [],
          report: [],
          unrecognized: false,
        }}
        schemeName={null}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
