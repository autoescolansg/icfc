// assets/js/utils/authFetch.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supa = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

export async function authFetch(url, options = {}) {
  const { data: { session } } = await supa.auth.getSession();
  const headers = new Headers(options.headers || {});
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(url, { ...options, headers });
}

window.authFetch = authFetch;