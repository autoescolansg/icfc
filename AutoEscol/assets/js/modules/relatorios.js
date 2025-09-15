// assets/js/modules/relatorios.js
import { loadTransacoes, loadAlunos, loadSellerCfg } from './storage.js';
import { showToast, formatCurrency } from './ux.js';
import { formatCPF } from './alunos.js';

let allTransacoes = [];
let allAlunos = [];
let sellerConfig = {}; // Adicionado para carregar as configurações dos vendedores

export async function initRelatorios() {
  allTransacoes = await loadTransacoes();
  allAlunos = await loadAlunos();
  sellerConfig = await loadSellerCfg(); // Carrega as configurações dos vendedores

  const relatorioMensalMesAno = document.getElementById('relatorio-mensal-mesano');
  if (relatorioMensalMesAno) {
    relatorioMensalMesAno.value = new Date().toISOString().slice(0, 7);
  }

  document.getElementById('btnGerarRelatorioMensal')?.addEventListener('click', gerarRelatorioMensal);
  document.getElementById('btnGerarRelatorioPeriodo')?.addEventListener('click', gerarRelatorioPeriodo);
  document.getElementById('btnGerarRelatorioCliente')?.addEventListener('click', gerarRelatorioCliente);
  document.getElementById('btnGerarRelatorioVendedor')?.addEventListener('click', gerarRelatorioVendedor); // NOVO: Event listener para o relatório de vendedor

  populateRelatorioClienteSelect();
  populateRelatorioVendedorSelect(); // NOVO: Popula o select de vendedores

  const relatorioTabs = document.getElementById('relatorioTabs');
  if (relatorioTabs) {
    relatorioTabs.addEventListener('click', (e) => {
      const target = e.target.closest('.nav-link');
      if (!target) return;

      e.preventDefault();
      
      document.querySelectorAll('#relatorioTabs .nav-link').forEach(link => link.classList.remove('active'));
      document.querySelectorAll('#relatorioTabsContent .tab-pane').forEach(pane => pane.classList.remove('show', 'active'));

      target.classList.add('active');
      
      const targetPaneId = target.dataset.bsTarget;
      const targetPane = document.querySelector(targetPaneId);
      if (targetPane) {
        targetPane.classList.add('show', 'active');
      }
    });
    document.getElementById('mensal-tab')?.click();
  }
}

function populateRelatorioClienteSelect() {
  const select = document.getElementById('relatorio-cliente-cpf');
  if (!select) return;

  while (select.options.length > 1) {
    select.remove(1);
  }

  allAlunos.forEach(aluno => {
    const option = document.createElement('option');
    option.value = aluno.cpf;
    option.textContent = `${aluno.nome} (${formatCPF(aluno.cpf)})`;
    select.appendChild(option);
  });
}

// NOVO: Função para popular o select de vendedores
function populateRelatorioVendedorSelect() {
  const select = document.getElementById('relatorio-vendedor-nome');
  if (!select) return;

  while (select.options.length > 1) {
    select.remove(1);
  }

  // Pega os nomes dos vendedores das configurações ou dos alunos
  const vendedores = new Set(Object.keys(sellerConfig).concat(allAlunos.map(a => a.vendedor)).filter(Boolean));
  
  vendedores.forEach(vendedor => {
    const option = document.createElement('option');
    option.value = vendedor;
    option.textContent = vendedor;
    select.appendChild(option);
  });
}

async function gerarRelatorioMensal() {
  const mesAno = document.getElementById('relatorio-mensal-mesano').value;
  if (!mesAno) {
    showToast('Selecione um mês e ano para o relatório mensal.', 'danger');
    return;
  }

  const [year, month] = mesAno.split('-').map(Number);
  const filteredTransacoes = allTransacoes.filter(t => {
    const d = new Date(t.data);
    return d.getFullYear() === year && (d.getMonth() + 1) === month;
  });

  renderRelatorio(filteredTransacoes, `Relatório Mensal: ${month}/${year}`);
}

async function gerarRelatorioPeriodo() {
  const dataInicio = document.getElementById('relatorio-periodo-inicio').value;
  const dataFim = document.getElementById('relatorio-periodo-fim').value;

  if (!dataInicio || !dataFim) {
    showToast('Selecione as datas de início e fim para o relatório por período.', 'danger');
    return;
  }

  const start = new Date(dataInicio + 'T00:00:00');
  const end = new Date(dataFim + 'T23:59:59');

  const filteredTransacoes = allTransacoes.filter(t => {
    const d = new Date(t.data + 'T00:00:00');
    return d >= start && d <= end;
  });

  renderRelatorio(filteredTransacoes, `Relatório por Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`);
}

async function gerarRelatorioCliente() {
  const clienteCpf = document.getElementById('relatorio-cliente-cpf').value;

  let filteredTransacoes = allTransacoes.filter(t => t.tipo === 'entrada');

  let titulo = 'Relatório de Entradas por Cliente';
  if (clienteCpf) {
    filteredTransacoes = filteredTransacoes.filter(t => t.cliente_cpf === clienteCpf);
    const aluno = allAlunos.find(a => a.cpf === clienteCpf);
    titulo += `: ${aluno ? aluno.nome : formatCPF(clienteCpf)}`;
  } else {
    titulo += ': Todos os Clientes';
  }

  renderRelatorio(filteredTransacoes, titulo);
}

// NOVO: Função para gerar o relatório de vendedor
async function gerarRelatorioVendedor() {
  const vendedorNome = document.getElementById('relatorio-vendedor-nome').value;
  const dataInicio = document.getElementById('relatorio-vendedor-inicio').value;
  const dataFim = document.getElementById('relatorio-vendedor-fim').value;

  if (!vendedorNome) {
    showToast('Selecione um vendedor para o relatório.', 'danger');
    return;
  }
  if (!dataInicio || !dataFim) {
    showToast('Selecione as datas de início e fim para o relatório do vendedor.', 'danger');
    return;
  }

  const start = new Date(dataInicio + 'T00:00:00');
  const end = new Date(dataFim + 'T23:59:59');

  // Filtra alunos pelo vendedor e período
  const alunosDoVendedor = allAlunos.filter(aluno => 
    aluno.vendedor === vendedorNome &&
    new Date(aluno.dataCadastro + 'T00:00:00') >= start &&
    new Date(aluno.dataCadastro + 'T00:00:00') <= end
  );

  // Filtra transações de entrada associadas a esses alunos e dentro do período
  const cpfsAlunosDoVendedor = alunosDoVendedor.map(a => a.cpf);
  const entradasDoVendedor = allTransacoes.filter(t =>
    t.tipo === 'entrada' &&
    cpfsAlunosDoVendedor.includes(t.cliente_cpf) &&
    new Date(t.data + 'T00:00:00') >= start &&
    new Date(t.data + 'T00:00:00') <= end
  );

  const totalAlunos = alunosDoVendedor.length;
  const totalVendas = entradasDoVendedor.reduce((sum, t) => sum + t.valor, 0);
  const configVendedor = sellerConfig[vendedorNome] || { meta: 0, comissao: 0 };
  const metaAlunos = configVendedor.meta;
  const comissaoPercent = configVendedor.comissao;
  const valorComissao = (totalVendas * comissaoPercent) / 100;

  let html = `<h3>Relatório de Vendas: ${vendedorNome}</h3>`;
  html += `<p>Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}</p>`;

  html += `
    <div class="stats-grid mb-4">
      <div class="stat-card">
        <div class="stat-header">
          <h4 class="stat-title">Alunos Cadastrados</h4>
          <div class="stat-icon">
            <i class="fa-solid fa-users"></i>
          </div>
        </div>
        <h3 class="stat-value">${totalAlunos}</h3>
        <p class="text-secondary">Meta: ${metaAlunos} alunos</p>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <h4 class="stat-title">Total de Vendas</h4>
          <div class="stat-icon success-icon">
            <i class="fa-solid fa-dollar-sign"></i>
          </div>
        </div>
        <h3 class="stat-value text-success">${formatCurrency(totalVendas)}</h3>
        <p class="text-secondary">Comissão: ${comissaoPercent}%</p>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <h4 class="stat-title">Comissão Estimada</h4>
          <div class="stat-icon">
            <i class="fa-solid fa-hand-holding-dollar"></i>
          </div>
        </div>
        <h3 class="stat-value">${formatCurrency(valorComissao)}</h3>
        <p class="text-secondary">Baseado em ${formatCurrency(totalVendas)}</p>
      </div>
    </div>
  `;

  if (alunosDoVendedor.length === 0 && entradasDoVendedor.length === 0) {
    html += `<p class="text-center text-secondary py-3">Nenhum aluno ou venda encontrado para este vendedor no período.</p>`;
  } else {
    html += `
      <h4 class="section-subtitle mt-4 mb-3">Alunos Cadastrados por ${vendedorNome}</h4>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Data Matrícula</th>
              <th>Status Geral</th>
            </tr>
          </thead>
          <tbody>
      `;
    alunosDoVendedor.forEach(aluno => {
      html += `
        <tr>
          <td>${aluno.nome}</td>
          <td>${formatCPF(aluno.cpf)}</td>
          <td>${formatDate(aluno.dataCadastro)}</td>
          <td><span class="status-badge status-${aluno.statusGeral}">${aluno.statusGeral}</span></td>
        </tr>
      `;
    });
    html += `
          </tbody>
        </table>
      </div>
    `;

    html += `
      <h4 class="section-subtitle mt-4 mb-3">Entradas Financeiras Associadas</h4>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Cliente</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
      `;
    entradasDoVendedor.forEach(t => {
      const alunoAssociado = allAlunos.find(a => a.cpf === t.cliente_cpf);
      html += `
        <tr>
          <td>${formatDate(t.data)}</td>
          <td>${t.descricao}</td>
          <td>${alunoAssociado ? alunoAssociado.nome : formatCPF(t.cliente_cpf)}</td>
          <td class="text-success">${formatCurrency(t.valor)}</td>
        </tr>
      `;
    });
    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  const resultadosDiv = document.getElementById('relatorio-resultados');
  if (resultadosDiv) {
    resultadosDiv.innerHTML = html;
  }
}


function renderRelatorio(data, titulo) {
  const resultadosDiv = document.getElementById('relatorio-resultados');
  if (!resultadosDiv) return;

  let html = `<h3>${titulo}</h3>`;

  if (data.length === 0) {
    html += `<p class="text-center text-secondary py-3">Nenhum resultado encontrado para este relatório.</p>`;
    resultadosDiv.innerHTML = html;
    return;
  }

  const entradas = data.filter(t => t.tipo === 'entrada');
  const saidas = data.filter(t => t.tipo === 'saida');

  const totalEntradas = entradas.reduce((sum, t) => sum + t.valor, 0);
  const totalSaidas = saidas.reduce((sum, t) => sum + t.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  html += `
    <div class="stats-grid mb-4">
      <div class="stat-card">
        <div class="stat-header">
          <h4 class="stat-title">Total Entradas</h4>
          <div class="stat-icon success-icon">
            <i class="fa-solid fa-arrow-up"></i>
          </div>
        </div>
        <h3 class="stat-value text-success">${formatCurrency(totalEntradas)}</h3>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <h4 class="stat-title">Total Saídas</h4>
          <div class="stat-icon danger-icon">
            <i class="fa-solid fa-arrow-down"></i>
          </div>
        </div>
        <h3 class="stat-value text-danger">${formatCurrency(totalSaidas)}</h3>
      </div>
      <div class="stat-card">
        <div class="stat-header">
          <h4 class="stat-title">Saldo Final</h4>
          <div class="stat-icon">
            <i class="fa-solid fa-wallet"></i>
          </div>
        </div>
        <h3 class="stat-value ${saldo >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(saldo)}</h3>
      </div>
    </div>
  `;

  html += `
    <h4 class="section-subtitle mt-4 mb-3">Detalhes das Transações</h4>
    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Cliente/Recebedor</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
    `;

  data.sort((a,b) => new Date(b.data) - new Date(a.data)).forEach(t => {
    const valorClass = t.tipo === 'entrada' ? 'text-success' : 'text-danger';
    const clienteRecebedor = t.tipo === 'entrada' ? (t.cliente_cpf ? formatCPF(t.cliente_cpf) : '-') : (t.nome_recebedor || '-');
    html += `
      <tr>
        <td>${formatDate(t.data)}</td>
        <td>${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
        <td>${t.descricao}</td>
        <td>${t.categoria || '-'}</td>
        <td>${clienteRecebedor}</td>
        <td class="${valorClass}">${formatCurrency(t.valor)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  resultadosDiv.innerHTML = html;
}

/* ---------- hook para realtime.js ---------- */
export async function renderRelatoriosFromList(transacoesList, alunosListUpdated) {
  if (Array.isArray(transacoesList)) allTransacoes = transacoesList.slice();
  if (Array.isArray(alunosListUpdated)) allAlunos = alunosListUpdated.slice();
  sellerConfig = await loadSellerCfg(); // Recarrega as configurações dos vendedores
  populateRelatorioClienteSelect();
  populateRelatorioVendedorSelect(); // NOVO: Atualiza o select de vendedores
  // Se um relatório estiver ativo, re-renderiza
  const activeTab = document.querySelector('#relatorioTabs .nav-link.active');
  if (activeTab) {
    const tabId = activeTab.id;
    if (tabId === 'mensal-tab') gerarRelatorioMensal();
    else if (tabId === 'periodo-tab') gerarRelatorioPeriodo();
    else if (tabId === 'clientes-tab') gerarRelatorioCliente();
    else if (tabId === 'vendedor-tab') gerarRelatorioVendedor(); // NOVO: Re-renderiza o relatório de vendedor
  }
}
window.renderRelatoriosFromList = renderRelatoriosFromList;
