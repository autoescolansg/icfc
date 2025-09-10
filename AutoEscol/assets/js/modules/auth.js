
// assets/js/modules/auth.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supa = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// expõe a mesma instância para outros módulos + evento de pronto
window.__supa = supa;
window.dispatchEvent(new Event("supa:ready"));

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
    const { data: prof, error } = await supa.from("profiles").select("role,seller,email").single();
    if (!error && prof) {
      role = prof.role || role;
      seller = prof.seller ?? null;
      email = prof.email || email;
    }
  } catch (_) { /* segue com defaults se falhar */ }

  currentUser = { id: session.user.id, email, role, seller };
  applyUI(true);
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
