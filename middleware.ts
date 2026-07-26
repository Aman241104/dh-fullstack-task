import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Standard Supabase SSR session-refresh middleware. NOTE: Next.js 16
// deprecated `middleware.ts` in favor of `proxy.ts`/`export function
// proxy()`, but this project's installed Next.js 16.2.11 never actually
// registers a file named proxy.ts into its middleware manifest (confirmed:
// empty manifest in both dev and `next build`, in both Turbopack and
// webpack, even for a zero-dependency proxy.ts) despite validating its
// export shape at compile time - a real discovery bug in this exact
// version. middleware.ts/middleware() is kept deliberately (with its
// deprecation warning) because it is the one that actually runs. Revisit
// this on a future Next.js upgrade.
// Required because Server Components can't write cookies themselves (see
// lib/supabase/server.ts) — without this, a session nearing its expiry
// never gets refreshed and users get silently logged out mid-session.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touches the session so expiring tokens get refreshed on every request.
  await supabase.auth.getUser();

  // IP allowlist gate - only applied to the pipeline itself (/board and its
  // API), never to /login or /settings, so an admin who adds a bad entry can
  // still always reach settings to fix it. is_ip_allowed() returns true when
  // the table is empty, so this is a no-op until an admin opts in.
  const { pathname } = request.nextUrl;
  const isPublicCapture = pathname === "/api/leads" && request.method === "POST";
  const isGated =
    !isPublicCapture &&
    (pathname.startsWith("/board") ||
      pathname.startsWith("/api/leads") ||
      pathname.startsWith("/api/activity") ||
      pathname.startsWith("/api/ip-allowlist"));

  if (isGated) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { data: allowed } = await supabase.rpc("is_ip_allowed", { p_ip: ip });
    if (allowed === false) {
      return NextResponse.json({ error: "Access denied from this network" }, { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
