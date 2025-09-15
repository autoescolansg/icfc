// assets/js/modules/ux.js
export function showToast(message, type='info'){
  const el = document.getElementById('toast'); if (!el) return;
  el.textContent = message;
  el.className = 'toast show ' + (type||'');
  setTimeout(()=>{ el.classList.remove('show'); }, 2000);
}
// expose for simple require from auth
window.__ux = { showToast };
