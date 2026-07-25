import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, listProfiles } from "@/lib/leads";
import BoardClient from "./board-client";

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const profiles = await listProfiles();

  return <BoardClient currentProfile={profile} profiles={profiles} />;
}
