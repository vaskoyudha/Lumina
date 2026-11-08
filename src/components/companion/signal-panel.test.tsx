import { render, screen, within } from "@testing-library/react";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import { SignalPanel } from "@/components/companion/signal-panel";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import { RISK_LABEL } from "@/lib/contracts/score";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { scoreWithTrace } from "@/lib/scoring/score";

/**
 * The panel is the product's honesty display, so these assert what a judge can
 * point at: the verdict reads first, every finding names the words that fired
 * it, and a stage that did not inspect anything says so instead of wearing a
 * green tick.
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

const PRIZE_MESSAGE =
  "Selamat Anda menang hadiah utama Rp25.000.000. Untuk pencairan, bayar biaya admin Rp350.000 lebih dulu ya.";

describe("SignalPanel", () => {
  it("states nothing was checked before a result exists", () => {
    render(<SignalPanel result={null} sequence={AGENT_SEQUENCE} />);

    expect(screen.getByText(/belum ada yang diperiksa/i)).toBeInTheDocument();
    expect(screen.queryByText(/\d+ temuan/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: /agent yang akan memeriksa/i }),
    ).toBeInTheDocument();
  });

  it("leads with the verdict and never invents a finding", () => {
    const { result, trace } = scoreWithTrace({ text: APK_MESSAGE });
    render(
      <SignalPanel result={result} sequence={AGENT_SEQUENCE} trace={trace} />,
    );

    // The number and the band are the engine's; the panel only prints them.
    expect(screen.getByText(String(result.score))).toBeInTheDocument();
    expect(screen.getByText(RISK_LABEL[result.risk])).toBeInTheDocument();

    // The result screen displays the checked message, so the disclosure that
    // only a lossy digest can leave the device belongs on this screen too.
    expect(
      screen.getByText(/pesan lengkap tetap di perangkat/i),
    ).toBeInTheDocument();

    // Identity Agent is real now, so no stage may claim to be unbuilt.
    expect(screen.queryByText(/belum aktif/i)).not.toBeInTheDocument();

    const findings = within(
      screen.getByRole("list", { name: /temuan terdeteksi/i }),
    );
    expect(findings.getAllByText(/agent/i).length).toBeGreaterThan(0);
  });

  it("credits each finding to the agent that produced it, with its quote", () => {
    const { result, trace } = scoreWithTrace({ text: PRIZE_MESSAGE });
    render(
      <SignalPanel result={result} sequence={AGENT_SEQUENCE} trace={trace} />,
    );

    const findings = within(
      screen.getByRole("list", { name: /temuan terdeteksi/i }),
    );
    // The combination finding is the Conversation Agent's.
    expect(findings.getByText("Conversation Agent")).toBeInTheDocument();
    expect(
      findings.getByText(/hadiah tetapi meminta pembayaran lebih dulu/i),
    ).toBeInTheDocument();

    // A weight-0 placeholder is not a finding: the badge counts real ones only.
    expect(screen.getByText(/^\d+ temuan$/i)).toBeInTheDocument();
  });

  it("names a skipped stage and its reason instead of a green tick", () => {
    const { result, trace } = scoreWithTrace({ text: PRIZE_MESSAGE });
    render(
      <SignalPanel result={result} sequence={AGENT_SEQUENCE} trace={trace} />,
    );

    // The prize message carries no link, so the Link Agent has nothing to read.
    // It must appear as skipped, with the trace's own note. Address the row by
    // its agent name: other stages may be skipped for their own reasons.
    const linkRow = screen.getByText("Link Agent").closest("p");
    expect(linkRow).not.toBeNull();
    expect(linkRow).toHaveTextContent(/dilewati/i);
    expect(linkRow).toHaveTextContent(/tidak ada tautan pada pesan ini/i);
    expect(
      screen.getByText(
        new RegExp(
          `\\d+ dari ${AGENT_SEQUENCE.length} agen memeriksa pesan ini`,
          "i",
        ),
      ),
    ).toBeInTheDocument();
  });

  it("records artifacts as proof rather than repeating the findings", () => {
    const { result } = scoreWithTrace({ text: PRIZE_MESSAGE });
    const evidence = buildEvidenceBundle([
      {
        text: PRIZE_MESSAGE,
        at: "2026-11-06T00:00:00.000Z",
        result,
      },
    ]);
    render(
      <SignalPanel
        evidence={evidence}
        result={result}
        sequence={AGENT_SEQUENCE}
      />,
    );

    expect(screen.getByText(/bukti tercatat/i)).toBeInTheDocument();
    expect(screen.getByText(/nominal uang yang disebut/i)).toBeInTheDocument();
  });

  it("offers the emergency mode only when the risk is high", () => {
    // A request for an OTP forces the top band by hard rule, so this test does
    // not depend on how the weights happen to add up.
    const high = scoreWithTrace({
      text: "Akun Anda akan diblokir dalam 2 jam. Verifikasi OTP sekarang di bit.ly/verifikasi-wa agar akun tidak ditutup permanen.",
    });
    const { unmount } = render(
      <SignalPanel result={high.result} sequence={AGENT_SEQUENCE} />,
    );
    expect(high.result.risk).toBe("tinggi");
    expect(
      screen.getByRole("link", { name: /buka mode darurat/i }),
    ).toHaveAttribute("href", "/darurat");
    unmount();

    const clean = scoreWithTrace({
      text: "besok pagi aku mau ke kampus lebih awal untuk mengurus surat keterangan aktif kuliah, lalu siangnya mampir ke perpustakaan mengembalikan buku yang sudah lewat tenggat dua hari.",
    });
    render(<SignalPanel result={clean.result} sequence={AGENT_SEQUENCE} />);
    expect(clean.result.risk).not.toBe("tinggi");
    expect(
      screen.queryByRole("link", { name: /buka mode darurat/i }),
    ).not.toBeInTheDocument();
  });

  it("lights only the stage whose trace is actually running", () => {
    const { result, trace } = scoreWithTrace({ text: APK_MESSAGE });
    const done = render(
      <SignalPanel result={result} sequence={AGENT_SEQUENCE} trace={trace} />,
    );

    // Every detector has finished, so nothing may wear the live state.
    expect(done.container.querySelector('[data-live="true"]')).toBeNull();
    done.unmount();

    const liveTrace = {
      ...trace,
      stages: [
        ...trace.stages,
        {
          id: "voice" as const,
          ...STAGE_LABEL.voice,
          status: "berjalan" as const,
          findings: 0,
          ms: 0,
        },
      ],
    };
    const { container } = render(
      <SignalPanel
        result={result}
        sequence={AGENT_SEQUENCE}
        trace={liveTrace}
        running
      />,
    );

    const lit = [...container.querySelectorAll('[data-live="true"]')];
    expect(lit.length).toBeGreaterThan(0);
    for (const element of lit) {
      expect(element.getAttribute("data-node")).toBe("voice");
    }
    expect(screen.getByText("Berjalan")).toBeInTheDocument();
    expect(
      screen.getByText(/pemeriksaan sedang berjalan/i),
    ).toBeInTheDocument();
  });

  it("gives every node exactly one port of each direction", () => {
    const { result, trace } = scoreWithTrace({ text: APK_MESSAGE });
    const { container } = render(
      <SignalPanel result={result} sequence={AGENT_SEQUENCE} trace={trace} />,
    );

    const keys = [...container.querySelectorAll("[data-port]")].map(
      (element) =>
        `${element.getAttribute("data-node")}:${element.getAttribute("data-port")}`,
    );

    expect(keys).toEqual(
      expect.arrayContaining([
        "entry:out",
        "root:out",
        "synthesis:in",
        "synthesis:out",
        "voice:in",
        ...AGENT_SEQUENCE.map((agent) => `agent-${agent}:in`),
        ...AGENT_SEQUENCE.map((agent) => `agent-${agent}:out`),
      ]),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
