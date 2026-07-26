import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Sans, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "../guide.css";

const displayFont = IBM_Plex_Sans({
  variable: "--g-font-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
const bodyFont = Source_Serif_4({ variable: "--g-font-serif", subsets: ["latin"] });
const monoFont = IBM_Plex_Mono({
  variable: "--g-font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Web Development Submission Guide — Digital Heroes",
  description: "Reviewer guide to the Digital Heroes Web Development submission — Task A and Task B.",
};

const pages = [
  { name: "Home", perf: "76 – 95", lcp: "1.3s – 3.6s" },
  { name: "Product", perf: "79 – 80", lcp: "3.8s" },
  { name: "Pricing", perf: "68 – 80", lcp: "3.6s – 3.8s" },
  { name: "Contact", perf: "92 (stable)", lcp: "1.4s" },
];

export default function WebDevGuidePage() {
  return (
    <div className={`guide-page ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <div className="guide-shell">
        <header className="guide-fade">
          <p className="guide-eyebrow guide-mono">Digital Heroes · Web Development</p>
          <h1 className="guide-h1 guide-display" style={{ marginTop: "0.6rem" }}>
            Submission guide — Web Development
          </h1>
          <p className="guide-sub" style={{ marginTop: "0.5rem" }}>
            Aman Patel · github.com/Aman241104 · patelaman0241@gmail.com
          </p>

          <div className="guide-actions">
            <a
              className="guide-btn guide-btn--primary guide-display"
              href="https://dh-web-task.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the live site ↗
            </a>
            <a
              className="guide-btn guide-btn--ghost guide-display"
              href="https://github.com/Aman241104/dh-web-task"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source ↗
            </a>
            <Link className="guide-btn guide-btn--ghost guide-display" href="/guide">
              ← Back to Full Stack guide
            </Link>
          </div>

          <nav className="guide-nav guide-mono">
            <a href="#task-a">Task A</a>
            <a href="#task-b">Task B</a>
          </nav>
        </header>

        <section id="task-a" className="guide-section guide-fade">
          <div className="guide-section-head">
            <h2 className="guide-h2 guide-display">Task A — Marketing site (Next.js)</h2>
            <span className="guide-tag guide-mono">Live site</span>
          </div>

          <div className="guide-body">
            <p>
              4 pages — Home, Product, Pricing, Contact — audited with Lighthouse (mobile,
              simulated throttling) against the real production deployment, each run 3× in the
              same session after an external review found single-run numbers didn&rsquo;t
              reproduce. Reported as a range, not a cherry-picked best run.
            </p>
          </div>

          <div className="guide-table-scroll">
            <table className="guide-filetable">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Performance (3 runs)</th>
                  <th>LCP range</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td className="guide-mono">{p.perf}</td>
                    <td className="guide-mono">{p.lcp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="guide-sub">
            Accessibility, Best Practices, and SEO are stable at 100 on every page, every run.
          </p>

          <div className="guide-callout guide-callout--warn">
            <p>
              <strong>Disclosed, not hidden:</strong>{" "}
              Performance swings up to 27 points across back-to-back runs of the same page
              (Pricing: 68–80), and TBT occasionally exceeds budget — worst on Pricing, whose hero
              carries the heaviest hydration load on the site (billing toggle, cost estimator, and
              a WebGL orb, all interactive, all above the fold). Root cause isn&rsquo;t fully
              isolated yet — flagged as a known limitation rather than papered over with a single
              favorable run.
            </p>
          </div>
        </section>

        <section id="task-b" className="guide-section guide-fade">
          <div className="guide-section-head">
            <h2 className="guide-h2 guide-display">Task B — Mobile performance audit</h2>
            <span className="guide-tag guide-mono">Family Owned Motel</span>
          </div>

          <div className="guide-body">
            <p>
              Audited familyownedmotel.com — a real, independent motel site, no affiliation. 5
              separate Lighthouse mobile runs to get a stable range rather than a single
              measurement, plus a manual diagnosis of what&rsquo;s actually driving the numbers.
            </p>
          </div>

          <div className="guide-facts guide-mono">
            <div className="guide-fact">
              <div className="guide-fact-label">Performance</div>
              <div className="guide-fact-value">37 – 49 / 100</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">LCP</div>
              <div className="guide-fact-value">14.0s – 20.2s</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Root cause</div>
              <div className="guide-fact-value">8+MB images</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Biggest single fix</div>
              <div className="guide-fact-value">94.4% smaller</div>
            </div>
          </div>

          <ul className="guide-list">
            <li>
              <strong>Re-encoding one background image</strong> (3.3MB → 186KB, WebP/JPEG,
              verified) — 32% of the entire page&rsquo;s weight in a single file, zero code
              change required.
            </li>
            <li>
              A duplicate media-library upload wasting 774KB for zero visual change, plus 6 more
              oversized photos totaling ~3.4MB — no ambiguity, all confirmed by direct inspection.
            </li>
            <li>
              <strong>CLS 0.201</strong>, traced to all 83 <code>&lt;img&gt;</code> tags missing
              width/height — a systemic, template-level fix, not a one-off.
            </li>
            <li>
              Explicitly called out what&rsquo;s{" "}
              <strong>not</strong>{" "}
              worth fixing: the WordPress platform and jQuery itself — TBT is noisy but nowhere
              close to the dominant cost next to a 14–20s LCP that&rsquo;s entirely image weight,
              not JavaScript.
            </li>
          </ul>

          <p className="guide-sub">
            Full deliverables (diagnosis report, prioritized fix list, client summary, before/after
            prototype, PDF report) — ask for the Drive folder or the local audit bundle.
          </p>
        </section>

        <footer className="guide-footer guide-mono">
          <span>Digital Heroes · Web Development</span>
          <a href="mailto:patelaman0241@gmail.com">patelaman0241@gmail.com</a>
        </footer>
      </div>
    </div>
  );
}
