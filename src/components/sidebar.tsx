"use client";

import { useRouter } from "next/navigation";
import { SquaresFour, SignOut } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function Sidebar({ currentProfile }: { currentProfile: Profile }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 shrink-0 bg-card rounded-3xl p-5 flex flex-col h-[calc(100vh-2.5rem)] sticky top-5">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center text-accent-foreground font-bold text-sm">
          D
        </div>
        <span className="font-bold text-lg tracking-tight">Docket.</span>
      </div>

      <p className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
        General
      </p>
      <nav className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent-soft text-accent font-medium text-sm">
          <SquaresFour size={18} weight="fill" />
          Leads
        </div>
      </nav>

      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-accent-soft text-accent font-semibold text-xs flex items-center justify-center">
            {currentProfile.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{currentProfile.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{currentProfile.role}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-card-muted hover:text-foreground transition-colors"
        >
          <SignOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
