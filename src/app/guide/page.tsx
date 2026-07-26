import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "./guide.css";

const displayFont = IBM_Plex_Sans({
  variable: "--g-font-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Source_Serif_4({
  variable: "--g-font-serif",
  subsets: ["latin"],
});

const monoFont = IBM_Plex_Mono({
  variable: "--g-font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Submission Guide — Docket / Digital Heroes",
  description:
    "Reviewer guide to the Digital Heroes Full Stack submission — Task A (Docket) and Task B (inheriting a bad codebase).",
};

const taskBFiles = [
  {
    label: "README — start here",
    path: "task-b/README.md",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/README.md",
  },
  {
    label: "Assessment — ranked by risk",
    path: "task-b/ASSESSMENT.md",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/ASSESSMENT.md",
  },
  {
    label: "Migration plan — phased",
    path: "task-b/MIGRATION_PLAN.md",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/MIGRATION_PLAN.md",
  },
  {
    label: "Standards + adoption",
    path: "task-b/STANDARDS.md",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/STANDARDS.md",
  },
  {
    label: "Refactor — before",
    path: "task-b/refactor/before.ts",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/refactor/before.ts",
  },
  {
    label: "Refactor — route handler",
    path: "task-b/refactor/after/route.ts",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/refactor/after/route.ts",
  },
  {
    label: "Refactor — business logic (testable)",
    path: "task-b/refactor/after/lead-routing.service.ts",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/refactor/after/lead-routing.service.ts",
  },
  {
    label: "Refactor — data access (parameterized)",
    path: "task-b/refactor/after/leads.repository.ts",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/refactor/after/leads.repository.ts",
  },
  {
    label: "Tests — 7 passing",
    path: "task-b/refactor/after/lead-routing.service.test.ts",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/refactor/after/lead-routing.service.test.ts",
  },
  {
    label: "Commentary — what changed, why",
    path: "task-b/refactor/NOTES.md",
    href: "https://github.com/Aman241104/dh-fullstack-task/blob/main/task-b/refactor/NOTES.md",
  },
];

export default function GuidePage() {
  return (
    <div
      className={`guide-page ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}
    >
      <div className="guide-shell">
        <header className="guide-fade">
          <p className="guide-eyebrow guide-mono">Digital Heroes · Full Stack Development · 04/16</p>
          <h1 className="guide-h1 guide-display" style={{ marginTop: "0.6rem" }}>
            Submission guide — Task A and Task B
          </h1>
          <p className="guide-sub" style={{ marginTop: "0.5rem" }}>
            Aman Patel · github.com/Aman241104 · patelaman0241@gmail.com
          </p>

          <div className="guide-status-strip guide-mono">
            <span className="guide-pill">
              <span className="guide-dot" /> build passing
            </span>
            <span className="guide-pill">
              <span className="guide-dot" /> tests 28/28
            </span>
            <span className="guide-pill">
              <span className="guide-dot" /> lint 0 errors
            </span>
            <span className="guide-pill">
              <span className="guide-dot" /> CI green
            </span>
          </div>

          <div className="guide-actions">
            <a
              className="guide-btn guide-btn--primary guide-display"
              href="https://dh-fullstack-task.vercel.app/login"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the live app ↗
            </a>
            <a
              className="guide-btn guide-btn--ghost guide-display"
              href="https://github.com/Aman241104/dh-fullstack-task"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source ↗
            </a>
            <a className="guide-btn guide-btn--ghost guide-display" href="#task-b">
              Jump to Task B
            </a>
          </div>

          <nav className="guide-nav guide-mono">
            <a href="#task-a">Task A</a>
            <a href="#task-b">Task B</a>
            <a href="#scorecard">Scorecard</a>
            <a href="#access">Access &amp; links</a>
          </nav>
        </header>

        <section id="task-a" className="guide-section guide-fade">
          <div className="guide-section-head">
            <h2 className="guide-h2 guide-display">Task A — Docket</h2>
            <span className="guide-tag guide-mono">Live app</span>
          </div>

          <div className="guide-body">
            <p>
              A lead management app a small sales team could actually use, not just a form with a
              table behind it: a public capture form, an authenticated pipeline board with grid
              and Kanban views, two roles with permissions enforced twice (Postgres Row Level
              Security as the real boundary, an explicit route-level check on top so a blocked
              action returns a clean 403 instead of a raw database error), and a JSON API backing
              every action.
            </p>
            <p>
              Built out further over a second pass: hybrid AI lead scoring (a cheap deterministic
              score first, an NVIDIA model call only for genuinely ambiguous cases), an AI Copilot
              scoped to exactly four tools inside a lead&rsquo;s detail view — every action it
              takes runs through the same permission checks a manual API call would — Supabase
              Realtime, native two-factor auth, an admin-configurable IP allowlist, Sentry error
              tracking, and email notifications.
            </p>
          </div>

          <div className="guide-facts guide-mono">
            <div className="guide-fact">
              <div className="guide-fact-label">Stack</div>
              <div className="guide-fact-value">Next.js · Supabase</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Roles</div>
              <div className="guide-fact-value">Admin · Member</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Tests</div>
              <div className="guide-fact-value">28 passing, real DB</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">AI provider</div>
              <div className="guide-fact-value">NVIDIA NIM</div>
            </div>
          </div>

          <div className="guide-callout">
            <p>
              Verified directly, not just asserted: a member session hitting the admin-only
              assign endpoint returns <code>403 Forbidden</code> even called straight against the
              API, bypassing the UI entirely.
            </p>
          </div>

          <p className="guide-sub">
            Full architecture notes and the API contract:{" "}
            <a
              href="https://github.com/Aman241104/dh-fullstack-task/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--g-accent)" }}
            >
              README.md ↗
            </a>
          </p>
        </section>

        <section id="task-b" className="guide-section guide-fade">
          <div className="guide-section-head">
            <h2 className="guide-h2 guide-display">Task B — Inheriting a bad codebase</h2>
            <span className="guide-tag guide-mono">No live app — read below</span>
          </div>

          <div className="guide-body">
            <p>
              The brief&rsquo;s scenario: joining as the second engineer on an existing
              lead-routing SaaS with no tests, business logic buried in route handlers, a
              frontend that talks to the database directly, and hardcoded secrets in source.
            </p>
          </div>

          <ul className="guide-list">
            <li>
              <strong>Assessment</strong>{" "}
              ranks the four problems by actual business risk — a stated reason per item, not a
              generic checklist.
            </li>
            <li>
              <strong>Migration plan</strong>{" "}
              is phased (week 1 / month 1 / quarter 1), strangler-pattern throughout — no
              big-bang rewrite, the app stays shippable at every point.
            </li>
            <li>
              <strong>Refactor</strong>{" "}
              is a concrete before/after: a bad handler rewritten into a route handler, a
              pure/testable service, a parameterized repository, and a notification module — with
              a boundary-value bug the new tests catch that the original code was silently
              exposed to.
            </li>
            <li>
              <strong>Standards</strong>{" "}
              covers not just what the rules are, but how to get a team that&rsquo;s shipped a
              certain way for years to actually adopt them.
            </li>
          </ul>

          <div className="guide-callout">
            <p>
              This folder is a separate, independently installable mini-project — deliberately
              not dependent on the main app&rsquo;s dependencies:
            </p>
          </div>

          <div className="guide-codeblock guide-mono">
            cd task-b
            <br />
            npm install
            <br />
            npx tsc --noEmit
            <br />
            npx vitest run
          </div>

          <div className="guide-table-scroll">
            <table className="guide-filetable">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Path</th>
                </tr>
              </thead>
              <tbody>
                {taskBFiles.map((f) => (
                  <tr key={f.path}>
                    <td>{f.label}</td>
                    <td className="guide-mono guide-path-cell">
                      <a href={f.href} target="_blank" rel="noopener noreferrer">
                        {f.path} ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="scorecard" className="guide-section guide-fade">
          <div className="guide-section-head">
            <h2 className="guide-h2 guide-display">Self-audit scorecard</h2>
            <span className="guide-tag guide-mono">8.7 / 10 combined</span>
          </div>

          <p className="guide-sub">
            Ran a self-review of both submissions after the build was &ldquo;done&rdquo; —
            treated it as an outside audit rather than taking the finished state at face value.
            Findings that came out of it were fixed, not just noted.
          </p>

          <table className="guide-scorecard">
            <thead>
              <tr>
                <th>Task A — Docket</th>
                <th style={{ textAlign: "right" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Functionality vs. brief</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  9.5
                </td>
              </tr>
              <tr>
                <td>Security</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  9.0
                </td>
              </tr>
              <tr>
                <td>Code quality</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  8.0
                </td>
              </tr>
              <tr>
                <td>Testing</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  8.5
                </td>
              </tr>
              <tr>
                <td>CI / process</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  9.0
                </td>
              </tr>
              <tr>
                <td>Documentation</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  9.0
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Overall</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right", fontWeight: 600 }}>
                  8.5
                </td>
              </tr>
            </tbody>
          </table>

          <table className="guide-scorecard">
            <thead>
              <tr>
                <th>Task B — Inheriting Ledgerline</th>
                <th style={{ textAlign: "right" }}>Score</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Assessment quality</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  9.5
                </td>
              </tr>
              <tr>
                <td>Migration plan</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  9.0
                </td>
              </tr>
              <tr>
                <td>Refactor code</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  9.0
                </td>
              </tr>
              <tr>
                <td>Verifiability</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right" }}>
                  9.0
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Overall</td>
                <td className="guide-score guide-mono" style={{ textAlign: "right", fontWeight: 600 }}>
                  9.0
                </td>
              </tr>
            </tbody>
          </table>

          <div className="guide-callout guide-callout--warn">
            <p>
              Honest gap surfaced by the audit: five ESLint errors (a common fetch-on-mount
              pattern the newer <code>react-hooks/set-state-in-effect</code> rule flags) had
              slipped through because lint wasn&rsquo;t part of CI. Fixed, and lint is now a CI
              step — not glossed over as a one-off cleanup.
            </p>
          </div>
        </section>

        <section id="access" className="guide-section guide-fade">
          <div className="guide-section-head">
            <h2 className="guide-h2 guide-display">Access &amp; links</h2>
          </div>

          <div className="guide-facts guide-mono">
            <div className="guide-fact">
              <div className="guide-fact-label">Admin login</div>
              <div className="guide-fact-value">admin1234@gmail.com</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Admin password</div>
              <div className="guide-fact-value">admin1234</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Member login</div>
              <div className="guide-fact-value">user1234@gmail.com</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Member password</div>
              <div className="guide-fact-value">user1234</div>
            </div>
          </div>

          <ul className="guide-list">
            <li>
              Live app —{" "}
              <a
                href="https://dh-fullstack-task.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--g-accent)" }}
              >
                dh-fullstack-task.vercel.app ↗
              </a>
            </li>
            <li>
              Repository —{" "}
              <a
                href="https://github.com/Aman241104/dh-fullstack-task"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--g-accent)" }}
              >
                github.com/Aman241104/dh-fullstack-task ↗
              </a>
            </li>
            <li>
              CI runs —{" "}
              <a
                href="https://github.com/Aman241104/dh-fullstack-task/actions"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--g-accent)" }}
              >
                GitHub Actions ↗
              </a>
            </li>
          </ul>
        </section>

        <section className="guide-section guide-fade">
          <div className="guide-section-head">
            <h2 className="guide-h2 guide-display">Other role submissions</h2>
          </div>
          <p className="guide-sub">Aman also submitted for two other Digital Heroes roles.</p>
          <div className="guide-other-grid">
            <Link href="/guide/ecommerce" className="guide-other-card">
              <div className="guide-other-card-tag guide-mono">Ecommerce · Shopify</div>
              <div className="guide-other-card-title guide-display">Amble Supply Co.</div>
              <div className="guide-other-card-sub">
                8 custom sections, metafield-driven swatches, plus a live-store audit
              </div>
            </Link>
            <Link href="/guide/webdev" className="guide-other-card">
              <div className="guide-other-card-tag guide-mono">Web Development</div>
              <div className="guide-other-card-title guide-display">Marketing site + mobile audit</div>
              <div className="guide-other-card-sub">
                4-page Next.js site, plus a real mobile-performance diagnosis
              </div>
            </Link>
          </div>
        </section>

        <footer className="guide-footer guide-mono">
          <span>Digital Heroes · Full Stack Development · 04/16</span>
          <a href="mailto:patelaman0241@gmail.com">patelaman0241@gmail.com</a>
        </footer>
      </div>
    </div>
  );
}
