// netlify/functions/backup-alunos.mjs
export const config = { schedule: "@daily" };
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export const handler = async () => {
  try {
    const { data, error } = await supabase
      .from("alunos")
      .select("cpf, data, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;

    const payload = JSON.stringify(data || [], null, 2);
    const fname = `daily/alunos-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;

    const blob = new Blob([payload], { type: "application/json" });
    const { error: upErr } = await supabase.storage.from("backups").upload(fname, blob, { upsert: true });
    if (upErr) throw upErr;

    return json(200, { ok: true, file: fname });
  } catch (e) {
    return json(500, { error: String(e?.message || e) });
  }
};

function json(statusCode, obj) {
  return { statusCode, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) };
}