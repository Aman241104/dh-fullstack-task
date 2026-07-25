"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

// Shown only below the `lg` breakpoint, in place of the full Sidebar (which
// is `hidden` there) — this app has exactly one real destination (Leads), so
// there's nothing to put behind a hamburger menu. Just identity + sign out.
export default function MobileTopBar({ currentProfile }: { currentProfile: Profile }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="lg:hidden flex items-center justify-between bg-card rounded-2xl px-4 py-3 mb-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm">
          D
        </div>
        <span className="font-bold tracking-tight">Docket.</span>
      </div>
      <button
        onClick={signOut}
        className="flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <SignOut size={16} />
        {currentProfile.name.split(" ")[0]}
      </button>
    </div>
  );
}
