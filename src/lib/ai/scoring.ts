import { nvidiaChat, isAiConfigured } from "./nvidia";

// Hybrid scoring: cheap deterministic rules first, AI only for the
// ambiguous middle band — ported from job-serach's job_finder.py pattern
// (keyword_score + score_job_single), same reasoning: most leads are
// obviously good or obviously low-effort, and calling an LLM for the
// obvious cases is wasted latency and cost. Only the genuinely uncertain
// ones get a real model call.

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com",
]);

export interface LeadScoreInput {
  email: string;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
}

export function deterministicScore(lead: LeadScoreInput): number {
  let score = 30; // base

  const domain = lead.email.split("@")[1]?.toLowerCase();
  if (domain && !FREE_EMAIL_DOMAINS.has(domain)) score += 20; // real B2B signal

  const wordCount = (lead.message ?? "").trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 40) score += 15; // substantive message = real intent
  else if (wordCount > 15) score += 8;

  if (lead.phone) score += 10;
  if (lead.company) score += 10;

  return Math.min(Math.max(score, 0), 100);
}

// Same "return ONLY JSON" + regex-extract + graceful-fallback pattern as
// job-serach's score_job_single() / claude_client.py — a lead is never
// blocked or dropped because the AI call had a bad moment.
export async function scoreLead(
  lead: LeadScoreInput,
): Promise<{ score: number; reason: string }> {
  const detScore = deterministicScore(lead);

  // Only call the AI for the ambiguous middle band — clearly-good and
  // clearly-low-effort leads keep their free, instant deterministic score.
  if (detScore < 35 || detScore > 65 || !isAiConfigured()) {
    return { score: detScore, reason: "keyword-based scoring" };
  }

  const prompt = `Score this inbound sales lead 0-100 for how likely it is to be a genuine, worthwhile business inquiry. Return ONLY a JSON object:
{"score": <int>, "reason": "<10 words max>"}

Email domain: ${lead.email.split("@")[1] ?? "unknown"}
Company: ${lead.company ?? "not given"}
Phone: ${lead.phone ? "given" : "not given"}
Message: "${(lead.message ?? "").slice(0, 300)}"

Rules:
- 70-100: clearly a real business inquiry, specific need stated
- 40-69: plausible but vague or missing details
- 0-39: looks like spam, a test submission, or too little information to tell

Return ONLY the JSON object, nothing else.`;

  try {
    const message = await nvidiaChat([{ role: "user", content: prompt }], {
      maxTokens: 100,
      temperature: 0.2,
    });
    const raw = message.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      return { score: Math.round(Number(obj.score) || detScore), reason: String(obj.reason ?? "AI-scored") };
    }
  } catch {
    // Fall through to the deterministic score below — an AI hiccup never
    // blocks or drops a lead.
  }

  return { score: detScore, reason: "keyword-based scoring (AI unavailable)" };
}
