import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import { SignalPanel } from "@/components/companion/signal-panel";
import { STAGE_LABEL } from "@/lib/contracts/agent-run";
import { RISK_LABEL } from "@/lib/contracts/score";
import { buildEvidenceBundle } from "@/lib/evidence/bundle";
import { scoreWithTrace } from "@/lib/scoring/score";

/**
 * The panel is the product's honesty display, so these assert what a judge can
 * point at: the verdict reads first, every finding names the words that fired
 * it, and an agent with no object says so without being called skipped.
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

function withEvidenceStage(trace: ReturnType<typeof scoreWithTrace>["trace"]) {
  return {
    ...trace,
    stages: [
      ...trace.stages,
      {
        id: "evidence" as const,
        ...STAGE_LABEL.evidence,
        status: "dilewati" as const,
        findings: 0,
        ms: 0,
        note: "Tidak ada kutipan yang bisa dicatat.",
      },
    ],
  };
}

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
    const { container } = render(
      <SignalPanel
        result={result}
        sequence={AGENT_SEQUENCE}
        trace={withEvidenceStage(trace)}
      />,
    );

    // The number and the band are the engine's; the panel only prints them.
    expect(screen.getByText(String(result.score))).toBeInTheDocument();
    expect(screen.getByText(RISK_LABEL[result.risk])).toBeInTheDocument();

    // The result screen displays the checked message, so the disclosure that
    // only a lossy digest can leave the device belongs on this screen too.
    expect(
      screen.getByText(/pesan lengkap tetap di perangkat/i),
    ).toBeInTheDocument();

    // The result ledger is not the teaching graph: no Q-codes or fake ports.
    expect(screen.queryByText(/Q4/)).not.toBeInTheDocument();
    expect(container.querySelector("[data-port]")).toBeNull();

    const findings = within(
      screen.getByRole("list", { name: /temuan terdeteksi/i }),
    );
    expect(findings.getAllByText(/agent/i).length).toBeGreaterThan(0);
  });

  it("credits each finding to the agent that produced it, with its quote", () => {
    const { result, trace } = scoreWithTrace({ text: PRIZE_MESSAGE });
    render(
      <SignalPanel
        result={result}
        sequence={AGENT_SEQUENCE}
        trace={withEvidenceStage(trace)}
      />,
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
    expect(screen.getAllByText(/^\d+ temuan$/i).length).toBeGreaterThan(0);
  });

  it("names an agent with no object and keeps its reason behind a group", async () => {
    const user = userEvent.setup();
    const { result, trace } = scoreWithTrace({ text: PRIZE_MESSAGE });
    render(
      <SignalPanel
        result={result}
        sequence={AGENT_SEQUENCE}
        trace={withEvidenceStage(trace)}
      />,
    );

    // The prize message carries no link, so the Link Agent has nothing to read.
    const trigger = screen.getByRole("button", { name: /tanpa objek/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Link Agent")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Link Agent")).toBeInTheDocument();
    expect(
      screen.getByText(/tidak ada tautan pada pesan ini/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/\d+ diperiksa/i)).toBeInTheDocument();
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
      screen.getByRole("link", { name: /buka komunitas/i }),
    ).toHaveAttribute("href", "/komunitas");
    unmount();

    const clean = scoreWithTrace({
      text: "besok pagi aku mau ke kampus lebih awal untuk mengurus surat keterangan aktif kuliah, lalu siangnya mampir ke perpustakaan mengembalikan buku yang sudah lewat tenggat dua hari.",
    });
    render(<SignalPanel result={clean.result} sequence={AGENT_SEQUENCE} />);
    expect(clean.result.risk).not.toBe("tinggi");
    expect(
      screen.queryByRole("link", { name: /buka komunitas/i }),
    ).not.toBeInTheDocument();
  });

  it("lights only the stage whose trace is actually running", () => {
    const { result, trace } = scoreWithTrace({ text: APK_MESSAGE });
    const done = render(
      <SignalPanel
        result={result}
        sequence={AGENT_SEQUENCE}
        trace={withEvidenceStage(trace)}
      />,
    );

    // Every detector has finished, so nothing may wear the live state.
    expect(done.container.querySelector('[data-live="true"]')).toBeNull();
    done.unmount();

    const liveTrace = {
      ...withEvidenceStage(trace),
      stages: [
        ...withEvidenceStage(trace).stages,
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

  it("keeps the teaching graph's ports in the empty state", () => {
    const { container } = render(
      <SignalPanel result={null} sequence={AGENT_SEQUENCE} />,
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
