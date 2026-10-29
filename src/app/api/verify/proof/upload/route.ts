import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { verifyMutationRequest, verifyError } from "@/lib/verify-http";
import { getVerifySession } from "@/lib/verify-store";

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.includes("application/json")) return verifyError("Expected upload request.");
  let body: HandleUploadBody;
  try { body = await request.json(); } catch { return verifyError("Invalid upload request."); }
  // Vercel Blob's signed completion callback has no browser Origin; only its
  // token-generation request comes from the public Verify page.
  try {
    const result = await handleUpload({
      body, request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!verifyMutationRequest(request)) throw new Error("Upload must start from the Verify page.");
        const id = clientPayload ?? "";
        const session = await getVerifySession(id);
        if (!session || session.status !== "AWAITING_VERIFICATION" || !session.challengeCode || !session.challengeExpiresAt || Date.parse(session.challengeExpiresAt) <= Date.now() || session.proofPath || !["webm", "mp4"].some(extension => pathname === `verify-proof/${id}/proof.${extension}`)) throw new Error("This session cannot accept proof.");
        return { allowedContentTypes: ["video/webm", "video/mp4"], maximumSizeInBytes: 14_000_000, validUntil: Math.min(Date.now() + 10 * 60_000, Date.parse(session.challengeExpiresAt)), addRandomSuffix: true };
      },
      onUploadCompleted: async () => { /* The seller confirms the upload with /api/verify/proof. */ },
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return verifyError(error instanceof Error ? error.message : "Proof upload failed."); }
}
