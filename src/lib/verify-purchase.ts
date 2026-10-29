import { usdCents } from "@/lib/refund-rules";

export function validateVerifyPurchase(item: unknown, amount: unknown) {
  if (typeof item !== "string") throw new Error("Name the physical item being verified.");
  const name = item.trim();
  if (name.length < 3 || name.length > 80 || /[\r\n\x00-\x1f]/.test(name)) throw new Error("Item name must be 3–80 characters on one line.");
  const amountCents = usdCents(amount);
  if (amountCents < 100 || amountCents > 500000) throw new Error("Sandbox purchase amount must be between $1.00 and $5,000.00 USD.");
  return { item: name, amountCents };
}

export function verifyAmountValue(amountCents: number) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 500000) throw new Error("Invalid Verify purchase amount.");
  return (amountCents / 100).toFixed(2);
}
