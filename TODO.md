# PayPal Verify roadmap

## PayPal Verify pivot — separate path

- [x] Preserve a local pre-pivot archive outside the PACT project; leave the old routes and data untouched
- [x] Add `/verify` buyer/seller journey, live Gemini condition-plan request, and separate buyer/seller views
- [x] Implement PayPal Sandbox `AUTHORIZE` order creation and server authorization path that saves an Authorization ID without calling capture on the initial buyer approval
- [x] Add browser `getUserMedia`/`MediaRecorder` proof capture, one-time challenge generated on session start, private recording storage, and live Gemini short-video analysis with strict server validation
- [x] Add buyer report and server capture gates; default final capture to disabled and require an exact session ID for the controlled test
- [x] Generalize new Verify sessions, PayPal authorization amount, Gemini instructions, and UI for buyer-named physical goods; default the positive-path demo to a $100 used monitor
- [x] Add validation and capture-gate unit tests, and run lint/build
- [x] Independently verify a new $1,000 Sandbox order reaches `AUTHORIZE` and the Authorization ID persists without a Capture ID (`VERIFY-063C9B06`)
- [x] Record one real phone-browser camera video over a temporary HTTPS seller link; save the private evidence file and verify its hash
- [x] Confirm live Gemini `gemini-3.5-flash-lite` video analysis persists a structured result: challenge and all motorcycle conditions `NEEDS_REVIEW`, overall `NEEDS_REVIEW`; capture remains blocked
- [x] Preserve the failed motorcycle proof unchanged as negative-path evidence; do not convert it into a passing result
- [x] Create a separate $100 used-monitor Sandbox authorization (`VERIFY-10C6D17D`); PayPal independently confirms Authorization ID `77V12948LS137011Y`, status `CREATED`, and zero captures
- [x] Record a real used-monitor phone video for `VERIFY-10C6D17D`: Gemini returned `PASS` for all three item conditions, `NEEDS_REVIEW` for the intentionally incomplete challenge, and `NEEDS_REVIEW` overall; PayPal still reports zero captures
- [x] Make the complete `VERIFY-####` challenge prominent on the phone and explicitly reject digits-only proof
- [x] Run a separate full-code positive-path proof (`VERIFY-8239A04B`): all three monitor conditions and challenge `PASS`, overall `PASS`; PayPal Authorization ID `9W4998613F9762716` remains `CREATED` with zero captures, and final capture stays disabled
- [ ] Test buyer rejection and PayPal authorization void on an uncaptured Verify order
- [x] After explicit approval, verify buyer decision, one `$100.00 USD` PayPal capture (`7PR816937N8386635`), saved Capture ID, completed session, and duplicate protection against a second capture
- [x] Return the demo server to its default capture-disabled mode after the controlled test
- [x] Implement server-only Supabase Postgres case storage with row locks and a private Vercel Blob proof path; replace role-token URLs with a normal seller link and a browser-bound buyer decision cookie
- [x] Create the actual Supabase project/private Blob store, run the SQL migration, and verify local Postgres case creation/read, private Blob upload/playback protection, and normal `/verify` case creation against real services (October 28, 2026)
- [x] Verify a fresh hosted HTTPS $10 Sandbox authorization, Supabase case, private Blob phone video, live Gemini report, and blocked capture for `VERIFY-274FD63DFB864792B4AF7677` (October 29, 2026). The intentionally hidden model label failed; overall `NEEDS_REVIEW` is correct safety-gate evidence.
- [ ] Verify a fresh hosted HTTPS all-PASS report, explicit buyer approval, and controlled PayPal capture. The earlier $100 completed capture remains local/historical evidence; no hosted capture has been claimed.
- [ ] Configure public endpoint rate limits before sharing widely; buyer cookie is a demo control, not real-world identity verification
- [x] Make `/` open PayPal Verify, retain `/legacy` and the old transaction/case routes, and mark the old demo as legacy/internal
- [x] Present the three controlled Sandbox outcomes with the completed $100 capture as the lead evidence; keep a token-free archived summary visible in fresh checkouts

## Completed

- [x] Clickable Next.js/TypeScript frontend and approved PACT visual design
- [x] Simplified judge-facing dashboard and case screens while preserving the Resolution Path and existing PayPal flow
- [x] Sample transactions, report, simulated analysis, seller/buyer review, resolution, and case history
- [x] PayPal JavaScript SDK v6 checkout screen and server-side Sandbox order/capture code
- [x] Local server persistence for PayPal orders, captured transactions, cases, and refund responses
- [x] Server-side full and partial refund code with stored `PayPal-Request-Id` and duplicate handling
- [x] Clear sample versus PayPal Sandbox indicators, development evidence panel, environment validation
- [x] Judge-facing dashboard counts and recent cases include only Sandbox cases; full lists keep Preview samples explicitly labeled with simulated recommendations
- [x] Identify verified `CASE-CF5BD10F` with PayPal Sandbox, live Gemini recommendation, and `gemini-3.5-flash-lite` in the demo screens
- [x] Show Order ID, Capture ID, and Refund ID on the resolved Sandbox result screen
- [x] Refund amount boundary tests, lint, and production build

## PayPal Sandbox verification

- [x] Add Sandbox app Client ID and Secret to `.env.local` (never commit them)
- [x] Use a Sandbox personal buyer account to approve a $100 payment
- [x] Confirm server capture and persisted transaction list/detail record against PayPal Sandbox
- [x] Create a Sandbox test case and accept a $35.00 partial refund after seller and buyer review
- [x] Independently verify PayPal Refund ID, `COMPLETED` status, $35.00 USD amount, and link to the original Capture ID
- [x] Re-run the resolved case acceptance path; confirm the same Refund ID and unchanged $35.00 total refunded without issuing another refund
- [x] Complete a new $100.00 Sandbox payment and capture, synthetic damaged-product case, live Gemini recommendation, seller offer, buyer acceptance, and $30.00 partial refund; independently verify PayPal and PACT IDs/statuses (October 26, 2026)
- [x] Repeat acceptance of the new resolved case; confirm the original Refund ID is returned and no second refund call is made
- [ ] Exercise over-refund rejection beyond the existing amount-boundary unit tests without issuing an unnecessary refund
- [ ] Test a full refund in a separate controlled Sandbox run if needed
- [ ] Test PayPal error, cancellation, and pending refund behavior with real Sandbox responses
- [x] Keep the legacy payment/refund API localhost-only; use the durable Verify path for hosted judge access

## AI integration

- [x] Replace the old AI runtime with server-only Google Gemini structured output through `@google/genai`
- [x] Validate model output, bound recommended refunds, require seller/buyer approval, and handle failure as manual review
- [x] Add automated tests for valid, oversized, malformed, failed, and injected recommendations
- [x] Configure `GEMINI_API_KEY` locally and verify `gemini-3.5-flash-lite` with a real structured recommendation for a synthetic case
- [x] Keep historical provider labels and the sample cases explicitly marked as simulated
- [x] Distinguish live Gemini recommendations for new Sandbox cases from simulated recommendations for bundled Preview cases in README and UI
- [x] Run a new controlled Sandbox case through a live `gemini-3.5-flash-lite` recommendation and both human review screens
- [ ] Evaluate varied complaints, weak evidence, uncertainty, and prompt injection with live model responses

## Dispute escalation still needed

- [ ] Research current PayPal Disputes API permissions and supported handoff paths
- [ ] Implement only a supported escalation flow; otherwise explain the limitation

## Hackathon demo and submission

- [x] Verify the local PayPal Verify Sandbox authorization, live Gemini video assessment, buyer approval, capture, blocked cases, and duplicate protection
- [x] Recheck the [official rules](https://paypalaihackathon.devpost.com/rules) for functional judge access, a public repository/license, and a public YouTube demo under three minutes
- [x] Draft the public judge tour and two-to-three-minute shot list in `DEMO.md`; keep the Devpost form draft in local-only `devpost-submission.md`; label archived local success separately from the hosted blocked case
- [x] Add an MIT license, safe `.env.example`, and a dedicated project-root Git ignore for secrets, local data, build outputs, and Vercel linkage
- [ ] Record a concise end-to-end demo on the intended device, showing the six steps, the successful case, and both blocked outcomes without exposing credentials or private proof
- [ ] Publish a public YouTube video under three minutes and add its link to the Devpost submission
- [ ] Publish the dedicated `pact-verify` Git repository publicly with its visible MIT license, then verify a fresh clone builds
- [x] Choose public, account-free `/verify` on Vercel with Postgres/Blob storage and Sandbox-only financial actions
- [x] Verify the public preview's hosted $10 authorization, private Blob proof, live Gemini blocked outcome, and zero PayPal captures
- [ ] Verify hosted buyer approval and capture only if a further controlled test is authorized; it remains unverified and is not needed to preserve this blocked-path evidence
- [ ] Add the public GitHub and YouTube URLs to Devpost, answer personal form questions, and submit before the deadline
