# PayPal Verify

**Pay only when the deal matches reality.** AI verifies. You decide. PayPal moves the money.

This is an **independent hackathon concept**, not an official PayPal feature. The default route `/` opens `/verify`. The earlier PACT dispute/refund demo is preserved at `/legacy`, with its transaction and case routes still available.

**Public preview:** https://pact-verify-preview.vercel.app/verify · **Source:** https://github.com/SHauny1122/pact-verify · **Demo recording plan:** [DEMO.md](DEMO.md)

## Evidence at a glance

| Flow | Independently verified | Boundary |
| --- | --- | --- |
| Earlier PACT dispute/refund demo | $100 Sandbox capture, persisted case, live Gemini recommendation, seller and buyer review, and completed $30 partial refund; a separate $35 refund was also confirmed against PayPal | Legacy route; its file-backed records are local, not on the hosted preview |
| Verify positive path | Phone video, all checks `PASS`, buyer approval, one $100 Sandbox capture, saved Capture ID, and duplicate-capture rejection | Verified locally before the Supabase/Blob migration; the public page shows an archived summary |
| Hosted Verify safety gate | New $10 Sandbox `AUTHORIZE` order, saved Authorization ID, private phone video, live Gemini analysis, missing model label `FAIL`, overall `NEEDS_REVIEW`, zero captures | Verified on the public Vercel preview with Supabase and private Blob |
| Hosted Verify buyer approval → capture | **Not verified** | Capture remains disabled for this hosted case; do not present the local $100 capture as a hosted result |

### Fast judge tour

1. Open the [public Verify preview](https://pact-verify-preview.vercel.app/verify). No PACT login is required.
2. Scroll to **Proof changed what happened to the money**. The featured $100 card is the archived local successful capture; the **Hosted preview · $10** card shows the new blocked result. Both are labeled as saved test evidence.
3. To try a fresh case, set conditions on `/verify`. The live plan uses Gemini. PayPal authorization requires a **PayPal Sandbox personal buyer account**; the seller proof step requires a phone camera and microphone on HTTPS. The buyer must stay in the browser that created the case because its decision cookie is HttpOnly and browser-bound. Final capture is disabled by default.
4. Use `/legacy` only to inspect the older dispute/refund concept. Its hosted payment actions are intentionally unavailable.

## Judge demo

Open `/verify` on the deployed HTTPS site or `http://127.0.0.1:3000/verify` locally. No judge login is required. The page shows the six-step buyer/seller journey and four controlled Sandbox outcomes: the archived failed motorcycle proof, archived monitor proof with an incomplete challenge, archived completed $100 monitor capture, and the new hosted $10 missing-label block. The completed result is the main evidence panel. It displays the live Gemini model and findings, condition confidence, Authorization ID, Capture ID, human approval, and duplicate-capture result **from the historical local test**. A new database shows clearly labeled saved summaries without private videos or browser access values. These summaries are presentation evidence, not a new live PayPal or Gemini response.

The default server configuration leaves Verify capture disabled. A full capture requires a fresh Sandbox authorization and an exact session-scoped capture enable flag; do not reuse or alter the three recorded test sessions. The public judge path lets a visitor create a new case and inspect the evidence without an account. Only the browser that created a case receives its HttpOnly buyer-decision cookie. The seller view uses a normal session URL with `?role=seller` and no secret URL token. This is a **Sandbox hackathon demo**, not identity verification for real buyers or sellers. A public visitor with a case ID can attempt to submit seller proof, so only use synthetic terms and never live PayPal credentials.

## Implementation and verified tests

`/verify` is the primary, independently built hackathon product. The original PACT routes and verified historical payment/refund records remain available through the labeled legacy demo at `/legacy`.

The intended journey is: buyer names a physical item, sets a Sandbox USD amount and conditions → live Gemini plan → PayPal Sandbox `AUTHORIZE` order for the agreed amount → seller records a short camera/microphone video with a one-time challenge generated when recording begins → live Gemini video analysis → buyer reviews the video and findings → buyer decides whether to permit capture. The default form demonstrates a **$100.00 used monitor**, but new sessions can use other physical goods and Sandbox amounts from $1.00 to $5,000.00. The message is **“AI verifies. You decide. PayPal moves the money.”** A PayPal authorization reserves funds; it is not a capture. The [official delayed-capture guide](https://developer.paypal.com/checkout/delay-capture/) describes `AUTHORIZE`, later [capture](https://developer.paypal.com/api/payments/v2/authorizations-capture/), and [void](https://developer.paypal.com/api/payments/v2/authorizations-void/). The video path uses Gemini's [short-video inline input](https://ai.google.dev/gemini-api/docs/video-understanding).

The hosted Verify path stores one case per row in a private Supabase Postgres schema. Each JSONB record contains buyer conditions, plan, challenge, Gemini findings and confidence, buyer decision, PayPal IDs/statuses, blocked outcomes, and stable PayPal idempotency request IDs. Postgres row locks serialize state changes across Vercel instances, including capture attempts. Browser-recorded videos upload directly to a **private Vercel Blob store**; the server reads, validates, and hashes the video before passing bytes to Gemini. Vercel Functions cannot reliably receive the earlier 5–8 MB recordings through their request body limit. The buyer video endpoint streams only to the case creator's browser. PayPal and Gemini credentials, the database URL, and the Blob token remain server-side. Recordings are evidence signals, not proof against spoofing. A condition that Gemini cannot clearly verify must be `NEEDS_REVIEW`, which blocks capture.

Final capture defaults to disabled with `VERIFY_CAPTURE_ENABLED=false`. For the explicitly approved controlled Sandbox test below, the server was started temporarily with `VERIFY_CAPTURE_ENABLED=true` and `VERIFY_CAPTURE_SESSION_ID=VERIFY-8239A04B`; both values are required, so other sessions remain disabled. The server checks exact required conditions, challenge status, session expiry, buyer approval, authorization state and amount, and a stable capture request ID. A buyer rejection attempts to void the uncaptured authorization. The older PACT results below concern the legacy dispute/refund flow.

### Controlled Verify phone-video test — October 26, 2026

One new `$1,000.00 USD` Sandbox order (`5WW225240B978230A`) used `AUTHORIZE` intent. PayPal independently returned Authorization ID `65K99214PD224463C`, status `CREATED`, matching amount/currency, and **zero captures**. Verify persisted that Authorization ID in session `VERIFY-063C9B06`. A phone browser opened a temporary HTTPS seller link, used its camera/microphone, and submitted one 5,245,480-byte WebM recording. The private file's SHA-256 matches the saved evidence record. Live `gemini-3.5-flash-lite` video analysis completed and persisted a structured report. The handwritten digits `205 778` were read, but Gemini marked the full `VERIFY-205778` challenge `NEEDS_REVIEW` because no motorcycle appeared beside it. Engine start, odometer, and fairing conditions were each `NEEDS_REVIEW` because the video showed no motorcycle. Overall status is `NEEDS_REVIEW`; Verify stored `CONDITION_FAILED` and no Capture ID. A direct final-approval/capture request returned HTTP 409 with capture disabled. PayPal still reported the authorization `CREATED` and zero captures after the analysis. This verifies the phone recording and live video-analysis path, **not** a passing motorcycle proof or completed capture. The temporary HTTPS tunnel was stopped after the test; the local buyer page remains available.

A separate `$100.00 USD` used-monitor session (`VERIFY-10C6D17D`) created PayPal Sandbox `AUTHORIZE` order `5PC22171YN874184G`. PayPal independently returned Authorization ID `77V12948LS137011Y`, status `CREATED`, amount `$100.00 USD`, and zero captures. The phone uploaded a 5,102,140-byte browser recording; its file hash matches the saved evidence record. Live `gemini-3.5-flash-lite` analysis marked **all three monitor conditions `PASS`**: powered-on display, no obvious visible cracks, and a visible Dell label. The seller deliberately showed only the challenge digits `4740`, so Gemini marked the required full `VERIFY-4740` challenge `NEEDS_REVIEW`. Overall status is `NEEDS_REVIEW` and Verify stored `CONDITION_FAILED`. No buyer approval or PayPal capture occurred. This is a verified challenge-failure test with passing item checks, **not** a completed positive-path purchase.

A third, separate `$100.00 USD` used-monitor session (`VERIFY-8239A04B`) used Sandbox `AUTHORIZE` order `74T472843C333114K`. PayPal independently returned Authorization ID `9W4998613F9762716`, status `CREATED`, amount `$100.00 USD`, and **zero captures**. The phone submitted a 7,739,337-byte browser video whose SHA-256 matches the stored evidence record. Live `gemini-3.5-flash-lite` analysis returned `PASS` for the powered-on monitor (95% confidence), no obvious visible cracks (90%), visible Dell label (99%), and the complete `VERIFY-4898` challenge shown beside it. Overall status was `PASS`; Verify saved `AWAITING_BUYER_DECISION`. At that checkpoint, buyer approval had not been given and capture remained disabled, verifying the evidence assessment and report path before the separate final-capture test.

After an explicit final-capture test request, the buyer clicked **Approve & Pay** once for this same session. Verify saved the buyer approval, then the server captured the existing authorization with the stored idempotency request ID. PayPal independently reports one `COMPLETED` capture, ID `7PR816937N8386635`, for `$100.00 USD`, linked to authorization `9W4998613F9762716`; the authorization is now `CAPTURED`. Verify persisted that Capture ID and marked `VERIFY-8239A04B` `COMPLETED`. A repeated approval/capture request was rejected before another PayPal capture call, and a fresh PayPal lookup still showed exactly one capture. No refund was requested in the Verify path; PayPal's capture details show no refunded amount. The two earlier sessions remain unchanged.

To try Verify locally, configure the database and private Blob store below, keep the Sandbox and Gemini values in `.env.local`, restart `npm run dev`, and open `http://127.0.0.1:3000/verify`. Name the item, enter a USD amount and buyer conditions, create the session, approve the **Sandbox authorization** (not a charge), then use the seller link on an HTTPS phone browser to record proof. The system checks a fresh `VERIFY-####` code beside the item in addition to the buyer conditions. Write and show the **full code including `VERIFY-`** during the continuous recording. The client uploads browser-recorded WebM or MP4 under 14 MB, and the UI stops recording at 55 seconds. Preview and submit the video, then return to the same buyer browser for the report. Do not use a gallery upload as live proof. Camera access requires localhost or HTTPS. A phone cannot use a computer's `localhost`; use the deployed HTTPS site or a temporary HTTPS tunnel to your local server.

PACT is an AI-assisted pre-dispute resolution concept for PayPal transactions. The sample journey remains clickable. On October 26, 2026, a new **PayPal Sandbox $100.00 checkout, server capture, persisted transaction, live Gemini recommendation, seller-approved and buyer-accepted $30.00 partial refund, and resolved case** were verified end to end. Sample cases and the previously resolved Sandbox case retain their simulated recommendations. Formal dispute escalation is not implemented.

## Hosted Verify architecture and setup

- **Frontend/API:** Next.js on Vercel. `/` redirects to `/verify`; `/legacy` retains the old prototype. The legacy payment/refund API is localhost-only and its `.data/pact.json` store is **not** migrated to hosted storage. Treat it as an internal visual preview on Vercel.
- **Case storage:** Supabase Postgres via the server-only transaction-pooler `DATABASE_URL`. Run [db/001_verify.sql](db/001_verify.sql) once in the Supabase SQL Editor. It creates a private `pact_verify.sessions` table and uniqueness checks on saved PayPal Authorization/Capture IDs. Do not add the schema to the Supabase browser API or expose the Postgres password.
- **Video storage:** Use a **private** Vercel Blob store connected to this project. The current `@vercel/blob` client-upload handler needs the connected store's server-only `BLOB_READ_WRITE_TOKEN` to issue tightly scoped, 10-minute upload grants for an authorized Verify state, limited to WebM/MP4 under 14 MB. Vercel may also pull a short-lived OIDC token for local development; this does not replace the token required by this client-upload handler. The browser never receives the storage read/write token. The buyer playback route uses the private store server-side.
- **Public access:** Anyone can open `/verify` and create a Sandbox demo case. No account or login is needed. Case creation sets an HttpOnly, SameSite buyer cookie in that browser; server-side checks require it for authorization, rejection, approval, capture, and private video playback. The seller URL has no role token. This browser-bound decision is a demo control, not a claim of legal buyer identity. Keep financial actions in Sandbox, use synthetic items, and add Vercel rate limits for public Gemini/Blob endpoints before sharing the site widely.
- **Capture:** `VERIFY_CAPTURE_ENABLED=false` by default. To test one fresh case's full flow, select its exact ID with `VERIFY_CAPTURE_SESSION_ID` and redeploy with the flag true; then return the flag to false. Capture still requires a passing fresh report, recorded buyer approval, matching uncaptured USD authorization, and the stored idempotency ID. A process crash after PayPal accepts a capture but before Postgres commits needs manual reconciliation against PayPal before any retry.

### Environment variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `PAYPAL_ENVIRONMENT=sandbox` | Server | Sandbox only |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Browser-visible | PayPal JS SDK client ID (not a secret) |
| `PAYPAL_CLIENT_SECRET` | Server only | Matching Sandbox REST app secret |
| `GEMINI_API_KEY` | Server only | Live Gemini plan and video analysis |
| `DATABASE_URL` | Server only | Supabase Postgres **transaction pooler** URI, port 6543, SSL required |
| `BLOB_READ_WRITE_TOKEN` | Server only | Connected **private** Vercel Blob store token |
| `VERIFY_CAPTURE_ENABLED` | Server only | Default `false`; controlled Sandbox capture switch |
| `VERIFY_CAPTURE_SESSION_ID` | Server only | Exact ID allowed to capture when switch is true |

Create a Supabase project, copy its transaction-pooler connection string from **Connect**, and set its database password there. Put the full URI in `.env.local` locally and in Vercel Environment Variables later; never put it in source or a `NEXT_PUBLIC_` variable. The app does not need a Supabase anon key or service-role key. Create the private Blob store in Vercel Storage and link it to the Vercel project; for local full-flow testing, use `vercel link` and `vercel env pull` to put the development Blob credential in `.env.local`. Preserve existing local PayPal, Gemini, and database values when pulling. No database or Blob store is created automatically by `npm install`.

On October 28, 2026, the `PACT Verify` Supabase project and its private `pact_verify.sessions` schema were created. The local checkout was linked to Vercel project `pact-verify`, with private Blob store `pact-verify-proof` in `dub1`. Local tests confirmed case creation/read in Postgres, a private Blob upload, authorized playback through PACT's proof route, rejection of anonymous app playback and anonymous direct Blob access, and cleanup of the temporary case and blob. A normal `/verify` case creation/read also succeeded with one live Gemini **plan-generation** request. No PayPal action or Gemini video analysis was performed during those storage tests.

### Hosted preview blocked-outcome test — October 29, 2026

The public Vercel preview at `https://pact-verify-preview.vercel.app` created `VERIFY-274FD63DFB864792B4AF7677` in Supabase for a $10.00 used monitor. PayPal Sandbox independently confirmed order `103117238L1852403` used `AUTHORIZE` intent, Authorization ID `5NT256919V536314A` was `CREATED` for exactly $10.00 USD, and the order had **zero captures**. The seller recorded a 5,186,011-byte WebM video on a phone over HTTPS; its size matched the private Vercel Blob record. Anonymous direct access to the Blob URL returned `403`, and PACT's protected proof route returned `404` without the buyer cookie.

Live `gemini-3.5-flash-lite` analysis marked the full `VERIFY-4436` challenge, monitor power-on, and absence of obvious cracks `PASS`. The model/brand-label condition was `FAIL` because the label was intentionally hidden. Overall status was `NEEDS_REVIEW`; Verify persisted `CONDITION_FAILED`, buyer approval remained unset, capture remained disabled, and a final PayPal lookup still showed the $10 authorization `CREATED` with zero captures. This is **verified hosted blocked-path evidence**, not a successful hosted capture. The previously completed $100 capture shown on the landing page is archived local-flow evidence.

### Deploy your own copy to Vercel

1. Fork or clone this repository. Keep `.env.local`, `.data/`, `.vercel/`, and private proof videos out of Git.
2. In Supabase, create the project and run `db/001_verify.sql`; obtain the transaction-pooler `DATABASE_URL`.
3. In Vercel, import the repository as a Next.js project and create a **private** Blob store for it.
4. Set every variable above for the intended Vercel environment. Keep `PAYPAL_ENVIRONMENT=sandbox` and `VERIFY_CAPTURE_ENABLED=false` initially. Use Node.js 22 or later.
5. Deploy, then test a new case on HTTPS with a Sandbox buyer and phone proof. The current public preview has verified the blocked outcome only. A separate, all-PASS hosted case and explicit buyer approval would be required to verify hosted capture; do not infer that from the archived local $100 result.

The old `.data/verify.json` and `.data/verify-proof/` are local historical artifacts and are **not** imported by this migration. The three public evidence cards fall back to the archived, token-free summary. A newly created hosted case uses live PayPal Sandbox and Gemini; the archived summary does not query those APIs again.

## Run locally

1. Install Node.js 22 or later and npm.
2. Run `npm ci` in this directory.
3. Copy `.env.example` to `.env.local`; fill in the PayPal Sandbox, Gemini, Supabase `DATABASE_URL`, and private Blob token values above. Run `db/001_verify.sql` in Supabase first.
4. Run `npm run dev` and open `http://localhost:3000` or `http://127.0.0.1:3000`.
5. Run `npm run lint`, `npm run test`, and `npm run build` for verification.

The original sample journey works without PayPal credentials. The new checkout screen shows a clear setup message until credentials are supplied.

## PayPal Sandbox setup

1. Sign in or create an account at the [PayPal Developer Dashboard](https://developer.paypal.com/).
2. Under **Sandbox → Accounts**, use or create a **Business** account for the merchant and a separate **Personal** account for the buyer. PayPal normally creates one of each automatically. Set or view the buyer account password in the account details. See [Sandbox accounts](https://developer.paypal.com/sandbox-testing/accounts).
3. Under **Apps & Credentials → Sandbox**, create or select a REST app associated with the Sandbox business merchant. Copy the **Client ID** and **Secret** for that Sandbox app.
4. Put the values in `.env.local` as shown below. Do not use live credentials. Never commit `.env.local`, buyer passwords, or the local `.data/` directory.

```dotenv
PAYPAL_ENVIRONMENT=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_app_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_app_secret
```

`NEXT_PUBLIC_PAYPAL_CLIENT_ID` is intentionally browser-visible for the PayPal JavaScript SDK v6. `PAYPAL_CLIENT_SECRET` is read only by the server. The app refuses payment actions unless the environment is exactly `sandbox` and both credentials are present. The checkout uses PayPal's [current Next.js Checkout guide](https://developer.paypal.com/guides/nextjs-checkout), [JavaScript SDK v6](https://developer.paypal.com/sdk/js/set-up/), and server SDK. Refunds use the official [Payments v2 capture refund operation](https://developer.paypal.com/api/payments/v2/captures-refund). A stable `PayPal-Request-Id` is stored for each capture and refund attempt, following PayPal's [idempotency guidance](https://developer.paypal.com/api/rest/requests/).

## Test payment and refund

1. From the dashboard, select **Start PayPal Sandbox demo** (or open **Transactions → Create Sandbox transaction**).
2. Click the PayPal button and sign in with the **Sandbox personal buyer** email and password. Approve the $100.00 USD Studio Desk Lamp payment.
3. PACT captures the order on the server and opens its transaction detail. Confirm the completed capture and, in development, the **Developer / PayPal API evidence** area showing the Order ID, Capture ID, and status.
4. Return to **Transactions**. Choose the captured payment marked **PayPal Sandbox**, not a **Preview** sample. Open it and select **Report a problem**.
5. Enter an issue. For a new Sandbox case, **Assess** requests a server-side Gemini recommendation only when the current PayPal capture passes the read-only check and `GEMINI_API_KEY` is configured. Without a successful request, the case moves to **Needs review** and the seller must make a manual offer. In **Seller review**, choose a full or partial refund; a partial refund must be greater than $0 and below the original captured amount. PayPal applies its own refundability check when the existing refund route runs.
6. In **Buyer review**, choose **Accept & refund in Sandbox**. The server calls PayPal to refund the saved capture. If PayPal returns `PENDING`, use **Check refund status**; PACT only marks the case resolved when PayPal reports `COMPLETED`.
7. Confirm **Resolved by Pact**, original amount, actual refunded amount, PayPal Sandbox refund status, Order ID, Capture ID, and Refund ID. Verify the refund independently through PayPal Sandbox.

The sample transactions and cases continue to run from browser `localStorage`. PayPal Sandbox orders, captures, cases, and refund identifiers are stored server-side in `.data/pact.json` and persist across local app restarts. This small file store is for **one local development process only**; it is not a hosted multiuser database. The demo has no buyer or merchant authentication, so do not expose it publicly or use live PayPal credentials. The payment API rejects non-local hosts and cross-origin browser requests, but this is not a substitute for authentication.

For a judge walkthrough, start at `/verify`. The older dashboard's **Start PayPal Sandbox demo** action belongs to the localhost-only legacy dispute/refund prototype. Its local store includes verified `CASE-CF5BD10F`, labeled **PayPal Sandbox · Live recommendation · Gemini · gemini-3.5-flash-lite** on that machine; a fresh installation must create its own Sandbox case. Bundled sample transactions and cases remain available in the full lists, marked **Preview** and **Simulated recommendation**; they never call Gemini or PayPal.

### Verified Sandbox run — October 19, 2026

One Personal Sandbox buyer approved the $100.00 USD checkout. PACT captured Order ID `3SJ11104YY041884L` as Capture ID `39R69602P7122540N`, persisted the transaction, and created case `CASE-8AFB19DA`. A seller-approved $35.00 partial refund was accepted in the buyer review screen. An independent PayPal Sandbox **Get Refund** lookup returned Refund ID `8CA636581X810982M`, status `COMPLETED`, amount `$35.00 USD`, and an `up` link to the same Capture ID. A separate **Get Captured Payment** lookup returned `PARTIALLY_REFUNDED` for the $100.00 capture, and PayPal's total refunded amount remained `$35.00` after a repeat acceptance request. PACT kept the same Refund ID and resolved case; its local store still contained one order and one captured transaction. No second payment or additional refund was observed in this run.

### Verified combined Sandbox and Gemini run — October 26, 2026

A Sandbox personal buyer approved a **new** $100.00 USD Studio Desk Lamp purchase. PayPal Order ID `4RL42564YU988810N` and Capture ID `5R9674968P0403255` independently returned `COMPLETED`; PACT saved transaction `TXN-5R9674968P0403255`. A synthetic damaged-product report created `CASE-CF5BD10F`. The server performed a read-only PayPal capture check, then a live `gemini-3.5-flash-lite` request. PACT saved the provider, model, timestamp, and a **$30.00 partial refund recommendation at 90% confidence** with this reason: “A partial refund is appropriate as the defect reduces the value and stability of the item, but the buyer can still use it.” No refund existed after the AI assessment.

The seller submitted the $30.00 offer; PACT recorded the seller approval and moved the case to buyer review. The buyer clicked **Accept & refund in Sandbox** once. PayPal's independent **Get Refund** response returned Refund ID `51575530B34072816`, `COMPLETED`, `$30.00 USD`, with an `up` link to Capture ID `5R9674968P0403255`. **Get Captured Payment** returned `PARTIALLY_REFUNDED`. PACT stored the same Refund ID and actual amount, and marked the case `resolved`. A repeat acceptance request returned the original resolved case and Refund ID; the resolved-case branch makes no second PayPal refund call. One other order created during checkout (`0TV89241FS1226606`) stayed `CREATED` with no capture. This is a local Sandbox demo with guided seller and buyer roles, not an authenticated production workflow.

## What is real and what is simulated

| Feature | Status |
| --- | --- |
| PayPal SDK v6 Sandbox checkout and server-side order creation | Verified with $100.00 USD Sandbox payments on October 19 and 26, 2026 |
| Server-side capture and saved PayPal transaction | Verified: PACT stored the completed capture, and a separate PayPal Sandbox capture lookup matched its amount, currency, Order ID, and Capture ID |
| Payments v2 partial refund of a capture | Verified for $35.00 and $30.00 USD, each linked to its original Capture ID; full refund remains untested |
| Stored refund ID, status, amount, and duplicate protection | Verified: repeat acceptance of the new resolved case returned the same stored refund; the resolved-case branch made no second PayPal call |
| Original sample transactions and case history samples | Preview; recommendations are simulated and labeled as such |
| Dashboard headline case metrics | Count only server-stored PayPal Sandbox cases; exclude preview samples |
| Gemini issue assessment and structured recommendation | **Live Gemini `gemini-3.5-flash-lite` request verified end to end** for the new Sandbox case; provider/model and recommendation persisted and displayed before human approvals |
| Original sample and previously resolved `CASE-8AFB19DA` recommendations | Simulated; clearly labeled per case. The older case's PayPal payment and refund were real Sandbox actions |
| Replacement and no-refund agreements | Simulated outcome, no PayPal API call |
| Formal PayPal dispute escalation | Not implemented |

The legacy seller and buyer review screens are guided demo roles, not authenticated user accounts. They remain localhost-only. A real-money service beyond this Sandbox hackathon demo would need identity, transaction ownership checks, and operational handling for pending or failed refunds.

## Gemini setup and safety

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey), following the [official Gemini setup guide](https://ai.google.dev/gemini-api/docs/get-started).
2. Add this server-only value to `.env.local` in the PACT project root and restart `npm run dev`:

```dotenv
GEMINI_API_KEY=your_api_key
```

Never use a `NEXT_PUBLIC_` prefix for the key, commit `.env.local`, or paste the key into a chat. The app reads only `GEMINI_API_KEY` for AI authentication and uses Google's official [`@google/genai` SDK](https://ai.google.dev/gemini-api/docs/libraries) with [JSON Schema structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). The selected model is `gemini-3.5-flash-lite`: Google's [pricing page](https://ai.google.dev/gemini-api/docs/pricing) lists free-tier input and output, and this key returned a usable structured recommendation from it. A `gemini-3.8-flash` generation attempt returned a temporary 503 high-demand response, so it is not the default for this demo.

For each new captured Sandbox case, PACT first performs a read-only PayPal capture lookup. It requires a matching completed capture, amount, and USD currency before asking AI for a recommendation. PayPal's capture lookup does not expose a reliable remaining refundable total for a partially refunded capture, so PACT sends that case to manual review. The model receives only the item, amount, currency, capture status, remaining refundable amount, and buyer report. Buyer text is treated as untrusted data. The server validates the structured output, rejects malformed or excessive refund amounts, and stores the recommendation with its provider, model, timestamp, issue type, assessment, reason, confidence, and risk flags. It does not send PayPal credentials to Gemini. The AI has no PayPal tools and cannot capture or refund; a seller offer and buyer acceptance remain required before the existing refund route can execute. Provider failure, refusal, timeout, invalid capture lookup, or invalid output moves the case to manual review without fabricating an AI answer. One case normally makes one provider request; restarting during a request also moves that case to manual review rather than automatically making another request.

The Gemini adapter first returned a valid advisory result for a **synthetic, non-PayPal** case on October 26, 2026: damaged lamp shade, partial refund recommendation of **$30.00 USD**, confidence **95%**. The separate combined Sandbox run above exercised the provider through a saved PayPal Sandbox case and both human review screens; that live case returned **90%** confidence. The already resolved `CASE-8AFB19DA` is retained as historical evidence and is not reassessed automatically.

## Hackathon status

The [official PayPal AI Hackathon rules](https://paypalaihackathon.devpost.com/rules) require a working project that meaningfully uses **both** PayPal Sandbox and an AI tool, with PayPal central to the project. PayPal Verify's authorization → real Gemini video assessment → buyer approval → $100 Sandbox capture journey was verified locally **before** the storage migration, including blocked evidence and duplicate-capture tests. The hosted Postgres/Blob path now has a verified blocked-outcome test; hosted buyer approval and capture remain unverified. The older PACT partial-refund demo is secondary. Submission still needs a public source repository with an open-source license, functional judge access, a project/tool description, and a public YouTube demo under three minutes. Do not publish `.env.local`, browser cookies, or private proof videos. See [TODO.md](TODO.md).
