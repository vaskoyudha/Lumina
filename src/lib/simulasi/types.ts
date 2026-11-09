export type ToolId = "isolation" | "permissions" | "report";
export type TacticId = "urgency" | "authority" | "attachment" | "secret";

export type ScenarioChoice = {
  label: string;
  verdict: "benar" | "salah";
  rationale?: string;
  panic?: number;
  tactic?: TacticId;
  compromisesDevice?: boolean;
  sharesOtp?: boolean;
  next: string;
};

type Scene = { id: string; chapter?: 1 | 2 | 3 };
export type ScenarioNode = Scene &
  (
    | {
        type: "message";
        speaker: string;
        text: string;
        next: string;
        delay_ms?: number;
        attachment?: { name: string; detail: string };
      }
    | { type: "choice"; prompt: string; choices: ScenarioChoice[] }
    | {
        type: "tool_task";
        tool: ToolId;
        prompt: string;
        on_success: string;
      }
    | {
        type: "ending";
        variant: "success" | "recovery" | "compromised";
        title: string;
        text: string;
        debrief: [string, string, string, string];
      }
  );

export type Scenario = {
  scenario: { id: string; level: number; title: string; difficulty: "mudah" };
  hud: {
    panic: {
      start: number;
      max: number;
      fail_at: number;
      fail_message: string;
    };
    intrusion: {
      start: number;
      max: number;
      rate_per_second: number;
      fail_message: string;
    };
  };
  tools: { id: ToolId; name: string; unlocked_at: string }[];
  start: string;
  nodes: ScenarioNode[];
  scoring: { grades: { min: number; label: string }[] };
};

export const TACTIC_IDS = [
  "urgency",
  "authority",
  "attachment",
  "secret",
] as const;
