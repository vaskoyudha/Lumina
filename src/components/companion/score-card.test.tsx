import { render, screen } from "@testing-library/react";
import { ScoreCard } from "@/components/companion/score-card";
import { scoreWithTrace } from "@/lib/scoring/score";

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

const CLEAN =
  "Aku sudah transfer uang kas kelas kemarin sore, tolong dicatat ya.";
const APK =
  "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim.";

describe("ScoreCard · a clean message looks like a clean message", () => {
  it("says nothing matched instead of naming a scheme", () => {
    const { result, trace } = scoreWithTrace({ text: CLEAN });
    render(<ScoreCard result={result} trace={trace} />);

    expect(
      screen.getByText(/tidak ada pola penipuan yang cocok/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Jual beli palsu")).not.toBeInTheDocument();
  });

  it("shows what was inspected and how much of it ran", () => {
    const { result, trace } = scoreWithTrace({ text: CLEAN });
    render(<ScoreCard result={result} trace={trace} />);

    expect(screen.getByText(/yang diperiksa/i)).toBeInTheDocument();
    expect(
      screen.getByText(/1 dari 5 agen benar-benar memeriksa/i),
    ).toBeInTheDocument();
  });

  it("carries its provenance", () => {
    const { result, trace } = scoreWithTrace({ text: CLEAN });
    render(<ScoreCard result={result} trace={trace} />);

    expect(screen.getByText(/deterministik/i)).toBeInTheDocument();
    expect(screen.getByText(/di perangkat/i)).toBeInTheDocument();
  });

  it("offers no module or simulation for a message with no scheme", () => {
    const { result, trace } = scoreWithTrace({ text: CLEAN });
    render(<ScoreCard result={result} trace={trace} />);

    expect(
      screen.queryByRole("link", { name: /pelajari pola ini/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /coba simulasi/i }),
    ).not.toBeInTheDocument();
  });
});

describe("ScoreCard · a real finding names what it is", () => {
  it("prints the modus name, not only the internal id", () => {
    const { result, trace } = scoreWithTrace({ text: APK });
    render(<ScoreCard result={result} trace={trace} />);

    expect(screen.getByText("File APK via WhatsApp")).toBeInTheDocument();
  });

  it("does not call an APK a hard override after the rule changed", () => {
    const { result, trace } = scoreWithTrace({ text: APK });
    render(<ScoreCard result={result} trace={trace} />);

    expect(screen.queryByText(/indikator keras/i)).not.toBeInTheDocument();
  });
});
