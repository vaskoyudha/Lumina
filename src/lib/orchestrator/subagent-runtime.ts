import type { AgentStatus, SpecialistId } from "@/lib/contracts/orchestrator";
import type { ReportPoint } from "@/lib/orchestrator/report";

/**
 * In-process subagent runtime.
 *
 * This is deliberately the smallest useful port of the Pi/DeepAgents model:
 * a supervisor owns a case, spawns named children with an isolated task, and
 * can send a follow-up to the same child later instead of rebuilding it.
 *
 * It is not a durable scheduler. Sessions live in this process, are capped,
 * and are dropped on restart. A production port would persist the transcript
 * and move execution to a worker, exactly as Pi's durable conversations do.
 */

export interface SubagentMessage {
  role: string;
  content: string | null;
  reasoning_content?: string | null;
  tool_calls?: {
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

export interface SubagentEnvelope {
  /** Stable conversation/case id; defaults to the orchestrator run id. */
  caseId: string;
  agent: SpecialistId;
  /** The supervisor's specific task, not the specialist's static role. */
  task: string;
  /** The supervisor's rationale, treated by the child as a hypothesis. */
  brief: string;
  /** The evidence the child may inspect. Never the whole chat transcript. */
  message: string;
  /** Tool names the supervisor allows for this child. */
  tools: string[];
  /** Optional per-child model override. */
  model?: string;
}

export type SessionStatus =
  | "idle"
  | "running"
  | "done"
  | "failed"
  | "aborted"
  | "archived";

export interface SubagentSession {
  id: string;
  caseId: string;
  agent: SpecialistId;
  status: SessionStatus;
  messages: SubagentMessage[];
  turns: number;
  createdAt: number;
  updatedAt: number;
  controller: AbortController;
}
export interface SubagentResult {
  agent: SpecialistId;
  label: string;
  status: AgentStatus;
  summary: string;
  findings: string[];
  points: ReportPoint[];
  ms: number;
}

export interface SubagentRunResult {
  result: SubagentResult;
  session: SubagentSession;
}

export type SubagentRunner = (
  session: SubagentSession,
  envelope: SubagentEnvelope,
) => Promise<SubagentResult>;

export interface SubagentRuntimeOptions {
  /** Parent request signal; aborting it aborts every child. */
  signal?: AbortSignal;
  /** Bound the in-process store. Defaults to 32. */
  maxSessions?: number;
  /** Shared store; defaults to the module-level store so sessions survive a turn. */
  store?: Map<string, SubagentSession>;
}

export interface SubagentStatusView {
  id: string;
  caseId: string;
  agent: SpecialistId;
  status: SessionStatus;
  turns: number;
  messages: number;
  updatedAt: number;
}

const DEFAULT_MAX_SESSIONS = 32;

/** Process-local, shared across orchestrator runs; cleared on restart. */
const defaultSessionStore = new Map<string, SubagentSession>();

export function clearSubagentSessions(caseId?: string) {
  if (caseId === undefined) {
    defaultSessionStore.clear();
    return;
  }
  for (const [id, session] of defaultSessionStore) {
    if (session.caseId === caseId) defaultSessionStore.delete(id);
  }
}

function keyFor(caseId: string, agent: SpecialistId) {
  return `${caseId}:${agent}`;
}

export class SubagentRuntime {
  private readonly sessions: Map<string, SubagentSession>;
  private readonly maxSessions: number;
  private readonly parentSignal?: AbortSignal;

  constructor(
    private readonly run: SubagentRunner,
    options: SubagentRuntimeOptions = {},
  ) {
    this.parentSignal = options.signal;
    this.maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS;
    this.sessions = options.store ?? defaultSessionStore;
  }

  private get(caseId: string, agent: SpecialistId) {
    return this.sessions.get(keyFor(caseId, agent));
  }

  private create(envelope: SubagentEnvelope): SubagentSession {
    const now = Date.now();
    const session: SubagentSession = {
      id: keyFor(envelope.caseId, envelope.agent),
      caseId: envelope.caseId,
      agent: envelope.agent,
      status: "idle",
      messages: [],
      turns: 0,
      createdAt: now,
      updatedAt: now,
      controller: new AbortController(),
    };
    this.sessions.set(session.id, session);
    this.evictIfNeeded();
    return session;
  }

  private evictIfNeeded() {
    if (this.sessions.size <= this.maxSessions) return;
    const idle = [...this.sessions.values()]
      .filter((session) => session.status !== "running")
      .sort((a, b) => a.updatedAt - b.updatedAt);
    while (this.sessions.size > this.maxSessions && idle.length > 0) {
      const oldest = idle.shift();
      if (!oldest) break;
      this.sessions.delete(oldest.id);
    }
  }

  private async execute(
    session: SubagentSession,
    envelope: SubagentEnvelope,
  ): Promise<SubagentRunResult> {
    if (session.controller.signal.aborted) {
      session.controller = new AbortController();
    }
    if (this.parentSignal?.aborted) {
      session.controller.abort(this.parentSignal.reason);
    }
    const onAbort = () => session.controller.abort(this.parentSignal?.reason);
    this.parentSignal?.addEventListener("abort", onAbort, { once: true });
    session.status = "running";
    session.updatedAt = Date.now();
    try {
      const result = await this.run(session, envelope);
      session.status =
        result.status === "gagal"
          ? "failed"
          : session.controller.signal.aborted
            ? "aborted"
            : "done";
      session.updatedAt = Date.now();
      return { result, session };
    } catch (error) {
      session.status = session.controller.signal.aborted ? "aborted" : "failed";
      session.updatedAt = Date.now();
      throw error;
    } finally {
      this.parentSignal?.removeEventListener("abort", onAbort);
    }
  }

  /** Start a new named child. Same case+agent reuses the existing session. */
  async spawn(envelope: SubagentEnvelope): Promise<SubagentRunResult> {
    const existing = this.get(envelope.caseId, envelope.agent);
    if (existing) {
      console.info(
        `[subagent] reuse agent=${envelope.agent} turns=${existing.turns}`,
      );
      return this.send(envelope);
    }
    console.info(`[subagent] spawn agent=${envelope.agent}`);
    return this.execute(this.create(envelope), envelope);
  }

  /**
   * Continue an existing child. This is the Pi-style follow-up path: the child
   * keeps its own transcript instead of receiving a fresh reconstruction.
   */
  async send(envelope: SubagentEnvelope): Promise<SubagentRunResult> {
    const existing = this.get(envelope.caseId, envelope.agent);
    if (!existing) return this.spawn(envelope);
    if (existing.status === "running") {
      throw new Error("subagent-busy");
    }
    existing.status = "idle";
    return this.execute(existing, envelope);
  }

  status(caseId: string, agent: SpecialistId): SubagentStatusView | null {
    const session = this.get(caseId, agent);
    if (!session) return null;
    return {
      id: session.id,
      caseId: session.caseId,
      agent: session.agent,
      status: session.status,
      turns: session.turns,
      messages: session.messages.length,
      updatedAt: session.updatedAt,
    };
  }

  list(caseId?: string): SubagentStatusView[] {
    return [...this.sessions.values()]
      .filter((session) => caseId === undefined || session.caseId === caseId)
      .map((session) => ({
        id: session.id,
        caseId: session.caseId,
        agent: session.agent,
        status: session.status,
        turns: session.turns,
        messages: session.messages.length,
        updatedAt: session.updatedAt,
      }));
  }

  abort(caseId: string, agent: SpecialistId): boolean {
    const session = this.get(caseId, agent);
    if (!session) return false;
    session.controller.abort("subagent-aborted");
    if (session.status === "running") session.status = "aborted";
    session.updatedAt = Date.now();
    return true;
  }

  archive(caseId: string, agent: SpecialistId): boolean {
    const session = this.get(caseId, agent);
    if (!session) return false;
    session.controller.abort("subagent-archived");
    session.status = "archived";
    session.updatedAt = Date.now();
    return true;
  }

  /** Test/route teardown. */
  clear(caseId?: string) {
    for (const [id, session] of this.sessions) {
      if (caseId === undefined || session.caseId === caseId) {
        this.sessions.delete(id);
      }
    }
  }
}
