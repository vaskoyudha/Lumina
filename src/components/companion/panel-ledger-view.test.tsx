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
  SpawnedSection,
  TraceDisclosure,
} from "@/components/companion/panel-ledger-view";
import type { SpawnedAgent } from "@/components/companion/spawn-ledger";
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
    const onSelectAgent = jest.fn();
    const agent: PanelAgent = {
      agent: "link",
      outcome: "no_object",
      count: 0,
      findings: [],
      note: "Tidak ada tautan pada pesan ini.",
    };

    render(
      <CoverageGroup
        agents={[agent]}
        label="Tanpa objek"
        onSelectAgent={onSelectAgent}
      />,
    );

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

    await user.click(
      screen.getByRole("button", { name: /tampilkan info link agent/i }),
    );
    expect(onSelectAgent).toHaveBeenCalledWith("link");
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

describe("SpawnedSection", () => {
  const spawned: SpawnedAgent[] = [
    {
      agent: "message",
      label: "Mochi · Message Agent",
      task: "Membaca kata yang dipakai untuk menekan.",
      status: "selesai",
      findings: 2,
      ms: 14,
    },
    {
      agent: "link",
      label: "Bubu · Link Agent",
      task: "Membongkar tautan pada pesan.",
      status: "berjalan",
      findings: 0,
    },
    {
      agent: "identity",
      label: "Identity Agent",
      task: "Memeriksa identitas pengirim.",
      status: "gagal",
      findings: 0,
    },
    {
      agent: "conversation",
      label: "Conversation Agent",
      task: "Membandingkan giliran.",
      status: "dilewati",
      findings: 0,
    },
  ];

  it("renders one row per spawned agent with its status", () => {
    render(<SpawnedSection agents={spawned} titleId="panel" />);

    expect(screen.getByText("Sub-agen dijalankan · 4")).toBeInTheDocument();

    const list = within(
      screen.getByRole("list", { name: /sub-agen yang dijalankan/i }),
    );
    expect(list.getByText("2 temuan")).toBeInTheDocument();
    expect(list.getByText("Berjalan")).toBeInTheDocument();
    expect(list.getByText("Gagal")).toBeInTheDocument();
    expect(list.getByText("Dilewati")).toBeInTheDocument();
  });

  it("renders nothing when no agent was spawned", () => {
    const { container } = render(
      <SpawnedSection agents={[]} titleId="panel" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("reports the clicked agent", async () => {
    const user = userEvent.setup();
    const onSelectAgent = jest.fn();

    render(
      <SpawnedSection
        agents={spawned}
        onSelectAgent={onSelectAgent}
        titleId="panel"
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /tampilkan info sub-agen link agent/i,
      }),
    );
    expect(onSelectAgent).toHaveBeenCalledWith("link");
  });
});
