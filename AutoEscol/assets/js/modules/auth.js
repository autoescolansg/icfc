// assets/js/modules/auth.js (Supabase Auth)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supa = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

function applyUI(logged) {
  const login = document.getElementById("login");
  const app   = document.getElementById("app");
  if (login && app) {
    login.style.display = logged ? "none" : "flex";
    app.style.display   = logged ? "block" : "none";
  }
}

export async function initAuth() {
  const { data: { session } } = await supa.auth.getSession();
  applyUI(Boolean(session));

  const btnLogin  = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  btnLogin?.addEventListener("click", async () => {
    const email = document.getElementById("loginUser")?.value?.trim();
    const pass  = document.getElementById("loginPass")?.value?.trim();
    if (!email || !pass) { alert("Informe usuário e senha"); return; }
    const { error } = await supa.auth.signInWithPassword({ email, password: pass });
    if (error) { alert(error.message); return; }
    applyUI(true);
    window.appLoginSuccess?.(email);
  });

  btnLogout?.addEventListener("click", async () => {
    await supa.auth.signOut();
    applyUI(false);
    sessionStorage.removeItem("alunos.etag");
  });

  supa.auth.onAuthStateChange((_event, session) => {
    applyUI(Boolean(session));
  });

  window.__supa = supa;
}
