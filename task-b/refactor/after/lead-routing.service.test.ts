import { describe, it, expect } from "vitest";
import { scoreLead, tierForPriority } from "./lead-routing.service";

// Real unit tests against pure functions — no server, no database, no network.
// This is the concrete payoff of extracting the logic out of the route handler:
// these tests run in milliseconds and don't need Postgres or Slack to exist.

describe("scoreLead", () => {
  it("scores a large referral deal as high priority", () => {
    const score = scoreLead({ dealSizeEstimate: 75000, employeeCount: 800, source: "referral" });
    expect(score).toBe(3 + 2 + 2); // large deal + large company + referral
  });

  it("scores a small cold-outbound deal as low priority", () => {
    const score = scoreLead({ dealSizeEstimate: 2000, employeeCount: 10, source: "cold_outbound" });
    expect(score).toBe(1 - 1); // small deal, no size bonus, cold-outbound penalty
  });

  it("does not let priority go negative", () => {
    const score = scoreLead({ dealSizeEstimate: 500, employeeCount: 2, source: "cold_outbound" });
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe("tierForPriority", () => {
  it("maps a high score to enterprise", () => {
    expect(tierForPriority(5)).toBe("enterprise");
  });

  it("maps a mid score to mid_market", () => {
    expect(tierForPriority(3)).toBe("mid_market");
  });

  it("maps a low score to smb", () => {
    expect(tierForPriority(1)).toBe("smb");
  });

  // This test is the one that would have caught a real bug in the BEFORE code:
  // the original inline logic used the same >= boundaries for both "enterprise"
  // vs "mid_market" and "mid_market" vs "smb" without a test to confirm the
  // boundary values landed on the intended side. Writing this test first forces
  // stating the boundary explicitly instead of trusting it by inspection.
  it("treats exactly 4 as mid_market, not enterprise", () => {
    expect(tierForPriority(4)).toBe("mid_market");
  });
});
