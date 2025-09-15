// assets/js/main.js
// Mantém a sua estrutura (theme, navigation, alunos, io, seller),
// mas agora mostra/oculta Login/App com base no evento "auth:ready"
// emitido por assets/js/modules/auth.js (Supabase Auth).

import { initTheme } from './modules/theme.js';
import { initAuth } from './modules/auth.js';
import { initNavigation } from './modules/navigation.js';
import { initAlunos } from './modules/alunos.js';
import { initIO } from './modules/io.js';
// import { initSellerCfg } from './modules/seller.js'; // REMOVIDO: Integrado em config.js
import { initFinanceiro } from './modules/financeiro.js';
import { initConfig } from './modules/config.js'; // Agora também gerencia seller cfg
import { initRelatorios } from './modules/relatorios.js'; // NOVO

function applySessionUI(isLogged) {
  const login = document.getElementById("login");
  const app   = document.getElementById("app");
  if (login && app) {
    login.style.display = isLogged ? "none" : "flex";
    app.style.display   = isLogged ? "block" : "none";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Inicializações do seu app
  initTheme();
  initNavigation();
  initAlunos();
  initIO();
  // initSellerCfg(); // REMOVIDO
  initFinanceiro();
  initConfig(); // Agora também gerencia seller cfg
  initRelatorios(); // NOVO

  // Começa escondendo o app até sabermos a sessão
  applySessionUI(false);

  // Inicializa a autenticação (auth.js disparará "auth:ready" ao resolver/mudar sessão)
  initAuth();

  // Quando a sessão estiver pronta (ou mudar), atualiza a UI
  window.addEventListener('auth:ready', (e) => {
    const user = e.detail; // { id, email, role, seller } ou null
    applySessionUI(!!user);
    // Atualiza o nome e avatar do usuário no header
    const userDisplayName = document.getElementById('userDisplayName');
    const userAvatar = document.getElementById('userAvatar');
    const userRole = document.querySelector('.user-role');

    if (user) {
      userDisplayName.textContent = user.email || 'Usuário';
      userAvatar.textContent = (user.email ? user.email.charAt(0).toUpperCase() : 'U');
      userRole.textContent = user.role || 'Colaborador';
    } else {
      userDisplayName.textContent = 'Usuário';
      userAvatar.textContent = 'U';
      userRole.textContent = 'Visitante';
    }
    // Re-inicializa módulos que dependem do currentUser
    initConfig(); // Para mostrar/esconder a aba de config
  });

  // Compat: se algum código antigo chamar appLoginSuccess, apenas loga (auth.js já cuida da sessão)
  window.appLoginSuccess = (email) => {
    console.debug('appLoginSuccess (compat):', email);
    // Nada a fazer aqui; auth.js já dispara 'auth:ready' quando a sessão muda.
  };
});
