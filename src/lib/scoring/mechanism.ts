import type { Signal } from "@/lib/contracts/score";
export const MECHANISMS = [
  "authority-claim",
  "urgency-pressure",
  "payment-redirect",
  "credential-request",
  "link-deception",
  "attachment-risk",
  "reward-lure",
  "relationship-lure",
  "identity-mismatch",
  "platform-evasion",
  "escalation",
  "injection",
] as const;
export type MechanismId = (typeof MECHANISMS)[number];
const RULE_MECHANISM: Record<string, MechanismId> = {
  "job-admin-deposit": "payment-redirect",
  "job-withdrawal": "payment-redirect",
  "job-early-data": "credential-request",
  "job-brand-lure": "authority-claim",
  "job-free-mail": "identity-mismatch",
  "job-no-interview": "reward-lure",
  "job-salary-outlier": "reward-lure",
  "otp-request": "credential-request",
  "otp-notification": "credential-request",
  apk: "attachment-risk",
  urgency: "urgency-pressure",
  "block-threat": "urgency-pressure",
  "fake-authority": "authority-claim",
  quishing: "payment-redirect",
  prize: "reward-lure",
  "admin-fee": "payment-redirect",
  "topup-loop": "payment-redirect",
  "screen-share": "credential-request",
  "off-marketplace": "payment-redirect",
  "guaranteed-return": "reward-lure",
  secrecy: "credential-request",
  pinjol: "authority-claim",
  "job-fee": "payment-redirect",
  "job-pay-to-earn": "payment-redirect",
  "job-personal-rail": "payment-redirect",
  "job-overseas-fee": "payment-redirect",
  "mkt-offplatform": "platform-evasion",
  "mkt-personal-rail": "payment-redirect",
  "mkt-giftcard-crypto": "payment-redirect",
  "mkt-qris-refund": "payment-redirect",
  "mkt-underprice": "reward-lure",
  "mkt-dp": "payment-redirect",
  "mkt-fake-resi": "identity-mismatch",
  "mkt-urgency": "urgency-pressure",
  "investment-withdrawal": "payment-redirect",
  "investment-pyramid": "reward-lure",
  "love-emergency": "relationship-lure",
  "love-mule": "payment-redirect",
  "mkt-account-change": "payment-redirect",
  "mkt-overpayment": "payment-redirect",
};
export function annotateSignal(signal: Signal, ruleId = signal.ruleId): Signal {
  const agent = signal.agent ?? "scoring";
  const id =
    ruleId ??
    `${agent}.${agent === "identity" ? (/asing/.test(signal.label) ? "foreign-claim" : /berantai/.test(signal.label) ? "forwarded" : "sender-claim") : agent === "qris" ? (/CRC/.test(signal.label) ? "crc" : /merchant/.test(signal.label) ? "merchant" : /Mata uang/.test(signal.label) ? "currency" : /Negara/.test(signal.label) ? "country" : "uri") : agent === "conversation" ? (/bertahap/.test(signal.label) ? "staged" : "combination") : "context"}`;
  const key = id.split(".").at(-1) ?? id;
  const mechanism =
    signal.mechanism ??
    RULE_MECHANISM[key] ??
    (agent === "link"
      ? "link-deception"
      : agent === "conversation"
        ? "escalation"
        : agent === "injection"
          ? "injection"
          : agent === "qris"
            ? "payment-redirect"
            : "identity-mismatch");
  return { ...signal, ruleId: id, mechanism };
}
