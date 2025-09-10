// netlify/functions/utils/roles.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/** Returns { role, seller, email } for the given userId (or nulls) */
export async function getUserProfile(userId) {
  if (!userId) return { role: null, seller: null, email: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("role, seller, email")
    .eq("id", userId)
    .single();
  if (error) return { role: null, seller: null, email: null };
  return { role: data?.role || null, seller: data?.seller || null, email: data?.email || null };
}