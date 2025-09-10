const KEY = 'autoescolaAlunosV8';
const SELLER_KEY = 'autoescolaSellerCfgV1';
const API = window.API_BASE || null;

async function apiGet(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}
async function apiPut(path, body) {
  const r = await fetch(`${API}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`PUT ${path} ${r.status}`);
  return r.json();
}

export async function loadAlunos(){
  if (API) {
    try { return await apiGet('/alunos'); }
    catch (e) { console.warn('API offline, usando localStorage', e); }
  }
  try{ const raw = localStorage.getItem(KEY); return raw? JSON.parse(raw): []; }catch{ return []; }
}
export async function saveAlunos(list){
  if (API) {
    try { await apiPut('/alunos', list); return; }
    catch (e) { console.warn('API offline, salvando local', e); }
  }
  try{ localStorage.setItem(KEY, JSON.stringify(list)); }catch{}
}
export async function loadSellerCfg(){
  if (API) {
    try { return await apiGet('/seller'); }
    catch (e) { console.warn('API offline, usando local', e); }
  }
  try{ const raw = localStorage.getItem(SELLER_KEY); return raw? JSON.parse(raw): { Ewerton:{meta:0, comissao:0}, Darlan:{meta:0, comissao:0} }; }catch{
    return { Ewerton:{meta:0, comissao:0}, Darlan:{meta:0, comissao:0} };
  }
}
export async function saveSellerCfg(cfg){
  if (API) {
    try { await apiPut('/seller', cfg); return; }
    catch (e) { console.warn('API offline, salvando local', e); }
  }
  try{ localStorage.setItem(SELLER_KEY, JSON.stringify(cfg)); }catch{}
}
