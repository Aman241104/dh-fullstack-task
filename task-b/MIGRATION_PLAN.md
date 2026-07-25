# Phased migration plan — no big-bang rewrite

A full rewrite is the wrong answer here: Ledgerline serves real paying customers today, the team is
small, and a rewrite freezes feature work for months while betting the whole business on the new
version working correctly on day one. Everything below is the strangler pattern instead — the old
code keeps running, new code grows around it, and the two coexist safely for as long as it takes.

## Week 1 — stop the bleeding, zero customer-facing risk

- **Rotate every exposed credential** (DB connection string, third-party API keys) and move them to
  environment variables. This is the one item that's urgent regardless of everything else — see
  `ASSESSMENT.md` #1.
- **Add a secret-scanning pre-commit hook** (e.g. gitleaks) so this can't silently happen again.
- **Add a smoke test around the highest-traffic path** (lead creation, whatever earns the most
  revenue) — not comprehensive coverage, just a tripwire that fails loudly if the riskiest path
  breaks during any of the following work.
- **New code stops calling the database directly from the frontend.** Existing direct-access code is
  left alone this week — the rule only applies going forward, so nothing existing is touched or put
  at risk yet.

Nothing here changes any customer-visible behavior. This is entirely internal hardening.

## Month 1 — the service layer starts existing, for the highest-traffic endpoints first

- Introduce a `services/` and `repositories/` layer (thin route handler → service function →
  repository), starting with the 2-3 endpoints that see the most traffic or the most support
  tickets — highest payoff for the effort, and the ones worth having tests around soonest.
- Each endpoint migrated this way gets tests as part of the same PR — not a separate "add tests
  later" ticket, because "later" is how the codebase got to zero tests in the first place.
- Frontend calls for these specific endpoints get routed through the API instead of the direct DB
  connection, one endpoint at a time, each one verified against its new tests before the old direct
  path is removed.
- Old, untouched endpoints keep working exactly as they did in Week 1 — nothing is forced to migrate
  before its turn.

## Quarter 1 — the migration finishes, the old pattern stops being an option

- Remaining endpoints migrated to the service/repository pattern, same one-at-a-time process,
  prioritized by whichever the team is already touching for feature work (the boy scout rule) rather
  than a dedicated "pay down tech debt" sprint that competes with roadmap work for buy-in.
- Direct frontend-to-database access is fully removed — by this point every read path has an
  equivalent API route, so removing the old connection string from the frontend bundle is just
  deleting dead code, not a risky cutover.
- CI gate added: any PR touching a file in `services/` or `repositories/` requires a passing test for
  the changed code — not a repo-wide coverage mandate (unrealistic to retrofit onto old code that
  hasn't been touched yet), just a ratchet that only tightens on code someone is already in.
- Consistent error handling and structured logging applied across the now-complete service layer —
  the last piece that only makes sense once the layer itself exists everywhere.

## Why this order, explicitly

Each phase only depends on the phase before it, and at every point in this timeline the app is in a
shippable, working state — there's no phase where "this migration is half-done" is also "the app is
broken." That's the actual point of a phased plan: not just spreading the work out, but making sure
stopping partway through (a reprioritization, someone leaving, a different fire) never leaves the
codebase in a worse state than before the migration started.
