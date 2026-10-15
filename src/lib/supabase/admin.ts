import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue.");
  const { data: admin } = await supabase.from("domain_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) throw new Error("This account is not enabled as a domain administrator.");
  return { supabase, user };
}
