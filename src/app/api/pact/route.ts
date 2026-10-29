import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { changePactStore, readPactStore } from "@/lib/pact-store";
import { captureSandboxOrder, createSandboxOrder, getSandboxRefund, paypalConfig, refundSandboxCapture } from "@/lib/paypal";
import type { PactCase } from "@/lib/mock-data";
import { buyerApprovedRefundStage, usdCents, validateRefundOffer } from "@/lib/refund-rules";

const refundInFlight = new Set<string>();
const validLocalRequest = (request: NextRequest) => {
  const host = request.headers.get("host") ?? "";
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return false;
  const origin = request.headers.get("origin");
  try { return !origin || new URL(origin).host === host; } catch { return false; }
};
const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function GET(request: NextRequest) {
  if (!validLocalRequest(request)) return bad("PACT Sandbox demo is available only on localhost.", 403);
  const store = await readPactStore();
  return NextResponse.json({ transactions: store.transactions, cases: store.cases, config: { ...paypalConfig(), clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "" } }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!validLocalRequest(request)) return bad("PACT Sandbox demo is available only on localhost.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return bad("Expected JSON.");
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return bad("Invalid JSON."); }
  try {
    switch (input.action) {
      case "create_order": {
        if (!paypalConfig().ready) return bad(`Missing Sandbox setup: ${paypalConfig().missing.join(", ")}`, 503);
        const id = await createSandboxOrder();
        await changePactStore(store => { store.orders.push({ id, captureRequestId: randomUUID(), createdAt: new Date().toISOString() }); });
        return NextResponse.json({ id });
      }
      case "capture_order": {
        if (typeof input.orderId !== "string") return bad("Order ID is required.");
        const result = await changePactStore(async store => {
          const existing = store.transactions.find(item => item.orderId === input.orderId);
          if (existing) return existing;
          const pending = store.orders.find(item => item.id === input.orderId);
          if (!pending) throw new Error("This order was not created by this PACT demo.");
          const order = await captureSandboxOrder(pending.id, pending.captureRequestId);
          const capture = order.purchaseUnits?.[0]?.payments?.captures?.[0];
          if (order.status !== "COMPLETED" || capture?.status !== "COMPLETED" || !capture.id || capture.amount?.currencyCode !== "USD" || usdCents(capture.amount.value) !== 10000) {
            throw new Error("PayPal did not return a completed $100.00 USD capture. Check the Sandbox order before continuing.");
          }
          const payer = order.paymentSource?.paypal ?? order.payer;
          const name = [payer?.name?.givenName, payer?.name?.surname].filter(Boolean).join(" ") || "Sandbox buyer";
          const createdAt = capture.createTime ?? order.createTime ?? new Date().toISOString();
          const transaction = { id: `TXN-${capture.id}`, item: "Studio Desk Lamp", short: "S", tone: "product-amber", buyer: name, email: payer?.emailAddress ?? "", date: new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), amount: 100, status: "Completed" as const, description: "Adjustable LED desk lamp, matte black — Sandbox demo", orderId: pending.id, source: "paypal_sandbox" as const, captureId: capture.id, currency: "USD", captureStatus: capture.status, createdAt };
          store.transactions.unshift(transaction);
          return transaction;
        });
        return NextResponse.json({ transaction: result });
      }
      case "report": {
        if (typeof input.transactionId !== "string" || typeof input.issueType !== "string" || typeof input.issue !== "string" || typeof input.preferred !== "string") return bad("Complete the report form.");
        if (input.issue.trim().length < 20 || input.issue.length > 2000) return bad("Describe the issue in 20–2000 characters.");
        if (!["Damaged item", "Item not as described", "Late delivery", "Item not received", "Other issue"].includes(input.issueType)) return bad("Choose a valid issue type.");
        if (!["A refund", "A replacement", "No preference"].includes(input.preferred)) return bad("Choose a valid preferred outcome.");
        const item = await changePactStore(store => {
          const transaction = store.transactions.find(t => t.id === input.transactionId && t.source === "paypal_sandbox");
          if (!transaction || transaction.captureStatus !== "COMPLETED") throw new Error("Select a captured Sandbox transaction.");
          if (store.cases.some(c => c.transactionId === transaction.id)) throw new Error("This transaction already has a case.");
          const report: PactCase = { id: `CASE-${randomUUID().slice(0, 8).toUpperCase()}`, transactionId: transaction.id, title: input.issueType as string, buyer: transaction.buyer, initials: transaction.buyer.split(" ").map(n => n[0]).join("").slice(0, 2), avatarTone: "avatar-peach", status: "analysing", updated: "Just now", issue: (input.issue as string).trim(), issueType: input.issueType as string, preferredOutcome: input.preferred as string, proposal: "needs_review", refundAmount: 0, confidence: 0, reason: "Assessment pending.", source: "paypal_sandbox" };
          store.cases.unshift(report);
          transaction.status = "Issue reported";
          return report;
        });
        return NextResponse.json({ case: item });
      }
      case "seller_offer": {
        if (typeof input.caseId !== "string" || typeof input.proposal !== "string" || !["full_refund", "partial_refund", "replacement", "no_refund"].includes(input.proposal)) return bad("Choose a valid offer.");
        const item = await changePactStore(store => {
          const current = store.cases.find(c => c.id === input.caseId);
          const transaction = store.transactions.find(t => t.id === current?.transactionId);
          if (!current || !transaction || current.status === "resolved" || current.status === "refund_pending" || current.status === "analysing") throw new Error("This case cannot be changed.");
          const cents = validateRefundOffer(input.proposal as string, input.amount, usdCents(transaction.amount));
          current.proposal = input.proposal as PactCase["proposal"];
          current.refundAmount = cents / 100;
          current.status = "buyer_review";
          current.sellerApprovedAt = new Date().toISOString();
          current.updated = "Just now";
          return current;
        });
        return NextResponse.json({ case: item });
      }
      case "request_changes": {
        if (typeof input.caseId !== "string") return bad("Case ID is required.");
        const item = await changePactStore(store => {
          const current = store.cases.find(c => c.id === input.caseId);
          if (!current || current.status !== "buyer_review" || current.refundRequestId) throw new Error("This offer cannot be changed now.");
          current.status = "seller_review";
          current.updated = "Just now";
          return current;
        });
        return NextResponse.json({ case: item });
      }
      case "accept_offer": {
        if (typeof input.caseId !== "string") return bad("Case ID is required.");
        const prepared = await changePactStore(store => {
          const item = store.cases.find(c => c.id === input.caseId);
          const transaction = store.transactions.find(t => t.id === item?.transactionId);
          if (!item || !transaction?.captureId) throw new Error("Captured Sandbox transaction not found.");
          if (item.status === "resolved") return { item, transaction, done: true };
          if (!buyerApprovedRefundStage(item.status)) throw new Error("The buyer must review the seller offer first.");
          if (item.proposal === "replacement" || item.proposal === "no_refund") {
            item.status = "resolved";
            item.updated = "Just now";
            return { item, transaction, done: true };
          }
          const cents = usdCents(item.refundAmount);
          if (cents < 1 || cents > usdCents(transaction.amount)) throw new Error("Refund amount exceeds the captured amount.");
          item.refundRequestId ??= randomUUID();
          item.status = "refund_pending";
          item.refundError = undefined;
          return { item, transaction, done: false };
        });
        if (prepared.done) return NextResponse.json({ case: prepared.item });
        const { item, transaction } = prepared;
        if (refundInFlight.has(item.id)) return NextResponse.json({ case: item });
        refundInFlight.add(item.id);
        try {
          const refund = item.paypalRefundId
            ? await getSandboxRefund(item.paypalRefundId)
            : await refundSandboxCapture(transaction.captureId!, item.refundRequestId!, usdCents(item.refundAmount), usdCents(transaction.amount));
          if (!refund.id || !refund.status) throw new Error("PayPal refund response did not include an ID and status.");
          const actualCents = usdCents(refund.amount?.value);
          if (refund.amount?.currencyCode !== "USD" || actualCents !== usdCents(item.refundAmount)) throw new Error("PayPal refund amount did not match the approved offer. Verify in Sandbox.");
          const saved = await changePactStore(store => {
            const current = store.cases.find(c => c.id === item.id)!;
            const payment = store.transactions.find(t => t.id === transaction.id)!;
            current.paypalRefundId = refund.id;
            current.paypalRefundStatus = refund.status;
            current.actualRefundAmount = actualCents / 100;
            current.refundError = refund.status === "FAILED" || refund.status === "CANCELLED" ? `PayPal refund status: ${refund.status}` : undefined;
            current.status = refund.status === "COMPLETED" ? "resolved" : refund.status === "FAILED" || refund.status === "CANCELLED" ? "refund_failed" : "refund_pending";
            current.updated = "Just now";
            if (refund.status === "COMPLETED") payment.status = actualCents === usdCents(payment.amount) ? "Refunded" : "Issue reported";
            return current;
          });
          return NextResponse.json({ case: saved });
        } catch (error) {
          await changePactStore(store => { const current = store.cases.find(c => c.id === item.id); if (current) current.refundError = "PayPal Sandbox refund needs review. Check the merchant Sandbox activity; a retry uses the same request ID."; });
          throw error;
        } finally {
          refundInFlight.delete(item.id);
        }
      }
      default: return bad("Unknown action.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sandbox request failed.";
    // SDK errors can contain request detail. Keep API responses concise and leave diagnosis on the server.
    const safe = /^(This |Select |Refund |The buyer|Captured |PayPal did not|PayPal refund|This order|This case|This offer)/.test(message) ? message : "PayPal Sandbox request failed. Check credentials, buyer approval, and the server log.";
    console.error("PACT Sandbox action failed:", error);
    return bad(safe, 409);
  }
}
