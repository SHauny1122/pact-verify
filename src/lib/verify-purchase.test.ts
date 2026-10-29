import assert from "node:assert/strict";
import test from "node:test";
import { validateVerifyPurchase, verifyAmountValue } from "./verify-purchase";

test("physical item and USD cents are stored as agreed for a generic Verify purchase", () => {
  assert.deepEqual(validateVerifyPurchase(" Used monitor ", "100.00"), { item: "Used monitor", amountCents: 10000 });
  assert.equal(verifyAmountValue(10000), "100.00");
  assert.deepEqual(validateVerifyPurchase("Used motorcycle", 1000), { item: "Used motorcycle", amountCents: 100000 });
});

test("Verify rejects invalid names, excessive amounts and sub-cent values before an order is created", () => {
  assert.throws(() => validateVerifyPurchase("TV\nInvoice", "100.00"));
  assert.throws(() => validateVerifyPurchase("TV", "100.00"));
  assert.throws(() => validateVerifyPurchase("Used monitor", "0.99"));
  assert.throws(() => validateVerifyPurchase("Used monitor", "5000.01"));
  assert.throws(() => validateVerifyPurchase("Used monitor", "100.001"));
});
