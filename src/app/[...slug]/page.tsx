import { DemoRouter } from "@/components/demo-router";
import { Suspense } from "react";
export default function DemoPage(){return <Suspense fallback={<div className="route-loading" role="status"><span className="loading-mark">✦</span><span className="section-kicker">PACT / PREPARING VIEW</span><h1>Making space for a better outcome.</h1><div className="loading-line"><span/></div></div>}><DemoRouter/></Suspense>}
