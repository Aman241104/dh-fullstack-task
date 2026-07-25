import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client, RLS-respecting (uses the anon key + the caller's own
// session cookie). Every route handler and server component uses this — the
// permission boundary lives entirely in the RLS policies these requests run
// under, not in this file. There is no service_role client anywhere in the
// app runtime: "admin" is a profiles.role value checked inside RLS policies,
// not a Postgres-level bypass, so the app never needs the service_role key.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render, which can't set
            // cookies — middleware.ts handles session refresh in that case.
          }
        },
      },
    },
  );
}
