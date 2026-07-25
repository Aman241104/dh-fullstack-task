// AFTER — data access isolated to one place, parameterized (no string
// concatenation, no SQL injection vector), and the only file in this refactor
// that imports `pg` — a route handler or service never touches the database
// driver directly.

import { Pool } from "pg";
import type { RepTier } from "./lead-routing.service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export interface Rep {
  id: string;
  name: string;
  email: string;
}

export async function findAvailableRep(tier: RepTier): Promise<Rep | null> {
  const result = await pool.query(
    `SELECT id, name, email FROM reps WHERE tier = $1 AND active = true ORDER BY current_load ASC LIMIT 1`,
    [tier],
  );
  return result.rows[0] ?? null;
}

export async function assignLead(leadId: string, repId: string, priority: number): Promise<void> {
  await pool.query(`UPDATE leads SET assigned_rep_id = $1, priority = $2 WHERE id = $3`, [
    repId,
    priority,
    leadId,
  ]);
}
