// assets/js/modules/theme.js
const THEME_KEY = 'autoescolaTheme';

function applyTheme(mode){
  const app = document.getElementById('app');
  if (!app) return;

  if (mode === 'light'){ // Modo Escuro (Deepseek usa 'light' para o tema escuro)
    app.classList.add('theme-light');
    document.documentElement.classList.add('theme-light');
    document.body.classList.add('theme-light');
  } else { // Modo Claro
    app.classList.remove('theme-light');
    document.documentElement.classList.remove('theme-light');
    document.body.classList.remove('theme-light');
  }
  try{ localStorage.setItem(THEME_KEY, mode); }catch(_){}
  updateThemeButtonIcon(mode);
}

function updateThemeButtonIcon(mode) {
  const btn = document.getElementById('btnTheme');
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = 'fas ' + (mode === 'light' ? 'fa-sun' : 'fa-moon');
    }
  }
}

export function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || 'dark'; // Padrão para claro
  applyTheme(saved);

  const btn = document.getElementById('btnTheme');
  if (btn){
    btn.addEventListener('click', ()=>{
      const currentMode = document.getElementById('app').classList.contains('theme-light') ? 'light' : 'dark';
      const nextMode = currentMode === 'light' ? 'dark' : 'light';
      applyTheme(nextMode);
    });
  }
}