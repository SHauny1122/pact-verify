import { NextRequest, NextResponse } from "next/server";

// Browser actions must originate from the same HTTPS site (or local dev).
// Origin protects the browser-bound buyer decision against cross-site posts.
export function verifyMutationRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const source = new URL(origin);
    const local = source.hostname === "localhost" || source.hostname === "127.0.0.1";
    return source.host === host && (source.protocol === "https:" || (local && source.protocol === "http:"));
  } catch { return false; }
}

export function verifyError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
