// assets/js/modules/alunos.js
import { loadAlunos, saveAlunos, loadSellerCfg } from './storage.js';
import { currentUser } from './auth.js';
import { pushLog } from './logs.js';
import { showToast } from './ux.js';

let alunos = []; // carrega depois (await)
let chartVendedores = null, chartCategorias = null;
let editingCPF = null;

const STEPS = ['foto','aulas_teoricas','prova_teorica','aulas_praticas','baliza_carro','baliza_moto'];

/* ---------- Helpers / formatação ---------- */
function ensureEtapas(a){
  a.etapas = a.etapas || {
    foto:{inicio:null,fim:null},
    aulas_teoricas:{inicio:null,fim:null},
    prova_teorica:{inicio:null,fim:null},
    aulas_praticas:{inicio:null,fim:null},
    baliza_carro:{inicio:null,fim:null},
    baliza_moto:{inicio:null,fim:null}
  };
  return a;
}
function formatDate(ds){ if(!ds) return ''; const d=new Date(ds); return isNaN(d)? ds : d.toLocaleDateString('pt-BR') }
function formatCPF(c){ if(!c) return ''; const v=String(c).replace(/\D/g,''); return v.length===11? v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'): c }
function formatTelefone(t){ if(!t) return ''; const v=String(t).replace(/\D/g,''); if (v.length===11) return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`; if (v.length===10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`; return t; }
function renderEtapas(a){
  a = ensureEtapas(a);
  const labels = { foto:'Foto', aulas_teoricas:'Teóricas', prova_teorica:'Prova Teórica', aulas_praticas:'Práticas', baliza_carro:'Baliza Carro', baliza_moto:'Baliza Moto' };
  return STEPS.map(key=>{
    const st = a.etapas[key]||{inicio:null,fim:null};
    const done = !!st.fim;
    const on = done ? 'style="opacity:1"' : (st.inicio ? 'style="opacity:.85"' : 'style="opacity:.45"');
    return `<span class="chip" ${on}>${labels[key]}</span>`;
  });
}

/* ---------- Init ---------- */
export async function initAlunos(){
  alunos = await loadAlunos();
  if (!Array.isArray(alunos)) alunos = [];

  // Cadastro
  document.getElementById('cadastro-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault(); await cadastrarAluno();
  });

  // Filtros
  document.getElementById('searchInput')?.addEventListener('input', onFiltersChange);
  document.getElementById('sellerFilter')?.addEventListener('change', onFiltersChange);
  document.getElementById('dateStart')?.addEventListener('change', onFiltersChange);
  document.getElementById('dateEnd')?.addEventListener('change', onFiltersChange);
  document.getElementById('catFilter')?.addEventListener('change', onFiltersChange);
  document.getElementById('btnRefresh')?.addEventListener('click', ()=>{ renderTabela(); refreshDashboard(); });

  // Ações da tabela
  const tbody = document.querySelector('#alunosTable tbody');
  tbody?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'excluir') deletarAluno(btn.dataset.cpf);
    if (btn.dataset.edit) openEdit(btn.dataset.cpf);
  });

  // Modal edição
  document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEdit')?.addEventListener('click', closeModal);
  document.getElementById('editForm')?.addEventListener('submit', onSaveEdit);

  renderTabela();
  refreshDashboard();
}

function onFiltersChange(){ renderTabela(); refreshDashboard(); }

/* ---------- CRUD ---------- */
async function cadastrarAluno(){
  const nome = document.getElementById('nome').value.trim();
  const cpf  = document.getElementById('cpf').value.replace(/\D/g,'');
  const telefone = document.getElementById('telefone').value.trim();
  const categoria = document.getElementById('categoria').value;
  const dataCadastro = document.getElementById('data-cadastro').value || new Date().toISOString().slice(0,10);
  const vendedor = document.getElementById('vendedor').value;

  if (!nome || !cpf){ alert('Preencha nome e CPF'); return; }
  if (alunos.some(a => a.cpf === cpf)){ alert('Já existe aluno com esse CPF'); return; }

  const novo = {
    nome, cpf, telefone, categoria, dataCadastro, vendedor,
    statusGeral: 'pendente',
    etapas: {
      foto:{inicio:null,fim:null},
      aulas_teoricas:{inicio:null,fim:null},
      prova_teorica:{inicio:null,fim:null},
      aulas_praticas:{inicio:null,fim:null},
      baliza_carro:{inicio:null,fim:null},
      baliza_moto:{inicio:null,fim:null}
    }
  };
  alunos.unshift(novo);
  await saveAlunos(alunos);
  try{ document.getElementById('cadastro-form').reset(); }catch(_){}
  pushLog(`Cadastrar aluno ${novo.cpf} (${novo.nome}) vendedor=${novo.vendedor}`);
  renderTabela(); refreshDashboard(); showToast('Aluno cadastrado!', 'success');
}

function deletarAluno(cpf){
  const aluno = alunos.find(a => a.cpf === cpf);
  if (!aluno) return;
  if (currentUser?.role==='colaborador' && currentUser?.seller !== aluno.vendedor){
    alert('Você só pode excluir/altera alunos do seu vendedor.'); return;
  }
  if (!confirm('Excluir aluno?')) return;
  alunos = alunos.filter(a => a.cpf !== cpf);
  saveAlunos(alunos);
  pushLog(`Excluir aluno ${cpf}`);
  renderTabela(); refreshDashboard(); showToast('Aluno excluído.', 'warn');
}

/* ---------- Modal edição ---------- */
function openEdit(cpf){
  const aluno = alunos.find(x=>x.cpf===cpf); if(!aluno) return;
  if (currentUser?.role==='colaborador' && currentUser?.seller !== aluno.vendedor){
    alert('Você só pode editar alunos do seu vendedor.'); return;
  }
  editingCPF = cpf;
  document.getElementById('edNome').value = aluno.nome||'';
  document.getElementById('edTelefone').value = aluno.telefone||'';
  document.getElementById('edCategoria').value = aluno.categoria||'B';
  document.getElementById('edVendedor').value = aluno.vendedor||'Ewerton';

  const et = ensureEtapas(aluno).etapas;
  const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.value = val? String(val).slice(0,10):''; };
  set('edFotoIni', et.foto.inicio); set('edFotoFim', et.foto.fim);
  set('edTeoIni', et.aulas_teoricas.inicio); set('edTeoFim', et.aulas_teoricas.fim);
  set('edProvaIni', et.prova_teorica.inicio); set('edProvaFim', et.prova_teorica.fim);
  set('edPraIni', et.aulas_praticas.inicio); set('edPraFim', et.aulas_praticas.fim);
  set('edCarIni', et.baliza_carro.inicio); set('edCarFim', et.baliza_carro.fim);
  set('edMotoIni', et.baliza_moto.inicio); set('edMotoFim', et.baliza_moto.fim);

  document.getElementById('editModal').style.display='flex';
}
function closeModal(){ const m=document.getElementById('editModal'); if(m) m.style.display='none'; }

async function onSaveEdit(e){
  e.preventDefault();
  if (!editingCPF) return;
  const aluno = alunos.find(x=>x.cpf===editingCPF); if(!aluno) return;
  if (currentUser?.role==='colaborador' && currentUser?.seller !== aluno.vendedor){ alert('Sem permissão'); return; }

  aluno.nome = document.getElementById('edNome').value.trim();
  aluno.telefone = document.getElementById('edTelefone').value.trim();
  aluno.categoria = document.getElementById('edCategoria').value;
  aluno.vendedor = document.getElementById('edVendedor').value;

  const v = (id)=>{ const el=document.getElementById(id); return el && el.value ? el.value : null; };
  aluno.etapas = {
    foto:{inicio:v('edFotoIni'), fim:v('edFotoFim')},
    aulas_teoricas:{inicio:v('edTeoIni'), fim:v('edTeoFim')},
    prova_teorica:{inicio:v('edProvaIni'), fim:v('edProvaFim')},
    aulas_praticas:{inicio:v('edPraIni'), fim:v('edPraFim')},
    baliza_carro:{inicio:v('edCarIni'), fim:v('edCarFim')},
    baliza_moto:{inicio:v('edMotoIni'), fim:v('edMotoFim')}
  };

  const steps = STEPS.map(k=>aluno.etapas[k]||{});
  const allDone = steps.every(s=>!!s.fim);
  const anyStarted = steps.some(s=>!!s.inicio || !!s.fim);
  aluno.statusGeral = allDone ? 'concluido' : (anyStarted ? 'andamento' : 'pendente');

  await saveAlunos(alunos);
  pushLog(`Editar aluno ${aluno.cpf} (${aluno.nome})`);
  closeModal(); renderTabela(); refreshDashboard(); showToast('Aluno atualizado!', 'success');
}

/* ---------- Filtro & Render ---------- */
export function getFiltered(){
  const q=(document.getElementById('searchInput')?.value||'').toLowerCase();
  const sellerFilter=document.getElementById('sellerFilter')?.value||'todos';
  const catFilter=document.getElementById('catFilter')?.value||'todas';
  const dS=document.getElementById('dateStart')?.value||'';
  const dE=document.getElementById('dateEnd')?.value||'';
  const start=dS?new Date(dS):null; const end=dE?new Date(dE):null;

  let data = Array.isArray(alunos) ? alunos.slice() : [];
  if (sellerFilter!=='todos') data=data.filter(a=>a.vendedor===sellerFilter);
  if (currentUser?.role==='colaborador' && currentUser?.seller) data=data.filter(a=>a.vendedor===currentUser.seller);
  if (q) data=data.filter(a=>(a.nome?.toLowerCase().includes(q) || a.cpf?.includes(q)));
  if (catFilter!=='todas') data=data.filter(a=>a.categoria===catFilter);
  if (start) data=data.filter(a=> new Date(a.dataCadastro)>=start);
  if (end) data=data.filter(a=> new Date(a.dataCadastro)<=end);
  return data;
}

export function renderTabela(){
  const tbody = document.querySelector('#alunosTable tbody'); if (!tbody) return;
  tbody.innerHTML = '';
  const data = getFiltered();
  data.forEach(aluno => {
    const status = aluno.statusGeral === 'concluido' ? 'Concluído' : aluno.statusGeral === 'andamento' ? 'Em Andamento' : 'Pendente';
    const statusClass = aluno.statusGeral === 'concluido' ? 'status-concluido' : aluno.statusGeral === 'andamento' ? 'status-andamento' : 'status-pendente';
    const canDelete = (currentUser?.role === 'admin') || (currentUser?.role === 'colaborador' && currentUser?.seller === aluno.vendedor);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${aluno.nome}</td>
      <td>${formatCPF(aluno.cpf)}</td>
      <td>${formatTelefone(aluno.telefone)}</td>
      <td>${formatDate(aluno.dataCadastro)}</td>
      <td>${aluno.vendedor || '-'}</td>
      <td>
        <span class="status-badge ${statusClass}">${status}</span>
        <div style="margin-top:.25rem; display:flex; gap:.25rem; flex-wrap:wrap">
          ${renderEtapas(aluno).join('')}
        </div>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-outline" data-edit="1" data-cpf="${aluno.cpf}"><i class="fas fa-pen"></i></button>
          ${canDelete ? `<button class="btn btn-sm btn-danger" data-action="excluir" data-cpf="${aluno.cpf}"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

export async function refreshDashboard(){
  const data = getFiltered();
  const total = data.length;
  const concluidos = data.filter(a => a.statusGeral === 'concluido').length;
  const andamento = data.filter(a => a.statusGeral === 'andamento').length;
  const pendentes = data.filter(a => !a.statusGeral || a.statusGeral === 'pendente').length;
  const ew = data.filter(a => a.vendedor==='Ewerton').length;
  const da = data.filter(a => a.vendedor==='Darlan').length;

  const el = (id,v)=>{const e=document.getElementById(id); if(e) e.textContent=String(v)};
  el('total-alunos', total); el('concluidos', concluidos); el('andamento', andamento); el('pendentes', pendentes);
  el('ewerton-count', ew); el('darlan-count', da);

  try{
    const cfg = await loadSellerCfg();  // vem da API/local
    const em = document.getElementById('ewerton-meta'); if (em) em.textContent = `Meta: ${cfg.Ewerton?.meta||0} | Comissão: ${cfg.Ewerton?.comissao||0}%`;
    const dm = document.getElementById('darlan-meta'); if (dm) dm.textContent = `Meta: ${cfg.Darlan?.meta||0} | Comissão: ${cfg.Darlan?.comissao||0}%`;
  }catch(e){
    console.warn("Falha ao carregar seller cfg:", e);
  }

  updateCharts(data);
}

function updateCharts(data){
  // Proteção: só desenha se Chart existir e os canvas estiverem presentes
  if (!window.Chart) {
    console.warn("Chart.js não carregado; pulando gráficos.");
    return;
  }
  const cv = document.getElementById('chartVendedores');
  const cc = document.getElementById('chartCategorias');
  if (!cv || !cc) return;

  const ctxV = cv.getContext('2d');
  const ctxC = cc.getContext('2d');
  if (!ctxV || !ctxC) return;

  const byVend = ['Ewerton','Darlan'].map(s => data.filter(a=>a.vendedor===s).length);
  const cats = ['A','B','AB'].map(c => data.filter(a=>a.categoria===c).length);

  const indigo = '#6366F1', emerald='#22C55E', amber='#F59E0B';

  if (!chartVendedores){
    chartVendedores = new Chart(ctxV, {
      type:'bar',
      data:{ labels:['Ewerton','Darlan'], datasets:[{ label:'Alunos', data:byVend, backgroundColor:[indigo, emerald] }]},
      options:{ responsive:true, plugins:{ legend:{display:false}}}
    });
  } else {
    chartVendedores.data.datasets[0].data = byVend;
    chartVendedores.update();
  }

  if (!chartCategorias){
    chartCategorias = new Chart(ctxC, {
      type:'doughnut',
      data:{ labels:['A','B','AB'], datasets:[{ data:cats, backgroundColor:[indigo, emerald, amber] }]},
      options:{ responsive:true }
    });
  } else {
    chartCategorias.data.datasets[0].data = cats;
    chartCategorias.update();
  }
}

// --- realtime: permite o refresco imediato vindo do Supabase ---
export function renderAlunosFromList(list) {
  if (Array.isArray(list)) alunos = list.slice();
  renderTabela();
  refreshDashboard();
}
window.renderAlunosFromList = renderAlunosFromList;
