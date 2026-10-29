import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyExperience } from "@/components/verify-experience";

export const metadata: Metadata = { title: "Verify session — independent hackathon concept", description: "PayPal Sandbox authorization, seller proof and buyer decision." };

async function Session({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ role?: string }> }) {
  const { id } = await params;
  const { role } = await searchParams;
  return <VerifyExperience id={id} role={role === "seller" ? "seller" : "buyer"}/>;
}

export default function VerifySessionPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ role?: string }> }) {
  return <Suspense fallback={<p>Loading Verify session…</p>}><Session {...props}/></Suspense>;
}
