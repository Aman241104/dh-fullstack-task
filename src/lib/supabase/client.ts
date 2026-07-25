import { createBrowserClient } from "@supabase/ssr";

// Browser client for Client Components (login form, board interactions).
// Same anon key, same RLS — there is no elevated-privilege path on the client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
