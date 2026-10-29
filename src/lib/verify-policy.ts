export type VerifyStatus = "CREATED" | "PAYPAL_AUTHORIZED" | "AWAITING_VERIFICATION" | "PROOF_SUBMITTED" | "AI_VERIFIED" | "AWAITING_BUYER_DECISION" | "CONDITION_FAILED" | "AI_FAILED" | "BUYER_REJECTED" | "BUYER_APPROVED" | "PAYPAL_CAPTURED" | "COMPLETED" | "CAPTURE_FAILED" | "VOID_FAILED";
export type CheckStatus = "PASS" | "FAIL" | "NEEDS_REVIEW";
export type Condition = { id: string; text: string; instruction: string };
export type ConditionResult = { id: string; condition: string; status: CheckStatus; evidence: string; observedValue: string; confidence: number };
export type VisionReport = {
  provider: "Gemini";
  model: string;
  analyzedAt: string;
  challengeCodeStatus: CheckStatus;
  observedChallengeCode: string;
  challengeEvidence: string;
  conditions: ConditionResult[];
  overallStatus: CheckStatus;
};

const statuses: CheckStatus[] = ["PASS", "FAIL", "NEEDS_REVIEW"];
const short = (value: unknown, max = 500) => typeof value === "string" && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;

export function validateConditions(input: unknown): string[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > 5) throw new Error("Enter 1–5 buyer conditions.");
  const conditions = input.map(item => short(item, 180));
  if (conditions.some(item => !item || item.length < 8)) throw new Error("Each condition must be 8–180 characters.");
  return conditions as string[];
}

export function validatePlan(raw: unknown, buyerConditions: string[]): Condition[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (!Array.isArray(value.steps) || value.steps.length !== buyerConditions.length) return null;
  const plan: Condition[] = [];
  for (let i = 0; i < buyerConditions.length; i++) {
    const row = value.steps[i];
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const step = row as Record<string, unknown>;
    if (step.id !== `C${i + 1}` || step.condition !== buyerConditions[i]) return null;
    const instruction = short(step.instruction, 240);
    if (!instruction) return null;
    plan.push({ id: `C${i + 1}`, text: buyerConditions[i], instruction });
  }
  return plan;
}

export function validateVisionReport(raw: unknown, conditions: Condition[], challengeCode: string, model: string): VisionReport | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (!statuses.includes(value.challenge_code_status as CheckStatus) || !statuses.includes(value.overall_status as CheckStatus)) return null;
  const observedCode = short(value.observed_challenge_code, 40);
  const challengeEvidence = short(value.challenge_evidence, 500);
  if (!observedCode || !challengeEvidence || !Array.isArray(value.conditions) || value.conditions.length !== conditions.length) return null;
  const results: ConditionResult[] = [];
  for (let i = 0; i < conditions.length; i++) {
    const rawRow = value.conditions[i];
    if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) return null;
    const row = rawRow as Record<string, unknown>;
    if (row.id !== conditions[i].id || row.condition !== conditions[i].text || !statuses.includes(row.status as CheckStatus)) return null;
    const evidence = short(row.evidence, 500);
    if (!evidence || typeof row.confidence !== "number" || !Number.isFinite(row.confidence) || row.confidence < 0 || row.confidence > 1) return null;
    if (typeof row.observed_value !== "string" || row.observed_value.length > 120) return null;
    if (row.status === "PASS" && row.confidence < 0.8) return null;
    results.push({ id: conditions[i].id, condition: conditions[i].text, status: row.status as CheckStatus, evidence, observedValue: row.observed_value.trim(), confidence: row.confidence });
  }
  const normalizeCode = (code: string) => code.toUpperCase().replace(/[\s-]/g, "");
  const codePass = value.challenge_code_status === "PASS" && normalizeCode(observedCode) === normalizeCode(challengeCode);
  const allPass = codePass && results.every(row => row.status === "PASS");
  if (value.overall_status === "PASS" && !allPass) return null;
  if (allPass && value.overall_status !== "PASS") return null;
  if (value.challenge_code_status === "PASS" && !codePass) return null;
  return {
    provider: "Gemini", model, analyzedAt: new Date().toISOString(),
    challengeCodeStatus: value.challenge_code_status as CheckStatus,
    observedChallengeCode: observedCode, challengeEvidence,
    conditions: results, overallStatus: value.overall_status as CheckStatus,
  };
}

export function captureGate(input: { status: VerifyStatus; report?: VisionReport; buyerApprovedAt?: string; challengeExpiresAt?: string; authorizationId?: string; captureId?: string; voidedAt?: string }, now = Date.now()): string | null {
  if (input.status !== "BUYER_APPROVED") return "Buyer approval is required.";
  if (!input.authorizationId || input.captureId || input.voidedAt) return "An uncaptured authorization is required.";
  if (!input.buyerApprovedAt) return "Buyer approval is not recorded.";
  const expiresAt = input.challengeExpiresAt ? Date.parse(input.challengeExpiresAt) : Number.NaN;
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return "The verification session expired.";
  if (!input.report || input.report.overallStatus !== "PASS" || input.report.challengeCodeStatus !== "PASS" || input.report.conditions.length === 0 || input.report.conditions.some(row => row.status !== "PASS")) return "Every verification condition must pass.";
  return null;
}

export function captureEnabledFor(sessionId: string, enabled = process.env.VERIFY_CAPTURE_ENABLED, allowedSessionId = process.env.VERIFY_CAPTURE_SESSION_ID): boolean {
  return enabled === "true" && sessionId.startsWith("VERIFY-") && allowedSessionId === sessionId;
}
