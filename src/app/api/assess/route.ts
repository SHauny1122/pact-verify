import { NextRequest, NextResponse } from "next/server";
import { AI_REVIEW_MESSAGE, generateAiAssessment, remainingRefundableFromCapture, type AssessmentContext } from "@/lib/ai-resolution";
import type { PactCase } from "@/lib/mock-data";
import { changePactStore } from "@/lib/pact-store";
import { getSandboxCapture } from "@/lib/paypal";
import { usdCents } from "@/lib/refund-rules";

const inFlight = new Map<string, Promise<PactCase>>();

function validLocalRequest(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return false;
  const origin = request.headers.get("origin");
  try { return !origin || new URL(origin).host === host; } catch { return false; }
}

async function assessCase(caseId: string): Promise<PactCase> {
  const prepared = await changePactStore(store => {
    const item = store.cases.find(value => value.id === caseId && value.source === "paypal_sandbox");
    const transaction = store.transactions.find(value => value.id === item?.transactionId);
    if (!item || !transaction) throw new Error("Case not found.");
    if (item.status !== "analysing") return { item, context: null };
    if (item.aiAttemptedAt || transaction.captureStatus !== "COMPLETED") {
      item.status = "needs_review";
      item.proposal = "needs_review";
      item.refundAmount = 0;
      item.reason = AI_REVIEW_MESSAGE;
      item.aiFailure = AI_REVIEW_MESSAGE;
      return { item, context: null };
    }
    const alreadyRefunded = store.cases
      .filter(value => value.transactionId === transaction.id && value.paypalRefundStatus === "COMPLETED")
      .reduce((total, value) => total + usdCents(value.actualRefundAmount ?? 0), 0);
    const remainingRefundableCents = Math.max(0, usdCents(transaction.amount) - alreadyRefunded);
    item.aiAttemptedAt = new Date().toISOString();
    const context: AssessmentContext = {
      transaction: { amount: transaction.amount, currency: transaction.currency, item: transaction.item, description: transaction.description, captureStatus: transaction.captureStatus },
      reportedIssueType: item.issueType,
      buyerDescription: item.issue,
      preferredOutcome: item.preferredOutcome ?? "No preference",
      remainingRefundableCents,
    };
    return { item, context, captureId: transaction.captureId };
  });
  if (!prepared.context) return prepared.item;

  let result: Awaited<ReturnType<typeof generateAiAssessment>> = { kind: "needs_review", reason: AI_REVIEW_MESSAGE };
  try {
    if (prepared.captureId) {
      const capture = await getSandboxCapture(prepared.captureId);
      const paypalRemaining = remainingRefundableFromCapture(capture, prepared.captureId, usdCents(prepared.context.transaction.amount));
      if (paypalRemaining !== null && paypalRemaining === prepared.context.remainingRefundableCents) {
        result = await generateAiAssessment({ ...prepared.context, remainingRefundableCents: paypalRemaining });
      }
    }
  } catch {
    // If PayPal cannot confirm the current capture, do not ask AI to suggest money.
  }
  return changePactStore(store => {
    const item = store.cases.find(value => value.id === caseId && value.source === "paypal_sandbox");
    if (!item) throw new Error("Case not found.");
    if (item.status !== "analysing") return item;
    if (result.kind === "needs_review") {
      item.status = "needs_review";
      item.proposal = "needs_review";
      item.refundAmount = 0;
      item.confidence = 0;
      item.reason = result.reason;
      item.aiFailure = result.reason;
    } else {
      const recommendation = result.recommendation;
      item.ai = recommendation;
      item.status = recommendation.recommendedResolution === "needs_review" ? "needs_review" : "seller_review";
      item.proposal = recommendation.recommendedResolution;
      item.refundAmount = recommendation.recommendedRefundAmount;
      item.confidence = Math.round(recommendation.confidence * 100);
      item.reason = recommendation.reason;
      item.aiFailure = undefined;
    }
    item.updated = "Just now";
    return item;
  });
}

export async function POST(request: NextRequest) {
  if (!validLocalRequest(request)) return NextResponse.json({ error: "Local demo only." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const caseId = body && typeof body === "object" && "caseId" in body ? body.caseId : undefined;
  if (typeof caseId !== "string" || !/^CASE-[A-Z0-9-]{4,32}$/.test(caseId)) return NextResponse.json({ error: "Case ID is required." }, { status: 400 });

  let assessment = inFlight.get(caseId);
  if (!assessment) {
    assessment = assessCase(caseId);
    inFlight.set(caseId, assessment);
  }
  try {
    const item = await assessment;
    return NextResponse.json({ case: item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("PACT assessment failed:", error);
    return NextResponse.json({ error: "Assessment could not complete. This case needs manual review." }, { status: 500 });
  } finally {
    if (inFlight.get(caseId) === assessment) inFlight.delete(caseId);
  }
}
