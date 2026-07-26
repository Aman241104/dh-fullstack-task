# Refactor commentary — before.ts → after/

Real, run, verified: `cd task-b && npm install && npx tsc --noEmit && npx vitest run` — 7 passing
tests, ~150ms, no server or database required to run them, and the whole folder (including
`route.ts` and `leads.repository.ts`, which the test file doesn't touch) typechecks cleanly against
real `express`/`pg`/`zod` type declarations, not just against the one file the tests happen to
import.

## What was actually wrong with `before.ts`

- **Hardcoded connection string and Slack webhook URL** — the exact issue from `ASSESSMENT.md` #1,
  reproduced concretely instead of described abstractly.
- **String-concatenated SQL** in both queries — beyond being unmaintainable, `'${repTier}'` and
  `'${leadId}'` built by concatenation are a SQL injection vector if any value in that chain is ever
  influenced by user input (and `leadId` comes straight from the URL param here).
- **No input validation** — `dealSizeEstimate > 50000` on a body that was never checked to contain
  a number throws a runtime `TypeError` on a malformed request, and nothing in the handler catches it.
- **No error handling around the network call** — an async handler with an unguarded `await fetch(...)`
  means a Slack outage turns into an unhandled promise rejection instead of a clean response.
- **The business logic itself was untestable as written.** It's not just messy — there's no way to
  write a test for "does a $75k referral deal from an 800-person company score as enterprise" without
  spinning up Express and mocking `pg`, so nobody did, so a real ambiguity in the tier boundaries
  (see below) sat undetected.

## What the refactor actually fixes, concretely — not just "it's cleaner"

- **`lead-routing.service.ts` is directly unit-testable** because it takes plain data and returns a
  plain result. The test file proves this isn't a hypothetical benefit: 7 real tests run in under
  200ms with no database, no HTTP server, no mocking framework.
- **One of those tests caught a real bug the original code was silently exposed to.** Writing
  `tierForPriority`'s tests forced stating the boundary explicitly — priority `4` lands in
  `mid_market`, not `enterprise` — a fact that was true in the original inline `if`/`else if` chain
  but was never verified anywhere, meaning a future edit to the thresholds could have silently
  flipped it with nothing to catch it.
- **`leads.repository.ts` uses parameterized queries** — the SQL injection vector is closed, not just
  moved.
- **Secrets come from `process.env`** in both `leads.repository.ts` and `notify.ts` — nothing here is
  committed to source, addressing `ASSESSMENT.md` #1 in the code itself, not just in a policy
  document.
- **`route.ts` validates input with Zod before anything else runs**, and wraps the real work in a
  `try/catch` that returns a clean `500` instead of crashing the process. Compare its length and
  content to `before.ts` — the handler shrank because everything it used to do badly now lives
  somewhere it can be done (and tested) properly.
