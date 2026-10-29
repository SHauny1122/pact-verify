"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CircleAlert, CreditCard } from "lucide-react";
import { PayPalOneTimePaymentButton, PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";

type Config = { ready: boolean; missing: string[]; clientId: string };

export async function pactRequest<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/pact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Sandbox request failed.");
  return data as T;
}

export function SandboxCheckout({ config, refresh }: { config: Config; refresh: () => Promise<void> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  if (!config.ready) return <div className="panel pact-setup"><CircleAlert size={24}/><h2>PayPal Sandbox setup needed</h2><p>Set {config.missing.join(", ")} in <code>.env.local</code>, then restart the app. The checkout will appear here.</p><Link href="/transactions" className="btn btn-outline">Back to transactions</Link></div>;
  return <div className="pact-checkout-grid"><section className="panel pact-checkout-card"><div className="section-kicker">SANDBOX CHECKOUT / 01</div><div className="detail-product"><span className="product-hero product-amber">S</span><div><h2>Studio Desk Lamp</h2><p>Adjustable LED desk lamp, matte black</p></div></div><div className="summary-row"><span>Demo item</span><strong>Studio Desk Lamp</strong></div><div className="summary-row"><span>Currency</span><strong>USD</strong></div><div className="summary-row"><span>Total</span><strong>$100.00</strong></div><p className="pact-checkout-note">Pay with a PayPal Sandbox personal buyer account. PACT creates and captures this payment through PayPal Sandbox.</p>{working && <p className="pact-working" role="status">Confirming the PayPal capture…</p>}{error && <div className="pact-error" role="alert">{error}</div>}<div className="pact-paypal-button"><PayPalProvider clientId={config.clientId} environment="sandbox" components={["paypal-payments"]} pageType="checkout"><PayPalOneTimePaymentButton createOrder={async () => { setError(""); const { id } = await pactRequest<{ id: string }>({ action: "create_order" }); return { orderId: id }; }} onApprove={async ({ orderId }) => { setWorking(true); setError(""); try { const { transaction } = await pactRequest<{ transaction: { id: string } }>({ action: "capture_order", orderId }); await refresh(); router.push(`/transactions/${transaction.id}`); } catch (caught) { setError(caught instanceof Error ? caught.message : "Capture failed."); } finally { setWorking(false); } }} onCancel={() => setError("Sandbox checkout was cancelled. No payment was captured.")} onError={() => setError("PayPal checkout could not finish. Check the Sandbox buyer account and try again.")} presentationMode="auto" disabled={working}/></PayPalProvider></div></section><aside className="panel pact-checkout-aside"><span className="card-icon"><CreditCard size={22}/></span><div className="section-kicker">WHAT HAPPENS NEXT</div><h2>A real transaction for the demo.</h2><p>After capture, this payment appears in PACT’s transaction list. You can report an issue and use the existing resolution journey to issue a Sandbox refund.</p><div className="flow-preview"><div><span className="flow-icon">01</span><span>Buyer approves in Sandbox</span></div><div><span className="flow-icon">02</span><span>PACT captures and records payment</span></div><div><span className="flow-icon">03</span><span>Open the transaction</span><ArrowRight size={15}/></div></div></aside></div>;
}
