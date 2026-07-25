# Engineering standards — and getting a resistant team to actually adopt them

## The standards themselves

1. **Thin route handlers.** A handler validates input, calls one service function, and formats the
   response. No business logic, no direct database queries, inline in a handler.
2. **Service layer for anything that isn't pure request/response plumbing.** Business logic lives in
   a service function that takes plain arguments and returns a plain result — no framework request
   object in sight, which is what makes it unit-testable without spinning up a server.
3. **Repository layer for data access.** All database queries for a given resource live in one place,
   not scattered across every handler that happens to need that data.
4. **No secrets in source.** Everything comes from environment variables, enforced by a
   secret-scanning pre-commit hook, not just a policy on a wiki page nobody reads.
5. **Tests are part of the change, not a follow-up ticket.** A PR that touches `services/` or
   `repositories/` includes a test for what it touched. This is a CI gate on *changed* files, not a
   whole-repo coverage percentage — a coverage mandate on a codebase that started at zero tests
   either fails immediately (blocking everything) or gets quietly disabled (which is worse than not
   having it), so it only applies going forward, on code someone is already touching.

## Getting a team that's shipped this way for years to actually adopt it

Standards written down and never enforced are worse than no standards — they create an appearance of
rigor while nobody follows them, which erodes trust in whatever official process exists. The adoption
part matters as much as the standards themselves:

- **Don't mandate a rewrite of existing code to match the new standard.** Nothing is more likely to
  get a proposal quietly ignored than "also go fix everything you already shipped." The standards
  apply to new and touched code only — see `MIGRATION_PLAN.md`.
- **Pair on the first two or three refactors instead of handing over a document.** A standard that
  arrives as a Slack link to a markdown file competes with everything else in someone's inbox and
  loses. Sitting with someone while they do the first real migration, on real code they already
  understand, teaches the pattern in a way a document can't, and it signals this is a real practice,
  not a memo.
- **Sell it via the pain the team already feels, not abstract best-practice language.** This team
  already knows tests would have caught some bug that shipped last month, already knows the fear of
  touching a file with no tests around it, already knows a secret leaked somewhere at some point.
  Framing the standards as "the fix for the thing that already went wrong" gets buy-in that "clean
  code principles" never will.
- **Make the first success visible.** The first endpoint migrated to the new pattern, with tests,
  that catches a real bug before it ships — that's worth telling the team about directly, not
  burying in a changelog. Nothing sells a standard like a concrete story of it working.
- **Expect and allow pushback on the CI gate specifically.** A hard blocking gate on day one, before
  anyone has seen the pattern work, reads as bureaucracy imposed from outside. Introducing it as a
  warning first, then a gate once a few real migrations have gone well, gets less resistance than
  making it mandatory from the start.

The underlying idea across all of this: adoption fails when a standard feels imposed on people's
existing work. It succeeds when it's introduced as a tool that solves a problem the team already
recognizes, applied first by example, and only made mandatory once it's already proven itself on
real code the team can see.
