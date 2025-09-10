import { initTheme } from './modules/theme.js';
import { initAuth } from './modules/auth.js';
import { initNavigation } from './modules/navigation.js';
import { initAlunos } from './modules/alunos.js';
import { initIO } from './modules/io.js';
import { initSellerCfg } from './modules/seller.js';

function applySessionUI() {
  const hasSession = !!localStorage.getItem("app.session");
  const login = document.getElementById("login");
  const app   = document.getElementById("app");
  if (login && app) {
    login.style.display = hasSession ? "none" : "flex";
    app.style.display   = hasSession ? "block" : "none";
  }
}

// deixa uma função global para o módulo de auth chamar quando login for bem-sucedido
window.appLoginSuccess = (user = "user") => {
  localStorage.setItem("app.session", JSON.stringify({ user, ts: Date.now() }));
  applySessionUI();
};

document.addEventListener('DOMContentLoaded', () => {
  // 1) aplica estado salvo (mantém logado após F5)
  applySessionUI();

  // 2) inicializações existentes
  initTheme();
  initAuth();
  initNavigation();
  initAlunos();
  initIO();
  initSellerCfg();

  // 3) listeners simples (fallback) caso seu auth.js não chame appLoginSuccess()
  document.getElementById('btnLogin')?.addEventListener('click', () => {
    const u = document.getElementById('loginUser')?.value?.trim() || 'user';
    // dá tempo do auth validar; se for inválido, seu auth pode limpar depois
    setTimeout(() => window.appLoginSuccess(u), 200);
  });

  document.getElementById('btnLogout')?.addEventListener('click', () => {
    localStorage.removeItem("app.session");
    applySessionUI();
  });
});
