// assets/js/modules/financeiro.js
import { loadTransacoes, apiPostTransacao, saveTransacoes, loadAlunos } from './storage.js';
import { showToast, formatCurrency, calculateMonthlyTrend, validateForm } from './ux.js';
import { authFetch } from '../utils/authFetch.js';
import { formatCPF } from './alunos.js';

let transacoes = [];
let alunosList = [];
let chartBalancoMensal = null;

/* ---------- helpers ---------- */
function formatDate(ds){ if(!ds) return ''; const d=new Date(ds); return isNaN(d)? ds : new Date(ds).toLocaleDateString('pt-BR') }

/* ---------- init ---------- */
export async function initFinanceiro(){
  transacoes = await loadTransacoes();
  if (!Array.isArray(transacoes)) transacoes = [];

  alunosList = await loadAlunos();
  populateAlunosSelect();

  document.getElementById('entrada-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (validateForm(e.target)) {
      await adicionarEntrada();
    }
  });
  document.getElementById('saida-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (validateForm(e.target)) {
      await adicionarSaida();
    }
  });

  document.getElementById('btnRefreshFinanceiro')?.addEventListener('click', ()=>{ refreshFinanceiroDashboard(); });

  // Event listeners para filtros de entradas
  document.getElementById('entradaDateStart')?.addEventListener('change', renderEntradasTable);
  document.getElementById('entradaDateEnd')?.addEventListener('change', renderEntradasTable);

  // Event listeners para filtros de saídas
  document.getElementById('saidaDateStart')?.addEventListener('change', renderSaidasTable);
  document.getElementById('saidaDateEnd')?.addEventListener('change', renderSaidasTable);

  // Event listeners para exclusão de transações
  document.querySelector('#entradasTable tbody')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'excluir') deletarTransacao(btn.dataset.id);
  });
  document.querySelector('#saidasTable tbody')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'excluir') deletarTransacao(btn.dataset.id);
  });
  document.getElementById('recent-transactions-list')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'excluir') deletarTransacao(btn.dataset.id);
  });


  refreshFinanceiroDashboard();
  renderEntradasTable();
  renderSaidasTable();
}

function populateAlunosSelect() {
  const select = document.getElementById('entrada-cliente-cpf');
  if (!select) return;

  while (select.options.length > 1) {
    select.remove(1);
  }

  alunosList.forEach(aluno => {
    const option = document.createElement('option');
    option.value = aluno.cpf;
    option.textContent = `${aluno.nome} (${formatCPF(aluno.cpf)})`;
    select.appendChild(option);
  });
}

/* ---------- CRUD Entradas ---------- */
async function adicionarEntrada(){
  const descricao = document.getElementById('entrada-descricao').value.trim();
  const valor = parseFloat(document.getElementById('entrada-valor').value);
  const categoria = document.getElementById('entrada-categoria').value.trim();
  const data = document.getElementById('entrada-data').value;
  const clienteCpf = document.getElementById('entrada-cliente-cpf').value;

  const novaTransacao = {
    descricao, valor, tipo: 'entrada', categoria, data,
    cliente_cpf: clienteCpf || null,
    conta: 'Caixa',
    forma_pagamento: 'Dinheiro'
  };

  try {
    const newTransaction = await apiPostTransacao(novaTransacao);
    transacoes.unshift(newTransaction);
    await saveTransacoes(transacoes);

    document.getElementById('entrada-form').reset();
    document.getElementById('entrada-data').valueAsDate = new Date();
    showToast('Entrada registrada com sucesso!', 'success');
    refreshFinanceiroDashboard();
    renderEntradasTable();
  } catch (e) {
    console.error('Erro ao adicionar entrada:', e);
    showToast('Erro ao adicionar entrada: ' + e.message, 'danger');
  }
}

/* ---------- CRUD Saídas ---------- */
async function adicionarSaida(){
  const descricao = document.getElementById('saida-descricao').value.trim();
  const valor = parseFloat(document.getElementById('saida-valor').value);
  const categoria = document.getElementById('saida-categoria').value;
  const data = document.getElementById('saida-data').value;
  const conta = document.getElementById('saida-conta').value;
  const formaPagamento = document.getElementById('saida-forma-pagamento').value;
  const nomeRecebedor = document.getElementById('saida-nome-recebedor').value.trim();

  const novaTransacao = {
    descricao, valor, tipo: 'saida', categoria, data,
    conta, forma_pagamento: formaPagamento,
    nome_recebedor: nomeRecebedor || null
  };

  try {
    const newTransaction = await apiPostTransacao(novaTransacao);
    transacoes.unshift(newTransaction);
    await saveTransacoes(transacoes);

    document.getElementById('saida-form').reset();
    document.getElementById('saida-data').valueAsDate = new Date();
    showToast('Saída registrada com sucesso!', 'success');
    refreshFinanceiroDashboard();
    renderSaidasTable();
  } catch (e) {
    console.error('Erro ao adicionar saída:', e);
    showToast('Erro ao adicionar saída: ' + e.message, 'danger');
  }
}

/* ---------- Deletar Transação ---------- */
async function deletarTransacao(id){
  if (!confirm('Tem certeza que deseja excluir esta transação?')) return;

  try {
    const res = await authFetch(`${window.API_BASE}/transacoes?id=${id}`, { method: 'DELETE' });
    const body = await res.json().catch(()=> ({}));
    if (!res.ok) throw new Error(body?.error || `Falha ao excluir transação (${res.status})`);

    transacoes = transacoes.filter(t => t.id !== id);
    await saveTransacoes(transacoes);
    showToast('Transação excluída.', 'warn');
    refreshFinanceiroDashboard();
    renderEntradasTable();
    renderSaidasTable();
  } catch (e) {
    console.error('Erro ao excluir transação:', e);
    showToast('Erro ao excluir transação: ' + e.message, 'danger');
  }
}

/* ---------- Renderização de Tabelas ---------- */
export function getFilteredEntradas(){
  const dS=document.getElementById('entradaDateStart')?.value||'';
  const dE=document.getElementById('entradaDateEnd')?.value||'';
  const start=dS?new Date(dS):null; const end=dE?new Date(dE):null;

  let data = transacoes.filter(t => t.tipo === 'entrada');
  if (start) data = data.filter(t => new Date(t.data) >= start);
  if (end) data = data.filter(t => new Date(t.data) <= end);
  return data.sort((a,b) => new Date(b.data) - new Date(a.data));
}

export function renderEntradasTable(){
  const tbody = document.querySelector('#entradasTable tbody'); if (!tbody) return;
  tbody.innerHTML = '';
  const data = getFilteredEntradas();

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-secondary">
          Nenhuma entrada registrada.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(t.data)}</td>
      <td>${t.descricao}</td>
      <td>${t.categoria || '-'}</td>
      <td>${t.cliente_cpf ? formatCPF(t.cliente_cpf) : '-'}</td>
      <td class="text-success">${formatCurrency(t.valor)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-danger" data-action="excluir" data-id="${t.id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

export function getFilteredSaidas(){
  const dS=document.getElementById('saidaDateStart')?.value||'';
  const dE=document.getElementById('saidaDateEnd')?.value||'';
  const start=dS?new Date(dS):null; const end=dE?new Date(dE):null;

  let data = transacoes.filter(t => t.tipo === 'saida');
  if (start) data = data.filter(t => new Date(t.data) >= start);
  if (end) data = data.filter(t => new Date(t.data) <= end);
  return data.sort((a,b) => new Date(b.data) - new Date(a.data));
}

export function renderSaidasTable(){
  const tbody = document.querySelector('#saidasTable tbody'); if (!tbody) return;
  tbody.innerHTML = '';
  const data = getFilteredSaidas();

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-secondary">
          Nenhuma saída registrada.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(t.data)}</td>
      <td>${t.descricao}</td>
      <td>${t.categoria || '-'}</td>
      <td>${t.conta || '-'}</td>
      <td>${t.forma_pagamento || '-'}</td>
      <td>${t.nome_recebedor || '-'}</td>
      <td class="text-danger">${formatCurrency(t.valor)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-danger" data-action="excluir" data-id="${t.id}"><i class="fas fa-trash"></i></button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function renderRecentTransactions() {
  const listEl = document.getElementById('recent-transactions-list');
  if (!listEl) return;

  const recent = transacoes.slice(0, 5).sort((a,b) => new Date(b.created_at || b.data) - new Date(a.created_at || a.data));
  listEl.innerHTML = '';

  if (recent.length === 0) {
    listEl.innerHTML = `<p class="text-center py-3 text-secondary">Nenhuma transação recente.</p>`;
    return;
  }

  recent.forEach(t => {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    const valorClass = t.tipo === 'entrada' ? 'amount-income' : 'amount-expense';
    const iconClass = t.tipo === 'entrada' ? 'success-icon' : 'danger-icon';
    item.innerHTML = `
      <div class="transaction-info">
        <div class="transaction-icon ${iconClass}">
          <i class="fas fa-solid fa-arrow-${t.tipo === 'entrada' ? 'up' : 'down'}"></i>
        </div>
        <div>
          <div class="transaction-description">${t.descricao}</div>
          <div class="transaction-date">${formatDate(t.data)}</div>
        </div>
      </div>
      <div class="transaction-amount ${valorClass}">
        ${formatCurrency(t.valor)}
        <button class="btn btn-sm btn-danger" data-action="excluir" data-id="${t.id}"><i class="fas fa-trash"></i></button>
      </div>
    `;
    listEl.appendChild(item);
  });
}


/* ---------- Dashboard Financeiro ---------- */
export async function refreshFinanceiroDashboard(){
  const allTransacoes = await loadTransacoes();

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

  const saldoAtual = allTransacoes.reduce((sum, t) => sum + (t.tipo === 'entrada' ? t.valor : -t.valor), 0);


  const el = (id,v)=>{const e=document.getElementById(id); if(e) e.textContent=String(v)};
  el('saldo-atual', formatCurrency(saldoAtual));
  el('entradas-mes', formatCurrency(entradasMes));
  el('saidas-mes', formatCurrency(saidasMes));

  calculateMonthlyTrend(saldoMes, saldoMesAnterior, 'saldo-trend', 'financeiro');
  calculateMonthlyTrend(entradasMes, entradasMesAnterior, 'entradas-trend', 'financeiro');
  calculateMonthlyTrend(saidasMes, saidasMesAnterior, 'saidas-trend', 'financeiro', true);

  renderBalancoMensalChart(transacoesCurrentMonth);
  renderRecentTransactions();
}

function renderBalancoMensalChart(transacoesMesAtual) {
  const ctx = document.getElementById('chartBalancoMensal')?.getContext('2d');
  if (!ctx) return;

  const today = new Date();
  const diasNoMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const labels = Array.from({ length: diasNoMes }, (_, i) => (i + 1).toString());

  const entradasPorDia = new Array(diasNoMes).fill(0);
  const saidasPorDia = new Array(diasNoMes).fill(0);

  transacoesMesAtual.forEach(t => {
    const dia = new Date(t.data).getDate() - 1;
    if (dia >= 0 && dia < diasNoMes) {
      if (t.tipo === 'entrada') {
        entradasPorDia[dia] += t.valor;
      } else {
        saidasPorDia[dia] += t.valor;
      }
    }
  });

  if (chartBalancoMensal) {
    chartBalancoMensal.data.labels = labels;
    chartBalancoMensal.data.datasets[0].data = entradasPorDia;
    chartBalancoMensal.data.datasets[1].data = saidasPorDia;
    chartBalancoMensal.update();
  } else {
    chartBalancoMensal = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Entradas',
            data: entradasPorDia,
            backgroundColor: 'var(--success)',
            borderColor: 'var(--success)',
            borderWidth: 1
          },
          {
            label: 'Saídas',
            data: saidasPorDia,
            backgroundColor: 'var(--danger)',
            borderColor: 'var(--danger)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'var(--text-color-secondary)' // Cor da legenda
            }
          },
          title: {
            display: false,
            text: 'Balanço Mensal'
          }
        },
        scales: {
          x: {
            stacked: true,
            title: {
              display: true,
              text: 'Dia do Mês',
              color: 'var(--text-color-secondary)'
            },
            ticks: {
              color: 'var(--text-color-secondary)' // Cor dos ticks do eixo X
            },
            grid: {
              color: 'rgba(var(--border-color), 0.5)' // Cor da grade
            }
          },
          y: {
            stacked: true,
            title: {
              display: true,
              text: 'Valor (R$)',
              color: 'var(--text-color-secondary)'
            },
            beginAtZero: true,
            ticks: {
              color: 'var(--text-color-secondary)' // Cor dos ticks do eixo Y
            },
            grid: {
              color: 'rgba(var(--border-color), 0.5)' // Cor da grade
            }
          }
        }
      }
    });
  }
}


/* ---------- hook para realtime.js ---------- */
export function renderTransacoesFromList(list) {
  if (Array.isArray(list)) transacoes = list.slice();
  refreshFinanceiroDashboard();
  renderEntradasTable();
  renderSaidasTable();
}
window.renderTransacoesFromList = renderTransacoesFromList;
