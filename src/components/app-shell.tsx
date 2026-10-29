"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutDashboard, LifeBuoy, Menu, ShieldCheck, X } from "lucide-react";
import { ReactNode, useState } from "react";

const navigation = [
  { href: "/legacy", label: "Legacy overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/cases", label: "Cases", icon: LifeBuoy },
];

const stages = [
  { segment: "report", label: "Report" },
  { segment: "analysis", label: "Assess" },
  { segment: "proposal", label: "Propose" },
  { segment: "seller", label: "Seller" },
  { segment: "buyer", label: "Buyer" },
  { segment: "resolved", label: "Resolve" },
];

function PactMark({ size = 31 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 36 36" fill="none" aria-hidden="true">
    <path d="M3 7.5h7.2L17.9 18l-7.7 10.5H3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter" />
    <path d="M33 7.5h-7.2L18.1 18l7.7 10.5H33" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" strokeLinejoin="miter" />
    <path d="M18 13.2 22.8 18 18 22.8 13.2 18 18 13.2Z" fill="currentColor" />
  </svg>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const segment = path.split("/")[1] ?? "";
  const stageIndex = stages.findIndex((stage) => stage.segment === segment);
  const section = path === "/legacy" ? "Legacy overview" : path.startsWith("/transactions") ? "Legacy transactions" : path.startsWith("/cases") ? "Legacy cases" : path === "/about" ? "The Pact method" : "Legacy resolution flow";

  return <div className="app-layout">
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand"><Link href="/legacy" onClick={() => setOpen(false)} aria-label="Legacy PACT overview"><span className="brand-mark"><PactMark /></span><span className="brand-word">PACT<span className="brand-period">.</span><small>LEGACY RESOLUTION DEMO</small></span></Link><button className="mobile-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={19} /></button></div>

      <div className="merchant-label">Northstar Studio <small>Merchant demo</small></div>
      <nav className="side-nav" aria-label="Workspace navigation">{navigation.map(({ href, label, icon: Icon }) => {
        const active = path.startsWith(href);
        return <Link key={href} href={href} onClick={() => setOpen(false)} className={active ? "active" : ""}>
          <Icon size={17} strokeWidth={1.8}/><span className="nav-label">{label}</span>
        </Link>;
      })}<Link href="/verify" onClick={() => setOpen(false)} className="legacy-verify-link"><ShieldCheck size={17} strokeWidth={1.8}/><span className="nav-label">PayPal Verify ↗</span></Link></nav>
      <Link className="sidebar-about" href="/about" onClick={() => setOpen(false)}>How Pact works</Link>
    </aside>

    <div className="main-region">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={22}/></button><strong>{section}</strong></div>
        <div className="top-right"><span className="environment"><span className="live-dot"/> LEGACY PACT DEMO · PAYPAL SANDBOX</span></div>
      </header>
      {stageIndex >= 0 && <div className="journey-rail"><span className="journey-label">RESOLUTION PATH</span><div className="journey-stages">{stages.map((stage, index) => <div key={stage.segment} className={index === stageIndex ? "current" : index < stageIndex ? "passed" : "future"}><span className="journey-number">0{index + 1}</span><span>{stage.label}</span></div>)}</div><span className="journey-progress">0{stageIndex + 1} / 06</span></div>}
      <main className="content">{children}<footer className="footer"><span>© PACT</span><span>PayPal Sandbox · AI recommendations are advisory</span></footer></main>
    </div>
    {open && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setOpen(false)}/>}
  </div>;
}
