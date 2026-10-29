import { io } from "next/cache";
import { getVerifySession, type VerifySession } from "@/lib/verify-store";
import { verifiedDemoSnapshot, type EvidenceCase } from "@/lib/verify-evidence-snapshot";

const evidenceIds = {
  motorcycle: "VERIFY-063C9B06",
  partialMonitor: "VERIFY-10C6D17D",
  completedMonitor: "VERIFY-8239A04B",
  hostedBlockedMonitor: "VERIFY-274FD63DFB864792B4AF7677",
} as const;

function publicEvidence(session?: VerifySession): EvidenceCase | null {
  if (!session?.report) return null;
  return {
    id: session.id, status: session.status, authorizationId: session.authorizationId,
    captureId: session.captureId, captureStatus: session.captureStatus,
    buyerApprovedAt: session.buyerApprovedAt, report: session.report,
  };
}

function EvidenceResult({ session, title, detail }: { session: EvidenceCase; title: string; detail: string }) {
  if (!session?.report) return null;
  return <article className="verify-history-card">
    <div className="verify-history-top"><span>{title}</span><strong>CAPTURE BLOCKED</strong></div>
    <h3>{detail}</h3>
    <p>{session.id} · Gemini {session.report.model}</p>
    <div className="verify-history-status"><span>ITEM CHECKS</span><b>{session.report.conditions.filter(row => row.status === "PASS").length}/{session.report.conditions.length} PASS</b></div>
    <div className="verify-history-status"><span>FULL CHALLENGE</span><b>{session.report.challengeCodeStatus.replace("_", " ")}</b></div>
    <div className="verify-history-status"><span>PAYPAL CAPTURES</span><b>{session.captureId ? "1" : "0"}</b></div>
  </article>;
}

export async function VerifyEvidence() {
  await io();
  let motorcycleSession: VerifySession | null = null;
  let partialSession: VerifySession | null = null;
  let completedSession: VerifySession | null = null;
  let hostedBlockedSession: VerifySession | null = null;
  try {
    [motorcycleSession, partialSession, completedSession, hostedBlockedSession] = await Promise.all([
      getVerifySession(evidenceIds.motorcycle), getVerifySession(evidenceIds.partialMonitor), getVerifySession(evidenceIds.completedMonitor), getVerifySession(evidenceIds.hostedBlockedMonitor),
    ]);
  } catch {
    // The public historical summary remains available during a database outage.
  }
  const savedMotorcycle = publicEvidence(motorcycleSession ?? undefined);
  const savedPartialMonitor = publicEvidence(partialSession ?? undefined);
  const savedCompletedMonitor = publicEvidence(completedSession ?? undefined);
  const motorcycle = savedMotorcycle ?? verifiedDemoSnapshot.motorcycle;
  const partialMonitor = savedPartialMonitor ?? verifiedDemoSnapshot.partialMonitor;
  const completedMonitor = savedCompletedMonitor?.status === "COMPLETED" ? savedCompletedMonitor : verifiedDemoSnapshot.completedMonitor;
  const hostedBlockedMonitor = publicEvidence(hostedBlockedSession ?? undefined) ?? verifiedDemoSnapshot.hostedBlockedMonitor;
  const report = completedMonitor.report;
  const completed = completedMonitor.status === "COMPLETED" && completedMonitor.captureStatus === "COMPLETED" && Boolean(completedMonitor.buyerApprovedAt && completedMonitor.authorizationId && completedMonitor.captureId && report.overallStatus === "PASS" && report.challengeCodeStatus === "PASS");

  if (!completed) return null;

  return <section id="verified-results" className="verify-evidence" aria-labelledby="verify-evidence-title">
    <div className="verify-evidence-heading"><div><span className="verify-eyebrow">CONTROLLED SANDBOX TESTS / FOUR OUTCOMES</span><h2 id="verify-evidence-title">Proof changed what happened to the money.</h2></div><p>The $100 capture is archived evidence from the local flow. The $10 blocked case below ran on this hosted preview. These are saved test results, not a new PayPal or Gemini check on page load.</p></div>

    <article className="verify-featured-result">
      <div className="verify-featured-lead"><span className="verify-result-index">03 / ARCHIVED LOCAL POSITIVE PATH</span><span className="verify-pass-pill">ALL CHECKS PASS · CAPTURED</span></div>
      <div className="verify-featured-summary"><div><h3>Used monitor, proven live.</h3><p>Gemini checked the video. The buyer approved the passing report. PayPal then captured the existing $100.00 authorization.</p></div><strong>$100.00 <small>USD / SANDBOX</small></strong></div>
      <div className="verify-evidence-grid">
        <div className="verify-findings"><div className="verify-evidence-subhead"><span>GEMINI VIDEO FINDINGS</span><strong>{report.model}</strong></div>
          {report.conditions.map(row => <div key={row.condition} className="verify-finding-row"><div><strong>{row.condition}</strong><p>{row.evidence}</p></div><span>PASS <b>{Math.round(row.confidence * 100)}%</b></span></div>)}
          <div className="verify-finding-row verify-challenge-row"><div><strong>Full one-time challenge</strong><p>{report.challengeEvidence}</p></div><span>{report.challengeCodeStatus}</span></div>
        </div>
        <div className="verify-money-path"><div className="verify-evidence-subhead"><span>PAYPAL MONEY PATH</span><strong>BUYER CONTROLLED</strong></div>
          <div className="verify-money-step"><span>01 / AUTHORIZE</span><strong>Funds reserved</strong><code>{completedMonitor.authorizationId}</code><p>PayPal approval reserved $100.00. It did not capture funds.</p></div>
          <div className="verify-money-step"><span>02 / BUYER APPROVES</span><strong>Approval recorded</strong><p>The buyer accepted the passing report before capture.</p></div>
          <div className="verify-money-step"><span>03 / CAPTURE</span><strong>Payment completed</strong><code>{completedMonitor.captureId}</code><p>PayPal Sandbox capture: {completedMonitor.captureStatus}. A repeat capture request was blocked; PayPal confirmed one capture.</p></div>
        </div>
      </div>
      <div className="verify-featured-foot"><span>{completedMonitor.id} · Live Gemini · PayPal Sandbox</span><span>No refund involved</span></div>
    </article>

    <div className="verify-history-heading"><span>WHAT THE SAFETY GATE BLOCKED</span><p>The hosted $10 test hid the model label. Gemini refused to pass the incomplete proof, and PayPal made zero captures.</p></div>
    <div className="verify-history-grid"><EvidenceResult session={hostedBlockedMonitor} title="04 / HOSTED PREVIEW · $10" detail="Model label hidden. Authorization uncaptured."/><EvidenceResult session={motorcycle} title="01 / ARCHIVED MOTORCYCLE TEST" detail="No motorcycle in the recording."/><EvidenceResult session={partialMonitor} title="02 / ARCHIVED MONITOR TEST" detail="Item checks passed. Code was incomplete."/></div>
  </section>;
}
