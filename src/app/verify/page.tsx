import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyStart } from "@/components/verify-experience";
import { VerifyEvidence } from "@/components/verify-evidence";

export const metadata: Metadata = { title: "PayPal Verify — independent hackathon concept", description: "A proof-before-payment PayPal Sandbox and Gemini demo." };

export default function VerifyPage() { return <VerifyStart evidence={<Suspense fallback={<section className="verify-evidence" aria-label="Loading verified Sandbox records"/>}><VerifyEvidence/></Suspense>}/>; }
