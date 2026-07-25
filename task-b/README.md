# Task B — Inherit and improve a bad codebase

Digital Heroes Full Stack Development role (04/16). The brief's scenario is self-contained (not a
real external repo to audit) — a hypothetical handoff onto "Ledgerline," an existing lead-routing
SaaS with no tests, business logic in route handlers, direct frontend database access, and
committed secrets. Framed in the same domain as Task A (lead management) for narrative coherence,
not because it's the same codebase.

## Deliverables

- **[`ASSESSMENT.md`](./ASSESSMENT.md)** — the four issues, ranked by actual risk (not by how
  annoying each one is), with what breaks if each is left in place.
- **[`MIGRATION_PLAN.md`](./MIGRATION_PLAN.md)** — phased: week 1, month 1, quarter 1. No
  big-bang rewrite — the strangler pattern throughout, old code keeps running while new code grows
  around it.
- **[`refactor/`](./refactor)** — a concrete before/after. `before.ts` is a realistic bad handler
  (hardcoded secrets, string-concatenated SQL, inline business logic, no validation, no error
  handling) written for this exercise. `after/` splits it into a route handler, a pure/testable
  service, a parameterized repository, and an env-based notification module — plus a real test file
  (`lead-routing.service.test.ts`, 7 passing tests, verified: `npx vitest run task-b/refactor/after/lead-routing.service.test.ts`).
  Commentary in [`refactor/NOTES.md`](./refactor/NOTES.md), including a specific boundary-value bug
  the new tests catch that the original code was silently exposed to.
- **[`STANDARDS.md`](./STANDARDS.md)** — the standards themselves, plus how to actually get a team
  that's shipped this way for years to adopt them (the harder half of this deliverable, and the one
  most easily skipped).
