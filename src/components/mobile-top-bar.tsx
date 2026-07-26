"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { SignOut, Gear } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

// Shown only below the `lg` breakpoint, in place of the full Sidebar (which
// is `hidden` there).
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
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-muted-foreground">
          <Gear size={18} />
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <SignOut size={16} />
          {currentProfile.name.split(" ")[0]}
        </button>
      </div>
    </div>
  );
}
