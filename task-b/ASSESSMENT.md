# Assessment — inheriting Ledgerline's lead-routing service

**The scenario:** you've just joined as the second engineer on Ledgerline, an existing lead-routing
SaaS. It serves real customers today and cannot go down. The codebase works — customers are paying,
leads are flowing — but:

- No tests anywhere in the codebase.
- Business logic (lead scoring, routing rules, discount calculation) lives inline inside Express
  route handlers, mixed with request parsing and response formatting.
- The React frontend calls the Postgres database directly from client-side code using a long-lived
  connection string, bypassing the API entirely for some read paths.
- Third-party API keys and the database connection string are hardcoded in committed source files,
  not environment variables.

This assessment ranks what to fix, in what order, and states the real risk of leaving each one in
place — not by how annoying it is to look at, but by what actually breaks a customer or the business
if it's left alone another quarter.

## Ranked by risk

### 1. Secrets committed to the repo — fix immediately, this week
**Risk if left:** this is the only item on this list that's an *active, ongoing* exposure, not a
latent one. Every engineer who has ever cloned the repo, every CI log that's ever printed an env
var, every fork — all of them potentially have a live database connection string and third-party
API keys right now. If the repo is public, or becomes public, or a laptop with a clone gets stolen,
that's a direct breach, not a hypothetical one. This is also the cheapest item on the list to fix:
rotate the exposed credentials, move them to environment variables, and add a secret-scanning
pre-commit hook so it can't happen again. There is no reason to sequence this behind anything else.

### 2. No tests — fix second, because it blocks safely fixing everything else
**Risk if left:** every other change on this list — extracting business logic, removing direct
frontend DB access, standardizing error handling — becomes materially riskier without tests, because
there's no way to know a refactor preserved behavior except manually re-clicking through the app and
hoping. This isn't itself a customer-facing risk today, but it's the reason every *other* fix on this
list is scarier than it needs to be. Fixing it doesn't mean writing a full suite up front — it means
writing tests for the specific paths about to be touched, as they're touched (see the migration plan
below), starting now so the backlog of untested code stops growing.

### 3. Frontend calling the database directly — high, but not this week
**Risk if left:** this is a real security and coupling problem — a database credential shipped to
every browser is one that a motivated user can extract from the network tab or the bundle, and it
means the "API" isn't actually the boundary between client and data, so every future access-control
rule has to be enforced twice, in two different places, or it silently doesn't apply to this path at
all. It's ranked below the first two because it's not an *active* leak the way #1 is (an attacker
still needs to find and use the credential), and fixing it properly (routing every read through the
API) is real, multi-week work that benefits from #2 already being underway so the migration itself
can be tested.

### 4. Business logic inside route handlers — real, but lowest urgency of the four
**Risk if left:** this is a maintainability and velocity problem, not a security or outage one. Logic
buried in a handler is hard to unit test in isolation, hard to reuse if a second entry point ever
needs the same calculation (a cron job, an admin tool, a webhook), and hard for a new engineer to
find. It's genuinely the least urgent of the four because nothing breaks today as a direct result of
it — it just makes every future change here slower and riskier than it needs to be. Worth fixing as
each handler is touched for another reason (the "boy scout rule"), not worth a dedicated sprint on
its own before the first three are underway.

## What ships in what order

1 → 2 → 3 and 4 interleaved, driven by whatever the team is already touching. See
`MIGRATION_PLAN.md` for the phased breakdown — none of this requires stopping feature work or a
big-bang rewrite.
