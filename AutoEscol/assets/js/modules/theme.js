
const THEME_KEY='autoescolaTheme';
function apply(mode){
  const root = document.documentElement, body = document.body;
  if (mode==='light'){ root.classList.add('theme-light'); body.classList.add('theme-light'); }
  else { root.classList.remove('theme-light'); body.classList.remove('theme-light'); }
  try{ localStorage.setItem(THEME_KEY, mode); }catch(_){}
}
export function initTheme(){
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  apply(saved);
  const btn = document.getElementById('btnTheme');
  if (btn){
    btn.addEventListener('click', ()=>{
      const cur = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
      const next = cur==='light' ? 'dark' : 'light';
      apply(next);
      const icon = btn.querySelector('i');
      if (icon) icon.className = 'fas ' + (next==='light' ? 'fa-sun' : 'fa-moon');
    });
  }
}
