// assets/js/realtime.js — usa a mesma instância do auth e assina somente após login
const API_BASE = window.API_BASE || "/api";

function setupRealtime(supa) {
  let alunosChannel = null;
  let transacoesChannel = null;
  let profilesChannel = null;

  async function fetchAlunosNoStore() {
    const head = await fetch(`${API_BASE}/alunos`, { method: "HEAD", cache: "no-store" });
    const etag = head.headers.get("ETag");
    const prev = sessionStorage.getItem("alunos.etag");
    if (etag && prev && etag === prev) return;
    const data = await fetch(`${API_BASE}/alunos`, { cache: "no-store" }).then(r => r.json());
    sessionStorage.setItem("alunos.etag", etag || "");
    window.renderAlunosFromList?.(data);
    window.renderRelatoriosFromList?.(undefined, data); // Atualiza alunos para relatórios
  }

  async function fetchTransacoesNoStore() {
    const head = await fetch(`${API_BASE}/transacoes`, { method: "HEAD", cache: "no-store" });
    const etag = head.headers.get("ETag");
    const prev = sessionStorage.getItem("transacoes.etag");
    if (etag && prev && etag === prev) return;
    const data = await fetch(`${API_BASE}/transacoes`, { cache: "no-store" }).then(r => r.json());
    sessionStorage.setItem("transacoes.etag", etag || "");
    window.renderTransacoesFromList?.(data);
    window.renderRelatoriosFromList?.(data, undefined); // Atualiza transações para relatórios
  }

  async function fetchProfilesNoStore() {
    const head = await fetch(`${API_BASE}/profiles`, { method: "HEAD", cache: "no-store" });
    const etag = head.headers.get("ETag");
    const prev = sessionStorage.getItem("profiles.etag");
    if (etag && prev && etag === prev) return;
    const data = await fetch(`${API_BASE}/profiles`, { cache: "no-store" }).then(r => r.json());
    sessionStorage.setItem("profiles.etag", etag || "");
    window.renderColaboradoresTable?.(data); // Chama a função de renderização da config.js
  }

  function subscribe() {
    // Unsubscribe de canais existentes
    if (alunosChannel) { try { alunosChannel.unsubscribe(); } catch {} alunosChannel = null; }
    if (transacoesChannel) { try { transacoesChannel.unsubscribe(); } catch {} transacoesChannel = null; }
    if (profilesChannel) { try { profilesChannel.unsubscribe(); } catch {} profilesChannel = null; }

    // Assina o canal de alunos
    alunosChannel = supa
      .channel("alunos-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "alunos" }, () => {
        fetchAlunosNoStore().catch(e => console.error("Alunos refresh falhou:", e));
      })
      .subscribe(status => {
        console.log("Realtime Alunos status:", status);
        if (status === "SUBSCRIBED") fetchAlunosNoStore();
      });

    // Assina o canal de transações
    transacoesChannel = supa
      .channel("transacoes-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transacoes" }, () => {
        fetchTransacoesNoStore().catch(e => console.error("Transacoes refresh falhou:", e));
      })
      .subscribe(status => {
        console.log("Realtime Transacoes status:", status);
        if (status === "SUBSCRIBED") fetchTransacoesNoStore();
      });

    // Assina o canal de perfis
    profilesChannel = supa
      .channel("profiles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchProfilesNoStore().catch(e => console.error("Profiles refresh falhou:", e));
      })
      .subscribe(status => {
        console.log("Realtime Profiles status:", status);
        if (status === "SUBSCRIBED") fetchProfilesNoStore();
      });
  }

  // Assina quando houver sessão
  supa.auth.getSession().then(({ data: { session } }) => {
    if (session) subscribe(); else console.warn("Realtime aguardando login…");
  });

  // Reassina quando a sessão mudar
  supa.auth.onAuthStateChange((_e, session) => {
    if (session) { console.log("Auth mudou → re-assinando Realtime"); subscribe(); }
    else { console.log("Logout → cancelando assinatura Realtime");
      try { alunosChannel?.unsubscribe(); } catch {} alunosChannel = null;
      try { transacoesChannel?.unsubscribe(); } catch {} transacoesChannel = null;
      try { profilesChannel?.unsubscribe(); } catch {} profilesChannel = null;
    }
  });

  window.addEventListener("online", () => {
    fetchAlunosNoStore().catch(()=>{});
    fetchTransacoesNoStore().catch(()=>{});
    fetchProfilesNoStore().catch(()=>{});
  });
}

// Usa cliente do auth.js; se ainda não existir, espera evento
if (window.__supa) {
  setupRealtime(window.__supa);
} else {
  window.addEventListener("supa:ready", () => setupRealtime(window.__supa), { once: true });
}
