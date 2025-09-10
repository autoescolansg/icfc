// assets/js/modules/auth.js (fix: exporta currentUser + carrega perfil)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supa = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// export esperado por outros módulos
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
  // tenta carregar perfil (role/seller) com RLS (self select)
  let role = "colaborador", seller = null, email = session.user?.email || null;
  try {
    const { data: prof } = await supa
      .from("profiles")
      .select("role,seller,email")
      .single();
    if (prof) {
      role = prof.role || role;
      seller = prof.seller ?? null;
      email = prof.email || email;
    }
  } catch {}
  currentUser = { id: session.user.id, email, role, seller };
  applyUI(true);
  // avisa módulos que dependem do usuário
  window.dispatchEvent(new CustomEvent("auth:ready", { detail: currentUser }));
}

export async function initAuth() {
  const { data: { session } } = await supa.auth.getSession();
  await setSessionUser(session);

  const btnLogin  = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  btnLogin?.addEventListener("click", async () => {
    const email = document.getElementById("loginUser")?.value?.trim();
    const pass  = document.getElementById("loginPass")?.value?.trim();
    if (!email || !pass) { alert("Informe usuário e senha"); return; }
    const { error, data } = await supa.auth.signInWithPassword({ email, password: pass });
    if (error) { alert(error.message); return; }
    await setSessionUser(data.session);
    // compat: se o app expõe hook
    window.appLoginSuccess?.(email);
  });

  btnLogout?.addEventListener("click", async () => {
    await supa.auth.signOut();
    await setSessionUser(null);
    sessionStorage.removeItem("alunos.etag");
  });

  // reaja a mudanças (outra aba, refresh de token, etc.)
  supa.auth.onAuthStateChange(async (_event, session) => {
    await setSessionUser(session);
  });

  // expõe global opcional
  window.__supa = supa;
}
