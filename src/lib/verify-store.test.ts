import assert from "node:assert/strict";
import test from "node:test";
import { accessHash, hasBuyerAccess, isProofPath, newBuyerAccess, type VerifySession } from "./verify-store";

test("a browser-bound buyer decision needs the matching server-stored hash", () => {
  const access = newBuyerAccess();
  const session = { buyerAccessHash: accessHash(access) } as VerifySession;
  assert.equal(hasBuyerAccess(session, access), true);
  assert.equal(hasBuyerAccess(session, newBuyerAccess()), false);
  assert.equal(hasBuyerAccess(session, ""), false);
  assert.equal(hasBuyerAccess(session, undefined), false);
});

test("proof confirmation accepts only the current case's private Blob path", () => {
  const id = "VERIFY-ABCDEF1234567890ABCDEF12";
  assert.equal(isProofPath(id, `verify-proof/${id}/proof-oYnXSVczoLa9yBYMFJOSN.webm`), true);
  assert.equal(isProofPath(id, `verify-proof/${id}/proof-oYnXSVczoLa9yBYMFJOSN.mp4`), true);
  assert.equal(isProofPath(id, "verify-proof/VERIFY-00000000/proof-other.webm"), false);
  assert.equal(isProofPath(id, `verify-proof/${id}/../proof-other.webm`), false);
});
