// assets/js/realtime.js (fix: não sombrear a classe global URL)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL  = window.SUPABASE_URL;
const SUPA_ANON = window.SUPABASE_ANON_KEY;
const API_BASE  = window.API_BASE || "/api";

if (!SUPA_URL || !SUPA_ANON) {
  console.warn("Supabase ANON não configurado (defina SUPABASE_URL e SUPABASE_ANON_KEY no index.html).");
} else {
  const supa = createClient(SUPA_URL, SUPA_ANON, { auth: { persistSession: true } });

  async function refreshAlunos() {
    try {
      const base = `${API_BASE}/alunos`;
      const head = await fetch(base, { method: "HEAD" });
      const etag = head.headers.get("ETag");
      const prev = sessionStorage.getItem("alunos.etag");
      if (etag && prev && etag === prev) return;
      const data = await fetch(base).then(r => r.json());
      sessionStorage.setItem("alunos.etag", etag || "");
      window.renderAlunosFromList?.(data);
    } catch (e) {
      console.error("Falha ao atualizar alunos:", e);
    }
  }

  supa
    .channel("alunos-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "alunos" }, refreshAlunos)
    .subscribe((status) => {
      console.log("Realtime:", status);
      if (status === "SUBSCRIBED") refreshAlunos();
    });

  window.addEventListener("online", refreshAlunos);
}
