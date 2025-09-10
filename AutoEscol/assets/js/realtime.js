
// assets/js/realtime.js — usa a mesma instância do auth e assina somente após login
const API_BASE = window.API_BASE || "/api";

function setupRealtime(supa) {
  let channel = null;

  async function fetchAlunosNoStore() {
    const head = await fetch(`${API_BASE}/alunos`, { method: "HEAD", cache: "no-store" });
    const etag = head.headers.get("ETag");
    const prev = sessionStorage.getItem("alunos.etag");
    if (etag && prev && etag === prev) return;
    const data = await fetch(`${API_BASE}/alunos`, { cache: "no-store" }).then(r => r.json());
    sessionStorage.setItem("alunos.etag", etag || "");
    window.renderAlunosFromList?.(data);
  }

  function subscribe() {
    if (channel) { try { channel.unsubscribe(); } catch {} channel = null; }
    channel = supa
      .channel("alunos-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "alunos" }, () => {
        fetchAlunosNoStore().catch(e => console.error("refresh falhou:", e));
      })
      .subscribe(status => {
        console.log("Realtime status:", status);
        if (status === "SUBSCRIBED") fetchAlunosNoStore();
      });
  }

  // Assina quando houver sessão
  supa.auth.getSession().then(({ data: { session } }) => {
    if (session) subscribe(); else console.warn("Realtime aguardando login…");
  });

  // Reassina quando a sessão mudar
  supa.auth.onAuthStateChange((_e, session) => {
    if (session) { console.log("Auth mudou → re-assinando Realtime"); subscribe(); }
    else { console.log("Logout → cancelando assinatura Realtime"); try { channel?.unsubscribe(); } catch {} channel = null; }
  });

  window.addEventListener("online", () => fetchAlunosNoStore().catch(()=>{}));
}

// Usa cliente do auth.js; se ainda não existir, espera evento
if (window.__supa) {
  setupRealtime(window.__supa);
} else {
  window.addEventListener("supa:ready", () => setupRealtime(window.__supa), { once: true });
}
