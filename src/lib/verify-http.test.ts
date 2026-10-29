import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { verifyMutationRequest } from "./verify-http";

test("public Verify writes require their own HTTPS or localhost origin", () => {
  const request = (url: string, origin?: string) => new NextRequest(url, { method: "POST", headers: { host: new URL(url).host, ...(origin ? { origin } : {}) } });
  assert.equal(verifyMutationRequest(request("https://verify.example.com/api/verify", "https://verify.example.com")), true);
  assert.equal(verifyMutationRequest(request("http://127.0.0.1:3000/api/verify", "http://127.0.0.1:3000")), true);
  assert.equal(verifyMutationRequest(request("https://verify.example.com/api/verify", "https://evil.example.com")), false);
  assert.equal(verifyMutationRequest(request("https://verify.example.com/api/verify")), false);
  assert.equal(verifyMutationRequest(request("http://verify.example.com/api/verify", "http://verify.example.com")), false);
});
