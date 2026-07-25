export type Role = "admin" | "member";
export type LeadStatus = "new" | "contacted" | "qualified" | "won" | "lost";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  source: string;
  status: LeadStatus;
  assigned_to: string | null;
  score: number | null;
  score_reason: string | null;
  created_at: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  actor_id: string;
  action: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
