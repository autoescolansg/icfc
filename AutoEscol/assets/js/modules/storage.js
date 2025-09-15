// assets/js/modules/storage.js
import { authFetch } from "../utils/authFetch.js";

// Normaliza e valida CPF (11 dígitos)
function normalizeCPF(v) {
  const cpf = String(v || "").replace(/\D/g, "");
  return /^\d{11}$/.test(cpf) ? cpf : null;
}

// ---------- Alunos ----------
export async function apiPutAlunos(alunosArray) {
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
    rows.push({ cpf, data: rest }); // Envia o objeto completo para a coluna 'data'
  }

  if (!rows.length) {
    return;
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
    console.error("PUT alunos fail", res.status, text);
    throw new Error(json?.error || `PUT /alunos ${res.status}`);
  }

  if (descartados.length) {
    console.warn(`Registros de alunos ignorados por CPF inválido: ${descartados.length}`);
  }
  return json;
}

export async function saveAlunos(alunosArray) {
  try {
    await apiPutAlunos(alunosArray); // envia para API
    localStorage.setItem("alunos", JSON.stringify(alunosArray)); // mantém cópia local
  } catch (e) {
    console.warn("API offline ou falha ao salvar alunos, salvando local", e);
    localStorage.setItem("alunos", JSON.stringify(alunosArray));
  }
}

export async function loadAlunos() {
  try {
    const res = await authFetch(`${window.API_BASE}/alunos`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("GET alunos falhou");
    return await res.json();
  } catch (e) {
    console.warn("Falha ao carregar alunos da API, usando local", e);
    const raw = localStorage.getItem("alunos");
    return raw ? JSON.parse(raw) : [];
  }
}

// ---------- Transações Financeiras ----------
export async function apiPostTransacao(transacao) {
  const res = await authFetch(`${window.API_BASE}/transacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transacao),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    console.error("POST transacao fail", res.status, text);
    throw new Error(json?.error || `POST /transacoes ${res.status}`);
  }
  return json;
}

export async function saveTransacoes(transacoesArray) {
  // Esta função agora apenas atualiza o cache local.
  // A persistência na API é feita por apiPostTransacao e apiDeleteTransacao.
  localStorage.setItem("transacoes", JSON.stringify(transacoesArray));
}

export async function loadTransacoes() {
  try {
    const res = await authFetch(`${window.API_BASE}/transacoes`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("GET transacoes falhou");
    return await res.json();
  } catch (e) {
    console.warn("Falha ao carregar transações da API, usando local", e);
    const raw = localStorage.getItem("transacoes");
    return raw ? JSON.parse(raw) : [];
  }
}

// ---------- Configuração de Vendedores ----------
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

export async function saveSellerCfg(cfg) {
  try {
    const res = await authFetch(`${window.API_BASE}/seller`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!res.ok) throw new Error("PUT seller falhou");
    return await res.json();
  } catch (e) {
    console.warn("Falha ao salvar seller cfg na API, salvando local", e);
    // Opcional: salvar localmente se a API falhar
  }
}

// ---------- Gestão de Usuários (Profiles) ----------
export async function loadUsers() {
  try {
    const res = await authFetch(`${window.API_BASE}/profiles`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("GET profiles falhou");
    return await res.json();
  } catch (e) {
    console.warn("Falha ao carregar perfis de usuários da API", e);
    return [];
  }
}

export async function saveUser(userProfile) {
  try {
    const res = await authFetch(`${window.API_BASE}/profiles`, {
      method: "POST", // Usamos POST para criar, o backend pode lidar com PUT para atualizar
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userProfile),
    });
    if (!res.ok) throw new Error("POST profile falhou");
    return await res.json();
  } catch (e) {
    console.error("Falha ao salvar perfil de usuário", e);
    throw e;
  }
}

export async function deleteUser(userId) {
  try {
    const res = await authFetch(`${window.API_BASE}/profiles?id=${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("DELETE profile falhou");
    return await res.json();
  } catch (e) {
    console.error("Falha ao excluir perfil de usuário", e);
    throw e;
  }
}
