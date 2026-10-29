import { Client, Environment, OrdersController, PaymentsController, CheckoutPaymentIntent } from "@paypal/paypal-server-sdk";

export function paypalConfig() {
  const missing = [
    !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
    !process.env.PAYPAL_CLIENT_SECRET && "PAYPAL_CLIENT_SECRET",
    process.env.PAYPAL_ENVIRONMENT !== "sandbox" && "PAYPAL_ENVIRONMENT=sandbox",
  ].filter(Boolean) as string[];
  return { ready: missing.length === 0, missing };
}

function client() {
  const config = paypalConfig();
  if (!config.ready) throw new Error(`PayPal Sandbox is not configured. Set ${config.missing.join(", ")} in .env.local.`);
  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
      oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    },
    environment: Environment.Sandbox,
  });
}

export async function createSandboxOrder() {
  const { result } = await new OrdersController(client()).createOrder({
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [{ description: "Studio Desk Lamp — PACT Sandbox demo", amount: { currencyCode: "USD", value: "100.00" } }],
    },
  });
  if (!result.id) throw new Error("PayPal did not return an order ID.");
  return result.id;
}

export async function captureSandboxOrder(orderId: string, requestId: string) {
  const { result } = await new OrdersController(client()).captureOrder({ id: orderId, paypalRequestId: requestId, prefer: "return=representation" });
  return result;
}

export async function refundSandboxCapture(captureId: string, requestId: string, amountCents: number, captureCents: number) {
  const full = amountCents === captureCents;
  const { result } = await new PaymentsController(client()).refundCapturedPayment({
    captureId,
    paypalRequestId: requestId,
    prefer: "return=representation",
    body: full ? {} : { amount: { currencyCode: "USD", value: (amountCents / 100).toFixed(2) } },
  });
  return result;
}

export async function getSandboxRefund(refundId: string) {
  const { result } = await new PaymentsController(client()).getRefund({ refundId });
  return result;
}

export async function getSandboxCapture(captureId: string) {
  const { result } = await new PaymentsController(client()).getCapturedPayment({ captureId });
  return result;
}
