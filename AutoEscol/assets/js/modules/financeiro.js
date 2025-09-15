// assets/js/modules/financeiro.js
import { loadTransacoes, saveTransacoes } from './storage.js';
import { showToast, formatCurrency, calculateMonthlyTrend } from './ux.js';
import { authFetch } from '../utils/authFetch.js';
import { formatCPF } from './alunos.js'; // Reutiliza formatCPF

let transacoes = [];

/* ---------- helpers ---------- */
function formatDate(ds){ if(!ds) return ''; const d=new Date(ds); return isNaN(d)? ds : new Date(ds).toLocaleDateString('pt-BR') }

/* ---------- init ---------- */
export async function initFinanceiro(){
  transacoes = await loadTransacoes();
  if (!Array.isArray(transacoes)) transacoes = [];

  document.getElementById('transacao-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault(); await adicionarTransacao();
  });

  document.getElementById('btnRefreshFinanceiro')?.addEventListener('click', ()=>{ refreshFinanceiroDashboard(); renderTransacoesTable(); });
  document.getElementById('transacaoDateStart')?.addEventListener('change', renderTransacoesTable);
  document.getElementById('transacaoDateEnd')?.addEventListener('change', renderTransacoesTable);
  document.getElementById('transacaoTipoFilter')?.addEventListener('change', renderTransacoesTable);

  const tbody = document.querySelector('#transacoesTable tbody');
  tbody?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'excluir') deletarTransacao(btn.dataset.id);
  });

  refreshFinanceiroDashboard();
  renderTransacoesTable();
}

/* ---------- CRUD ---------- */
async function adicionarTransacao(){
  const descricao = document.getElementById('transacao-descricao').value.trim();
  const valor = parseFloat(document.getElementById('transacao-valor').value);
  const tipo = document.getElementById('transacao-tipo').value;
  const categoria = document.getElementById('transacao-categoria').value.trim();
  const data = document.getElementById('transacao-data').value;
  const clienteCpf = document.getElementById('transacao-cliente-cpf').value.replace(/\D/g,'');

  if (!descricao || isNaN(valor) || valor <= 0 || !tipo || !data){
    showToast('Preencha todos os campos obrigatórios (Descrição, Valor, Tipo, Data).', 'danger');
    return;
  }

  const novaTransacao = {
    descricao, valor, tipo, categoria, data,
    cliente_cpf: clienteCpf || null
  };

  transacoes.unshift(novaTransacao); // Adiciona no início da lista
  await saveTransacoes(transacoes); // Salva na API e localmente
  try{ document.getElementById('transacao-form').reset(); }catch(_){}
  document.getElementById('transacao-data').valueAsDate = new Date(); // Reseta a data para hoje
  showToast('Transação adicionada com sucesso!', 'success');
  refreshFinanceiroDashboard();
  renderTransacoesTable();
}

async function deletarTransacao(id){
  if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

  // Chama API DELETE (com token via authFetch)
  const res = await authFetch(`${window.API_BASE}/transacoes?id=${id}`, { method: 'DELETE' });
  const body = await res.json().catch(()=> ({}));
  if (!res.ok) {
    showToast(body?.error || `Falha ao excluir transação (${res.status})`, 'danger');
    return;
  }

  transacoes = transacoes.filter(t => t.id !== id);
  await saveTransacoes(transacoes); // Salva a lista atualizada após exclusão
  showToast('Transação excluída.', 'warn');
  refreshFinanceiroDashboard();
  renderTransacoesTable();
}

/* ---------- Renderização ---------- */
export function getFilteredTransacoes(){
  const dS=document.getElementById('transacaoDateStart')?.value||'';
  const dE=document.getElementById('transacaoDateEnd')?.value||'';
  const tipoFilter=document.getElementById('transacaoTipoFilter')?.value||'todos';
  const start=dS?new Date(dS):null; const end=dE?new Date(dE):null;

  let data = Array.isArray(transacoes) ? transacoes.slice() : [];

  if (tipoFilter !== 'todos') data = data.filter(t => t.tipo === tipoFilter);
  if (start) data = data.filter(t => new Date(t.data) >= start);
  if (end) data = data.filter(t => new Date(t.data) <= end);

  return data;
}

export function renderTransacoesTable(){
  const tbody = document.querySelector('#transacoesTable tbody'); if (!tbody) return;
  tbody.innerHTML = '';
  const data = getFilteredTransacoes();

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          Nenhuma transação encontrada com os filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(t => {
    const tr = document.createElement('tr');
    const valorClass = t.tipo === 'entrada' ? 'text-success' : 'text-danger';
    tr.innerHTML = `
      <td>${formatDate(t.data)}</td>
      <td>${t.descricao}</td>
      <td>${t.categoria || '-'}</td>
      <td>${t.cliente_cpf ? formatCPF(t.cliente_cpf) : '-'}</td>
      <td>${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
      <td class="${valorClass}">${formatCurrency(t.valor)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-danger" data-action="excluir" data-id="${t.id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

export async function refreshFinanceiroDashboard(){
  const allTransacoes = await loadTransacoes(); // Carrega todas as transações para o cálculo de tendência

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const transacoesCurrentMonth = allTransacoes.filter(t => {
    const d = new Date(t.data);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const transacoesPreviousMonth = allTransacoes.filter(t => {
    const d = new Date(t.data);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const entradasMes = transacoesCurrentMonth.filter(t => t.tipo === 'entrada').reduce((sum, t) => sum + t.valor, 0);
  const saidasMes = transacoesCurrentMonth.filter(t => t.tipo === 'saida').reduce((sum, t) => sum + t.valor, 0);
  const saldoMes = entradasMes - saidasMes;

  const entradasMesAnterior = transacoesPreviousMonth.filter(t => t.tipo === 'entrada').reduce((sum, t) => sum + t.valor, 0);
  const saidasMesAnterior = transacoesPreviousMonth.filter(t => t.tipo === 'saida').reduce((sum, t) => sum + t.valor, 0);
  const saldoMesAnterior = entradasMesAnterior - saidasMesAnterior;

  // Saldo atual (considerando todas as transações até hoje)
  const saldoAtual = allTransacoes.reduce((sum, t) => sum + (t.tipo === 'entrada' ? t.valor : -t.valor), 0);


  const el = (id,v)=>{const e=document.getElementById(id); if(e) e.textContent=String(v)};
  el('saldo-atual', formatCurrency(saldoAtual));
  el('entradas-mes', formatCurrency(entradasMes));
  el('saidas-mes', formatCurrency(saidasMes));

  // Calcular e exibir tendências
  calculateMonthlyTrend(saldoMes, saldoMesAnterior, 'saldo-trend', 'financeiro');
  calculateMonthlyTrend(entradasMes, entradasMesAnterior, 'entradas-trend', 'financeiro');
  calculateMonthlyTrend(saidasMes, saidasMesAnterior, 'saidas-trend', 'financeiro', true); // Inverter para saídas
}

/* ---------- hook para realtime.js ---------- */
export function renderTransacoesFromList(list) {
  if (Array.isArray(list)) transacoes = list.slice();
  refreshFinanceiroDashboard();
  renderTransacoesTable();
}
window.renderTransacoesFromList = renderTransacoesFromList;