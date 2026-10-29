import assert from "node:assert/strict";
import test from "node:test";
import { captureEnabledFor, captureGate, validateConditions, validatePlan, validateVisionReport, type Condition } from "./verify-policy";

const conditions: Condition[] = [
  { id: "C1", text: "Engine starts", instruction: "Start the engine with sound." },
  { id: "C2", text: "Odometer below 20,000 km", instruction: "Show the odometer clearly." },
];
const validReport = {
  challenge_code_status: "PASS", observed_challenge_code: "VERIFY-583100", challenge_evidence: "Code is clearly visible beside the motorcycle.", overall_status: "PASS",
  conditions: [
    { id: "C1", condition: "Engine starts", status: "PASS", evidence: "Engine sound follows ignition.", observed_value: "", confidence: .94 },
    { id: "C2", condition: "Odometer below 20,000 km", status: "PASS", evidence: "Digits visible on dashboard.", observed_value: "18420 km", confidence: .92 },
  ],
};

test("buyer conditions and AI plan must match exact IDs and text", () => {
  assert.deepEqual(validateConditions(["Engine starts", "Odometer below 20,000 km"]), ["Engine starts", "Odometer below 20,000 km"]);
  assert.ok(validatePlan({ steps: [{ id: "C1", condition: "Engine starts", instruction: "Start engine." }] }, ["Engine starts"]));
  assert.equal(validatePlan({ steps: [{ id: "C1", condition: "Engine runs", instruction: "Start engine." }] }, ["Engine starts"]), null);
});

test("valid real-video format can be normalized but mismatched challenge and missing checks never pass", () => {
  const report = validateVisionReport(validReport, conditions, "VERIFY-583100", "gemini-3.5-flash-lite");
  assert.equal(report?.overallStatus, "PASS");
  assert.equal(validateVisionReport({ ...validReport, observed_challenge_code: "VERIFY 583100" }, conditions, "VERIFY-583100", "gemini-3.5-flash-lite")?.overallStatus, "PASS");
  assert.equal(validateVisionReport({ ...validReport, observed_challenge_code: "583100" }, conditions, "VERIFY-583100", "gemini-3.5-flash-lite"), null);
  assert.equal(validateVisionReport(validReport, conditions, "VERIFY-000000", "gemini-3.5-flash-lite"), null);
  assert.equal(validateVisionReport({ ...validReport, conditions: validReport.conditions.slice(0, 1) }, conditions, "VERIFY-583100", "gemini-3.5-flash-lite"), null);
  assert.equal(validateVisionReport({ ...validReport, conditions: [{ ...validReport.conditions[0], confidence: .55 }, validReport.conditions[1]] }, conditions, "VERIFY-583100", "gemini-3.5-flash-lite"), null);
});

test("capture requires buyer approval, passing evidence, active session and uncaptured authorization", () => {
  const report = validateVisionReport(validReport, conditions, "VERIFY-583100", "gemini-3.5-flash-lite")!;
  const base = { status: "BUYER_APPROVED" as const, report, buyerApprovedAt: "2026-10-26T00:00:00.000Z", challengeExpiresAt: "2026-10-26T01:00:00.000Z", authorizationId: "AUTH-1" };
  const now = Date.parse("2026-10-26T00:30:00.000Z");
  assert.equal(captureGate(base, now), null);
  assert.ok(captureGate({ ...base, status: "AWAITING_BUYER_DECISION" }, now));
  assert.ok(captureGate({ ...base, challengeExpiresAt: "2026-10-26T00:00:00.000Z" }, now));
  assert.ok(captureGate({ ...base, captureId: "CAP-1" }, now));
  assert.ok(captureGate({ ...base, voidedAt: "2026-10-26T00:10:00.000Z" }, now));
  assert.ok(captureGate({ ...base, report: { ...report, conditions: [{ ...report.conditions[0], status: "NEEDS_REVIEW" }, report.conditions[1]] } }, now));
});

test("controlled capture switch applies only to the chosen Verify session", () => {
  assert.equal(captureEnabledFor("VERIFY-8239A04B", "true", "VERIFY-8239A04B"), true);
  assert.equal(captureEnabledFor("VERIFY-10C6D17D", "true", "VERIFY-8239A04B"), false);
  assert.equal(captureEnabledFor("VERIFY-8239A04B", "false", "VERIFY-8239A04B"), false);
  assert.equal(captureEnabledFor("VERIFY-8239A04B", "true", ""), false);
});
