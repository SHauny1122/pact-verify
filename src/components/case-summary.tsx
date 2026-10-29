"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PactCase } from "@/lib/mock-data";

function caseStatus(item: PactCase) {
  if (item.status === "resolved") return "Resolved";
  if (item.status === "seller_review") return "Seller review";
  if (item.status === "buyer_review") return "Buyer review";
  if (item.status === "analysing") return "Assessing";
  if (item.status === "needs_review") return "Needs review";
  if (item.status === "refund_pending") return "Refund pending";
  return "Refund needs review";
}

export function CaseSummary({ realCases }: { realCases: PactCase[] }) {
  const active = realCases.filter((item) => item.status !== "resolved").length;
  const resolved = realCases.filter((item) => item.status === "resolved").length;
  return <>
    <section className="dashboard-summary" aria-label="PayPal Sandbox case summary">
      <div className="summary-metric"><span>Active Sandbox cases</span><strong>{active}</strong></div>
      <div className="summary-metric"><span>Resolved Sandbox cases</span><strong>{resolved}</strong></div>
    </section>
    <section className="recent-cases" aria-labelledby="recent-cases-title">
      <div className="recent-heading"><h2 id="recent-cases-title">Sandbox cases</h2><Link href="/cases" className="text-link">All cases & previews <ArrowRight size={16}/></Link></div>
      <div className="recent-list">{realCases.slice(0, 4).map((item) => <Link href={`/cases/${item.id}`} className="recent-row" key={item.id}>
        <span className="recent-name"><strong>{item.title}</strong><small>{item.buyer} · {item.id}</small><small className="recent-proof">PayPal Sandbox · {item.ai ? `${item.ai.provider} · ${item.ai.model} · Live recommendation` : item.aiFailure ? "Manual review · No AI recommendation" : "Simulated recommendation (historical case)"}</small></span>
        <span className="recent-meta"><span>{caseStatus(item)}</span></span>
        <ArrowRight size={16} aria-hidden="true"/>
      </Link>)}{realCases.length === 0 && <div className="recent-empty">No Sandbox cases yet. Start the PayPal Sandbox demo to create one.</div>}</div>
    </section>
  </>;
}
