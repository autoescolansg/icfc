// netlify/functions/alunos.mjs
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "./utils/authGuard.mjs";
import { getUserProfile } from "./utils/roles.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const handler = async (event) => {
  try {
    const method = event.httpMethod.toUpperCase();
    if (method === "GET")    return await handleGET(event);
    if (method === "HEAD")   return await handleHEAD(event);
    if (method === "PUT")    return await handlePUT(event);
    if (method === "DELETE") return await handleDELETE(event);
    return json(405, { error: "Method not allowed" });
  } catch (err) {
    const msg = String(err?.message || err);
    const isAuth = /bearer token|jwt|signature|token|SUPABASE_JWT_SECRET/i.test(msg);
    return {
      statusCode: isAuth ? 401 : 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: msg })
    };
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}

/* ---------- GET (lista alunos) ---------- */
async function handleGET(event) {
  const url = new URL(event.rawUrl);
  const since  = url.searchParams.get("since");
  const cursor = url.searchParams.get("cursor");
  const limit  = Math.min(Number(url.searchParams.get("limit") || 200), 500);

  let q = supabase.from("alunos")
    .select("cpf, data, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (since)  q = q.gt("updated_at", new Date(since).toISOString());
  if (cursor) q = q.lt("updated_at", new Date(cursor).toISOString());

  const { data, error } = await q;
  if (error) throw error;

  const etag = data?.[0]?.updated_at || "empty";
  const inm = event.headers?.["if-none-match"] || event.headers?.["If-None-Match"];
  if (inm && inm === etag) {
    return { statusCode: 304, headers: { ETag: etag } };
  }

  const list = (data || []).map(r => ({ ...r.data, cpf: r.cpf }));
  return { statusCode: 200, headers: { "content-type": "application/json", ETag: etag }, body: JSON.stringify(list) };
}

/* ---------- HEAD (apenas ETag) ---------- */
async function handleHEAD(_event) {
  const { data, error } = await supabase
    .from("alunos")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const etag = data?.[0]?.updated_at || "empty";
  return { statusCode: 200, headers: { ETag: etag } };
}

/* ---------- PUT (upsert de alunos) ---------- */
async function handlePUT(event) {
  const user = requireAuth(event);
  const prof = await getUserProfile(user.userId);
  const allowed = prof.role === "admin" || prof.role === "colaborador";
  if (!allowed) return json(403, { error: "Forbidden" });

  if (!event.body) return json(400, { error: "Body vazio" });
  let payload;
  try { payload = JSON.parse(event.body); } catch { return json(400, { error: "JSON inválido" }); }
  if (!Array.isArray(payload)) return json(400, { error: "Esperado array de alunos" });

  const now = new Date().toISOString();
  const rows = [];
  for (const a of payload) {
    const cpf = String(a?.cpf || a?.data?.cpf || "").replace(/\D/g, "");
    if (!/^\d{11}$/.test(cpf)) continue;
    const clone = { ...a }; delete clone.cpf; delete clone.CPF;
    rows.push({ cpf, data: clone, updated_at: now });
  }
  if (!rows.length) return json(400, { error: "Array sem CPFs válidos" });

  const { data, error } = await supabase
    .from("alunos")
    .upsert(rows, { onConflict: "cpf" })
    .select();
  if (error) throw error;

  return json(200, { ok: true, upserted: data?.length || 0 });
}

/* ---------- DELETE (remove por CPF) ---------- */
async function handleDELETE(event) {
  const user = requireAuth(event);
  const prof = await getUserProfile(user.userId);
  const allowed = prof.role === "admin" || prof.role === "colaborador";
  if (!allowed) return json(403, { error: "Forbidden" });

  const url = new URL(event.rawUrl);
  let cpfs = url.searchParams.getAll("cpf") || [];

  if (event.body && !cpfs.length) {
    try {
      const parsed = JSON.parse(event.body);
      if (Array.isArray(parsed)) cpfs = parsed;
      else if (Array.isArray(parsed?.cpfs)) cpfs = parsed.cpfs;
    } catch {}
  }

  cpfs = cpfs.map(v => String(v || "").replace(/\D/g, "")).filter(v => /^\d{11}$/.test(v));
  if (!cpfs.length) return json(400, { error: "Informe pelo menos um CPF válido" });

  // (opcional) restringir colaborador ao próprio seller:
  if (prof.role === "colaborador") {
     const { data: rows } = await supabase.from("alunos").select("cpf, data").in("cpf", cpfs);
     const invalid = (rows || []).filter(r => (r.data?.vendedor ?? null) !== prof.seller).map(r => r.cpf);
    if (invalid.length) return json(403, { error: `Sem permissão p/ CPFs: ${invalid.join(",")}` });
   }

  const { error, count } = await supabase.from("alunos").delete({ count: "exact" }).in("cpf", cpfs);
  if (error) throw error;

  return json(200, { ok: true, deleted: count ?? 0, cpfs });
}
