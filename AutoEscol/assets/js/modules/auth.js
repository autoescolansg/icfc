
export let currentUser = null;

const USERS = [
  { username:'admin',   password:'admin123', role:'admin' },
  { username:'ewerton', password:'123456',  role:'colaborador', seller:'Ewerton' },
  { username:'darlan',  password:'123456',  role:'colaborador', seller:'Darlan' },
];

export function initAuth(){
  const login = document.getElementById('login');
  const app = document.getElementById('app');
  const btnLogin = document.getElementById('btnLogin');
  const btnLogout = document.getElementById('btnLogout');

  btnLogin?.addEventListener('click', ()=>{
    const u = document.getElementById('loginUser').value.trim().toLowerCase();
    const p = document.getElementById('loginPass').value;
    const found = USERS.find(x=>x.username===u && x.password===p);
    if (!found){ alert('Usuário ou senha inválidos'); return; }
    currentUser = { ...found };
    login.style.display='none'; app.style.display='block';
    const name = currentUser.username.charAt(0).toUpperCase()+currentUser.username.slice(1);
    const { showToast } = requireUX();
    showToast(`Bem-vindo, ${name}!`, 'success');
    applyRoleVisibility();
    // refresh after auth
    import('./alunos.js').then(m=>{ m.renderTabela(); m.refreshDashboard(); });
  });

  btnLogout?.addEventListener('click', ()=>{
    currentUser=null; app.style.display='none'; login.style.display='flex';
  });
}

function applyRoleVisibility(){
  // colaboradores: restringe a seção se necessário (mantém todas, mas data é filtrada por vendedor)
  // se quiser esconder: poderíamos ocultar Config para colaborador
  if (currentUser?.role==='colaborador'){
    document.querySelector('[data-section="config"]')?.classList.add('hidden');
  }else{
    document.querySelector('[data-section="config"]')?.classList.remove('hidden');
  }
}

function requireUX(){ return window.__ux || {}; }
