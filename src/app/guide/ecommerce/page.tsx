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
  title: "Ecommerce Submission Guide — Digital Heroes",
  description: "Reviewer guide to the Digital Heroes Ecommerce (Shopify) submission — Task A and Task B.",
};

const sections = [
  "custom-hero.liquid",
  "custom-value-props.liquid",
  "custom-story-split.liquid",
  "custom-testimonials.liquid",
  "custom-promise.liquid",
  "custom-category-nav.liquid",
  "custom-conditions-bar.liquid",
  "custom-cta-band.liquid",
];

export default function EcommerceGuidePage() {
  return (
    <div className={`guide-page ${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
      <div className="guide-shell">
        <header className="guide-fade">
          <p className="guide-eyebrow guide-mono">Digital Heroes · Ecommerce (Shopify) Development</p>
          <h1 className="guide-h1 guide-display" style={{ marginTop: "0.6rem" }}>
            Submission guide — Amble Supply Co.
          </h1>
          <p className="guide-sub" style={{ marginTop: "0.5rem" }}>
            Aman Patel · github.com/Aman241104 · patelaman0241@gmail.com
          </p>

          <div className="guide-actions">
            <a
              className="guide-btn guide-btn--primary guide-display"
              href="https://dh-task-aman-patel.myshopify.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the live store ↗
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
            <h2 className="guide-h2 guide-display">Task A — Amble Supply Co. theme</h2>
            <span className="guide-tag guide-mono">Live store</span>
          </div>

          <div className="guide-body">
            <p>
              Built on Shopify Dawn as the base theme, expanded into a full ski/snowboard-outfitter
              storefront: 8 custom sections (task asked for 3), a metafield-driven variant swatch
              feature, and a tested scroll-reveal system — merchant-editable through the theme
              editor, not hardcoded content.
            </p>
          </div>

          <div className="guide-facts guide-mono">
            <div className="guide-fact">
              <div className="guide-fact-label">Base theme</div>
              <div className="guide-fact-value">Shopify Dawn 15.5.0</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Custom sections</div>
              <div className="guide-fact-value">8 built</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Metafield type</div>
              <div className="guide-fact-value">JSON list</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Tests</div>
              <div className="guide-fact-value">18 total</div>
            </div>
          </div>

          <p className="guide-sub" style={{ marginBottom: "0.5rem" }}>Custom sections shipped:</p>
          <ul className="guide-list guide-mono" style={{ fontSize: "0.875rem" }}>
            {sections.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>

          <div className="guide-callout">
            <p>
              The swatch feature (<code>custom.swatch_colors</code>, a per-product JSON metafield)
              was deliberately chosen over a metaobject or flat fields — colors aren&rsquo;t shared
              across products (a snowboard and ski wax don&rsquo;t share a palette), and the list is
              variable-length per product. One field, merchant fills in label + hex, swatch clicks
              route to the matching variant when one exists — not just a cosmetic image swap.
            </p>
          </div>
        </section>

        <section id="task-b" className="guide-section guide-fade">
          <div className="guide-section-head">
            <h2 className="guide-h2 guide-display">Task B — Auditing a real live store</h2>
            <span className="guide-tag guide-mono">Little Mountain Ltd</span>
          </div>

          <div className="guide-body">
            <p>
              Audited littlemountainltd.com — a real, independent ski/snowboard retailer (Northeast
              Ohio, trading since 1983), no affiliation, picked via public search. Lighthouse
              mobile + a manual Playwright walkthrough (homepage, a real product page, add-to-cart)
              + view-source inspection.
            </p>
          </div>

          <div className="guide-facts guide-mono">
            <div className="guide-fact">
              <div className="guide-fact-label">Performance</div>
              <div className="guide-fact-value">90</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Accessibility</div>
              <div className="guide-fact-value">97</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">TTI</div>
              <div className="guide-fact-value">8.1s</div>
            </div>
            <div className="guide-fact">
              <div className="guide-fact-label">Homepage JS</div>
              <div className="guide-fact-value">60 files, 279KB</div>
            </div>
          </div>

          <ul className="guide-list">
            <li>
              <strong>A real, confirmed bug on every product page:</strong>{" "}
              a duplicate custom-element registration throws a console error and causes a second,
              malformed product-recommendations request to fail with HTTP 422 on every single
              product view.
            </li>
            <li>
              <strong>TTI (8.1s) vs. FCP (1.4s)</strong> — the page paints fast but stays
              non-interactive far longer after, the classic signature of JS still executing after
              paint.
            </li>
            <li>
              <strong>Zero product description and no sizing guide</strong>{" "}
              on a $300+, length-dependent product (139/143/147/151) — a real conversion gap at
              the exact moment someone decides whether to buy.
            </li>
            <li>
              Fix prototype verified on the real product image grid: <strong>208KB → 88KB, a 58%
              reduction</strong>, with one PNG-served photo alone accounting for over half the
              grid&rsquo;s weight.
            </li>
          </ul>
        </section>

        <footer className="guide-footer guide-mono">
          <span>Digital Heroes · Ecommerce Development</span>
          <a href="mailto:patelaman0241@gmail.com">patelaman0241@gmail.com</a>
        </footer>
      </div>
    </div>
  );
}
