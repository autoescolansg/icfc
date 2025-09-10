import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const handler = async (event) => {
  try {
    const method = event.httpMethod.toUpperCase();

    if (method === "GET") {
      const { data, error } = await supabase
        .from("alunos")
        .select("cpf, data, updated_at")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const list = (data || []).map(r => ({ ...r.data, cpf: r.cpf }));
      return json(200, list);
    }

    if (method === "PUT") {
      if (!event.body) return json(400, { error: "Body vazio" });
      let payload;
      try { payload = JSON.parse(event.body); } catch { return json(400, { error: "JSON inválido" }); }

      if (!Array.isArray(payload)) return json(400, { error: "Esperado array de alunos" });

      const rows = payload
        .filter(a => a && (a.cpf || (a.data && a.data.cpf)))
        .map(a => {
          const cpf = (a.cpf || a?.data?.cpf || "").toString().trim();
          const data = { ...a };
          delete data.cpf;
          return { cpf, data, updated_at: new Date().toISOString() };
        });

      if (!rows.length) return json(400, { error: "Array sem CPFs válidos" });

      const { data, error } = await supabase
        .from("alunos")
        .upsert(rows, { onConflict: "cpf" })
        .select();

      if (error) throw error;
      return json(200, { ok: true, upserted: data?.length || 0 });
    }

    return json(405, { error: "Method not allowed" });
  } catch (err) {
    return json(500, { error: String(err.message || err) });
  }
};

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj),
  };
}
