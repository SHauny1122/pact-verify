import { randomInt, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createVerificationPlan, VERIFY_MODEL } from "@/lib/verify-gemini";
import { verifyMutationRequest, verifyError } from "@/lib/verify-http";
import { captureEnabledFor, captureGate, validateConditions } from "@/lib/verify-policy";
import { authorizeVerifyOrder, captureVerifyAuthorization, createVerifyOrder, getVerifyAuthorization, getVerifyOrder, voidVerifyAuthorization } from "@/lib/verify-paypal";
import { accessHash, buyerCookieName, changeVerifySession, createVerifySession, getVerifySession, hasBuyerAccess, newBuyerAccess, publicSession, type VerifySession } from "@/lib/verify-store";
import { validateVerifyPurchase } from "@/lib/verify-purchase";
import { usdCents } from "@/lib/refund-rules";
import { paypalConfig } from "@/lib/paypal";

const noStore = { "Cache-Control": "no-store" };
type Input = Record<string, unknown>;
const roleOf = (value: unknown): "buyer" | "seller" | null => value === "buyer" || value === "seller" ? value : null;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const role = roleOf(searchParams.get("role"));
  const session = await getVerifySession(searchParams.get("id") ?? "");
  if (!session || !role || (role === "buyer" && !hasBuyerAccess(session, request.cookies.get(buyerCookieName(session.id))?.value))) return verifyError("Verification session not found in this browser.", 404);
  return NextResponse.json({ session: publicSession(session, role), config: { ...paypalConfig(), clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "", captureEnabled: captureEnabledFor(session.id) } }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return verifyError("This action must come from the Verify page.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return verifyError("Expected JSON.");
  let input: Input;
  try { input = await request.json(); } catch { return verifyError("Invalid JSON."); }
  try {
    if (input.action === "create_session") {
      if (!process.env.DATABASE_URL || !process.env.BLOB_READ_WRITE_TOKEN) return verifyError("Verify storage is not configured yet.", 503);
      const purchase = validateVerifyPurchase(input.item, input.amount);
      const buyerConditions = validateConditions(input.conditions);
      const plan = await createVerificationPlan(purchase.item, buyerConditions);
      const buyerAccess = newBuyerAccess();
      const session: VerifySession = {
        id: `VERIFY-${randomUUID().replace(/-/g, "").slice(0, 24).toUpperCase()}`, createdAt: new Date().toISOString(), status: "CREATED",
        buyerAccessHash: accessHash(buyerAccess),
        item: purchase.item, amountCents: purchase.amountCents, currency: "USD",
        conditions: plan, planProvider: "Gemini", planModel: VERIFY_MODEL, planCreatedAt: new Date().toISOString(),
        authorizeRequestId: randomUUID(), captureRequestId: randomUUID(), voidRequestId: randomUUID(),
      };
      await createVerifySession(session);
      const response = NextResponse.json({ id: session.id }, { headers: noStore });
      response.cookies.set(buyerCookieName(session.id), buyerAccess, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
      return response;
    }

    const role = roleOf(input.role);
    if (typeof input.id !== "string" || !role) return verifyError("Session ID and role are required.");
    const session = await getVerifySession(input.id);
    if (!session || (role === "buyer" && !hasBuyerAccess(session, request.cookies.get(buyerCookieName(session.id))?.value))) return verifyError("Verification session not found in this browser.", 404);
    const requiredRole = input.action === "start_proof" ? "seller" : "buyer";
    if (role !== requiredRole) return verifyError("This action requires the other participant's view.", 403);

    switch (input.action) {
      case "create_order": {
        if (!paypalConfig().ready) return verifyError("PayPal Sandbox setup is missing.", 503);
        const updated = await changeVerifySession(input.id, async current => {
          if (current.status !== "CREATED") throw new Error("This purchase cannot create another order.");
          current.orderId ??= await createVerifyOrder(current.item, current.amountCents);
          return current;
        });
        return NextResponse.json({ orderId: updated.orderId }, { headers: noStore });
      }
      case "authorize_order": {
        if (typeof input.orderId !== "string") return verifyError("PayPal Order ID is required.");
        const updated = await changeVerifySession(input.id, async current => {
          if (current.authorizationId) return current;
          if (current.status !== "CREATED" || !current.orderId || current.orderId !== input.orderId) throw new Error("This PayPal order does not belong to the session.");
          let order;
          try { order = await authorizeVerifyOrder(current.orderId, current.authorizeRequestId); }
          catch (error) {
            // A transport failure can follow a successful authorization. Read PayPal's
            // order before asking the buyer to try the same approval again.
            try { order = await getVerifyOrder(current.orderId); }
            catch { throw error; }
          }
          const authorization = order.purchaseUnits?.[0]?.payments?.authorizations?.[0];
          if (order.id !== current.orderId || order.intent !== "AUTHORIZE" || !authorization?.id || authorization.status !== "CREATED" || authorization.amount?.currencyCode !== "USD" || usdCents(authorization.amount.value) !== current.amountCents) throw new Error("PayPal did not return an authorization for the agreed USD amount. Check Sandbox before continuing.");
          current.authorizationId = authorization.id;
          current.authorizationStatus = authorization.status;
          current.authorizedAt = authorization.createTime ?? new Date().toISOString();
          current.status = "AWAITING_VERIFICATION";
          return current;
        });
        return NextResponse.json({ session: publicSession(updated, "buyer") }, { headers: noStore });
      }
      case "start_proof": {
        const updated = await changeVerifySession(input.id, current => {
          if (current.status !== "AWAITING_VERIFICATION" || !current.authorizationId) throw new Error("PayPal authorization is required before recording.");
          // Every new recording attempt gets a fresh challenge; the old code
          // from a failed camera attempt can never validate a later proof.
          current.challengeCode = `VERIFY-${randomInt(1000, 10000)}`;
          current.challengeCreatedAt = new Date().toISOString();
          current.challengeExpiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
          return current;
        });
        return NextResponse.json({ session: publicSession(updated, "seller", true) }, { headers: noStore });
      }
      case "reject": {
        const prepared = await changeVerifySession(input.id, current => {
          if (current.captureId || current.status === "COMPLETED" || current.status === "PAYPAL_CAPTURED") throw new Error("Captured payments cannot be rejected through this flow.");
          if (current.status === "BUYER_REJECTED" && current.voidedAt) return current;
          current.buyerRejectedAt ??= new Date().toISOString();
          current.status = current.authorizationId ? "VOID_FAILED" : "BUYER_REJECTED";
          return current;
        });
        if (!prepared.authorizationId || prepared.voidedAt) return NextResponse.json({ session: publicSession(prepared, "buyer") }, { headers: noStore });
        try {
          const updated = await changeVerifySession(input.id, async current => {
            if (current.voidedAt) return current;
            if (current.status !== "VOID_FAILED" || !current.authorizationId) throw new Error("This authorization cannot be voided from its current state.");
            try { await voidVerifyAuthorization(current.authorizationId, current.voidRequestId); }
            catch { /* A lost response may follow a successful void; confirm by read. */ }
            const checked = await getVerifyAuthorization(current.authorizationId);
            if (checked.status !== "VOIDED") throw new Error("PayPal did not confirm the authorization was voided.");
            current.authorizationStatus = "VOIDED";
            current.voidedAt = new Date().toISOString();
            current.voidError = undefined;
            current.status = "BUYER_REJECTED";
            return current;
          });
          return NextResponse.json({ session: publicSession(updated, "buyer") }, { headers: noStore });
        } catch {
          await changeVerifySession(input.id, current => { if (!current.voidedAt) current.voidError = "PayPal void is unconfirmed. Check Sandbox and retry."; });
          return verifyError("Buyer rejection was saved, but PayPal void is not confirmed. No capture is possible.", 502);
        }
      }
      case "approve_and_capture": {
        if (!captureEnabledFor(session.id)) return verifyError("Final capture is disabled for this session. No PayPal capture was attempted.", 409);
        const approved = await changeVerifySession(input.id, current => {
          if (current.captureId || current.status === "COMPLETED") throw new Error("This Verify session has already been captured. No second capture was attempted.");
          if (current.status !== "AWAITING_BUYER_DECISION" || !current.report || current.report.conditions.length !== current.conditions.length || !current.report.conditions.every((row, index) => row.id === current.conditions[index].id)) throw new Error("All required conditions must pass before buyer approval.");
          current.status = "BUYER_APPROVED";
          current.buyerApprovedAt = new Date().toISOString();
          const problem = captureGate(current);
          if (problem) throw new Error(problem);
          return current;
        });
        const updated = await changeVerifySession(approved.id, async current => {
          const problem = captureGate(current);
          if (problem) throw new Error(problem);
          const authorization = await getVerifyAuthorization(current.authorizationId!);
          if (authorization.status !== "CREATED" || authorization.amount?.currencyCode !== "USD" || usdCents(authorization.amount.value) !== current.amountCents || (authorization.expirationTime && Date.parse(authorization.expirationTime) <= Date.now())) throw new Error("PayPal authorization is not valid for capture.");
          const capture = await captureVerifyAuthorization(current.authorizationId!, current.captureRequestId, current.amountCents);
          if (!capture.id || capture.status !== "COMPLETED" || capture.amount?.currencyCode !== "USD" || usdCents(capture.amount.value) !== current.amountCents) throw new Error("PayPal capture was not confirmed. Check Sandbox before retrying.");
          current.captureId = capture.id;
          current.captureStatus = capture.status;
          current.capturedAt = capture.createTime ?? new Date().toISOString();
          current.authorizationStatus = "CAPTURED";
          current.status = "COMPLETED";
          return current;
        });
        return NextResponse.json({ session: publicSession(updated, "buyer") }, { headers: noStore });
      }
      default: return verifyError("Unknown action.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verify request failed.";
    return verifyError(message, 400);
  }
}
