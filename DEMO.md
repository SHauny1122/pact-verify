# Judge demo plan

**Product:** PayPal Verify, an independent hackathon concept. **Promise:** Pay only when the deal matches reality. **Mechanism:** AI verifies. You decide. PayPal moves the money.

## What is safe to claim

- **Archived local success:** a used-monitor video passed all checks, the buyer approved, and PayPal Sandbox captured one $100 authorization. A second capture was blocked. This happened before the Supabase/Blob migration; the public page shows a saved summary.
- **Hosted preview safety gate:** a separate $10 authorization and phone video used Supabase, private Vercel Blob, and live `gemini-3.5-flash-lite`. The full challenge, power-on, and screen checks passed. The deliberately hidden model label failed, so the overall result was `NEEDS_REVIEW`; PayPal still showed zero captures.
- **Legacy PACT refund:** a separate $100 Sandbox payment and $30 partial refund completed after live Gemini advice and seller/buyer review. This is the older localhost-only dispute/refund path.
- **Do not claim:** the hosted preview completed buyer approval and capture. It has not. Do not show the archived $100 capture as if it belongs to the hosted $10 case.

## Two-to-three-minute video script and shot list

| Time | Screen | Narration | Evidence to keep visible |
| --- | --- | --- | --- |
| 0:00–0:20 | Public `/verify` landing and six-step strip | “A buyer can agree to pay for a physical item, but only after seeing that the seller's proof matches the deal.” | Tagline and six stages |
| 0:20–0:45 | Set-conditions form | “The buyer names the item, amount, and checkable conditions. PayPal first authorizes the amount; it is not captured yet.” | Default monitor conditions; `AUTHORIZE · NO CAPTURE` wording |
| 0:45–1:15 | Featured $100 evidence card | “In our earlier controlled local test, Gemini passed the live monitor video and complete challenge. The buyer approved, and PayPal captured one $100 authorization.” | **Archived local positive path** label, model, Authorization ID, Capture ID, duplicate protection |
| 1:15–1:55 | Hosted $10 blocked card, then buyer report for `VERIFY-274FD63DFB864792B4AF7677` in the browser that created it | “On the hosted Vercel/Supabase/Blob path, we deliberately hid the model label. Gemini passed the other checks but failed the missing label. The buyer cannot approve payment.” | **Hosted preview** label, condition `FAIL`, overall `NEEDS_REVIEW`, disabled approval, no Capture ID |
| 1:55–2:15 | README evidence table or brief architecture diagram | “Private video storage and server-side validation keep AI advisory. Only a buyer decision can permit capture, and failed proof blocks it.” | Supabase, private Blob, Gemini, PayPal Sandbox; no secrets |
| 2:15–2:30 | Return to product hero | “PACT Verify makes the gap between promise and payment visible before money moves.” | Tagline and public demo URL |

If the video needs to be shorter, omit the architecture shot. If showing the legacy partial refund, label it **legacy local** and keep it to a brief optional cut after the main Verify story.

## Recording instructions

1. Use the desktop browser for the public landing page and archived cards. Use the **same Chrome profile that created the hosted $10 case** for its buyer report; another browser will lack the buyer cookie.
2. Hide browser bookmarks, account menus, DevTools, `.env.local`, Supabase credentials, PayPal buyer email/password, and private proof-video URLs. Do not show the private video itself without reviewing it first.
3. Record at 1080p with a legible browser zoom. Keep each ID on screen long enough to read. Put small on-screen labels **Archived local success** and **Hosted blocked test** if cuts could imply they are one case.
4. Speak the authorization/capture distinction clearly. Do not click PayPal, buyer approval, reject, or refund during this recording; use the already verified saved evidence.
5. Export a video under three minutes, upload it publicly to YouTube, then paste that URL into Devpost. Use original narration/music or no music.

## Suggested screenshots

1. `/verify` hero with six-stage journey.
2. Featured archived $100 capture with Gemini findings and PayPal IDs.
3. Hosted $10 blocked evidence card showing two item passes, one fail, challenge pass, and zero captures.
4. Hosted $10 buyer report showing `NEEDS_REVIEW` and disabled **Approve & Pay**.
5. Optional `/legacy` label and resolved $30 partial-refund evidence from the local prototype, clearly marked legacy.
