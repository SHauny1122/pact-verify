import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import postgres from "postgres";
import type { Condition, VerifyStatus, VisionReport } from "@/lib/verify-policy";

export type VerifySession = {
  id: string;
  createdAt: string;
  status: VerifyStatus;
  buyerAccessHash: string;
  amountCents: number;
  currency: "USD";
  item: string;
  conditions: Condition[];
  planProvider: "Gemini";
  planModel: string;
  planCreatedAt: string;
  orderId?: string;
  authorizeRequestId: string;
  authorizationId?: string;
  authorizationStatus?: string;
  authorizedAt?: string;
  challengeCode?: string;
  challengeCreatedAt?: string;
  challengeExpiresAt?: string;
  proofSubmittedAt?: string;
  proofMime?: string;
  proofBytes?: number;
  proofSha256?: string;
  proofPath?: string;
  report?: VisionReport;
  aiError?: string;
  buyerApprovedAt?: string;
  buyerRejectedAt?: string;
  captureRequestId: string;
  captureId?: string;
  captureStatus?: string;
  capturedAt?: string;
  voidRequestId: string;
  voidedAt?: string;
  voidError?: string;
};

let connection: ReturnType<typeof postgres> | undefined;
function database() {
  if (!process.env.DATABASE_URL) throw new Error("Verify database is not configured.");
  connection ??= postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: "require", idle_timeout: 20 });
  return connection;
}

export function newBuyerAccess() { return randomBytes(32).toString("base64url"); }
export function accessHash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function buyerCookieName(id: string) { return `pact_verify_buyer_${id}`; }
export function isProofPath(id: string, pathname: string) {
  return pathname.startsWith(`verify-proof/${id}/proof-`) && /^verify-proof\/VERIFY-[A-F0-9]{8,32}\/proof-[A-Za-z0-9_-]+\.(webm|mp4)$/.test(pathname);
}
export function hasBuyerAccess(session: VerifySession, value: unknown) {
  if (typeof value !== "string" || value.length < 30 || value.length > 100) return false;
  const expected = Buffer.from(session.buyerAccessHash, "hex");
  return expected.length === 32 && timingSafeEqual(expected, Buffer.from(accessHash(value), "hex"));
}

export async function getVerifySession(id: string): Promise<VerifySession | null> {
  // The landing page can display its archived summary before database setup.
  if (!process.env.DATABASE_URL || !/^VERIFY-[A-F0-9]{8,32}$/.test(id)) return null;
  const rows = await database()`SELECT record FROM pact_verify.sessions WHERE id = ${id}`;
  return rows.length ? rows[0].record as VerifySession : null;
}

export async function createVerifySession(session: VerifySession) {
  await database()`INSERT INTO pact_verify.sessions (id, created_at, record)
    VALUES (${session.id}, ${session.createdAt}, ${database().json(session)})`;
}

// A row lock survives concurrent Vercel instances. The callback and its PayPal
// operation finish before the record commits, preserving one capture per case.
export async function changeVerifySession<T>(id: string, change: (session: VerifySession) => Promise<T> | T): Promise<T> {
  return await database().begin(async tx => {
    const rows = await tx`SELECT record FROM pact_verify.sessions WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new Error("Verification session not found.");
    const session = rows[0].record as VerifySession;
    const result = await change(session);
    await tx`UPDATE pact_verify.sessions SET record = ${tx.json(session)} WHERE id = ${id}`;
    return result;
  }) as T;
}

export function publicSession(session: VerifySession, role: "buyer" | "seller", revealChallenge = false) {
  return {
    id: session.id, createdAt: session.createdAt, status: session.status, item: session.item,
    amountCents: session.amountCents, currency: session.currency, conditions: session.conditions,
    planProvider: session.planProvider, planModel: session.planModel, orderId: session.orderId,
    authorizationId: session.authorizationId, authorizationStatus: session.authorizationStatus,
    challengeCode: role === "seller" && revealChallenge ? session.challengeCode : undefined,
    challengeExpiresAt: session.challengeExpiresAt, proofSubmittedAt: session.proofSubmittedAt,
    report: session.report, aiError: session.aiError, buyerApprovedAt: session.buyerApprovedAt,
    buyerRejectedAt: session.buyerRejectedAt, captureId: session.captureId, captureStatus: session.captureStatus,
    voidedAt: session.voidedAt, voidError: session.voidError, hasProof: Boolean(session.proofPath),
  };
}
