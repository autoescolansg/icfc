// assets/js/realtime.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = window.SUPABASE_URL;
const ANON = window.SUPABASE_ANON_KEY;
if (!URL || !ANON) {
  console.warn("Supabase ANON não configurado (defina SUPABASE_URL e SUPABASE_ANON_KEY no index.html).");
} else {
  const supa = createClient(URL, ANON, { auth: { persistSession: true } });

  async function refreshAlunos() {
    try {
      const url = new URL(`${window.API_BASE}/alunos`, location.origin);
      const head = await fetch(url, { method: "HEAD" });
      const etag = head.headers.get("ETag");
      const prev = sessionStorage.getItem("alunos.etag");
      if (etag && prev && etag === prev) return;
      const data = await fetch(url).then(r => r.json());
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