import { createHash } from "node:crypto";
import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { analyzeVerificationVideo } from "@/lib/verify-gemini";
import { verifyMutationRequest, verifyError } from "@/lib/verify-http";
import { buyerCookieName, changeVerifySession, getVerifySession, hasBuyerAccess, isProofPath, publicSession } from "@/lib/verify-store";

export const maxDuration = 180;
const maxBytes = 14_000_000;
const noStore = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const session = await getVerifySession(id);
  if (!session || !hasBuyerAccess(session, request.cookies.get(buyerCookieName(id))?.value) || !session.proofPath || !session.proofMime) return verifyError("Proof unavailable.", 404);
  const blob = await get(session.proofPath, { access: "private" });
  if (!blob || blob.statusCode !== 200 || blob.blob.size !== session.proofBytes) return verifyError("Proof unavailable.", 404);
  return new NextResponse(blob.stream, { headers: { ...noStore, "Content-Type": session.proofMime, "Content-Length": String(blob.blob.size), "Accept-Ranges": "none", "Content-Disposition": "inline" } });
}

export async function POST(request: NextRequest) {
  if (!verifyMutationRequest(request)) return verifyError("This action must come from the Verify page.", 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return verifyError("Expected proof metadata.");
  let input: { id?: unknown; pathname?: unknown };
  try { input = await request.json(); } catch { return verifyError("Invalid proof metadata."); }
  const id = input.id;
  const pathname = input.pathname;
  if (typeof id !== "string" || typeof pathname !== "string" || !isProofPath(id, pathname)) return verifyError("Invalid proof session or path.");
  const session = await getVerifySession(id);
  if (!session || session.status !== "AWAITING_VERIFICATION" || !session.challengeCode || !session.challengeExpiresAt || Date.parse(session.challengeExpiresAt) <= Date.now()) return verifyError("Verification is not open or its challenge expired.", 409);

  const blob = await get(pathname, { access: "private" });
  if (!blob || blob.statusCode !== 200 || blob.blob.size < 1024 || blob.blob.size > maxBytes) return verifyError("Recorded proof is unavailable or too large.", 413);
  const mime = blob.blob.contentType.split(";")[0];
  if (mime !== "video/webm" && mime !== "video/mp4") return verifyError("Use a browser that records WebM or MP4 video.");
  const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer());
  const isWebm = mime === "video/webm" && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  const isMp4 = mime === "video/mp4" && bytes.toString("ascii", 4, 8) === "ftyp";
  if (!isWebm && !isMp4) return verifyError("Recorded video format is invalid.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  let claimed = false;
  try {
    await changeVerifySession(id, current => {
      if (current.status !== "AWAITING_VERIFICATION" || !current.challengeExpiresAt || Date.parse(current.challengeExpiresAt) <= Date.now() || current.proofPath) throw new Error("Proof already submitted or session expired.");
      current.proofPath = pathname;
      current.proofMime = mime;
      current.proofBytes = bytes.length;
      current.proofSha256 = sha256;
      current.proofSubmittedAt = new Date().toISOString();
      current.status = "PROOF_SUBMITTED";
    });
    claimed = true;
    const report = await analyzeVerificationVideo({ video: bytes, mimeType: mime as "video/webm" | "video/mp4", item: session.item, conditions: session.conditions, challengeCode: session.challengeCode });
    const updated = await changeVerifySession(id, current => {
      if (current.status !== "PROOF_SUBMITTED") throw new Error("Proof state changed during analysis.");
      current.report = report;
      current.aiError = undefined;
      current.status = report.overallStatus === "PASS" && current.challengeExpiresAt && Date.parse(current.challengeExpiresAt) > Date.now() ? "AWAITING_BUYER_DECISION" : "CONDITION_FAILED";
      return current;
    });
    return NextResponse.json({ session: publicSession(updated, "seller") }, { headers: noStore });
  } catch {
    if (!claimed) return verifyError("Proof was already submitted or the session expired.", 409);
    await changeVerifySession(id, current => {
      if (current.status === "PROOF_SUBMITTED") { current.status = "AI_FAILED"; current.aiError = "Video analysis failed or returned invalid evidence. No capture is permitted."; }
    });
    return verifyError("Proof saved, but Gemini analysis did not produce a valid report. No capture is permitted.", 502);
  }
}
