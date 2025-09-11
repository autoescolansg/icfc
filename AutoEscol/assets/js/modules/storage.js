// assets/js/modules/storage.js
import { authFetch } from "../utils/authFetch.js";

// Normaliza e valida CPF (11 dígitos)
function normalizeCPF(v) {
  const cpf = String(v || "").replace(/\D/g, "");
  return /^\d{11}$/.test(cpf) ? cpf : null;
}

export async function apiPut(alunosArray) {
  const rows = [];
  const descartados = [];

  for (const a of (alunosArray || [])) {
    const cpf = normalizeCPF(a?.cpf ?? a?.CPF ?? a?.data?.cpf);
    if (!cpf) {
      descartados.push(a);
      continue;
    }
    // remove duplicatas de campo CPF
    const { cpf: _1, CPF: _2, ...rest } = a || {};
    rows.push({ cpf, ...rest });
  }

  if (!rows.length) {
    throw new Error("Nenhum CPF válido para enviar (precisa ter 11 dígitos).");
  }

  const res = await authFetch(`${window.API_BASE}/alunos`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rows),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    console.error("PUT fail", res.status, text);
    throw new Error(json?.error || `PUT /alunos ${res.status}`);
  }

  if (descartados.length) {
    console.warn(`Registros ignorados por CPF inválido: ${descartados.length}`);
  }
  return json;
}

export async function saveAlunos(alunosArray) {
  try {
    await apiPut(alunosArray); // envia para API
    localStorage.setItem("alunos", JSON.stringify(alunosArray)); // mantém cópia local
  } catch (e) {
    console.warn("API offline, salvando local", e);
    localStorage.setItem("alunos", JSON.stringify(alunosArray));
  }
}

export async function loadAlunos() {
  try {
    const res = await authFetch(`${window.API_BASE}/alunos`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("GET falhou");
    return await res.json();
  } catch (e) {
    console.warn("Falha ao carregar da API, usando local", e);
    const raw = localStorage.getItem("alunos");
    return raw ? JSON.parse(raw) : [];
  }
}

// Config de vendedores
export async function loadSellerCfg() {
  try {
    const res = await authFetch(`${window.API_BASE}/seller`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("GET seller falhou");
    return await res.json();
  } catch (e) {
    console.warn("Falha seller cfg, usando padrão", e);
    return { Ewerton: { meta: 0, comissao: 0 }, Darlan: { meta: 0, comissao: 0 } };
  }
}
