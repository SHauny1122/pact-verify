export function usdCents(value: unknown): number {
  if (typeof value !== "number" && typeof value !== "string") throw new Error("Invalid USD amount.");
  const amount = Number(value);
  const cents = amount * 100;
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(cents)) || Math.abs(cents - Math.round(cents)) > 0.000001) {
    throw new Error("USD amounts must be nonnegative and have no more than two decimal places.");
  }
  return Math.round(cents);
}

export function validateRefundOffer(proposal: string, amount: unknown, capturedCents: number): number {
  if (!Number.isSafeInteger(capturedCents) || capturedCents < 1) throw new Error("Captured amount is invalid.");
  if (proposal === "full_refund") return capturedCents;
  if (proposal === "replacement" || proposal === "no_refund") return 0;
  if (proposal !== "partial_refund") throw new Error("Unsupported resolution type.");
  const cents = usdCents(amount);
  if (cents < 1 || cents >= capturedCents) throw new Error("A partial refund must be at least $0.01 and less than the captured amount.");
  return cents;
}

export function buyerApprovedRefundStage(status: string): boolean {
  return status === "buyer_review" || status === "refund_pending";
}
