// assets/js/modules/auth.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// A instância do Supabase agora será criada após a configuração ser carregada
export let supa = null; // Inicialmente nula

// expõe a mesma instância para outros módulos + evento de pronto
window.__supa = supa; // Será atualizado quando supa for inicializado

export let currentUser = null;

function applyUI(logged) {
  const login = document.getElementById("login");
  const app   = document.getElementById("app");
  if (login && app) {
    login.style.display = logged ? "none" : "flex";
    app.style.display   = logged ? "block" : "none";
  }
}

async function setSessionUser(session) {
  if (!session) {
    currentUser = null;
    applyUI(false);
    window.dispatchEvent(new CustomEvent("auth:ready", { detail: null }));
    return;
  }
  let role = "colaborador", seller = null, email = session.user?.email || null;
  try {
    // Garante que supa está inicializado antes de usar
    if (!supa) {
      console.warn("Supabase client not initialized yet in auth.js. Waiting for config.");
      // Pode ser necessário adicionar um listener aqui se a inicialização for assíncrona
      // Por enquanto, assumimos que initConfig() já rodou e supa foi definido.
      return;
    }
    const { data: prof, error } = await supa.from("profiles").select("role,seller,email").single();
    if (!error && prof) {
      role = prof.role || role;
      seller = prof.seller ?? null;
      email = prof.email || email;
    }
  } catch (e) {
    console.error("Erro ao buscar perfil do usuário:", e);
    /* segue com defaults se falhar */
  }

  currentUser = { id: session.user.id, email, role, seller };
  applyUI(true);
  window.dispatchEvent(new CustomEvent("auth:ready", { detail: currentUser }));
}

export async function initAuth() {
  // Espera o evento 'config:ready' para garantir que SUPABASE_URL e SUPABASE_ANON_KEY estão definidos
  await new Promise(resolve => {
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
      resolve();
    } else {
      window.addEventListener('config:ready', resolve, { once: true });
    }
  });

  // Inicializa o cliente Supabase aqui, após a configuração estar pronta
  supa = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  window.__supa = supa; // Atualiza a instância global

  const { data: { session } } = await supa.auth.getSession();
  await setSessionUser(session);

  const btnLogin  = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  btnLogin?.addEventListener("click", async () => {
    const email = document.getElementById("loginUser")?.value?.trim();
    const pass  = document.getElementById("loginPass")?.value?.trim();
    if (!email || !pass) { alert("Informe usuário e senha"); return; } // Usar showToast aqui seria melhor
    const { error, data } = await supa.auth.signInWithPassword({ email, password: pass });
    if (error) { alert(error.message); return; } // Usar showToast aqui seria melhor
    await setSessionUser(data.session);
    window.appLoginSuccess?.(email);
  });

  btnLogout?.addEventListener("click", async () => {
    try { await supa.auth.signOut({ scope: "local" }); } catch (e) { console.debug("signOut:", e?.message||e); }
    await setSessionUser(null);
    sessionStorage.removeItem("alunos.etag");
  });

  supa.auth.onAuthStateChange(async (_event, session) => {
    await setSessionUser(session);
  });
}
