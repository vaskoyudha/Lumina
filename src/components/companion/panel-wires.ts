/**
 * Panel graph geometry — pure, measured, orthogonal.
 *
 * The panel draws one bus on each side of the branch column: a fan rail in the
 * left gutter (`x = 4`) and a return rail in the right gutter (`x = width − 4`).
 * Every coordinate that matters comes from ports measured in the DOM; this
 * module only decides how to connect them. It never reads layout and never
 * invents a position, so it is testable without jsdom.
 *
 * Rails are structure: they belong to every branch at once, so they stay in the
 * base tone. State lives on the short tap that joins each branch to its rail.
 */

export type WireTone = "base" | "ran" | "live" | "skipped" | "failed";

export type WireHead = {
  /** Tip of the arrow, on the port's edge. */
  x: number;
  y: number;
  dir: "right" | "down";
};

export type PanelWire = {
  key: string;
  d: string;
  tone: WireTone;
  head?: WireHead;
};

export type WirePoint = {
  x: number;
  y: number;
  /** NodeStatus measured from the port's `data-status`. */
  status?: string;
};

export type WireAgent = {
  id: string;
  in?: WirePoint;
  out?: WirePoint;
};

export type PanelPorts = {
  width: number;
  rootOut?: WirePoint;
  synthesisIn?: WirePoint;
  synthesisOut?: WirePoint;
  voiceIn?: WirePoint;
  agents: WireAgent[];
};

export const WIRE_METRICS = {
  /** Distance from the canvas edge to each rail. */
  gutter: 4,
  /** Root stub length before the fan turns left. */
  rootStub: 16,
  /** Corner radius for every orthogonal bend. */
  elbow: 8,
  /** Arrowhead length, from base to tip. */
  head: 6,
  /** Arrowhead half-width at the base. */
  halfHead: 2.25,
  /** Port dot radius: the head tip stops on the dot's edge. */
  portEdge: 5,
  /** Horizontal return lane sits this far above the synthesis port. */
  returnGap: 24,
} as const;

const TONE_BY_STATUS: Record<string, WireTone> = {
  pending: "base",
  ran: "ran",
  live: "live",
  skipped: "skipped",
  failed: "failed",
};

export function wireTone(status: string | undefined): WireTone {
  return (status && TONE_BY_STATUS[status]) || "base";
}

/** Keep path strings stable and short; measured coordinates carry decimals. */
function n(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A corner radius that cannot overshoot either leg. Degenerate layouts (a rail
 * with no room) collapse to a hard corner instead of drawing backwards.
 */
function radius(...legs: number[]): number {
  return Math.max(
    0,
    Math.min(WIRE_METRICS.elbow, ...legs.map((leg) => leg / 2)),
  );
}

export function buildPanelWires(ports: PanelPorts): PanelWire[] {
  if (!(ports.width > 0)) return [];

  const leftRail = WIRE_METRICS.gutter;
  const rightRail = ports.width - WIRE_METRICS.gutter;
  const wires: PanelWire[] = [];

  type Tap = { id: string; point: WirePoint };

  const incoming: Tap[] = ports.agents.flatMap((agent) =>
    agent.in ? [{ id: agent.id, point: agent.in }] : [],
  );
  const outgoing: Tap[] = ports.agents.flatMap((agent) =>
    agent.out ? [{ id: agent.id, point: agent.out }] : [],
  );

  /*
   * Root fan. The stub leaves the root port, turns left, and becomes the rail
   * that every inbound tap hangs from. The rail is structural; each tap is
   * painted by its own branch below.
   */
  if (ports.rootOut && incoming.length > 0) {
    const root = ports.rootOut;
    const fanY = root.y + WIRE_METRICS.rootStub;
    const lastTap = Math.max(...incoming.map((tap) => tap.point.y));
    const r = radius(root.x - leftRail, lastTap - fanY);

    if (root.x > leftRail && lastTap > fanY) {
      wires.push({
        key: "rail:fan",
        d: [
          `M ${n(root.x)} ${n(root.y)}`,
          `L ${n(root.x)} ${n(fanY - r)}`,
          `Q ${n(root.x)} ${n(fanY)} ${n(root.x - r)} ${n(fanY)}`,
          `L ${n(leftRail + r)} ${n(fanY)}`,
          `Q ${n(leftRail)} ${n(fanY)} ${n(leftRail)} ${n(fanY + r)}`,
          `L ${n(leftRail)} ${n(lastTap)}`,
        ].join(" "),
        tone: "base",
      });
    }
  }

  for (const { id, point } of incoming) {
    const tipX = point.x - WIRE_METRICS.portEdge;
    const baseX = tipX - WIRE_METRICS.head;
    wires.push({
      key: `tap:in:${id}`,
      d: `M ${n(leftRail)} ${n(point.y)} L ${n(baseX)} ${n(point.y)}`,
      tone: wireTone(point.status),
      head: { x: n(tipX), y: n(point.y), dir: "right" },
    });
  }

  for (const { id, point } of outgoing) {
    wires.push({
      key: `tap:out:${id}`,
      d: `M ${n(point.x)} ${n(point.y)} L ${n(rightRail)} ${n(point.y)}`,
      tone: wireTone(point.status),
    });
  }

  /*
   * Return rail. It collects every output tap and turns left above the
   * synthesis card, then drops into its port. The rail and lane are structure;
   * only the terminal drop wears the synthesis tone.
   */
  if (ports.synthesisIn && outgoing.length > 0) {
    const target = ports.synthesisIn;
    const firstTap = Math.min(...outgoing.map((tap) => tap.point.y));
    const turnY = target.y - WIRE_METRICS.returnGap;
    const r = radius(rightRail - target.x, turnY - firstTap);

    if (rightRail > target.x && turnY > firstTap) {
      wires.push({
        key: "rail:return",
        d: [
          `M ${n(rightRail)} ${n(firstTap)}`,
          `L ${n(rightRail)} ${n(turnY - r)}`,
          `Q ${n(rightRail)} ${n(turnY)} ${n(rightRail - r)} ${n(turnY)}`,
          `L ${n(target.x + r)} ${n(turnY)}`,
          `Q ${n(target.x)} ${n(turnY)} ${n(target.x)} ${n(turnY + r)}`,
        ].join(" "),
        tone: "base",
      });

      const tipY = target.y - WIRE_METRICS.portEdge;
      const baseY = tipY - WIRE_METRICS.head;
      const dropStart = turnY + r;
      if (baseY > dropStart) {
        wires.push({
          key: "drop:synthesis",
          d: `M ${n(target.x)} ${n(dropStart)} L ${n(target.x)} ${n(baseY)}`,
          tone: wireTone(target.status),
          head: { x: n(target.x), y: n(tipY), dir: "down" },
        });
      } else {
        wires.push({
          key: "drop:synthesis",
          d: `M ${n(target.x)} ${n(baseY)} L ${n(target.x)} ${n(baseY)}`,
          tone: wireTone(target.status),
          head: { x: n(target.x), y: n(tipY), dir: "down" },
        });
      }
    }
  }

  if (ports.synthesisOut && ports.voiceIn) {
    const source = ports.synthesisOut;
    const target = ports.voiceIn;
    const tipY = target.y - WIRE_METRICS.portEdge;
    const baseY = tipY - WIRE_METRICS.head;
    wires.push({
      key: "link:voice",
      d: `M ${n(source.x)} ${n(source.y)} L ${n(target.x)} ${n(baseY)}`,
      tone: wireTone(target.status),
      head: { x: n(target.x), y: n(tipY), dir: "down" },
    });
  }

  return wires;
}
