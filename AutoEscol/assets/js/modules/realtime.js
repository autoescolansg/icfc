// assets/js/realtime.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const URL = window.SUPABASE_URL;
const ANON = window.SUPABASE_ANON_KEY;

if (!URL || !ANON) {
  console.warn("Supabase ANON/URL não configurados (defina em index.html).");
} else {
  const supa = createClient(URL, ANON, { auth: { persistSession: false } });

  async function refreshAlunos() {
    try {
      const data = await fetch(`${window.API_BASE}/alunos`).then(r => r.json());
      if (window.renderAlunosFromList) {
        window.renderAlunosFromList(data);
      } else {
        console.log("Alunos atualizados:", data);
      }
    } catch (e) {
      console.error("Falha ao atualizar alunos:", e);
    }
  }

  supa
    .channel("alunos-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "alunos" }, refreshAlunos)
    .subscribe((status) => {
      console.log("Realtime status:", status);
      if (status === "SUBSCRIBED") refreshAlunos();
    });

  window.addEventListener("online", refreshAlunos);
}
