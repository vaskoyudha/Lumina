import { z } from "zod";
import type {
  AgentStatus,
  ConsensusGroup,
  OrchestrationTrace,
  OrchestratorEvent,
  OrchestratorRequest,
  PlanStep,
  SpecialistId,
} from "@/lib/contracts/orchestrator";
import { SPECIALIST_IDS } from "@/lib/contracts/orchestrator";
import type { ScoreResult } from "@/lib/contracts/score";
import { MODUS_BY_ID } from "@/lib/modus";
import {
  SPECIALISTS,
  type SpecialistSpec,
  specialistSystemPrompt,
} from "@/lib/orchestrator/agents";
import { orchestratorDeadlineMs, isConsensusScoreEnabled } from "@/lib/orchestrator/flag";
import {
  COMMANDER_PROMPT,
  commanderUserPrompt,
  PLANNER_PROMPT,
  plannerUserPrompt,
  SCORING_PROMPT,
  scoringUserPrompt,
  SYNTHESIS_PROMPT,
  specialistUserPrompt,
  synthesisUserPrompt,
} from "@/lib/orchestrator/prompts";
import { findConsensus } from "@/lib/orchestrator/consensus";
import {
  type ReportPoint,
  type ReportSignal,
  SUBMIT_REPORT_TOOL,
  type SubmitReport,
  validateReport,
} from "@/lib/orchestrator/report";
import {
  type SubagentMessage,
  type SubagentResult,
  SubagentRuntime,
  type SubagentSession,
} from "@/lib/orchestrator/subagent-runtime";
import {
  SUBMIT_SCORE_TOOL,
  type ScoreDecision,
  validateScoreDecision,
} from "@/lib/orchestrator/score-decision";
import {
  openAITools,
  TOOL_DEFS,
  type ToolContext,
} from "@/lib/orchestrator/tools";
import { extractLinks, parseLink } from "@/lib/scoring/link";
import { scoreWithTrace, authorScore } from "@/lib/scoring/score";
import { fetchChat } from "@/lib/server/llm";

const MAX_AGENTS = 6;
const MAX_PLANNER_TOKENS = 800;
const MAX_SPECIALIST_TOKENS = 2400;
const MAX_SYNTHESIS_TOKENS = 1400;
const MAX_SCORE_TOKENS = 700;

const PlannerOutputSchema = z
  .object({
    rationale: z.string().max(1200).default(""),
    agents: z
      .array(
        z
          .object({
            agent: z.enum(SPECIALIST_IDS),
            task: z.string().min(1).max(600),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_AGENTS),
  })
  .strict();

const MAX_COMMANDER_TOKENS = 220;
const SCORE_IN_TEXT = /\b\d{1,3}\s*\/\s*100\b|\bskor\s*\d{1,3}\b/i;
const BAND_IN_TEXT = /\b(?:bersih|rendah|mencurigakan|tinggi)\b/i;

const CommanderOutputSchema = z
  .object({
    announcement: z.string().min(1).max(400),
    focus: z.string().max(120).default(""),
  })
  .strict();

interface CommanderBrief {
  text: string;
  focus: string;
  source: "model" | "fallback";
  ms: number;
}

function fallbackCommander(baseline: ScoreResult): string {
  const label = baseline.modus
    ? MODUS_BY_ID.get(baseline.modus)?.nama.trim()
    : undefined;
  return label
    ? `Aku sudah membaca pesanmu dan melihat pola yang sering muncul pada ${label}. Aku akan mengerahkan agen yang paling relevan untuk memeriksanya lebih dalam.`
    : "Aku sudah membaca pesanmu. Aku akan mengerahkan agen yang paling relevan untuk memeriksanya lebih dalam, lalu menjelaskan hasilnya dengan jelas.";
}

async function makeCommander(
  request: OrchestratorRequest,
  baseline: ScoreResult,
  chat: OrchestratorDeps["chat"],
  signal: AbortSignal,
): Promise<CommanderBrief> {
  const started = performance.now();
  const fallback = (): CommanderBrief => ({
    text: fallbackCommander(baseline),
    focus: baseline.modus ?? "",
    source: "fallback",
    ms: Math.round(performance.now() - started),
  });
  if (!chat) return fallback();
  try {
    const message = await chat(
      {
        messages: [
          { role: "system", content: COMMANDER_PROMPT },
          {
            role: "user",
            content: commanderUserPrompt({
              question: request.question,
              message: request.message,
              modus: baseline.modus,
              score: baseline.score,
              risk: baseline.risk,
              priorTurns: request.priorTurns,
            }),
          },
        ],
        maxTokens: MAX_COMMANDER_TOKENS,
        temperature: 0.2,
        responseFormat: "json",
      },
      signal,
    );
    const parsed = CommanderOutputSchema.safeParse(
      safeJson(message.content ?? ""),
    );
    if (!parsed.success) throw new Error("invalid-commander");
    const text = parsed.data.announcement.trim();
    const focus = parsed.data.focus.trim();
    if (
      !text ||
      SCORE_IN_TEXT.test(text) ||
      BAND_IN_TEXT.test(text) ||
      SCORE_IN_TEXT.test(focus) ||
      BAND_IN_TEXT.test(focus)
    )
      throw new Error("commander-verdict");
    return {
      text,
      focus,
      source: "model",
      ms: Math.round(performance.now() - started),
    };
  } catch {
    return fallback();
  }
}

interface ModelMessage {
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

interface ChatOptions {
  messages: ModelMessage[];
  tools?: ReturnType<typeof openAITools>;
  maxTokens: number;
  temperature?: number;
  responseFormat?: "json";
  /** Per-child model override; falls back to LUMINA_LLM_MODEL. */
  model?: string;
}

export interface OrchestratorDeps {
  chat?: (options: ChatOptions, signal: AbortSignal) => Promise<ModelMessage>;
  score?: typeof scoreWithTrace;
  signal?: AbortSignal;
  /** Test seam; the route passes the same value to its abort timer. */
  deadlineMs?: number;
  /** Called for every event as it happens, so a route can stream live. */
  onEvent?: (event: OrchestratorEvent) => void;
}

export interface OrchestratorResult {
  events: OrchestratorEvent[];
  trace: OrchestrationTrace;
  text: string;
  score: ScoreResult;
  degraded: boolean;
}

type EventInput = OrchestratorEvent extends infer E
  ? E extends OrchestratorEvent
    ? Omit<E, "runId" | "seq" | "at">
    : never
  : never;

function safeJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Parse the full tool payload, not the 2.4 kB display copy: a six-signal
 * score_message result can be just over the display cap, and truncating before
 * JSON.parse silently drops every grounding signal.
 */
function absorbToolSignals(serialized: string, target: ReportSignal[]): string {
  try {
    const data = JSON.parse(serialized) as {
      stage?: { note?: string; findings?: string[] };
      signals?: { label?: string; evidence?: string | null; weight?: number }[];
      findings?: string[];
    };
    for (const signal of data.signals ?? []) {
      const label = signal.label?.trim();
      if (!label || (signal.weight ?? 1) <= 0) continue;
      if (
        target.some((item) => item.label.toLowerCase() === label.toLowerCase())
      ) {
        continue;
      }
      target.push({
        label,
        evidence: signal.evidence ?? null,
        weight: signal.weight,
      });
    }
    return (
      data.stage?.note ||
      data.signals?.find((signal) => (signal.weight ?? 1) > 0)?.label ||
      data.stage?.findings?.[0] ||
      data.findings?.[0] ||
      ""
    );
  } catch {
    return "";
  }
}

function llmEnv() {
  const base = process.env.LUMINA_LLM_URL?.trim();
  const model =
    process.env.LUMINA_ORCHESTRATOR_MODEL?.trim() ||
    process.env.LUMINA_LLM_MODEL?.trim();
  if (!base || !model) throw new Error("llm-not-configured");
  const lanes = (process.env.LUMINA_LLM_LANES ?? "")
    .split(",")
    .map((lane) => lane.trim())
    .filter(Boolean);
  const laneKey =
    process.env.LUMINA_LLM_LANE_KEY?.trim() ||
    process.env.LUMINA_LLM_KEY?.trim();
  const targets = lanes.length
    ? lanes.map((lane) => ({ base: lane, apiKey: laneKey }))
    : [{ base, apiKey: process.env.LUMINA_LLM_KEY?.trim() }];
  return {
    base,
    model,
    targets,
    fallbackModel: process.env.LUMINA_LLM_FALLBACK_MODEL?.trim(),
  };
}

let laneCursor = 0;

async function defaultChat(
  options: ChatOptions,
  signal: AbortSignal,
): Promise<ModelMessage> {
  const env = llmEnv();
  const total = env.targets.length;
  const ordered = env.targets.map(
    (_, index) => env.targets[(laneCursor + index) % total],
  );
  laneCursor = (laneCursor + 1) % total;
  let lastStatus = 0;

  for (const target of ordered) {
    const response = await fetchChat({
      base: target.base,
      apiKey: target.apiKey,
      model: options.model ?? env.model,
      fallbackModel: env.fallbackModel,
      signal,
      body: {
        stream: false,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens,
        messages: options.messages,
        ...(options.tools?.length
          ? { tools: options.tools, tool_choice: "auto" }
          : {}),
        ...(options.responseFormat === "json"
          ? { response_format: { type: "json_object" } }
          : {}),
      },
    });
    if (response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        choices?: { message?: ModelMessage }[];
      } | null;
      const message = payload?.choices?.[0]?.message;
      if (!message) throw new Error("upstream-empty");
      return message;
    }
    lastStatus = response.status;
    await response.body?.cancel();
    if (response.status !== 429 && response.status < 500) break;
  }

  throw new Error(`upstream-${lastStatus || "empty"}`);
}

function defaultPlan(input: {
  message: string;
  priorTurns: string[];
}): PlanStep[] {
  const lower = input.message.toLowerCase();
  const links = extractLinks(input.message);
  const candidates: PlanStep[] = [
    {
      agent: "message",
      task: "Namai mekanisme rekayasa sosial dan kutip pemicunya.",
      skills: SPECIALISTS.message.skills,
      tools: SPECIALISTS.message.tools,
    },
  ];

  if (input.priorTurns.length > 0) {
    candidates.push({
      agent: "conversation",
      task: "Cari pola eskalasi lintas giliran.",
      skills: SPECIALISTS.conversation.skills,
      tools: SPECIALISTS.conversation.tools,
    });
  }

  if (links.length > 0) {
    candidates.push({
      agent: "link",
      task: "Periksa setiap tautan dan ambil reputasi url.vet.",
      skills: SPECIALISTS.link.skills,
      tools: SPECIALISTS.link.tools,
    });
  } else if (
    /\b(otp|pin|qris|rekening|transfer|e-?wallet|dana|ovo|gopay)\b/i.test(lower)
  ) {
    candidates.push({
      agent: "qris",
      task: "Periksa jalur pembayaran dan permintaan OTP/PIN.",
      skills: SPECIALISTS.qris.skills,
      tools: SPECIALISTS.qris.tools,
    });
  } else if (
    /\b(lowongan|kerja|magang|recruiter|komisi|tugas)\b/i.test(lower)
  ) {
    candidates.push({
      agent: "job",
      task: "Periksa pola penipuan lowongan/tugas.",
      skills: SPECIALISTS.job.skills,
      tools: SPECIALISTS.job.tools,
    });
  } else if (
    /\b(jual|beli|ongkir|rekber|cod|marketplace|barang)\b/i.test(lower)
  ) {
    candidates.push({
      agent: "marketplace",
      task: "Periksa pola penipuan jual-beli.",
      skills: SPECIALISTS.marketplace.skills,
      tools: SPECIALISTS.marketplace.tools,
    });
  } else if (
    /\b(bank|bca|bri|bni|mandiri|pemerintah|dinas|kurir|jne|j&t|sicepat)\b/i.test(
      lower,
    )
  ) {
    candidates.push({
      agent: "identity",
      task: "Uji klaim identitas dan peniruan merek.",
      skills: SPECIALISTS.identity.skills,
      tools: SPECIALISTS.identity.tools,
    });
  }

  if (candidates.length < MAX_AGENTS) {
    candidates.push({
      agent: "evidence",
      task: "Audit kutipan dan deduplikasi temuan.",
      skills: SPECIALISTS.evidence.skills,
      tools: SPECIALISTS.evidence.tools,
    });
  }

  return dedupePlan(candidates);
}

function dedupePlan(steps: PlanStep[]): PlanStep[] {
  const seen = new Set<SpecialistId>();
  const out: PlanStep[] = [];
  for (const step of steps) {
    if (seen.has(step.agent)) continue;
    seen.add(step.agent);
    out.push(step);
  }
  return out.slice(0, MAX_AGENTS);
}

function requiredSpecialist(baseline: ScoreResult): SpecialistId | undefined {
  return baseline.signals.find(
    (signal) =>
      signal.weight >= 0.7 &&
      SPECIALIST_IDS.includes(signal.agent as SpecialistId),
  )?.agent as SpecialistId | undefined;
}

function ensureEvidenceLast(
  steps: PlanStep[],
  baseline: ScoreResult,
): PlanStep[] {
  const withoutEvidence = steps.filter((step) => step.agent !== "evidence");
  if (withoutEvidence.length === 0) return steps;
  const existing = steps.find((step) => step.agent === "evidence");
  const findingBearing = withoutEvidence.some(
    (step) => step.agent !== "identity",
  );
  if (!existing && !findingBearing) return steps;
  const evidence =
    existing ??
    ({
      agent: "evidence",
      task: "Audit kutipan dan deduplikasi temuan.",
      skills: SPECIALISTS.evidence.skills,
      tools: SPECIALISTS.evidence.tools,
    } satisfies PlanStep);
  const required = requiredSpecialist(baseline);
  const kept = [...withoutEvidence];
  while (kept.length > MAX_AGENTS - 1) {
    let dropAt = -1;
    for (let index = kept.length - 1; index >= 0; index -= 1) {
      if (kept[index].agent !== required) {
        dropAt = index;
        break;
      }
    }
    if (dropAt === -1) break;
    kept.splice(dropAt, 1);
  }
  return [...kept, evidence];
}

/**
 * A supervisor may narrate the right scam type and still delegate to unrelated
 * specialists. When the deterministic scorer has a strong, owned signal, keep
 * the specialist that owns it in the plan; the model's rationale is a hypothesis,
 * not a replacement for the evidence already in hand.
 */
function ensureBaselineSpecialist(
  steps: PlanStep[],
  baseline: ScoreResult,
  fallback: PlanStep[],
): PlanStep[] {
  const required = requiredSpecialist(baseline);
  if (!required || steps.some((step) => step.agent === required)) return steps;

  const spec = SPECIALISTS[required];
  const step: PlanStep = {
    agent: required,
    task: spec.task,
    skills: spec.skills,
    tools: spec.tools,
  };
  const out =
    steps.length < MAX_AGENTS
      ? [...steps, step]
      : [...steps.slice(0, -1), step];
  return dedupePlan([...out, ...fallback]);
}

function normalizePlan(steps: PlanStep[], fallback: PlanStep[]): PlanStep[] {
  const merged = dedupePlan([...steps, ...fallback]);
  return merged;
}

function fallbackRationale(steps: readonly PlanStep[]): string {
  const names = steps
    .map((step) => SPECIALISTS[step.agent].displayName)
    .join(" dan ");
  return `Rencana cepat: ${names || "tim agen"} memeriksa bukti yang tersedia, lalu sintesis disusun dari skor deterministik.`;
}

async function makePlan(
  request: OrchestratorRequest,
  baseline: ScoreResult,
  chat: OrchestratorDeps["chat"],
  signal: AbortSignal,
): Promise<{
  steps: PlanStep[];
  rationale: string;
  source: "model" | "fallback";
  ms: number;
}> {
  const started = performance.now();
  const fallback = defaultPlan(request);
  if (!chat) {
    return {
      steps: ensureEvidenceLast(fallback, baseline),
      rationale: fallbackRationale(fallback),
      source: "fallback",
      ms: Math.round(performance.now() - started),
    };
  }
  try {
    const message = await chat(
      {
        messages: [
          { role: "system", content: PLANNER_PROMPT },
          {
            role: "user",
            content: plannerUserPrompt({
              question: request.question,
              message: request.message,
              baseline,
              hasLinks: extractLinks(request.message).length > 0,
              hasPriorTurns: request.priorTurns.length > 0,
            }),
          },
        ],
        maxTokens: MAX_PLANNER_TOKENS,
        temperature: 0,
        responseFormat: "json",
      },
      signal,
    );
    const parsed = PlannerOutputSchema.safeParse(
      safeJson(message.content ?? ""),
    );
    if (!parsed.success) throw new Error("invalid-plan");
    const normalized = normalizePlan(
      parsed.data.agents.map((step) => ({
        ...step,
        skills: SPECIALISTS[step.agent].skills,
        tools: SPECIALISTS[step.agent].tools,
      })),
      fallback,
    );
    const steps = ensureEvidenceLast(
      ensureBaselineSpecialist(normalized, baseline, fallback),
      baseline,
    );
    return {
      steps,
      rationale: parsed.data.rationale || "Rencana disusun oleh koordinator.",
      source: "model",
      ms: Math.round(performance.now() - started),
    };
  } catch {
    return {
      steps: ensureEvidenceLast(fallback, baseline),
      rationale: fallbackRationale(fallback),
      source: "fallback",
      ms: Math.round(performance.now() - started),
    };
  }
}

async function runSpecialist(
  spec: SpecialistSpec,
  task: string,
  brief: string,
  request: OrchestratorRequest,
  baseline: ScoreResult,
  score: () => ReturnType<typeof scoreWithTrace>,
  chat: OrchestratorDeps["chat"],
  emit: (event: EventInput) => void,
  signal: AbortSignal,
  options: {
    session?: SubagentSession;
    tools?: string[];
    model?: string;
  } = {},
): Promise<SubagentResult> {
  const { session, model } = options;
  const requestedTools = options.tools?.filter((tool) =>
    spec.tools.includes(tool),
  );
  const toolNames = requestedTools?.length ? requestedTools : spec.tools;
  const started = performance.now();
  const toolContext: ToolContext = {
    agent: spec.id,
    message: request.message,
    priorTurns: request.priorTurns,
    signal,
    score,
  };

  emit({
    type: "agent_start",
    agent: spec.id,
    label: spec.label,
    task,
    skills: spec.skills,
    tools: toolNames,
  });

  const calls: { name: string; args: unknown }[] = [];
  if (toolNames.includes("scan_detector") && spec.id !== "evidence") {
    calls.push({ name: "scan_detector", args: { detector: spec.id } });
  }
  if (toolNames.includes("score_message")) {
    calls.push({ name: "score_message", args: {} });
  }
  if (toolNames.includes("scrub_secrets")) {
    calls.push({ name: "scrub_secrets", args: {} });
  }
  if (toolNames.includes("extract_entities")) {
    calls.push({ name: "extract_entities", args: {} });
  }
  if (toolNames.includes("extract_links")) {
    calls.push({ name: "extract_links", args: {} });
  }
  if (toolNames.includes("verify_link")) {
    const link = extractLinks(request.message)[0];
    if (link) calls.push({ name: "verify_link", args: { url: link } });
  }
  if (toolNames.includes("domain_lookup")) {
    const link = extractLinks(request.message)[0];
    const host = link ? parseLink(link)?.host : null;
    if (host) calls.push({ name: "domain_lookup", args: { domain: host } });
  }

  const evidence: string[] = [];
  const reportSignals: ReportSignal[] = [];
  let lastToolSummary = "";
  for (const call of calls) {
    const tool = TOOL_DEFS[call.name];
    if (!tool) continue;
    const callId = `pre-${spec.id}-${call.name}`;
    const callStarted = performance.now();
    emit({
      type: "tool_call",
      agent: spec.id,
      callId,
      tool: call.name,
      args: call.args,
    });
    let ok = false;
    let output = "";
    try {
      const parsed = tool.schema.safeParse(call.args);
      if (!parsed.success) throw new Error("invalid-tool-arguments");
      const result = await tool.execute(parsed.data, toolContext);
      const serialized = JSON.stringify(result);
      output = serialized.slice(0, 2400);
      ok = true;
      lastToolSummary =
        absorbToolSignals(serialized, reportSignals) || lastToolSummary;
    } catch (error) {
      output = error instanceof Error ? error.message : "tool-failed";
    }
    emit({
      type: "tool_result",
      agent: spec.id,
      callId,
      tool: call.name,
      ok,
      ms: Math.round(performance.now() - callStarted),
      output,
    });
    if (ok) evidence.push(`### ${call.name}\n${output}`);
  }

  const evidenceBlock = evidence.join("\n\n").slice(0, 6000);
  const followUpNote = session?.messages.length
    ? `

<follow_up>
Ini putaran lanjutan untuk kasus yang sama. Gunakan percakapan sebelumnya sebagai konteks, tetapi laporkan hanya poin yang didukung <tool_evidence> pada putaran ini. Jangan mengulang poin yang sudah dilaporkan; sebutkan temuan baru atau perubahan buktinya.
</follow_up>`
    : "";
  const childPrompt = `${specialistUserPrompt(spec, {
    question: request.question,
    message: request.message,
    baseline,
    priorTurns: spec.id === "conversation" ? request.priorTurns : [],
    task,
    brief,
  })}

<tool_evidence>
${evidenceBlock || "Tidak ada tool yang mengembalikan bukti."}
</tool_evidence>

Gunakan hanya bukti tool di atas. Jangan menambah fakta baru. Panggil tool submit_report dengan poin yang merujuk tepat pada label sinyal di atas. Jika tool menolak laporan, baca issues lalu perbaiki sekali.${followUpNote}`;
  const messages: ModelMessage[] = session?.messages.length
    ? [...session.messages, { role: "user", content: childPrompt }]
    : [
        { role: "system", content: specialistSystemPrompt(spec) },
        { role: "user", content: childPrompt },
      ];

  const commitSession = (summary?: string) => {
    if (!session) return;
    const next: SubagentMessage[] = summary
      ? [...messages, { role: "assistant", content: summary }]
      : messages;
    session.messages = next.slice(-40);
    session.turns += 1;
    session.updatedAt = Date.now();
  };

  const baseResult = {
    agent: spec.id,
    label: spec.label,
    summary:
      lastToolSummary || "Agen tidak menemukan sinyal yang bisa dikutip.",
    findings: [] as string[],
    points: [] as ReportPoint[],
    ms: 0,
  };

  if (!chat) {
    commitSession(lastToolSummary || "Model tidak tersedia; agen dilewati.");
    return {
      ...baseResult,
      status: "dilewati",
      summary: lastToolSummary || "Model tidak tersedia; agen dilewati.",
      ms: Math.round(performance.now() - started),
    };
  }

  const tools = [...openAITools(spec.tools), SUBMIT_REPORT_TOOL];
  let report: SubmitReport | null = null;
  let lastError: unknown = null;
  let invalidReports = 0;
  let modelCalls = 0;
  const MAX_MODEL_CALLS = 4;

  while (!report && modelCalls < MAX_MODEL_CALLS) {
    modelCalls += 1;
    let message: ModelMessage | null = null;
    try {
      message = await chat(
        {
          messages,
          tools,
          maxTokens: MAX_SPECIALIST_TOKENS,
          temperature: 0.1,
          model,
        },
        signal,
      );
    } catch (error) {
      lastError = error;
      if (signal.aborted) break;
      await new Promise((resolve) => setTimeout(resolve, 900));
      continue;
    }

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      messages.push({
        role: "assistant",
        content: message.content ?? "",
      });
      messages.push({
        role: "user",
        content:
          "Kamu belum memanggil submit_report. Panggil tool itu sekarang; jangan menulis JSON bebas.",
      });
      continue;
    }

    const call = toolCalls[0];
    const callId = call.id || `call-${spec.id}-${modelCalls}`;
    const callStarted = performance.now();
    const args = safeJson(call.function.arguments);

    if (call.function.name === "submit_report") {
      emit({
        type: "tool_call",
        agent: spec.id,
        callId,
        tool: "submit_report",
        args,
      });
      const checked = validateReport(args, {
        message: request.message,
        signals: reportSignals,
      });
      const output = JSON.stringify(checked).slice(0, 2400);
      emit({
        type: "tool_result",
        agent: spec.id,
        callId,
        tool: "submit_report",
        ok: checked.ok,
        ms: Math.round(performance.now() - callStarted),
        output,
      });
      if (checked.ok) {
        report = checked.report;
        break;
      }
      console.info(
        `[subagent] report-rejected agent=${spec.id} issues=${checked.issues
          .slice(0, 3)
          .join(" | ")
          .slice(0, 400)}`,
      );
      invalidReports += 1;
      if (invalidReports >= 2) break;
      messages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: [call],
      });
      messages.push({
        role: "tool",
        tool_call_id: callId,
        content: output,
      });
      continue;
    }

    const toolName = call.function.name;
    const tool = TOOL_DEFS[toolName];
    const allowed = tool && toolNames.includes(toolName);
    if (!tool || !allowed) {
      const reason = tool ? "tool-not-allowed" : "unknown-tool";
      messages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: [call],
      });
      messages.push({
        role: "tool",
        tool_call_id: callId,
        content: JSON.stringify({ ok: false, error: reason }),
      });
      continue;
    }

    emit({
      type: "tool_call",
      agent: spec.id,
      callId,
      tool: toolName,
      args,
    });
    let ok = false;
    let output = "";
    try {
      const parsed = tool.schema.safeParse(args);
      if (!parsed.success) throw new Error("invalid-tool-arguments");
      if (
        toolName === "scan_detector" &&
        spec.id !== "evidence" &&
        (parsed.data as { detector?: string }).detector !== spec.id
      ) {
        throw new Error("detector-not-assigned");
      }
      const serialized = JSON.stringify(
        await tool.execute(parsed.data, toolContext),
      );
      output = serialized.slice(0, 2400);
      lastToolSummary =
        absorbToolSignals(serialized, reportSignals) || lastToolSummary;
      ok = true;
    } catch (error) {
      output = error instanceof Error ? error.message : "tool-failed";
    }
    emit({
      type: "tool_result",
      agent: spec.id,
      callId,
      tool: toolName,
      ok,
      ms: Math.round(performance.now() - callStarted),
      output,
    });
    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: [call],
    });
    messages.push({
      role: "tool",
      tool_call_id: callId,
      content: output,
    });
  }

  if (!report) {
    const noSignal = reportSignals.length === 0 && !lastError;
    const failure =
      lastToolSummary ||
      (lastError instanceof Error
        ? `Agen gagal melaporkan hasil (${lastError.message.slice(0, 80)}).`
        : "Agen tidak memanggil submit_report setelah satu kesempatan perbaikan.");
    const summary = noSignal
      ? lastToolSummary || "Tidak ada sinyal yang menjadi tugas agen ini."
      : failure;
    console.info(
      `[subagent] ${noSignal ? "skipped" : "failed"} agent=${spec.id} calls=${modelCalls} error=${
        lastError instanceof Error ? lastError.message.slice(0, 120) : "none"
      } summary=${summary.slice(0, 160)}`,
    );
    commitSession(summary);
    return {
      ...baseResult,
      status: noSignal ? "dilewati" : "gagal",
      summary,
      ms: Math.round(performance.now() - started),
    };
  }

  if (report.thought) {
    emit({
      type: "thought",
      agent: spec.id,
      text: report.thought.slice(0, 2000),
    });
  }

  commitSession(report.summary);
  return {
    agent: spec.id,
    label: spec.label,
    status: "selesai",
    summary: report.summary,
    findings: report.points.map((point) => point.point).slice(0, 20),
    points: report.points,
    ms: Math.round(performance.now() - started),
  };
}

async function makeScoreDecision(
  baseline: ScoreResult,
  group: ConsensusGroup,
  chat: OrchestratorDeps["chat"],
  signal: AbortSignal,
): Promise<{ decision: ScoreDecision; ms: number } | null> {
  const started = performance.now();
  if (!chat) return null;
  const messages: ModelMessage[] = [
    { role: "system", content: SCORING_PROMPT },
    { role: "user", content: scoringUserPrompt({ baseline, group }) },
  ];
  let invalid = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let message: ModelMessage;
    try {
      message = await chat(
        {
          messages,
          tools: [SUBMIT_SCORE_TOOL],
          maxTokens: MAX_SCORE_TOKENS,
          temperature: 0,
        },
        signal,
      );
    } catch {
      return null;
    }
    const call = message.tool_calls?.[0];
    if (!call || call.function.name !== "submit_score") return null;
    const checked = validateScoreDecision(
      safeJson(call.function.arguments),
      group,
    );
    if (checked.ok) {
      return {
        decision: checked.decision,
        ms: Math.round(performance.now() - started),
      };
    }
    invalid += 1;
    if (invalid >= 2) break;
    messages.push({
      role: "assistant",
      content: message.content ?? "",
      tool_calls: [call],
    });
    messages.push({
      role: "tool",
      tool_call_id: call.id ?? "submit-score",
      content: JSON.stringify(checked),
    });
  }
  return null;
}

function fallbackSynthesis(baseline: ScoreResult): string {
  const top = baseline.signals
    .filter((signal) => signal.weight > 0)
    .slice(0, 3)
    .map((signal) => signal.label);
  return [
    `Skor Lumina: ${baseline.score}/100 (${baseline.risk}).`,
    top.length ? `Sinyal utama: ${top.join("; ")}.` : "",
    baseline.advice[0] ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function runOrchestrator(
  request: OrchestratorRequest,
  deps: OrchestratorDeps = {},
): Promise<OrchestratorResult> {
  const runId = crypto.randomUUID();
  let seq = 0;
  const started = performance.now();
  const events: OrchestratorEvent[] = [];
  const emit = (event: EventInput) => {
    seq += 1;
    const full = {
      ...event,
      runId,
      seq,
      at: Date.now(),
    } as OrchestratorEvent;
    events.push(full);
    deps.onEvent?.(full);
    return full;
  };
  const signal = deps.signal ?? new AbortController().signal;
  const chat = deps.chat ?? defaultChat;
  const score = deps.score ?? scoreWithTrace;
  const deadlineMs = deps.deadlineMs ?? orchestratorDeadlineMs();

  emit({ type: "run_start", question: request.question });

  const cached = score({
    text: request.message,
    turns: request.priorTurns.map((text) => ({ text })),
  });
  const baseline = cached.result;
  const commander = await makeCommander(request, baseline, chat, signal);
  emit({
    type: "commander_say",
    text: commander.text,
    focus: commander.focus,
    source: commander.source,
    ms: commander.ms,
  });
  emit({
    type: "score",
    result: baseline,
    trace: cached.trace,
    ms: Math.round(performance.now() - started),
  });

  const plan = await makePlan(request, baseline, chat, signal);
  emit({
    type: "plan",
    rationale: plan.rationale,
    agents: plan.steps,
    planner: plan.source,
    ms: plan.ms,
  });

  const caseId = request.caseId ?? runId;
  const runtime = new SubagentRuntime(
    async (session, envelope) => {
      const spec = SPECIALISTS[envelope.agent];
      return runSpecialist(
        spec,
        envelope.task,
        envelope.brief,
        request,
        baseline,
        () => cached,
        chat,
        emit,
        session.controller.signal,
        {
          session,
          tools: envelope.tools,
          model: envelope.model,
        },
      );
    },
    { signal },
  );

  const reports: SubagentResult[] = [];
  const runOne = async (step: (typeof plan.steps)[number]) => {
    if (signal.aborted) {
      const spec = SPECIALISTS[step.agent];
      const skipped: SubagentResult = {
        agent: spec.id,
        label: spec.label,
        status: "dilewati",
        summary: "Dibatalkan sebelum agen berjalan.",
        findings: [],
        points: [],
        ms: 0,
      };
      emit({
        type: "agent_start",
        agent: skipped.agent,
        label: skipped.label,
        task: step.task,
        skills: step.skills,
        tools: step.tools,
      });
      emit({
        type: "agent_result",
        agent: skipped.agent,
        label: skipped.label,
        status: skipped.status,
        summary: skipped.summary,
        findings: [],
        points: [],
        ms: 0,
      });
      return skipped;
    }
    let result: SubagentResult;
    try {
      const run = await runtime.spawn({
        caseId,
        agent: step.agent,
        task: step.task,
        brief: plan.rationale,
        message: request.message,
        tools: step.tools,
      });
      result = run.result;
    } catch (error) {
      const spec = SPECIALISTS[step.agent];
      result = {
        agent: spec.id,
        label: spec.label,
        status: signal.aborted ? "dilewati" : "gagal",
        summary:
          error instanceof Error
            ? `Agen gagal dijalankan (${error.message.slice(0, 80)}).`
            : "Agen gagal dijalankan.",
        findings: [],
        points: [],
        ms: 0,
      };
    }
    emit({
      type: "agent_result",
      agent: result.agent,
      label: result.label,
      status: result.status,
      summary: result.summary,
      findings: result.findings,
      points: result.points,
      ms: result.ms,
    });
    return result;
  };
  for (const step of plan.steps) {
    if (performance.now() - started >= deadlineMs) {
      const spec = SPECIALISTS[step.agent];
      const skipped: SubagentResult = {
        agent: spec.id,
        label: spec.label,
        status: "dilewati",
        summary: "Dilewati karena batas waktu pemeriksaan tercapai.",
        findings: [],
        points: [],
        ms: 0,
      };
      emit({
        type: "agent_start",
        agent: skipped.agent,
        label: skipped.label,
        task: step.task,
        skills: step.skills,
        tools: step.tools,
      });
      emit({
        type: "agent_result",
        agent: skipped.agent,
        label: skipped.label,
        status: skipped.status,
        summary: skipped.summary,
        findings: [],
        points: [],
        ms: 0,
      });
      reports.push(skipped);
      continue;
    }
    reports.push(await runOne(step));
  }

  const consensus = findConsensus(
    reports.map((report) => ({
      agent: report.agent,
      status: report.status,
      points: report.points,
    })),
  );
  emit({ type: "consensus", groups: consensus });

  let finalScore = baseline;
  let scoreDecision: { decision: ScoreDecision; ms: number } | null = null;
  if (
    consensus.length > 0 &&
    isConsensusScoreEnabled() &&
    chat &&
    !signal.aborted
  ) {
    scoreDecision = await makeScoreDecision(
      baseline,
      consensus[0],
      chat,
      signal,
    );
    if (scoreDecision) {
      finalScore = authorScore(baseline, scoreDecision.decision, consensus[0]);
    }
    emit({
      type: "score_decision",
      result: finalScore,
      baseline,
      rationale:
        scoreDecision?.decision.rationale ??
        "Lumina tidak mengirim keputusan skor; skor engine dipertahankan.",
      source: scoreDecision ? "model" : "fallback",
    });
  }

  emit({ type: "synthesis_start", agent: "synthesizer" });
  let text = "";
  const synthStarted = performance.now();
  try {
    const message = await chat(
      {
        messages: [
          { role: "system", content: SYNTHESIS_PROMPT },
          {
            role: "user",
            content: synthesisUserPrompt({
              question: request.question,
              message: request.message,
              baseline: finalScore,
              reports: reports.map((report) => ({
                agent: report.agent,
                label: report.label,
                summary: report.summary,
                findings: report.findings,
                points: report.points,
              })),
            }),
          },
        ],
        maxTokens: MAX_SYNTHESIS_TOKENS,
        temperature: 0.2,
      },
      signal,
    );
    text =
      (message.content ?? "").trim() ||
      (message.reasoning_content ?? "").trim();
  } catch {
    text = "";
  }
  if (!text) text = fallbackSynthesis(finalScore);
  text = text.replace(/\b\d{1,3}\s*\/\s*100\b/g, `${finalScore.score}/100`);
  if (!text.includes(`${finalScore.score}/100`)) {
    text = `${fallbackSynthesis(finalScore)} ${text}`.trim();
  }
  emit({ type: "synthesis_delta", agent: "synthesizer", text });
  emit({
    type: "synthesis_end",
    agent: "synthesizer",
    text,
    ms: Math.round(performance.now() - synthStarted),
  });

  const trace: OrchestrationTrace = {
    runId,
    commander: {
      text: commander.text,
      source: commander.source,
      ms: commander.ms,
    },
    planner: {
      rationale: plan.rationale,
      agents: plan.steps,
      source: plan.source,
      ms: plan.ms,
    },
    agents: reports.map((report) => ({
      id: report.agent,
      label: report.label,
      task: plan.steps.find((step) => step.agent === report.agent)?.task ?? "",
      skills: SPECIALISTS[report.agent].skills,
      tools: SPECIALISTS[report.agent].tools,
      status: report.status,
      summary: report.summary,
      points: report.points,
      ms: report.ms,
    })),
    synthesis: text,
    totalMs: Math.round(performance.now() - started),
    degraded: reports.some((report) => report.status !== "selesai"),
    baselineScore: baseline,
    finalScore,
    consensus,
  };
  emit({ type: "trace", trace });
  emit({
    type: "done",
    totalMs: trace.totalMs,
    degraded: trace.degraded,
  });

  return {
    events,
    trace,
    text,
    score: finalScore,
    degraded: trace.degraded,
  };
}
