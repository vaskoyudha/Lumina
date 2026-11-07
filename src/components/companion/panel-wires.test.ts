import {
  buildPanelWires,
  type PanelPorts,
  WIRE_METRICS,
  type WireAgent,
} from "@/components/companion/panel-wires";

const IDS = [
  "message",
  "link",
  "identity",
  "conversation",
  "evidence",
] as const;

const IN_Y = [360.6, 498.6, 636.6, 774.6, 912.6];
const OUT_Y = [421.4, 559.4, 697.4, 835.4, 973.4];

/** Measured synthesis and voice ports at 380px, reused by the assertions. */
const SYNTHESIS_IN = { x: 128, y: 1055.6, status: "ran" };
const SYNTHESIS_OUT = { x: 128, y: 1107.8, status: "ran" };
const VOICE_IN = { x: 128, y: 1133.8, status: "pending" };

function agentsAt(inX: number, outX: number): WireAgent[] {
  return IDS.map((id, index) => ({
    id,
    in: { x: inX, y: IN_Y[index], status: "ran" },
    out: { x: outX, y: OUT_Y[index], status: "ran" },
  }));
}

/** Measured at 380px on 7 Nov 2026 (empty state). */
const NARROW: PanelPorts = {
  width: 256,
  rootOut: { x: 128, y: 294.6 },
  synthesisIn: SYNTHESIS_IN,
  synthesisOut: SYNTHESIS_OUT,
  voiceIn: VOICE_IN,
  agents: agentsAt(16, 243),
};

/** Measured at 1440px: same gutters, wider canvas. */
const WIDE: PanelPorts = {
  ...NARROW,
  width: 367,
  rootOut: { x: 183.5, y: 294.6 },
  synthesisIn: { x: 183.5, y: 1055.6, status: "ran" },
  synthesisOut: { x: 183.5, y: 1107.8, status: "ran" },
  voiceIn: { x: 183.5, y: 1133.8, status: "pending" },
  agents: agentsAt(16, 354),
};

function byKey(ports: PanelPorts, key: string) {
  const wire = buildPanelWires(ports).find((item) => item.key === key);
  if (!wire) throw new Error(`missing wire ${key}`);
  return wire;
}

describe("buildPanelWires", () => {
  it("draws one structural rail per gutter and a state tap per branch", () => {
    const wires = buildPanelWires(NARROW);
    const keys = wires.map((wire) => wire.key);

    expect(keys).toContain("rail:fan");
    expect(keys).toContain("rail:return");
    for (const id of IDS) {
      expect(keys).toContain(`tap:in:${id}`);
      expect(keys).toContain(`tap:out:${id}`);
    }
    expect(keys).toContain("drop:synthesis");
    expect(keys).toContain("link:voice");
    expect(keys).toHaveLength(14);
  });

  it("runs the left rail at x=4 and the right rail at width-4", () => {
    expect(byKey(NARROW, "rail:fan").d).toContain("L 4 912.6");
    expect(byKey(NARROW, "tap:out:evidence").d).toBe("M 243 973.4 L 252 973.4");
    expect(byKey(WIDE, "tap:out:evidence").d).toBe("M 354 973.4 L 363 973.4");
    expect(byKey(WIDE, "rail:fan").d).toContain("L 4 912.6");
  });

  it("starts the fan on the measured root port and stays above the cards", () => {
    const fan = byKey(NARROW, "rail:fan").d;
    expect(fan.startsWith("M 128 294.6")).toBe(true);
    expect(fan).toContain("Q 128 310.6 120 310.6");
    expect(byKey(WIDE, "rail:fan").d.startsWith("M 183.5 294.6")).toBe(true);

    // The only horizontal fan leg is 16px below the root, inside the 44px
    // spacer before the first card (top 338.6).
    expect(294.6 + 16).toBeLessThan(338.6);
  });

  it("returns above the synthesis card, not through the branch column", () => {
    const rail = byKey(NARROW, "rail:return").d;
    expect(rail.startsWith("M 252 421.4")).toBe(true);
    expect(rail).toContain("L 252 1023.6");
    expect(rail).toContain("Q 252 1031.6 244 1031.6");
    expect(rail).toContain("L 136 1031.6");
    expect(rail).toContain("Q 128 1031.6 128 1039.6");

    // 1031.6 sits in the 36px gap between cards (bottom 1018.6) and
    // synthesis (top 1054.6).
    expect(1031.6).toBeGreaterThan(1018.6);
    expect(1031.6).toBeLessThan(1054.6);
  });

  it("stops every arrow tip on its port edge", () => {
    const wires = buildPanelWires(NARROW);
    const ports = new Map<string, { x: number; y: number; axis: "x" | "y" }>();
    for (const [index, id] of IDS.entries()) {
      ports.set(`tap:in:${id}`, { x: 16, y: IN_Y[index], axis: "x" });
      ports.set(`tap:out:${id}`, { x: 243, y: OUT_Y[index], axis: "x" });
    }
    ports.set("drop:synthesis", {
      x: SYNTHESIS_IN.x,
      y: SYNTHESIS_IN.y,
      axis: "y",
    });
    ports.set("link:voice", {
      x: VOICE_IN.x,
      y: VOICE_IN.y,
      axis: "y",
    });

    for (const wire of wires) {
      if (!wire.head) continue;
      const port = ports.get(wire.key);
      if (!port) continue;
      expect(wire.head.dir).toBe(port.axis === "x" ? "right" : "down");
      expect(port.axis === "x" ? wire.head.x : wire.head.y).toBeCloseTo(
        (port.axis === "x" ? port.x : port.y) - WIRE_METRICS.portEdge,
        5,
      );
    }
  });

  it("stops the synthesis and voice shafts where each arrowhead starts", () => {
    expect(byKey(NARROW, "drop:synthesis").d).toBe("M 128 1039.6 L 128 1044.6");
    expect(byKey(NARROW, "drop:synthesis").head).toEqual({
      x: 128,
      y: 1050.6,
      dir: "down",
    });
    expect(byKey(NARROW, "link:voice").d).toBe("M 128 1107.8 L 128 1122.8");
    expect(byKey(NARROW, "link:voice").head).toEqual({
      x: 128,
      y: 1128.8,
      dir: "down",
    });
  });

  it("maps every status to a tone, including pending", () => {
    const statuses = ["ran", "skipped", "failed", "live", "pending"] as const;
    const ports: PanelPorts = {
      ...NARROW,
      agents: IDS.map((id, index) => ({
        id,
        in: { x: 16, y: IN_Y[index], status: statuses[index] },
        out: { x: 243, y: OUT_Y[index], status: statuses[index] },
      })),
      synthesisIn: { ...SYNTHESIS_IN, status: "pending" },
      voiceIn: { ...VOICE_IN, status: "live" },
    };

    expect(byKey(ports, "tap:in:message").tone).toBe("ran");
    expect(byKey(ports, "tap:in:link").tone).toBe("skipped");
    expect(byKey(ports, "tap:in:identity").tone).toBe("failed");
    expect(byKey(ports, "tap:in:conversation").tone).toBe("live");
    expect(byKey(ports, "tap:in:evidence").tone).toBe("base");
    expect(byKey(ports, "tap:out:link").tone).toBe("skipped");
    expect(byKey(ports, "rail:fan").tone).toBe("base");
    expect(byKey(ports, "rail:return").tone).toBe("base");
    expect(byKey(ports, "drop:synthesis").tone).toBe("base");
    expect(byKey(ports, "link:voice").tone).toBe("live");
  });

  it("never emits a Bézier curve", () => {
    for (const wire of buildPanelWires(NARROW)) {
      expect(wire.d).not.toMatch(/[CcSs]/);
    }
  });

  it("returns nothing for an unmeasured or portless canvas", () => {
    expect(buildPanelWires({ ...NARROW, width: 0 })).toEqual([]);
    expect(buildPanelWires({ width: 256, agents: [] })).toEqual([]);
  });

  it("skips an agent whose port is missing without moving the others", () => {
    const ports: PanelPorts = {
      ...NARROW,
      agents: NARROW.agents.map((agent, index) =>
        index === 2 ? { id: agent.id } : agent,
      ),
    };
    const wires = buildPanelWires(ports);
    expect(wires.some((wire) => wire.key === "tap:in:identity")).toBe(false);
    expect(wires.some((wire) => wire.key === "tap:out:identity")).toBe(false);
    expect(byKey(ports, "rail:fan").d).toContain("L 4 912.6");
    expect(byKey(ports, "rail:return").d.startsWith("M 252 421.4")).toBe(true);
  });
});
