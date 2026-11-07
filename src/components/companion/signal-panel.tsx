"use client";

import {
  Lock,
  Minus,
  MinusCircle,
  PenLine,
  Plus,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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
 * reference: one verdict node, five branch nodes, one synthesis node, joined by
 * SVG fan-out and convergence curves over a dotted canvas.
 *
 * The graph is the structure the reference asked for, but every wire is backed
 * by data we actually have: a branch turns green only when its detector ran, a
 * skipped branch keeps its reason (`dilewati — …`) instead of a green tick, and
 * the finding count in the synthesis node is the engine's, never a static
 * label. The only interactive chrome is real: the canvas zoom and the emergency
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
  live: "bg-brand motion-safe:animate-ping",
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

/**
 * The uppercase kind printed under each branch title, mirroring the
 * reference's `Q5 · MATCHING`. Each word is the stage's own subject, so the
 * line tells a reader what the branch does and nothing it does not.
 */
const BRANCH_KIND: Record<AgentId, string> = {
  message: "Urgensi",
  link: "Tautan",
  identity: "Identitas",
  conversation: "Eskalasi",
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
  message: "Ada urgensi, otoritas, atau iming-iming",
  link: "Ada tautan yang perlu dibuka",
  identity: "Ada klaim institusi atau nomor asing",
  conversation: "Ada pesan sebelumnya di percakapan",
  evidence: "Ada temuan yang bisa dikutip",
  scoring: "Menggabungkan seluruh temuan",
};

type NodeStatus = "ran" | "live" | "skipped" | "failed" | "pending";

/** The brand three-circle cluster the reference uses as a branch badge. */
function VennMark() {
  return (
    <svg className="size-4" fill="none" role="presentation" viewBox="0 0 20 20">
      <circle cx="10" cy="7.2" fill="var(--lumina-brand-strong)" r="3.2" />
      <circle cx="7.6" cy="11.8" fill="var(--lumina-brand-glow)" r="3.2" />
      <circle cx="12.4" cy="11.8" fill="var(--lumina-brand-soft)" r="3.2" />
    </svg>
  );
}

/** Entry pill + dashed stem + port, cloned from the reference canvas. */
function EntryPort({ label }: { label: string }) {
  return (
    <div className="mb-1 flex flex-col items-center">
      <div className="rounded-full border border-edge bg-panel/90 px-2 py-0.5 font-mono text-[9.5px] text-ink-mute uppercase tracking-wider">
        {label}
      </div>
      <div className="h-3 border-dot border-l border-dashed" />
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
  live: boolean;
  status: string;
};

type GraphWire = {
  key: string;
  d: string;
  active: boolean;
  muted: boolean;
};

/**
 * Every wire is measured from the ports the nodes actually render. The overlay
 * takes the canvas's own layout size as its viewBox, so the zoom transform moves
 * cards and wires together; `non-scaling-stroke` keeps the stroke honest while
 * the canvas scales.
 */
function useGraphWires(canvasRef: RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [wires, setWires] = useState<GraphWire[]>([]);

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    if (width <= 0 || height <= 0) return;

    const ports = new Map<string, PortPoint>();
    for (const element of canvas.querySelectorAll<HTMLElement>("[data-port]")) {
      const node = element.dataset.node;
      const port = element.dataset.port;
      if (!node || !port) continue;

      // Layout offsets, not `getBoundingClientRect`: the ancestor `scale()`
      // must not leak into the coordinate space the wires are drawn in.
      let x = element.offsetLeft + element.offsetWidth / 2;
      let y = element.offsetTop + element.offsetHeight / 2;
      let parent = element.offsetParent as HTMLElement | null;
      while (parent && parent !== canvas) {
        x += parent.offsetLeft;
        y += parent.offsetTop;
        parent = parent.offsetParent as HTMLElement | null;
      }

      ports.set(`${node}:${port}`, {
        x,
        y,
        live: element.dataset.live === "true",
        status: element.dataset.status ?? "",
      });
    }

    const agents = [...ports.keys()]
      .map((key) => key.split(":")[0])
      .filter(
        (node, index, all) =>
          node.startsWith("agent-") && all.indexOf(node) === index,
      );

    const root = ports.get("root:out");
    const synthesisIn = ports.get("synthesis:in");
    const synthesisOut = ports.get("synthesis:out");
    const voiceIn = ports.get("voice:in");
    const next: GraphWire[] = [];

    if (root) {
      const trunk = 8;
      for (const agent of agents) {
        const target = ports.get(`${agent}:in`);
        if (!target) continue;
        const middle = (root.y + trunk + target.y) / 2;
        next.push({
          key: `root:${agent}`,
          d: `M ${root.x} ${root.y} L ${root.x} ${root.y + trunk} C ${root.x} ${middle}, ${target.x} ${middle}, ${target.x} ${target.y}`,
          active: target.live,
          muted: target.status === "pending" || target.status === "skipped",
        });
      }
    }

    if (synthesisIn) {
      for (const agent of agents) {
        const source = ports.get(`${agent}:out`);
        if (!source) continue;
        const approach = Math.max(synthesisIn.y - 12, source.y);
        next.push({
          key: `${agent}:synthesis`,
          d: `M ${source.x} ${source.y} C ${source.x} ${approach}, ${synthesisIn.x} ${approach}, ${synthesisIn.x} ${synthesisIn.y}`,
          active: synthesisIn.live,
          muted: source.status === "pending" || source.status === "skipped",
        });
      }
    }

    if (synthesisOut && voiceIn) {
      next.push({
        key: "synthesis:voice",
        d: `M ${synthesisOut.x} ${synthesisOut.y} C ${synthesisOut.x} ${synthesisOut.y + 6}, ${voiceIn.x} ${voiceIn.y - 6}, ${voiceIn.x} ${voiceIn.y}`,
        active: voiceIn.live,
        muted: voiceIn.status === "pending" || voiceIn.status === "skipped",
      });
    }

    setSize({ width, height });
    setWires(next);
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    measure();
    const observer = new ResizeObserver(() => measure());
    observer.observe(canvas);
    for (const port of canvas.querySelectorAll("[data-port]")) {
      observer.observe(port);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [canvasRef, measure]);

  return { ...size, wires };
}

function GraphWires({
  height,
  width,
  wires,
}: {
  height: number;
  width: number;
  wires: GraphWire[];
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
      {wires.map((wire) => (
        <path
          className={cn(
            "stroke-brand-strong transition-opacity duration-150",
            wire.active
              ? "opacity-100 motion-safe:animate-pulse"
              : wire.muted
                ? "opacity-25"
                : "opacity-45",
          )}
          d={wire.d}
          key={wire.key}
          strokeDasharray={wire.muted ? "4 4" : undefined}
          strokeWidth={wire.active ? 2.2 : 1.4}
          vectorEffect="non-scaling-stroke"
        />
      ))}
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
      <span className="absolute top-4 -left-[9px] flex items-center">
        <span className="mr-0.5 h-0 w-0 border-y-[3.5px] border-y-transparent border-l-[5px] border-l-brand" />
        <span
          className={cn(
            "size-2.5 rounded-full border-2 border-dot bg-panel",
            live && "border-brand-strong motion-safe:animate-ping",
          )}
          data-live={live ? "true" : undefined}
          data-node={`agent-${nodeId}`}
          data-port="in"
          data-status={status}
        />
      </span>

      <div className="px-3.5 pt-2.5 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-brand-edge bg-brand-chip">
            <VennMark />
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
        <span
          className="absolute top-1/2 -right-[5px] size-2.5 -translate-y-1/2 rounded-full bg-brand-strong"
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
  children,
}: {
  title: ReactNode;
  code: string;
  kind: string;
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
          <p className="mt-2 font-mono text-[10px] text-ink-mute uppercase tracking-[0.1em]">
            {code} &nbsp;·&nbsp; {kind}
          </p>
        </div>
        {children}
      </div>
      <span
        aria-hidden
        className="absolute -bottom-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-brand-strong bg-panel"
        data-node="root"
        data-port="out"
      />
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
  status,
}: {
  code: string;
  note?: string;
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
      <span
        aria-hidden
        className={cn(
          "absolute -top-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-brand-strong bg-panel",
          live && "motion-safe:animate-ping",
        )}
        data-live={live ? "true" : undefined}
        data-node="voice"
        data-port="in"
        data-status={status}
      />
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
              {code} · Bahasa
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
}: {
  result: ScoreResult | null;
  sequence: AgentId[];
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
}) {
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { height, width, wires } = useGraphWires(canvasRef);

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
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-[5px] border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
            {ROOT_CODE}→{synthesisCode(sequence.length)}
          </span>
          <span className="rounded-[5px] border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
            {trace
              ? `${coverageCount(trace, sequence)}/${sequence.length} agen`
              : `${sequence.length} agen`}
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
              ref={canvasRef}
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
                  className="absolute -top-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-brand-strong bg-panel"
                  data-node="synthesis"
                  data-port="in"
                  data-status="pending"
                />
                <span
                  aria-hidden
                  className="absolute -bottom-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-brand-strong bg-panel"
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

              <p className="mt-3 flex items-center gap-1.5 rounded-full bg-txt/5 px-2.5 py-1.5 text-[10.5px] text-dim">
                <Lock aria-hidden className="size-3 shrink-0" />
                Pesan tidak dikirim ke mana pun saat diperiksa.
              </p>
            </div>
          </CardContent>
          {toolbar}
        </div>
      </Card>
    );
  }

  /*
   * A weight-0 signal is the engine's "nothing recognised" placeholder, not a
   * finding. Counting `signals.length` printed "1 temuan" beside a 0/100
   * "Bersih" verdict, so the panel contradicted the score it sits next to.
   */
  const findings = result.signals.filter((signal) => signal.weight > 0);
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

  /*
   * Coverage is read from the trace, never from a hardcoded table. Without a
   * trace the panel has measured nothing, so no branch claims to have run.
   * `dilewati` is the only honest "did not run": it carries the reason in its
   * note, which the branch node prints instead of a green tick.
   */
  const stageById = new Map(
    (trace?.stages ?? []).map((stage) => [stage.id, stage]),
  );
  const nodes = sequence.map((agent, index) => {
    const stage = stageById.get(agent);
    const ran =
      stage?.status === "selesai" ||
      stage?.status === "temuan" ||
      (agent === "evidence" && evidence != null);
    const status: NodeStatus = !trace
      ? "pending"
      : ran
        ? "ran"
        : stage?.status === "berjalan"
          ? "live"
          : stage?.status === "gagal"
            ? "failed"
            : stage?.status === "dilewati"
              ? "skipped"
              : "pending";
    return {
      agent,
      index,
      status,
      note: stage?.note,
      count: findings.filter((signal) => (signal.agent ?? "scoring") === agent)
        .length,
    };
  });
  const voiceStage = stageById.get("voice");
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
  const ranCount = nodes.filter((node) => node.status === "ran").length;
  const findingsKey = `${result.score}-${findings
    .map((signal) => signal.label)
    .join("|")}`;

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
            ref={canvasRef}
            style={{ transform: `scale(${zoom / 100})` }}
          >
            <GraphWires height={height} width={width} wires={wires} />
            <EntryPort label="Masukan pesan · diperiksa" />

            <RootNode
              code={ROOT_CODE}
              kind="Dinilai"
              title={
                <p className="truncate font-semibold text-[13.5px] text-ink tracking-[-0.01em]">
                  Pesan yang diperiksa
                </p>
              }
            >
              {/* 1 · Verdict. The only live region: five findings must not each announce. */}
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
                    Permintaan OTP atau file APK memaksa risiko tinggi.
                  </p>
                ) : null}
                {result.advice[0] && result.risk !== "bersih" ? (
                  <p className="mt-1.5 text-dim text-[11.5px] leading-snug">
                    {result.advice[0]}
                  </p>
                ) : null}
              </output>
            </RootNode>

            <div aria-hidden className="h-11" />

            <BranchList label="Agent yang memeriksa">
              {nodes.map((node) => (
                <AgentNode
                  code={branchCode(node.index)}
                  count={node.count}
                  key={node.agent}
                  kind={BRANCH_KIND[node.agent]}
                  label={STAGE_LABEL[node.agent].label}
                  nextCode={synthesisCode(nodes.length)}
                  nodeId={node.agent}
                  note={node.note}
                  status={node.status}
                />
              ))}
            </BranchList>

            <div aria-hidden className="h-9" />

            {/* 2 · Synthesis. The only list of findings, so every row is cited once. */}
            <section
              aria-labelledby={`${titleId}-findings`}
              className="relative rounded-[14px] border border-brand-line bg-panel px-3.5 py-2.5 shadow-rest"
              data-node="synthesis"
              data-status={trace ? "ran" : "pending"}
            >
              <span
                aria-hidden
                className="absolute -top-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-brand-strong bg-panel"
                data-node="synthesis"
                data-port="in"
                data-status={trace ? "ran" : "pending"}
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-brand-edge bg-brand-soft text-brand-strong">
                    <Sparkles aria-hidden className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <h3
                      className="truncate font-semibold text-[12px] text-ink"
                      id={`${titleId}-findings`}
                    >
                      Sintesis temuan
                    </h3>
                    <p className="font-mono text-[9.5px] text-ink-mute uppercase tracking-[0.08em]">
                      {trace
                        ? `${ranCount}/${sequence.length} agen melapor`
                        : "Tanpa catatan pipeline"}
                    </p>
                  </div>
                </div>
                <span className="tabular shrink-0 rounded-[5px] border border-brand-edge bg-brand-soft px-1.5 py-0.5 font-mono text-[10px] text-brand">
                  {findings.length} temuan
                </span>
              </div>

              <ul
                aria-label="Temuan terdeteksi"
                className="mt-2 flex flex-col gap-2"
                key={findingsKey}
              >
                {findings.length === 0 ? (
                  <li className="rounded-[10px] border border-edge-soft bg-bg px-2.5 py-2 text-[11.5px] text-dim">
                    Tidak ada pola penipuan yang dikenali pada pesan ini.
                  </li>
                ) : (
                  findings.map((signal, index) => {
                    const agent = signal.agent ?? "scoring";
                    return (
                      <li
                        className="animate-in fade-in-0 slide-in-from-bottom-1 rounded-[10px] border border-edge-soft bg-bg px-2.5 py-2"
                        key={`${signal.label}-${signal.evidence}`}
                        style={{
                          animationDelay: `${index * 12}ms`,
                          animationDuration: "140ms",
                          animationFillMode: "both",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="size-1.5 shrink-0 animate-in rounded-full bg-warn zoom-in-50 fade-in-0"
                            style={{
                              animationDelay: `${index * 12 + 60}ms`,
                              animationDuration: "320ms",
                              animationFillMode: "both",
                            }}
                          />
                          <span className="text-[10.5px] text-dim">
                            {STAGE_LABEL[agent].label}
                          </span>
                        </div>
                        <p className="mt-1 font-medium text-[12.5px] text-txt leading-snug">
                          {signal.label}
                        </p>
                        {signal.evidence ? (
                          <p className="mt-1 text-[11px] text-dim leading-snug">
                            “{signal.evidence}”
                          </p>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>

              {/* 3 · Coverage. A skipped stage names its reason on its branch. */}
              {trace ? (
                <div className="mt-2.5 border-edge-soft border-t pt-2">
                  <p className="flex items-center gap-1.5 text-[11px] text-dim">
                    {ranCount === sequence.length ? (
                      <ShieldCheck
                        aria-hidden
                        className="size-3.5 shrink-0 text-brand"
                      />
                    ) : (
                      <MinusCircle
                        aria-hidden
                        className="size-3.5 shrink-0 text-dim"
                      />
                    )}
                    {ranCount} dari {sequence.length} agen memeriksa pesan ini
                  </p>
                  {nodes
                    .filter((node) => node.status === "failed")
                    .map((node) => (
                      <p
                        className="mt-1 ps-5 text-[11px] text-danger leading-snug"
                        key={node.agent}
                      >
                        <span className="font-medium">
                          {STAGE_LABEL[node.agent].label}
                        </span>{" "}
                        gagal
                        {node.note ? ` — ${node.note}` : "."}
                      </p>
                    ))}
                </div>
              ) : null}
              <span
                aria-hidden
                className="absolute -bottom-[5px] left-1/2 z-10 size-2.5 -translate-x-1/2 rounded-full border-2 border-brand-strong bg-panel"
                data-node="synthesis"
                data-port="out"
                data-status={trace ? "ran" : "pending"}
              />
            </section>

            <div className="mt-6">
              <VoiceNode
                code={voiceCode(sequence.length)}
                note={voiceStage?.note}
                status={voiceStatus}
              />
            </div>

            {/* 4 · Proof. Artifacts are chips, not a second list of findings. */}
            {artifactGroups.length > 0 ? (
              <section
                aria-labelledby={`${titleId}-artifacts`}
                className="mt-3"
              >
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
                    +{artifactGroups.length - 3} jenis bukti lain di laporan
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        </CardContent>
        {toolbar}
      </div>

      <div className="shrink-0 border-edge border-t bg-panel px-3.5 pt-2.5 pb-3">
        <p className="text-[10.5px] text-dim leading-snug">
          Skor dihitung di perangkat oleh{" "}
          <span className="text-txt">scoring.ts</span> (deterministik).
        </p>
        {result.risk === "tinggi" ? (
          <Button
            asChild
            className="mt-2 h-8 w-full border-danger/40 text-danger hover:bg-danger/5"
            size="sm"
            variant="outline"
          >
            <Link data-pressable href="/darurat">
              Buka mode darurat
            </Link>
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/** Header count: how many branches actually reported. */
function coverageCount(trace: AgentTrace, sequence: AgentId[]): number {
  const ran = new Set(
    trace.stages
      .filter(
        (stage) => stage.status === "selesai" || stage.status === "temuan",
      )
      .map((stage) => stage.id),
  );
  return sequence.filter((agent) => ran.has(agent)).length;
}
