// AFTER — the business logic extracted from the route handler, as a pure
// function: plain arguments in, plain result out, no Express request object,
// no database, no network. This is what makes it unit-testable without
// standing up a server or a database — see lead-routing.service.test.ts.

export type RepTier = "enterprise" | "mid_market" | "smb";

export interface LeadInput {
  dealSizeEstimate: number;
  employeeCount: number;
  source: string;
}

export function scoreLead(lead: LeadInput): number {
  let priority = 0;

  if (lead.dealSizeEstimate > 50000) priority += 3;
  else if (lead.dealSizeEstimate > 10000) priority += 2;
  else priority += 1;

  if (lead.employeeCount > 500) priority += 2;
  if (lead.source === "referral") priority += 2;
  if (lead.source === "cold_outbound") priority -= 1;

  return Math.max(priority, 0);
}

export function tierForPriority(priority: number): RepTier {
  if (priority >= 5) return "enterprise";
  if (priority >= 3) return "mid_market";
  return "smb";
}
