import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AGENT_SEQUENCE } from "@/components/companion/agents";
import {
  buildPanelLedger,
  type PanelAgent,
} from "@/components/companion/panel-ledger";
import {
  CoverageGroup,
  CoverageStrip,
  FindingsSection,
  TraceDisclosure,
} from "@/components/companion/panel-ledger-view";
import { scoreWithTrace } from "@/lib/scoring/score";

const APK_MESSAGE =
  "Selamat siang Bu, ini undangan pernikahan anak kami. Mohon dibuka ya file Undangan-Pernikahan.apk yang saya kirim, isinya lengkap dengan lokasi acara.";

const positive = (signals: Parameters<typeof buildPanelLedger>[2]) =>
  signals.filter((signal) => signal.weight > 0);

function apkLedger() {
  const { result, trace } = scoreWithTrace({ text: APK_MESSAGE });
  return buildPanelLedger(AGENT_SEQUENCE, trace, positive(result.signals));
}

describe("CoverageStrip", () => {
  it("prints the run summary and one tick per agent", () => {
    const { container } = render(<CoverageStrip ledger={apkLedger()} />);

    expect(screen.getByText(/diperiksa/i)).toBeInTheDocument();
    expect(container.querySelectorAll("[data-coverage-tick]")).toHaveLength(
      AGENT_SEQUENCE.length,
    );
  });
});

describe("FindingsSection", () => {
  it("keeps the findings list and links a quote back to the message", async () => {
    const user = userEvent.setup();
    const onSelectEvidence = jest.fn();
    const ledger = apkLedger();
    const first = ledger.findingAgents[0]?.findings[0];

    render(
      <FindingsSection
        agents={ledger.findingAgents}
        onSelectEvidence={onSelectEvidence}
        titleId="test-findings"
      />,
    );

    const list = screen.getByRole("list", { name: /temuan terdeteksi/i });
    expect(within(list).getAllByText(/agent/i).length).toBeGreaterThan(0);

    if (!first)
      throw new Error("expected the APK message to produce a finding");
    const button = within(list).getAllByRole("button", {
      name: /lihat di pesan/i,
    })[0];
    if (!button) throw new Error("expected a message link");
    await user.click(button);
    expect(onSelectEvidence).toHaveBeenCalledWith(first.evidence);
  });

  it("renders the empty message when there are no findings", () => {
    render(<FindingsSection agents={[]} titleId="empty-findings" />);

    expect(
      screen.getByRole("list", { name: /temuan terdeteksi/i }),
    ).toHaveTextContent(/tidak ada pola penipuan yang dikenali/i);
    expect(
      screen.queryByRole("button", { name: /lihat di pesan/i }),
    ).toBeNull();
  });
});

describe("CoverageGroup", () => {
  it("stays closed until opened and then shows the reason", async () => {
    const user = userEvent.setup();
    const agent: PanelAgent = {
      agent: "link",
      outcome: "no_object",
      count: 0,
      findings: [],
      note: "Tidak ada tautan pada pesan ini.",
    };

    render(<CoverageGroup agents={[agent]} label="Tanpa objek" />);

    const trigger = screen.getByRole("button", { name: /tanpa objek/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByText(/tidak ada tautan pada pesan ini/i),
    ).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/tidak ada tautan pada pesan ini/i),
    ).toBeInTheDocument();
  });
});

describe("TraceDisclosure", () => {
  it("reveals the measured stage list only when opened", async () => {
    const user = userEvent.setup();
    const { trace } = scoreWithTrace({ text: APK_MESSAGE });

    render(<TraceDisclosure trace={trace} />);

    const trigger = screen.getByRole("button", { name: /jejak/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Message Agent")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Message Agent")).toBeInTheDocument();
    expect(screen.getAllByText(/ms/i).length).toBeGreaterThan(0);
  });
});
