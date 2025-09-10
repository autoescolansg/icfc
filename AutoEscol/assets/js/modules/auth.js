// --- sessão/usuário ---
export let currentUser = null;

const USERS = [
  { username:'admin',   password:'admin123', role:'admin' },
  { username:'ewerton', password:'123456',  role:'colaborador', seller:'Ewerton' },
  { username:'darlan',  password:'123456',  role:'colaborador', seller:'Darlan' },
];

// ==== helpers de sessão (persistência) ==== //
export function saveSession(userObj) {
  try {
    const payload = {
      user: userObj.username,
      role: userObj.role,
      seller: userObj.seller || null,
      ts: Date.now()
    };
    localStorage.setItem("app.session", JSON.stringify(payload));
  } catch {}
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem("app.session")); }
  catch { return null; }
}

export function clearSession() {
  localStorage.removeItem("app.session");
}

// ==== inicialização do módulo ==== //
export function initAuth(){
  const login = document.getElementById('login');
  const app = document.getElementById('app');
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');

  // Restaura sessão existente (mantém logado após F5)
  const stored = getSession();
  if (stored?.user) {
    const found = USERS.find(x => x.username === stored.user);
    if (found) {
      currentUser = { ...found };
      applyRoleVisibility();

      // Se o main.js já controla as telas, não mexemos.
      // Caso contrário, fazemos um fallback simples:
      if (login && app && getComputedStyle(app).display === 'none') {
        login.style.display = 'none';
        app.style.display   = 'block';
      }
    } else {
      clearSession();
    }
  }

  // LOGIN
  btnLogin?.addEventListener('click', ()=>{
    const u = document.getElementById('loginUser').value.trim().toLowerCase();
    const p = document.getElementById('loginPass').value;
    const found = USERS.find(x=>x.username===u && x.password===p);
    if (!found){ alert('Usuário ou senha inválidos'); return; }

    currentUser = { ...found };
    saveSession(currentUser);
    applyRoleVisibility();

    // Integra com main.js (se existir)
    if (typeof window.appLoginSuccess === 'function') {
      window.appLoginSuccess(currentUser.username);
    } else {
      // fallback UI simples
      if (login && app) { login.style.display='none'; app.style.display='block'; }
    }

    const name = currentUser.username.charAt(0).toUpperCase()+currentUser.username.slice(1);
    const { showToast } = requireUX();
    showToast?.(`Bem-vindo, ${name}!`, 'success');

    // refresh após login
    import('./alunos.js').then(m=>{ m.renderTabela?.(); m.refreshDashboard?.(); });
  });

  // LOGOUT
  btnLogout?.addEventListener('click', ()=>{
    clearSession();
    currentUser=null;
    // Se o main.js já trata logout, ele mesmo alterna a UI.
    // Fallback de UI:
    if (login && app) { app.style.display='none'; login.style.display='flex'; }
  });
}

function applyRoleVisibility(){
  // colaboradores: restringe a seção (ex.: ocultar Config)
  if (currentUser?.role==='colaborador'){
    document.querySelector('[data-section="config"]')?.classList.add('hidden');
  }else{
    document.querySelector('[data-section="config"]')?.classList.remove('hidden');
  }
}

function requireUX(){ return window.__ux || {}; }
