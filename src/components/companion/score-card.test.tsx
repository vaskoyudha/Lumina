import { render, screen } from "@testing-library/react";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
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
      screen.getByText(
        new RegExp(
          `1 dari ${AGENT_SEQUENCE.length} agen benar-benar memeriksa`,
          "i",
        ),
      ),
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

describe("ScoreCard · consensus provenance", () => {
  it("shows consensus provenance and both scores", () => {
    const { result } = scoreWithTrace({ text: CLEAN });
    render(
      <ScoreCard
        result={{
          ...result,
          score: 78,
          risk: "tinggi",
          source: "consensus",
          baselineScore: 0,
          consensus: {
            pattern: "overpayment-refund",
            agents: ["marketplace", "qris"],
            pointSignals: ["Kelebihan transfer"],
          },
          signals: [
            {
              label: "Kelebihan transfer",
              weight: 0.5,
              evidence: "transfer berlebih",
              agent: "marketplace",
              source: "consensus",
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByText(/Dinilai Lumina dari konsensus 2 agen/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Engine 0/)).toBeInTheDocument();
    expect(
      screen.queryByText("Tidak ada pola penipuan yang cocok pada pesan ini."),
    ).not.toBeInTheDocument();
  });

  it("renders a result without the new optional fields", () => {
    const { result, trace } = scoreWithTrace({ text: CLEAN });
    render(<ScoreCard result={result} trace={trace} />);

    expect(screen.queryByText(/Dinilai Lumina/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/tidak ada pola penipuan yang cocok/i),
    ).toBeInTheDocument();
  });
});
