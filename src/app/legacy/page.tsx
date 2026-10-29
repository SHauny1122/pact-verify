import Link from "next/link";
import { Suspense } from "react";
import { io } from "next/cache";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CaseSummary } from "@/components/case-summary";
import { readPactStore } from "@/lib/pact-store";
import { paypalConfig } from "@/lib/paypal";

export const metadata = { title: "Legacy PACT dispute demo — PayPal Verify" };

async function HeroActions() {
  await io();
  const ready = paypalConfig().ready;
  return <div className="hero-actions">
    <Link href="/verify" className="btn btn-primary">Open PayPal Verify <ArrowUpRight size={17}/></Link>
    <Link href={ready ? "/transactions/new" : "/transactions"} className="hero-secondary">{ready ? "Try legacy Sandbox flow" : "Explore legacy transactions"} <ArrowRight size={16}/></Link>
  </div>;
}

async function StoredCaseSummary() {
  await io();
  const store = await readPactStore();
  return <CaseSummary realCases={store.cases}/>;
}

async function IntegrationDisclosure() {
  await io();
  const configured = Boolean((process.env.GEMINI_API_KEY)?.trim());
  const store = await readPactStore();
  const verified = store.cases.some(item => item.ai?.provider === "Gemini");
  return <p className="dashboard-disclosure">PayPal Sandbox: real payment and refund <span aria-hidden="true">·</span> {verified ? "Gemini: live recommendations for new Sandbox cases" : configured ? "Gemini: configured, awaiting first assessment" : "Gemini: setup needed"}</p>;
}

export default function Dashboard() {
  return <AppShell>
    <div className="legacy-notice"><strong>LEGACY / INTERNAL DEMO</strong><span>This earlier PACT dispute and refund experience is preserved for reference. <Link href="/verify">Go to PayPal Verify ↗</Link></span></div>
    <section className="hero-panel minimal-hero">
      <div className="hero-copy">
        <span className="hero-kicker">PACT / LEGACY RESOLUTION DEMO</span>
        <h1>The earlier dispute-resolution prototype.</h1>
        <p className="hero-explanation">Explore the original PACT case and refund flow. PayPal Verify is now the main hackathon product.</p>
        <Suspense fallback={<div className="hero-actions"><Link href="/verify" className="btn btn-primary">Open PayPal Verify <ArrowUpRight size={17}/></Link><Link href="/transactions" className="hero-secondary">Explore legacy transactions <ArrowRight size={16}/></Link></div>}><HeroActions/></Suspense>
      </div>
    </section>

    <Suspense fallback={<p className="dashboard-disclosure">PayPal Sandbox: real payment and refund <span aria-hidden="true">·</span> AI status loading</p>}><IntegrationDisclosure/></Suspense>
    <Suspense fallback={<section className="dashboard-summary" aria-label="Sandbox case summary loading"><div className="summary-metric"><span>Active Sandbox cases</span><strong>—</strong></div><div className="summary-metric"><span>Resolved Sandbox cases</span><strong>—</strong></div></section>}><StoredCaseSummary/></Suspense>
  </AppShell>;
}
