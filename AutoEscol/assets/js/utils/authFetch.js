
// assets/js/utils/authFetch.js
// Envia automaticamente Authorization: Bearer <token> do Supabase Auth
export async function authFetch(url, options = {}) {
  const supa = window.__supa;
  if (!supa) return fetch(url, options);

  const { data: { session } } = await supa.auth.getSession();
  const headers = new Headers(options.headers || {});
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(url, { ...options, headers });
}
