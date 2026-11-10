"use client";

import {
  Lock,
  Minus,
  PenLine,
  Plus,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { DetectorAgent } from "@/components/companion/agents";
import { buildPanelLedger } from "@/components/companion/panel-ledger";
import {
  CoverageGroup,
  CoverageStrip,
  FindingsSection,
  TraceDisclosure,
} from "@/components/companion/panel-ledger-view";
import {
  buildPanelWires,
  type PanelWire,
  WIRE_METRICS,
  type WireHead,
  type WireTone,
} from "@/components/companion/panel-wires";
import { StatusPulse } from "@/components/companion/status-pulse";
import { ValidationNote } from "@/components/companion/validation-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyTitle } from "@/components/ui/empty";
import { type AgentTrace, STAGE_LABEL } from "@/lib/contracts/agent-run";
import type { EvidenceBundle } from "@/lib/contracts/evidence";
import {
  type AgentId,
  RISK_LABEL,
  type Risk,
  type ScoreResult,
} from "@/lib/contracts/score";
import { MODUS_BY_ID } from "@/lib/modus";
import { cn } from "@/lib/utils";

/**
 * Right-hand evidence panel (§3) — drawn as the agent graph from the Cortex
 * reference: one verdict node, one branch node per detector, one synthesis node, joined by
 * an orthogonal fan rail and return rail over a dotted canvas.
 *
 * The graph is the structure the reference asked for, but every wire is backed
 * by data we actually have: a branch turns green only when its detector ran, a
 * skipped branch keeps its reason (`dilewati — …`) instead of a green tick, and
 * the finding count in the synthesis node is the engine's, never a static
 * label. The only interactive chrome is real: the canvas zoom and the community
 * link. There is no simulated pipeline to drift out of date.
 *
 * Honesty rule (§5 · A): a stage that did not run says so, and never wears a
 * green tick. Every state below is read from `AgentTrace` or from the signals
 * themselves — there is no static "agent is live" table.
 */

const RISK_TEXT: Record<Risk, string> = {
  bersih: "text-brand",
  rendah: "text-brand",
  mencurigakan: "text-warn",
  tinggi: "text-danger",
};

const NODE_DOT: Record<string, string> = {
  ran: "bg-brand",
  live: "bg-brand",
  skipped: "bg-ink-faint",
  failed: "bg-danger",
  pending: "bg-dot",
};

const NODE_LABEL: Record<string, string> = {
  ran: "Selesai",
  live: "Berjalan",
  skipped: "Dilewati",
  failed: "Gagal",
  pending: "Tanpa catatan",
};

/** Port fills follow the branch's measured status, not the wire's own guess. */
const PORT_IN: Record<NodeStatus, string> = {
  pending: "border-dot",
  ran: "border-brand-strong",
  live: "border-brand-strong",
  skipped: "border-dot-soft",
  failed: "border-danger",
};

const PORT_OUT: Record<NodeStatus, string> = {
  pending: "bg-dot",
  ran: "bg-brand-strong",
  live: "bg-brand-strong",
  skipped: "bg-dot-soft",
  failed: "bg-danger",
};

/**
 * The uppercase kind printed under each branch title, mirroring the
 * reference's `Q5 · MATCHING`. Each word is the stage's own subject, so the
 * line tells a reader what the branch does and nothing it does not.
 */
const BRANCH_KIND: Record<AgentId, string> = {
  email: "Email",
  injection: "Instruksi",
  message: "Urgensi",
  link: "Tautan",
  identity: "Identitas",
  conversation: "Eskalasi",
  job: "Lowongan",
  marketplace: "Jual-beli",
  qris: "QRIS",
  evidence: "Bukti",
  scoring: "Sintesis",
};

/**
 * Canvas node numbering, taken from the reference: the message node is Q4 and
 * the branches fan out Q5…Qn into a single synthesis node after them.
 */
const ROOT_CODE = "Q4";
const branchCode = (index: number) => `Q${5 + index}`;
const synthesisCode = (count: number) => `Q${5 + count}`;
const voiceCode = (count: number) => `Q${6 + count}`;

/**
 * The condition each branch is entered under, printed on the root node's rule
 * rows. These are the detectors' real triggers, not invented prose: a branch
 * runs when there is something of its kind to inspect.
 */
const BRANCH_CONDITION: Record<AgentId, string> = {
  email: "Ada blok header email",
  injection: "Ada instruksi kepada pemeriksa",
  message: "Ada urgensi, otoritas, atau iming-iming",
  link: "Ada tautan yang perlu dibuka",
  identity: "Ada klaim institusi atau nomor asing",
  conversation: "Ada pesan sebelumnya di percakapan",
  job: "Ada tawaran kerja atau tugas berbayar",
  marketplace: "Ada percakapan jual-beli",
  qris: "Ada payload QRIS",
  evidence: "Ada temuan yang bisa dikutip",
  scoring: "Menggabungkan seluruh temuan",
};

type NodeStatus = "ran" | "live" | "skipped" | "failed" | "pending";

/** The brand mascot used as a branch badge. */
function AgentMark() {
  return (
    <Image
      alt=""
      className="size-full object-cover"
      height={128}
      src="/brand/companion-mascot.png"
      width={128}
    />
  );
}

/** Entry pill + stem + port, cloned from the reference canvas. */
function EntryPort({ label }: { label: string }) {
  return (
    <div className="mb-1 flex flex-col items-center">
      <div className="rounded-full border border-edge bg-panel/90 px-2 py-0.5 font-mono text-[9.5px] text-ink-mute uppercase tracking-wider">
        {label}
      </div>
      <div className="h-3 border-brand-edge border-l" />
      <div
        className="-mb-1.5 z-10 size-2.5 rounded-full border-2 border-dot bg-panel"
        data-node="entry"
        data-port="out"
      />
    </div>
  );
}

type PortPoint = {
  x: number;
  y: number;
  status?: string;
};

function sameWires(a: PanelWire[], b: PanelWire[]): boolean {
  return (
    a.length === b.length &&
    a.every((wire, index) => {
      const other = b[index];
      return (
        other != null &&
        wire.key === other.key &&
        wire.d === other.d &&
        wire.tone === other.tone &&
        wire.head?.x === other.head?.x &&
        wire.head?.y === other.head?.y &&
        wire.head?.dir === other.head?.dir
      );
    })
  );
}

/**
 * Every wire is measured from the ports the nodes actually render. The overlay
 * takes the canvas's own layout size as its viewBox, so the zoom transform moves
 * cards and wires together; `non-scaling-stroke` keeps the stroke honest while
 * the canvas scales.
 */
function useGraphWires(canvasRef: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [wires, setWires] = useState<PanelWire[]>([]);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    if (width <= 0 || height <= 0) return;

    /*
     * Rects, not `offsetLeft`: every port carries its own `-translate-x-1/2`
     * (a 5px shift offsets cannot see), and the canvas itself is scaled by the
     * zoom control. Dividing by the measured scale converts screen pixels back
     * into the canvas's layout space, which is the SVG's viewBox.
     */
    const canvasRect = canvas.getBoundingClientRect();
    if (canvasRect.width <= 0 || canvasRect.height <= 0) return;
    const scaleX = canvasRect.width / width;
    const scaleY = canvasRect.height / height;

    const ports = new Map<string, PortPoint>();
    for (const element of canvas.querySelectorAll<HTMLElement>("[data-port]")) {
      const node = element.dataset.node;
      const port = element.dataset.port;
      if (!node || !port) continue;

      const rect = element.getBoundingClientRect();
      const x = (rect.left + rect.width / 2 - canvasRect.left) / scaleX;
      const y = (rect.top + rect.height / 2 - canvasRect.top) / scaleY;

      ports.set(`${node}:${port}`, {
        x,
        y,
        status: element.dataset.status,
      });
    }

    const agents = [...ports.keys()]
      .map((key) => key.split(":")[0])
      .filter(
        (node, index, all) =>
          node.startsWith("agent-") && all.indexOf(node) === index,
      );

    const next = buildPanelWires({
      width,
      rootOut: ports.get("root:out"),
      synthesisIn: ports.get("synthesis:in"),
      synthesisOut: ports.get("synthesis:out"),
      voiceIn: ports.get("voice:in"),
      agents: agents.map((id) => ({
        id,
        in: ports.get(`${id}:in`),
        out: ports.get(`${id}:out`),
      })),
    });

    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
    setWires((prev) => (sameWires(prev, next) ? prev : next));
  }, [canvasRef]);

  /*
   * A callback ref, not a dependency array on an effect: `SignalPanel` swaps
   * from the empty canvas to the result canvas when the first verdict arrives,
   * and the observer has to follow the new DOM node. React calls this only when
   * a canvas actually mounts, so there is no render loop to guard against.
   */
  const attachCanvas = useCallback(
    (node: HTMLDivElement | null) => {
      canvasRef.current = node;
      if (!node) return;

      const observer = new ResizeObserver(() => measure());
      observer.observe(node);
      for (const port of node.querySelectorAll("[data-port]")) {
        observer.observe(port);
      }
      measure();

      return () => observer.disconnect();
    },
    [canvasRef, measure],
  );

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  /*
   * Tones are read from `data-status`, and a trace update does not necessarily
   * resize a port. Re-measure after every commit; the state setters bail when
   * the geometry and tones are unchanged, so this cannot loop.
   */
  useLayoutEffect(() => {
    measure();
  });

  return { attachCanvas, ...size, wires };
}

const WIRE_TONE: Record<
  WireTone,
  { fill: string; pulse: boolean; stroke: string; width: number }
> = {
  base: {
    fill: "fill-brand-edge",
    pulse: false,
    stroke: "stroke-brand-edge",
    width: 1.2,
  },
  ran: {
    fill: "fill-brand-strong",
    pulse: false,
    stroke: "stroke-brand-strong",
    width: 1.5,
  },
  live: {
    fill: "fill-brand-strong",
    pulse: true,
    stroke: "stroke-brand-strong",
    width: 2,
  },
  skipped: {
    fill: "fill-dot",
    pulse: false,
    stroke: "stroke-dot",
    width: 1.2,
  },
  failed: {
    fill: "fill-danger",
    pulse: false,
    stroke: "stroke-danger",
    width: 1.5,
  },
};

/** Filled triangle: tip on the port edge, base on the wire's own endpoint. */
function headPoints(head: WireHead): string {
  const length = WIRE_METRICS.head;
  const half = WIRE_METRICS.halfHead;
  if (head.dir === "right") {
    return `${head.x},${head.y} ${head.x - length},${head.y - half} ${head.x - length},${head.y + half}`;
  }
  return `${head.x},${head.y} ${head.x - half},${head.y - length} ${head.x + half},${head.y - length}`;
}

function GraphWires({
  height,
  width,
  wires,
}: {
  height: number;
  width: number;
  wires: PanelWire[];
}) {
  if (width <= 0 || height <= 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      fill="none"
      role="presentation"
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      {wires.map((wire) => {
        const tone = WIRE_TONE[wire.tone];
        return (
          <g data-tone={wire.tone} data-wire={wire.key} key={wire.key}>
            <path
              className={cn(
                "transition-colors duration-150",
                tone.stroke,
                tone.pulse && "motion-safe:animate-pulse",
              )}
              d={wire.d}
              strokeWidth={tone.width}
              vectorEffect="non-scaling-stroke"
            />
            {wire.head ? (
              <polygon className={tone.fill} points={headPoints(wire.head)} />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/**
 * One branch card, in the reference's three bands: header (badge, title,
 * `Q5 · URGENSI`), the `Then → Qn` routing row that carries the pink output
 * port, and the status row underneath. Nothing here is decorative: the status
 * dot, its label, and the signal count all come from the trace.
 */
function AgentNode({
  code,
  kind,
  label,
  nextCode,
  nodeId,
  status,
  note,
  count,
}: {
  code: string;
  kind: string;
  label: string;
  nextCode: string;
  nodeId: AgentId;
  status: NodeStatus;
  note?: string;
  count: number;
}) {
  const skipped = status === "skipped";
  const live = status === "live";

  return (
    <li
      className={cn(
        "relative rounded-[14px] border border-edge bg-panel shadow-rest transition-colors hover:border-brand-edge",
        live && "border-brand-strong shadow-lift",
      )}
      data-live={live ? "true" : undefined}
      data-node={`agent-${nodeId}`}
      data-status={status}
    >
      <span className="absolute top-4 -left-[2px] flex items-center">
        <StatusPulse
          kind="ping"
          className={cn(
            "size-2.5 rounded-full border-2 bg-panel",
            PORT_IN[status],
          )}
          data-live={live ? "true" : undefined}
          data-node={`agent-${nodeId}`}
          data-port="in"
          data-status={status}
        />
      </span>

      <div className="px-3.5 pt-2.5 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-brand-edge bg-brand-chip">
            <AgentMark />
          </span>
          {skipped ? (
            <p className="text-[12.5px] text-ink leading-snug">
              <span className="font-semibold">{label}</span>{" "}
              <span className="text-ink-faint">
                dilewati
                {note ? ` — ${note}` : "."}
              </span>
            </p>
          ) : (
            <p className="font-semibold text-[12.5px] text-ink leading-snug">
              {label}
            </p>
          )}
        </div>
        <p className="mt-1.5 font-mono text-[9.5px] text-ink-mute uppercase tracking-[0.1em]">
          {code} &nbsp;·&nbsp; {kind}
        </p>
      </div>

      <div className="relative flex items-center justify-between border-edge-soft border-t px-3.5 py-1.5 text-[11.5px] text-ink-mute">
        <span>Then</span>
        <span className="font-mono text-[10.5px]">→ &nbsp;{nextCode}</span>
        <StatusPulse
          kind="ping"
          className={cn(
            "absolute top-1/2 -right-[5px] size-2.5 -translate-y-1/2 rounded-full",
            PORT_OUT[status],
          )}
          data-live={live ? "true" : undefined}
          data-node={`agent-${nodeId}`}
          data-port="out"
          data-status={status}
        />
      </div>

      <div className="flex items-center justify-between border-edge-soft border-t px-3.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", NODE_DOT[status])} />
          <span className="font-medium text-[11px] text-ink-mute">
            {NODE_LABEL[status]}
          </span>
        </div>
        {count > 0 ? (
          <span className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
            {count} sinyal
          </span>
        ) : null}
      </div>
    </li>
  );
}

/**
 * The branch column. It draws no connector of its own: every wire lives in the
 * single overlay so there is exactly one geometry to keep in sync.
 */
function BranchList({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <ol aria-label={label} className="relative space-y-2.5 px-3">
      {children}
    </ol>
  );
}

/**
 * The root node's rule list. Each row is a real routing rule — the condition
 * the branch is entered under and the node it leads to. `active` marks the
 * branches that actually reported this run; before any input nothing is
 * highlighted, so the card never implies work that has not happened.
 */
function RoutingRow({
  agent,
  active,
  target,
}: {
  agent: AgentId;
  active: boolean;
  target: string;
}) {
  return (
    <li
      className={cn(
        "flex items-center justify-between px-3.5 py-2",
        active && "bg-brand-tint",
      )}
    >
      <div className="flex min-w-0 items-center gap-2 pr-2">
        <span className="shrink-0 rounded-[5px] bg-chip px-1.5 py-0.5 font-mono font-medium text-[10px] text-ink-soft">
          IF
        </span>
        <span
          className={cn(
            "truncate text-[12px]",
            active ? "font-medium text-txt" : "text-ink-mute",
          )}
        >
          {BRANCH_CONDITION[agent]}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-[10.5px] text-ink-mute">
          → &nbsp;{target}
        </span>
        <span
          className={cn(
            "size-2.5 rounded-full bg-brand",
            active && "scale-110 ring-4 ring-brand/20",
          )}
        />
      </div>
    </li>
  );
}

function RootNode({
  title,
  code,
  kind,
  port = true,
  children,
}: {
  title: ReactNode;
  code?: string;
  kind?: string;
  port?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-[15px] border-[1.5px] border-brand-strong bg-panel shadow-lift">
        <div className="px-3.5 pt-3 pb-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-brand-edge bg-brand-tint">
                <span className="flex h-2.5 w-4 items-center justify-start rounded-full bg-brand px-0.5">
                  <span className="size-1.5 rounded-full bg-white" />
                </span>
              </span>
              {title}
            </div>
          </div>
          {code && kind ? (
            <p className="mt-2 font-mono text-[10px] text-ink-mute uppercase tracking-[0.1em]">
              {code} &nbsp;·&nbsp; {kind}
            </p>
          ) : null}
        </div>
        {children}
      </div>
      {port ? (
        <span
          aria-hidden
          className="absolute -bottom-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-brand-strong bg-panel"
          data-node="root"
          data-port="out"
        />
      ) : null}
    </div>
  );
}

/**
 * The terminal language node. It is the one stage that genuinely runs while the
 * answer is being written, so the graph has an honest state to light up during
 * a check. Its port is the top-centre dot the synthesis wire lands on.
 */
function VoiceNode({
  code,
  note,
  port = true,
  status,
}: {
  code?: string;
  note?: string;
  port?: boolean;
  status: NodeStatus;
}) {
  const live = status === "live";
  const skipped = status === "skipped";

  return (
    <div
      className={cn(
        "relative rounded-[14px] border bg-panel px-3.5 py-2.5 shadow-rest transition-colors",
        live ? "border-brand-strong shadow-lift" : "border-brand-line",
      )}
      data-live={live ? "true" : undefined}
      data-node="voice"
      data-status={status}
    >
      {port ? (
        <StatusPulse
          aria-hidden
          kind="ping"
          className={cn(
            "absolute -top-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 bg-panel",
            PORT_IN[status],
          )}
          data-live={live ? "true" : undefined}
          data-node="voice"
          data-port="in"
          data-status={status}
        />
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-brand-edge bg-brand-soft text-brand-strong">
            <PenLine aria-hidden className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-[12px] text-ink">
              Penyusun bahasa
            </p>
            <p className="font-mono text-[9.5px] text-ink-mute uppercase tracking-[0.08em]">
              {code ? `${code} · Bahasa` : "Bahasa"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn("size-2 rounded-full", NODE_DOT[status])} />
          <span className="font-medium text-[11px] text-ink-mute">
            {NODE_LABEL[status]}
          </span>
        </div>
      </div>
      {skipped && note ? (
        <p className="mt-1.5 text-[11px] text-dim leading-snug">
          dilewati — {note}
        </p>
      ) : null}
      {live ? (
        <p className="mt-1.5 text-[11px] text-brand leading-snug">
          Menulis jawaban dari temuan, bukan menilai ulang.
        </p>
      ) : null}
    </div>
  );
}

export function SignalPanel({
  result,
  sequence,
  evidence,
  trace,
  running = false,
  titleId = "panel-bukti-title",
  className,
  action,
  onSelectEvidence,
}: {
  result: ScoreResult | null;
  sequence: readonly DetectorAgent[];
  /** What the Evidence Agent assembled, when this surface has produced one. */
  evidence?: EvidenceBundle | null;
  /** What the pipeline actually did. Omit on surfaces that do not measure. */
  trace?: AgentTrace | null;
  /** True while the language stage is still streaming its answer. */
  running?: boolean;
  /** Unique per surface: the chat renders the panel in a column and a sheet. */
  titleId?: string;
  /** Lets the caller drop the card frame when the shell already draws one. */
  className?: string;
  /** Header control supplied by the host, e.g. the sheet's close button. */
  action?: ReactNode;
  /** Selects a finding's exact quote in the conversation. */
  onSelectEvidence?: (evidence: string) => void;
}) {
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { attachCanvas, height, width, wires } = useGraphWires(canvasRef);
  const findings = result
    ? result.signals.filter((signal) => signal.weight > 0)
    : [];
  const ledger = buildPanelLedger(sequence, trace, findings);

  const header = (
    <CardHeader className="shrink-0 border-edge border-b bg-panel/85 px-3.5 pt-3 pb-2.5 backdrop-blur-md [.border-b]:pb-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle>
            <h2
              className="flex items-center gap-1.5 font-semibold text-[12px] text-txt"
              id={titleId}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  result ? RISK_TEXT[result.risk] : "bg-dim/50",
                )}
              />
              Panel bukti
            </h2>
          </CardTitle>
          <p className="mt-0.5 truncate text-[10.5px] text-dim">
            {running
              ? "Pemeriksaan sedang berjalan"
              : result == null
                ? "Menunggu pesan untuk diperiksa"
                : trace
                  ? "Pemeriksaan terakhir selesai"
                  : "Diperbarui setelah pemeriksaan terakhir"}
          </p>
          {result ? <CoverageStrip ledger={ledger} /> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-[5px] border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
            {result ? `${findings.length} temuan` : `${sequence.length} agen`}
          </span>
          {action}
        </div>
      </div>
    </CardHeader>
  );

  const toolbar = (
    <div className="pointer-events-none absolute inset-x-0 bottom-2.5 z-20 flex justify-center px-3.5">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-edge bg-panel/95 px-1.5 py-1 shadow-lift backdrop-blur-md">
        <span className="flex size-6 items-center justify-center rounded-full bg-chip text-ink">
          <Workflow aria-hidden className="size-3.5" />
        </span>
        <span className="mx-0.5 h-4 w-px bg-edge" />
        <Button
          aria-label="Perkecil kanvas"
          className="size-6 rounded-full text-ink-mute hover:bg-chip"
          disabled={zoom <= 85}
          onClick={() => setZoom((value) => Math.max(85, value - 5))}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <Minus />
        </Button>
        <span className="tabular min-w-8 text-center font-mono text-[10.5px] text-ink-mute">
          {zoom}%
        </span>
        <Button
          aria-label="Perbesar kanvas"
          className="size-6 rounded-full text-ink-mute hover:bg-chip"
          disabled={zoom >= 115}
          onClick={() => setZoom((value) => Math.min(115, value + 5))}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );

  if (!result) {
    return (
      <Card
        aria-labelledby={titleId}
        className={cn(
          "flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-none bg-transparent py-0 ring-0",
          className,
        )}
      >
        {header}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3.5 pt-3 pb-16">
            <div
              className="relative origin-top transition-transform duration-150"
              ref={attachCanvas}
              style={{ transform: `scale(${zoom / 100})` }}
            >
              <GraphWires height={height} width={width} wires={wires} />
              <EntryPort label="Masukan pesan · menunggu" />

              <RootNode
                code={ROOT_CODE}
                kind="Masukan"
                title={
                  <EmptyTitle className="truncate font-semibold text-[13.5px] text-ink tracking-[-0.01em]">
                    Belum ada yang diperiksa
                  </EmptyTitle>
                }
              >
                {/*
                 * The routing map, drawn before anything has run. Each row is
                 * the condition that would send the message down that branch —
                 * a description of the pipeline, never a claim that it ran.
                 */}
                <ul className="divide-y divide-edge-soft border-edge-soft border-t">
                  {sequence.map((agent, index) => (
                    <RoutingRow
                      active={false}
                      agent={agent}
                      key={agent}
                      target={branchCode(index)}
                    />
                  ))}
                </ul>
              </RootNode>

              <div aria-hidden className="h-11" />

              <BranchList label="Agent yang akan memeriksa">
                {sequence.map((agent, index) => (
                  <AgentNode
                    code={branchCode(index)}
                    count={0}
                    key={agent}
                    kind={BRANCH_KIND[agent]}
                    label={STAGE_LABEL[agent].label}
                    nextCode={synthesisCode(sequence.length)}
                    nodeId={agent}
                    status="pending"
                  />
                ))}
              </BranchList>

              <div aria-hidden className="h-9" />

              <div
                className="relative flex items-center justify-between rounded-[14px] border border-brand-line bg-panel px-3.5 py-2.5 shadow-rest"
                data-node="synthesis"
                data-status="pending"
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute -top-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 bg-panel",
                    PORT_IN.pending,
                  )}
                  data-node="synthesis"
                  data-port="in"
                  data-status="pending"
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute -bottom-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full",
                    PORT_OUT.pending,
                  )}
                  data-node="synthesis"
                  data-port="out"
                  data-status="pending"
                />
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-brand-edge bg-brand-soft text-brand-strong">
                    <Sparkles aria-hidden className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[12px] text-ink">
                      Sintesis temuan
                    </p>
                    <p className="font-mono text-[9.5px] text-ink-mute uppercase tracking-[0.08em]">
                      Menunggu giliran
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-chip px-2 py-0.5 font-medium text-[10.5px] text-ink-mute">
                  <span className="size-1.5 rounded-full bg-dot" />
                  Idle
                </span>
              </div>

              <div className="mt-6">
                <VoiceNode code={voiceCode(sequence.length)} status="pending" />
              </div>

              <p className="mt-3 flex items-start gap-1.5 rounded-[10px] bg-txt/5 px-2.5 py-1.5 text-[10.5px] text-dim leading-snug">
                <Lock aria-hidden className="mt-px size-3 shrink-0" />
                Pesan lengkap tetap di perangkat; ringkasan tanpa kutipan bisa
                sampai ke lapisan bahasa.
              </p>
            </div>
          </CardContent>
          {toolbar}
        </div>
      </Card>
    );
  }

  const style = RISK_TEXT[result.risk];
  const modusName = MODUS_BY_ID.get(result.modus)?.nama ?? "Belum dikenali";
  const artifacts = evidence?.artifacts ?? [];

  /**
   * One row per *kind* of evidence, not per value. A prize message quantifies
   * two amounts, and listing "Nominal uang yang disebut" twice reads like a
   * rendering bug to anyone scanning the panel. The bundle keeps them as
   * separate artifacts because the PDF cites each one.
   */
  const artifactGroups = [
    ...artifacts
      .reduce((groups, artifact) => {
        const seen = groups.get(artifact.label);
        groups.set(artifact.label, {
          label: artifact.label,
          values: seen ? [...seen.values, artifact.value] : [artifact.value],
        });
        return groups;
      }, new Map<string, { label: string; values: string[] }>())
      .values(),
  ];

  const voiceStage = trace?.stages.find((stage) => stage.id === "voice");
  const voiceStatus: NodeStatus = !trace
    ? "pending"
    : voiceStage?.status === "berjalan"
      ? "live"
      : voiceStage?.status === "selesai"
        ? "ran"
        : voiceStage?.status === "gagal"
          ? "failed"
          : voiceStage?.status === "dilewati"
            ? "skipped"
            : "pending";
  const coverageDefaultOpen = findings.length === 0;

  return (
    <Card
      aria-labelledby={titleId}
      className={cn(
        "flex h-full min-h-0 flex-col gap-0 overflow-hidden rounded-none bg-transparent py-0 ring-0",
        className,
      )}
    >
      {header}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3.5 pt-3 pb-4">
          <ValidationNote trace={trace} />
          <RootNode
            port={false}
            title={
              <p className="truncate font-semibold text-[13.5px] text-ink tracking-[-0.01em]">
                Pesan yang diperiksa
              </p>
            }
          >
            {/* 1 · Verdict. The only live region: findings must not each announce. */}
            <output
              aria-atomic="true"
              aria-live="polite"
              className="block border-edge-soft border-t px-3.5 py-2.5"
            >
              <div className="flex items-baseline gap-2">
                <p
                  className={cn(
                    "tabular font-semibold text-[2rem] leading-none",
                    style,
                  )}
                >
                  {result.score}
                  <span className="ms-0.5 font-normal text-dim text-xs">
                    /100
                  </span>
                </p>
                <Badge
                  variant="outline"
                  className={cn("border-current/30 text-[10.5px]", style)}
                >
                  {RISK_LABEL[result.risk]}
                </Badge>
              </div>
              <p className="mt-1 font-medium text-[12.5px] text-txt">
                {modusName}
              </p>
              {result.hardOverride ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-danger">
                  <TriangleAlert aria-hidden className="size-3 shrink-0" />
                  Permintaan OTP, PIN, atau password memaksa risiko tinggi.
                </p>
              ) : null}
              {result.advice[0] && result.risk !== "bersih" ? (
                <p className="mt-1.5 text-dim text-[11.5px] leading-snug">
                  {result.advice[0]}
                </p>
              ) : null}
            </output>
          </RootNode>

          <FindingsSection
            agents={ledger.findingAgents}
            onSelectEvidence={onSelectEvidence}
            titleId={titleId}
          />

          <div className="mt-3 flex flex-col gap-1.5">
            <CoverageGroup
              agents={ledger.cleanAgents}
              defaultOpen={coverageDefaultOpen}
              label="Diperiksa, nihil"
            />
            <CoverageGroup
              agents={ledger.noObjectAgents}
              defaultOpen={coverageDefaultOpen}
              label="Tanpa objek"
            />
            <CoverageGroup
              agents={ledger.pendingAgents}
              defaultOpen={
                findings.length === 0 &&
                ledger.cleanAgents.length === 0 &&
                ledger.noObjectAgents.length === 0
              }
              label="Belum tercatat"
            />
          </div>

          {ledger.failedAgents.length > 0 ? (
            <section aria-labelledby={`${titleId}-failed`} className="mt-3">
              <h3
                className="font-mono text-[9px] text-danger uppercase tracking-[0.14em]"
                id={`${titleId}-failed`}
              >
                Gagal · {ledger.failedAgents.length}
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {ledger.failedAgents.map((agent) => (
                  <li
                    className="rounded-[10px] border border-danger/30 bg-danger/5 px-2.5 py-2"
                    key={agent.agent}
                  >
                    <p className="font-medium text-[11.5px] text-danger">
                      {STAGE_LABEL[agent.agent].label} gagal
                    </p>
                    <p className="mt-0.5 text-[10.5px] text-dim leading-snug">
                      {agent.note ?? "Tidak ada catatan."}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {ledger.liveAgents.length > 0 ? (
            <section aria-labelledby={`${titleId}-live`} className="mt-3">
              <h3
                className="font-mono text-[9px] text-brand uppercase tracking-[0.14em]"
                id={`${titleId}-live`}
              >
                Berjalan · {ledger.liveAgents.length}
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {ledger.liveAgents.map((agent) => (
                  <li
                    className="flex items-center gap-2 rounded-[10px] border border-brand-edge bg-brand-soft px-2.5 py-2"
                    key={agent.agent}
                  >
                    <StatusPulse
                      className="size-2 rounded-full bg-brand-strong"
                      kind="opacity"
                    />
                    <span className="text-[11.5px] text-txt">
                      {STAGE_LABEL[agent.agent].label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section
            aria-labelledby={`${titleId}-synthesis`}
            className="mt-3 rounded-[14px] border border-brand-line bg-panel px-3.5 py-2.5 shadow-rest"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-brand-edge bg-brand-soft text-brand-strong">
                  <Sparkles aria-hidden className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <h3
                    className="truncate font-semibold text-[12px] text-ink"
                    id={`${titleId}-synthesis`}
                  >
                    Sintesis temuan
                  </h3>
                  <p className="font-mono text-[9.5px] text-ink-mute uppercase tracking-[0.08em]">
                    {findings.length === 0
                      ? "Tidak ada temuan"
                      : `${ledger.findingAgents.length} agen menemukan`}
                  </p>
                </div>
              </div>
              <span className="tabular shrink-0 rounded-[5px] border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
                {findings.length} temuan
              </span>
            </div>

            {ledger.otherFindings.length > 0 ? (
              <ul
                aria-label="Temuan sintesis"
                className="mt-2 flex flex-col gap-1.5"
              >
                {ledger.otherFindings.map((signal) => (
                  <li
                    className="rounded-[10px] border border-edge-soft bg-bg px-2.5 py-2"
                    key={`${signal.label}-${signal.evidence}`}
                  >
                    <p className="font-medium text-[11.5px] text-txt">
                      {signal.label}
                    </p>
                    {signal.evidence ? (
                      <p className="mt-0.5 text-[10.5px] text-dim">
                        “{signal.evidence}”
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {trace ? (
              <div className="mt-2 border-edge-soft border-t pt-1.5">
                <TraceDisclosure trace={trace} />
              </div>
            ) : null}
          </section>

          <div className="mt-3">
            <VoiceNode
              note={voiceStage?.note}
              port={false}
              status={voiceStatus}
            />
          </div>

          {/* 2 · Proof. Artifacts are chips, not a second list of findings. */}
          {artifactGroups.length > 0 ? (
            <section aria-labelledby={`${titleId}-artifacts`} className="mt-3">
              <h3
                className="font-medium text-[10.5px] text-dim uppercase tracking-[0.07em]"
                id={`${titleId}-artifacts`}
              >
                Bukti tercatat
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {artifactGroups.slice(0, 3).map((group) => (
                  <li
                    className="rounded-[10px] border border-edge bg-panel px-2.5 py-1.5"
                    key={group.label}
                  >
                    <span className="block text-[10.5px] text-dim">
                      {group.label}
                    </span>
                    <span className="block break-words text-[11.5px] text-txt">
                      {group.values.join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
              {artifactGroups.length > 3 ? (
                <p className="mt-1.5 text-[10.5px] text-dim">
                  +{artifactGroups.length - 3} jenis bukti lain dalam bundel
                </p>
              ) : null}
            </section>
          ) : null}
        </CardContent>
      </div>

      <div className="shrink-0 border-edge border-t bg-panel px-3.5 pt-2.5 pb-3">
        <p className="text-[10.5px] text-dim leading-snug">
          Skor dihitung di perangkat oleh{" "}
          <span className="text-txt">scoring.ts</span> (deterministik).
        </p>
        <p className="mt-1 text-[10.5px] text-dim leading-snug">
          Pesan lengkap tetap di perangkat; ringkasan tanpa kutipan bisa sampai
          ke lapisan bahasa.
        </p>
        {result.risk === "tinggi" ? (
          <Button
            asChild
            className="mt-2 h-8 w-full border-danger/40 text-danger hover:bg-danger/5"
            size="sm"
            variant="outline"
          >
            <Link data-pressable href="/komunitas">
              Buka komunitas
            </Link>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
