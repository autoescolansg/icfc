
// netlify/functions/seller.mjs
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
    if (method === "GET") return await handleGET();
    if (method === "PUT") return await handlePUT(event);
    return json(405, { error: "Method not allowed" });
  } catch (err) {
    return json(500, { error: String(err?.message || err) });
  }
};

async function handleGET() {
  const { data, error } = await supabase
    .from("seller")
    .select("nome, meta, comissao, updated_at")
    .order("nome");
  if (error) throw error;

  const obj = {};
  for (const r of data || []) {
    obj[r.nome] = { meta: Number(r.meta || 0), comissao: Number(r.comissao || 0) };
  }
  return json(200, obj);
}

async function handlePUT(event) {
  const user = requireAuth(event);
  const prof = await getUserProfile(user.userId);
  if (prof.role !== "admin") return json(403, { error: "Admin only" });

  if (!event.body) return json(400, { error: "Body vazio" });
  let payload;
  try { payload = JSON.parse(event.body); } catch { return json(400, { error: "JSON inválido" }); }

  let rows = [];
  if (Array.isArray(payload)) {
    rows = payload.map(s => ({
      nome: String(s?.nome || "").trim(),
      meta: Number(s?.meta || 0),
      comissao: Number(s?.comissao || 0),
      updated_at: new Date().toISOString()
    })).filter(s => s.nome);
  } else {
    rows = Object.entries(payload || {}).map(([nome, cfg]) => ({
      nome: String(nome).trim(),
      meta: Number(cfg?.meta || 0),
      comissao: Number(cfg?.comissao || 0),
      updated_at: new Date().toISOString()
    })).filter(s => s.nome);
  }
  if (!rows.length) return json(400, { error: "Nada para gravar" });

  const { data, error } = await supabase.from("seller").upsert(rows, { onConflict: "nome" }).select();
  if (error) throw error;

  return json(200, { ok: true, upserted: data?.length || 0 });
}

function json(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}
