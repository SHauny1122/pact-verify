"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert, Copy, LockKeyhole, ShieldCheck, Video } from "lucide-react";
import { PayPalOneTimePaymentButton, PayPalProvider, usePayPal } from "@paypal/react-paypal-js/sdk-v6";
import { upload } from "@vercel/blob/client";
import type { VerifyStatus } from "@/lib/verify-policy";
import type { publicSession } from "@/lib/verify-store";

type Session = ReturnType<typeof publicSession>;
type Role = "buyer" | "seller";
type Config = { ready: boolean; missing: string[]; clientId: string; captureEnabled: boolean };

async function api<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Verify request failed.");
  return data as T;
}

const errorText = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";
const formatUsd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const flow = ["Set conditions", "Authorize with PayPal", "Seller proves it live", "AI verifies", "Buyer approves", "PayPal captures"];
const statusText: Record<VerifyStatus, string> = {
  CREATED: "Conditions ready · PayPal authorization next", PAYPAL_AUTHORIZED: "PayPal authorization saved", AWAITING_VERIFICATION: "Awaiting seller proof",
  PROOF_SUBMITTED: "Proof submitted · Gemini is analysing", AI_VERIFIED: "Gemini analysis complete", AWAITING_BUYER_DECISION: "Buyer decision required",
  CONDITION_FAILED: "Condition failed or needs review · capture blocked", AI_FAILED: "Gemini could not verify · capture blocked",
  BUYER_REJECTED: "Buyer rejected · authorization voided", BUYER_APPROVED: "Buyer approved · capture pending", PAYPAL_CAPTURED: "PayPal captured",
  COMPLETED: "Purchase complete", CAPTURE_FAILED: "Capture not confirmed", VOID_FAILED: "Rejection saved · void needs attention",
};

function VerifyPayPalStatus() {
  const { loadingStatus, error } = usePayPal();
  if (loadingStatus === "resolved") return null;
  return <p className={loadingStatus === "rejected" ? "verify-error" : "verify-note"} role="status">{loadingStatus === "rejected" ? `PayPal Sandbox could not initialize: ${error?.message ?? "Unknown SDK error"}` : "Loading PayPal Sandbox checkout…"}</p>;
}

function Frame({ children, stage }: { children: React.ReactNode; stage: number }) {
  return <div className="verify-page"><header className="verify-top"><Link href="/verify" className="verify-wordmark"><span className="verify-emblem">V<span>·</span></span><span>PayPal Verify<small>INDEPENDENT HACKATHON CONCEPT</small></span></Link><Link href="/legacy" className="verify-back">Legacy PACT demo ↗</Link></header><main className="verify-main"><div className="verify-progress" aria-label="Verify journey">{flow.map((item, index) => <div key={item} className={index === stage ? "current" : index < stage ? "done" : "future"}><span>{String(index + 1).padStart(2, "0")}</span>{item}</div>)}</div>{children}</main><footer className="verify-footer"><span>AI verifies. You decide. PayPal moves the money.</span><span>PayPal Sandbox · no live payment</span></footer></div>;
}

export function VerifyStart({ evidence }: { evidence?: React.ReactNode }) {
  const router = useRouter();
  const [item, setItem] = useState("Used monitor");
  const [amount, setAmount] = useState("100.00");
  const [conditions, setConditions] = useState("Monitor powers on\nScreen has no obvious visible cracks\nModel and brand label is visible");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setWorking(true); setError("");
    try {
      const lines = conditions.split("\n").map(value => value.trim()).filter(Boolean);
      const created = await api<{ id: string }>({ action: "create_session", item, amount, conditions: lines });
      router.push(`/verify/${created.id}?role=buyer`);
    } catch (caught) { setError(errorText(caught)); setWorking(false); }
  }
  const previewAmount = Number(amount);
  return <Frame stage={0}>
    <div className="verify-hero"><div className="verify-eyebrow">PAYPAL VERIFY / INDEPENDENT HACKATHON CONCEPT</div><h1>Pay only when the deal <em>matches reality.</em></h1><p className="verify-hero-manifesto">AI verifies. You decide. PayPal moves the money.</p><p>Set the terms for a physical item. The seller records live proof. You review Gemini’s findings before PayPal captures the authorized amount.</p><a className="verify-evidence-jump" href="#verified-results">See the verified Sandbox result <ArrowRight size={15}/></a></div>
    <div className="verify-grid"><form className="verify-card verify-condition-card" onSubmit={submit}>
      <div className="verify-card-head"><span>YOUR TERMS</span><strong>PHYSICAL GOODS · PAYPAL SANDBOX</strong></div>
      <h2>What must the seller prove?</h2><p>Name the item, set a Sandbox amount, then write one checkable condition per line.</p>
      <div className="verify-fields"><label>Item<input aria-label="Physical item" value={item} onChange={event => setItem(event.target.value)} maxLength={80} required/></label><label>Price in USD<input aria-label="Sandbox price in USD" type="number" min="1" max="5000" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} required/></label></div>
      <textarea aria-label="Buyer conditions" value={conditions} onChange={event => setConditions(event.target.value)} rows={5} maxLength={900}/>
      <div className="verify-note"><LockKeyhole size={16}/> A fresh one-time code beside the item is always required. Initial PayPal approval only authorizes; it does not capture.</div>
      {error && <p className="verify-error" role="alert">{error}</p>}
      <button className="verify-primary" disabled={working}>{working ? "Creating a live Gemini plan…" : "Create verified purchase"}<ArrowRight size={17}/></button>
    </form><aside className="verify-aside"><span className="verify-aside-index">THE DEAL, DEFINED</span><div className="verify-deal-mark">{Number.isFinite(previewAmount) && previewAmount >= 0 ? formatUsd(Math.round(previewAmount * 100)) : "$—"}</div><div className="verify-line"/><p>One authorization. One recorded proof. One buyer decision.</p><div className="verify-aside-bottom"><ShieldCheck size={19}/><span>Gemini assesses the video. Only your final approval can permit capture.</span></div></aside></div>
    {evidence}
  </Frame>;
}

export function VerifyExperience({ id, role }: { id: string; role: Role }) {
  const [session, setSession] = useState<Session | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const sellerPath = `/verify/${id}?role=seller`;
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [clock, setClock] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(0);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/verify?id=${encodeURIComponent(id)}&role=${role}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Session not found.");
    setSession(data.session); setConfig(data.config);
  }, [id, role]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh().catch(caught => setError(errorText(caught)));
      setClock(Date.now());
    }, 0);
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, [refresh, id, role]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach(track => track.stop()); if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setWorking(true); setError("");
    try { const result = await api<{ session: Session }>({ action, id, role, ...extra }); setSession(result.session); await refresh(); }
    catch (caught) { setError(errorText(caught)); await refresh().catch(() => undefined); }
    finally { setWorking(false); }
  }

  async function beginRecording() {
    setWorking(true); setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("This browser cannot record a camera video. Use a supported browser on localhost or HTTPS.");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const mimeType = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("This browser does not support WebM or MP4 MediaRecorder output.");
      const result = await api<{ session: Session }>({ action: "start_proof", id, role });
      setSession(result.session);
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_400_000 });
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => { const blob = new Blob(chunks, { type: mimeType.split(";")[0] }); setRecorded(blob); setPreviewUrl(URL.createObjectURL(blob)); stream.getTracks().forEach(track => track.stop()); setRecording(false); };
      recorder.onerror = () => { setError("Camera recording failed. No proof was submitted."); stream.getTracks().forEach(track => track.stop()); setRecording(false); };
      recorderRef.current = recorder; recorder.start(1000); startedRef.current = Date.now(); setRecording(true);
      window.setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, 55_000);
    } catch (caught) { setError(caught instanceof DOMException && caught.name === "NotFoundError" ? "No camera or microphone was found. Connect both, or use a phone browser through a secure session link." : errorText(caught)); streamRef.current?.getTracks().forEach(track => track.stop()); }
    finally { setWorking(false); }
  }

  function stopRecording() {
    if (Date.now() - startedRef.current < 8000) { setError("Record at least eight seconds of proof."); return; }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function submitRecording() {
    if (!recorded) return;
    setWorking(true); setError("");
    try {
      const extension = recorded.type === "video/mp4" ? "mp4" : "webm";
      const blob = await upload(`verify-proof/${id}/proof.${extension}`, recorded, { access: "private", handleUploadUrl: "/api/verify/proof/upload", clientPayload: id, contentType: recorded.type });
      const response = await fetch("/api/verify/proof", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, pathname: blob.pathname }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Proof could not be analyzed.");
      setSession(data.session); setRecorded(null); await refresh();
    } catch (caught) { setError(errorText(caught)); await refresh().catch(() => undefined); }
    finally { setWorking(false); }
  }

  async function copySellerLink() {
    if (!sellerPath) return;
    try { await navigator.clipboard.writeText(`${window.location.origin}${sellerPath}`); setCopied(true); } catch { setError("Could not copy automatically. Open the seller link below."); }
  }

  const status = session?.status;
  const stage = !status || status === "CREATED" ? 1 : !session?.proofSubmittedAt ? 2 : status === "PROOF_SUBMITTED" ? 3 : status === "AWAITING_BUYER_DECISION" || status === "CONDITION_FAILED" || status === "AI_FAILED" ? 4 : status === "COMPLETED" ? 5 : 4;
  const expired = Boolean(session?.challengeExpiresAt && clock > 0 && Date.parse(session.challengeExpiresAt) <= clock);
  const canApprove = status === "AWAITING_BUYER_DECISION" && session?.report?.overallStatus === "PASS" && !expired && config?.captureEnabled;

  return <Frame stage={stage}><div className="verify-session-head"><div><div className="verify-eyebrow">{role.toUpperCase()} / {id}</div><h1>{role === "seller" ? "Show the deal as it is." : "Your terms. Your decision."}</h1><p>{role === "seller" ? "Record one short, uncut camera walkthrough. The buyer will review Gemini’s findings and your proof." : "PayPal reserves the amount first. You decide whether the video evidence meets your conditions before any capture."}</p></div><span className="verify-status">{status ? statusText[status] : error ? "Session unavailable" : "Loading session…"}</span></div>{error && <p className="verify-error" role="alert">{error}</p>}{!session ? <div className="verify-card">{error ? <>{role === "buyer" && error === "Verification session not found in this browser." && <p>Buyer sessions open only in the browser where they were created. Start a fresh Verify case in this browser to continue.</p>}<Link href="/verify" className="verify-text-link">Return to Verify ↗</Link></> : "Loading verification session…"}</div> : <div className="verify-grid"><div className="verify-stack"><section className="verify-card"><div className="verify-card-head"><span>THE AGREEMENT</span><strong>{formatUsd(session.amountCents)} USD · PayPal Sandbox</strong></div><h2>{session.item}</h2><div className="verify-conditions">{session.conditions.map((condition, index) => <div key={condition.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{condition.text}</strong><p>{condition.instruction}</p></div></div>)}</div><div className="verify-note"><ShieldCheck size={16}/> Verification plan: live Gemini · {session.planModel}</div></section>

      {role === "buyer" && status === "CREATED" && <section className="verify-card"><div className="verify-card-head"><span>02 / RESERVE THE AMOUNT</span><strong>AUTHORIZE · NO CAPTURE</strong></div><h2>Authorize with PayPal Sandbox</h2><p>Your first PayPal approval reserves {formatUsd(session.amountCents)}. It does not complete the charge. The seller then records proof.</p>{!config?.ready ? <p className="verify-error">PayPal Sandbox setup is missing: {config?.missing.join(", ")}</p> : <div className="verify-paypal"><PayPalProvider clientId={config.clientId} environment="sandbox" components={["paypal-payments"]} pageType="checkout"><VerifyPayPalStatus/><PayPalOneTimePaymentButton createOrder={async () => { setError(""); const result = await api<{ orderId: string }>({ action: "create_order", id, role }); return { orderId: result.orderId }; }} onApprove={async ({ orderId }) => { setWorking(true); setError(""); try { await run("authorize_order", { orderId }); } finally { setWorking(false); } }} onCancel={() => setError("Sandbox approval was cancelled. No payment was captured.")} onError={() => setError("PayPal checkout did not complete. Check your Sandbox buyer account.")} disabled={working}/></PayPalProvider></div>}</section>}

      {role === "buyer" && session.authorizationId && <section className="verify-card"><div className="verify-card-head"><span>PAYPAL SANDBOX</span><strong>{session.authorizationStatus}</strong></div><h2>Authorization saved</h2><div className="verify-id"><span>Order ID</span><code>{session.orderId}</code></div><div className="verify-id"><span>Authorization ID</span><code>{session.authorizationId}</code></div><p>No Capture ID exists until the buyer approves passing proof and final capture is enabled.</p>{sellerPath && status === "AWAITING_VERIFICATION" && <div className="verify-share"><p>Next: open the seller session in this browser or another browser on this computer.</p><button className="verify-secondary" onClick={copySellerLink}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? "Seller link copied" : "Copy seller link"}</button><Link href={sellerPath} className="verify-text-link">Open seller session here ↗</Link></div>}</section>}

      {role === "seller" && status === "AWAITING_VERIFICATION" && <section className="verify-card"><div className="verify-card-head"><span>03 / LIVE PROOF</span><strong>UNDER 60 SECONDS</strong></div><h2>Record the evidence</h2><p>When recording starts, copy the ENTIRE one-time code onto paper and hold it beside the {session.item.toLowerCase()}. The video must show VERIFY- and every digit together. Digits alone will not pass. Then follow every numbered instruction in one continuous recording.</p>{session.challengeCode && !expired ? <div className="verify-challenge"><small>SHOW THE ENTIRE CODE IN YOUR VIDEO</small><strong>{session.challengeCode}</strong><span>Show this full code beside the item: <b>{session.challengeCode}</b>. Include <b>VERIFY-</b> and all four digits; digits alone will not pass.</span></div> : <div className="verify-note"><LockKeyhole size={16}/> A fresh code appears only after camera permission succeeds and recording begins.</div>}<video ref={videoRef} muted playsInline hidden={!recording} className="verify-camera" aria-label="Live camera preview"/>{!recording && !recorded && <button className="verify-primary" onClick={beginRecording} disabled={working}><Video size={17}/> {expired ? "Restart with a new challenge" : session.challengeCode ? "Start camera recording" : "Start verification session"}</button>}{recording && <button className="verify-primary" onClick={stopRecording}>Stop recording <span>· max 55 sec</span></button>}{recorded && <><p className="verify-note">Recording ready · {(recorded.size / 1_000_000).toFixed(1)} MB</p><video className="verify-camera" src={previewUrl} controls playsInline/><button className="verify-primary" onClick={submitRecording} disabled={working || recorded.size > 14_000_000}>{working ? "Gemini is analysing real video…" : "Submit live proof for Gemini analysis"}<ArrowRight size={17}/></button></>}</section>}

      {role === "buyer" && session.hasProof && <section className="verify-card"><div className="verify-card-head"><span>THE EVIDENCE</span><strong>BROWSER-RECORDED VIDEO</strong></div><h2>Review the seller’s proof</h2><video className="verify-proof" src={`/api/verify/proof?id=${encodeURIComponent(id)}`} controls playsInline preload="metadata"/><p>This recording and AI assessment are evidence for your decision, not an authenticity guarantee.</p></section>}

      {role === "buyer" && session.report && <section className="verify-card"><div className="verify-card-head"><span>04 / GEMINI VIDEO ASSESSMENT</span><strong>{session.report.model}</strong></div><h2>What the recording shows</h2><div className="verify-result"><span>One-time challenge</span><b className={`verify-badge ${session.report.challengeCodeStatus.toLowerCase()}`}>{session.report.challengeCodeStatus}</b><p>{session.report.challengeEvidence}</p></div>{session.report.conditions.map(row => <div className="verify-result" key={row.id}><span>{row.condition}</span><b className={`verify-badge ${row.status.toLowerCase()}`}>{row.status}</b><p>{row.evidence}{row.observedValue ? ` · Observed: ${row.observedValue}` : ""} · {Math.round(row.confidence * 100)}% confidence</p></div>)}<div className="verify-note"><CircleAlert size={16}/> Gemini can only assess what the video clearly shows or sounds like. It cannot certify authenticity.</div></section>}

      {role === "buyer" && session.authorizationId && !session.voidedAt && !session.captureId && <section className="verify-card"><div className="verify-card-head"><span>05 / YOUR DECISION</span><strong>HUMAN APPROVAL REQUIRED</strong></div><h2>You decide whether to pay.</h2><p>{status === "AWAITING_BUYER_DECISION" && !expired ? "All checks passed in the AI report. Review the recording yourself before deciding." : "Approval is unavailable until every required check passes and the session remains valid."}</p>{!config?.captureEnabled && <div className="verify-note"><LockKeyhole size={16}/> Final PayPal capture is intentionally disabled for this first milestone.</div>}<div className="verify-decision"><button className="verify-primary" disabled={!canApprove || working} onClick={() => run("approve_and_capture")}>Approve &amp; Pay <ArrowRight size={17}/></button><button className="verify-secondary" disabled={working} onClick={() => run("reject")}>Reject and void authorization</button></div></section>}

      {role === "buyer" && status === "COMPLETED" && <section className="verify-card"><div className="verify-card-head"><span>PAYPAL CAPTURE</span><strong>COMPLETED</strong></div><h2>Purchase complete</h2><div className="verify-id"><span>Capture ID</span><code>{session.captureId}</code></div></section>}
      </div><aside className="verify-aside verify-session-aside"><span className="verify-aside-index">LIVE DEAL RECORD</span><div className="verify-deal-mark">{formatUsd(session.amountCents)}</div><div className="verify-line"/><p>{status ? statusText[status] : "Loading"}</p><div className="verify-aside-bottom"><LockKeyhole size={18}/><span>Funds remain uncaptured until every check passes and the buyer explicitly approves.</span></div>{role === "seller" && <p className="verify-mini">Share this seller view only with the person recording proof.</p>}</aside></div>}</Frame>;
}
