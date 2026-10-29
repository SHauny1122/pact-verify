import assert from "node:assert/strict";
import { test } from "node:test";
import { buyerApprovedRefundStage, usdCents, validateRefundOffer } from "./refund-rules";

test("USD values have exact cents", () => {
  assert.equal(usdCents("100.00"), 10000);
  assert.equal(usdCents(12.34), 1234);
  assert.throws(() => usdCents(1.999));
  assert.throws(() => usdCents(Number.NaN));
  assert.throws(() => usdCents(-1));
});

test("full refund uses the captured amount, not client input", () => {
  assert.equal(validateRefundOffer("full_refund", 999999, 10000), 10000);
});

test("partial refund cannot be zero, equal to, or greater than the capture", () => {
  assert.equal(validateRefundOffer("partial_refund", "25.00", 10000), 2500);
  for (const value of [0, -1, 100, 100.01, 1.001, "not a number"]) {
    assert.throws(() => validateRefundOffer("partial_refund", value, 10000));
  }
});

test("nonrefund outcomes cannot create a refund amount", () => {
  assert.equal(validateRefundOffer("replacement", 100, 10000), 0);
  assert.equal(validateRefundOffer("no_refund", 100, 10000), 0);
});

test("AI and manual review states cannot initiate a refund before seller and buyer review", () => {
  for (const status of ["analysing", "needs_review", "seller_review", "resolved"]) {
    assert.equal(buyerApprovedRefundStage(status), false);
  }
  assert.equal(buyerApprovedRefundStage("buyer_review"), true);
  assert.equal(buyerApprovedRefundStage("refund_pending"), true);
});
