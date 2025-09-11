// assets/js/modules/storage.js
import { authFetch } from "../utils/authFetch.js";

const KEY = 'autoescolaAlunosV8';
const SELLER_KEY = 'autoescolaSellerCfgV1';
const API = window.API_BASE || null;

async function apiGet(path) {
  const r = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}
async function apiPut(path, body) {
  // Usa authFetch para enviar Authorization: Bearer <token>
  const r = await authFetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text().catch(()=> '');
    console.error('PUT fail', r.status, t);
    throw new Error(`PUT ${path} ${r.status}`);
  }
  return r.json();
}

export async function loadAlunos(){
  if (API) {
    try {
      const list = await apiGet('/alunos');
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
      return list;
    } catch (e) {
      console.warn('API offline, usando local', e);
    }
  }
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveAlunos(list){
  if (API) {
    try {
      await apiPut('/alunos', list);
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
      return;
    } catch (e) {
      console.warn('API offline, salvando local', e);
    }
  }
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export async function loadSellerCfg(){
  if (API) {
    try { 
      return await apiGet('/seller'); 
    } catch (e) { 
      console.warn('API offline, usando local', e); 
    }
  }
  try {
    const raw = localStorage.getItem(SELLER_KEY);
    return raw ? JSON.parse(raw) : { Ewerton:{meta:0, comissao:0}, Darlan:{meta:0, comissao:0} };
  } catch {
    return { Ewerton:{meta:0, comissao:0}, Darlan:{meta:0, comissao:0} };
  }
}

export async function saveSellerCfg(cfg){
  if (API) {
    try { await apiPut('/seller', cfg); return; }
    catch (e) { console.warn('API offline, salvando local', e); }
  }
  try { localStorage.setItem(SELLER_KEY, JSON.stringify(cfg)); } catch {}
}
