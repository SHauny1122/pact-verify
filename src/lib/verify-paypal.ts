import { CheckoutPaymentIntent, Client, Environment, OrdersController, PaymentsController } from "@paypal/paypal-server-sdk";
import { paypalConfig } from "@/lib/paypal";
import { verifyAmountValue } from "@/lib/verify-purchase";

function sandboxClient() {
  if (!paypalConfig().ready) throw new Error("PayPal Sandbox is not configured.");
  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
      oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    },
    environment: Environment.Sandbox,
  });
}

export async function createVerifyOrder(item: string, amountCents: number) {
  const amount = verifyAmountValue(amountCents);
  const { result } = await new OrdersController(sandboxClient()).createOrder({
    body: {
      intent: CheckoutPaymentIntent.Authorize,
      purchaseUnits: [{ description: `${item} — independent Verify Sandbox demo`, amount: { currencyCode: "USD", value: amount } }],
    },
  });
  if (!result.id) throw new Error("PayPal did not return an order ID.");
  return result.id;
}

export async function authorizeVerifyOrder(orderId: string, requestId: string) {
  const { result } = await new OrdersController(sandboxClient()).authorizeOrder({ id: orderId, paypalRequestId: requestId, prefer: "return=representation" });
  return result;
}

export async function getVerifyOrder(orderId: string) {
  const { result } = await new OrdersController(sandboxClient()).getOrder({ id: orderId });
  return result;
}

export async function getVerifyAuthorization(authorizationId: string) {
  const { result } = await new PaymentsController(sandboxClient()).getAuthorizedPayment({ authorizationId });
  return result;
}

export async function captureVerifyAuthorization(authorizationId: string, requestId: string, amountCents: number) {
  const { result } = await new PaymentsController(sandboxClient()).captureAuthorizedPayment({
    authorizationId,
    paypalRequestId: requestId,
    prefer: "return=representation",
    body: { finalCapture: true, amount: { currencyCode: "USD", value: verifyAmountValue(amountCents) } },
  });
  return result;
}

export async function voidVerifyAuthorization(authorizationId: string, requestId: string) {
  const { result } = await new PaymentsController(sandboxClient()).voidPayment({ authorizationId, paypalRequestId: requestId, prefer: "return=representation" });
  return result;
}
