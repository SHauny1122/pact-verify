import type { CheckStatus, VerifyStatus } from "@/lib/verify-policy";

export type EvidenceCase = {
  id: string;
  status: VerifyStatus;
  authorizationId?: string;
  captureId?: string;
  captureStatus?: string;
  buyerApprovedAt?: string;
  report: {
    model: string;
    overallStatus: CheckStatus;
    challengeCodeStatus: CheckStatus;
    challengeEvidence: string;
    conditions: { condition: string; status: CheckStatus; evidence: string; confidence: number }[];
  };
};

// Public, token-free summary of the three independently checked Sandbox runs.
// These are historical results, never a substitute for a new live verification.
export const verifiedDemoSnapshot: { motorcycle: EvidenceCase; partialMonitor: EvidenceCase; completedMonitor: EvidenceCase; hostedBlockedMonitor: EvidenceCase } = {
  motorcycle: {
    id: "VERIFY-063C9B06", status: "CONDITION_FAILED",
    authorizationId: "65K99214PD224463C",
    report: {
      model: "gemini-3.5-flash-lite", overallStatus: "NEEDS_REVIEW", challengeCodeStatus: "NEEDS_REVIEW",
      challengeEvidence: "A handwritten number paper showing 205 778 is visible, but no motorcycle is present.",
      conditions: [
        { condition: "Engine starts", status: "NEEDS_REVIEW", evidence: "No motorcycle or engine is shown in the video.", confidence: 1 },
        { condition: "Odometer below 20,000 km", status: "NEEDS_REVIEW", evidence: "No motorcycle or odometer is shown in the video.", confidence: 1 },
        { condition: "No obvious cracked fairings", status: "NEEDS_REVIEW", evidence: "No motorcycle or fairings are shown in the video.", confidence: 1 },
      ],
    },
  },
  partialMonitor: {
    id: "VERIFY-10C6D17D", status: "CONDITION_FAILED",
    authorizationId: "77V12948LS137011Y",
    report: {
      model: "gemini-3.5-flash-lite", overallStatus: "NEEDS_REVIEW", challengeCodeStatus: "NEEDS_REVIEW",
      challengeEvidence: "Only the digits 4740 are visible on the paper; the VERIFY prefix is missing.",
      conditions: [
        { condition: "Monitor powers on", status: "PASS", evidence: "The monitor is displaying a webpage interface with text and UI elements.", confidence: 0.95 },
        { condition: "Screen has no obvious visible cracks", status: "PASS", evidence: "The display is clear and free of visible cracks.", confidence: 0.9 },
        { condition: "Model and brand label is visible", status: "PASS", evidence: "The DELL brand label is clearly visible on the lower bezel of the monitor.", confidence: 0.95 },
      ],
    },
  },
  completedMonitor: {
    id: "VERIFY-8239A04B", status: "COMPLETED",
    authorizationId: "9W4998613F9762716", captureId: "7PR816937N8386635", captureStatus: "COMPLETED",
    buyerApprovedAt: "2026-10-26T12:19:49.453Z",
    report: {
      model: "gemini-3.5-flash-lite", overallStatus: "PASS", challengeCodeStatus: "PASS",
      challengeEvidence: "The paper note clearly displays VERIFY-4898 held beside the monitor.",
      conditions: [
        { condition: "Monitor powers on", status: "PASS", evidence: "The monitor is lit up and displaying text/UI.", confidence: 0.95 },
        { condition: "Screen has no obvious visible cracks", status: "PASS", evidence: "The visible screen area appears intact with no visible cracks.", confidence: 0.9 },
        { condition: "Model and brand label is visible", status: "PASS", evidence: "The DELL brand label is clearly visible on the lower bezel of the monitor.", confidence: 0.99 },
      ],
    },
  },
  hostedBlockedMonitor: {
    id: "VERIFY-274FD63DFB864792B4AF7677", status: "CONDITION_FAILED",
    authorizationId: "5NT256919V536314A",
    report: {
      model: "gemini-3.5-flash-lite", overallStatus: "NEEDS_REVIEW", challengeCodeStatus: "PASS",
      challengeEvidence: "The full VERIFY-4436 code was visible beside the monitor.",
      conditions: [
        { condition: "Monitor powers on", status: "PASS", evidence: "The monitor displayed an active interface.", confidence: 0.95 },
        { condition: "Screen has no obvious visible cracks", status: "PASS", evidence: "The visible screen areas showed no obvious cracks.", confidence: 0.9 },
        { condition: "Model and brand label is visible", status: "FAIL", evidence: "The label was intentionally hidden and was not visible in the video.", confidence: 0.95 },
      ],
    },
  },
};
