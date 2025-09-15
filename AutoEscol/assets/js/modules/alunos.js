// assets/js/modules/alunos.js
import { loadAlunos, saveAlunos, loadSellerCfg } from './storage.js';
import { currentUser } from './auth.js';
import { pushLog } from './logs.js';
import { showToast, calculateMonthlyTrend, validateForm } from './ux.js';
import { authFetch } from '../utils/authFetch.js';

let alunos = [];
let editingCPF = null;

const STEPS = ['foto','aulas_teoricas','prova_teorica','aulas_praticas','baliza_carro','baliza_moto'];

/* ---------- helpers ---------- */
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
function formatDate(ds){ if(!ds) return ''; const d=new Date(ds); return isNaN(d)? ds : new Date(ds).toLocaleDateString('pt-BR') }

export function formatCPF(c){
  if(!c) return '';
  const v=String(c).replace(/\D/g,'');
  if (v.length===11) return v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
  return c;
}
function formatTelefone(t){
  if(!t) return '';
  const v=String(t).replace(/\D/g,'');
  if (v.length===11) return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
  if (v.length===10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`;
  return t;
}
function renderEtapas(a){
  a = ensureEtapas(a);
  const labels = { foto:'Foto', aulas_teoricas:'Teóricas', prova_teorica:'Prova Teórica', aulas_praticas:'Práticas', baliza_carro:'Baliza Carro', baliza_moto:'Baliza Moto' };
  return STEPS.map(key=>{
    const st = a.etapas[key]||{inicio:null,fim:null};
    const done = !!st.fim;
    const on = done ? 'style="opacity:1"' : (st.inicio ? 'style="opacity:.85"' : 'style="opacity:.45"');
    return `<span class="chip" ${on}>${labels[key]}</span>`;
  }).join('');
}

/* ---------- init ---------- */
export async function initAlunos(){
  alunos = await loadAlunos();
  if (!Array.isArray(alunos)) alunos = [];

  document.getElementById('cadastro-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (validateForm(e.target)) {
      await cadastrarAluno();
    }
  });

  // Event listeners para filtros
  document.getElementById('alunosSearchInput')?.addEventListener('input', onFiltersChange);
  document.getElementById('sellerFilter')?.addEventListener('change', onFiltersChange);
  document.getElementById('dateStart')?.addEventListener('change', onFiltersChange);
  document.getElementById('dateEnd')?.addEventListener('change', onFiltersChange);
  document.getElementById('catFilter')?.addEventListener('change', onFiltersChange);
  document.getElementById('btnRefresh')?.addEventListener('click', ()=>{ renderTabela(); refreshDashboard(); });

  const tbody = document.querySelector('#alunosTable tbody');
  tbody?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'excluir') deletarAluno(btn.dataset.cpf);
    if (btn.dataset.edit) openEdit(btn.dataset.cpf);
  });

  document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);
  document.getElementById('btnCancelEdit')?.addEventListener('click', closeModal);
  document.getElementById('editForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validateForm(e.target)) {
      await onSaveEdit();
    }
  });

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

  if (alunos.some(a => a.cpf === cpf)){ showToast('Já existe aluno com esse CPF.', 'danger'); return; }

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
  renderTabela();
  refreshDashboard();
  showToast('Aluno cadastrado com sucesso!', 'success');
}

async function deletarAluno(cpf){
  const aluno = alunos.find(a => a.cpf === cpf);
  if (!aluno) return;

  if (currentUser?.role==='colaborador' && currentUser?.seller !== aluno.vendedor){
    showToast('Você só pode excluir alunos do seu vendedor.', 'danger');
    return;
  }

  if (!confirm(`Excluir aluno ${aluno.nome} (${formatCPF(aluno.cpf)})?`)) return;

  const res = await authFetch(`${window.API_BASE}/alunos?cpf=${cpf}`, { method: 'DELETE' });
  const body = await res.json().catch(()=> ({}));
  if (!res.ok) {
    showToast(body?.error || `Falha ao excluir (${res.status})`, 'danger');
    return;
  }

  alunos = alunos.filter(a => a.cpf !== cpf);
  await saveAlunos(alunos);
  renderTabela();
  refreshDashboard();
  pushLog(`Excluir aluno ${cpf}`);
  showToast('Aluno excluído.', 'warn');
}

/* ---------- Modal edição ---------- */
function openEdit(cpf){
  const aluno = alunos.find(x=>x.cpf===cpf); if(!aluno) return;
  if (currentUser?.role==='colaborador' && currentUser?.seller !== aluno.vendedor){
    showToast('Você só pode editar alunos do seu vendedor.', 'danger');
    return;
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

async function onSaveEdit(){
  if (!editingCPF) return;
  const aluno = alunos.find(x=>x.cpf===editingCPF); if(!aluno) return;
  if (currentUser?.role==='colaborador' && currentUser?.seller !== aluno.vendedor){ showToast('Sem permissão para editar este aluno.', 'danger'); return; }

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
  closeModal();
  renderTabela();
  refreshDashboard();
  showToast('Aluno atualizado!', 'success');
}

/* ---------- filtros/render ---------- */
export function getFiltered(){
  const q=(document.getElementById('alunosSearchInput')?.value||'').toLowerCase();
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
  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-secondary">
          Nenhum aluno encontrado com os filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

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
        <div class="d-flex flex-wrap gap-1 mt-1">
          ${renderEtapas(aluno)}
        </div>
      </td>
      <td>
        <div class="table-actions">
          <button class="btn btn-sm btn-outline-primary" data-edit="1" data-cpf="${aluno.cpf}"><i class="fas fa-pen"></i></button>
          ${canDelete ? `<button class="btn btn-sm btn-danger" data-action="excluir" data-cpf="${aluno.cpf}"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

export async function refreshDashboard(){
  const allAlunos = await loadAlunos();
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

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const totalAlunosCurrentMonth = allAlunos.filter(a => {
    const d = new Date(a.dataCadastro);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const totalAlunosPreviousMonth = allAlunos.filter(a => {
    const d = new Date(a.dataCadastro);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  }).length;

  calculateMonthlyTrend(totalAlunosCurrentMonth, totalAlunosPreviousMonth, 'total-alunos-trend', 'alunos');

  const ewCurrentMonth = allAlunos.filter(a => a.vendedor === 'Ewerton' && new Date(a.dataCadastro).getMonth() === currentMonth && new Date(a.dataCadastro).getFullYear() === currentYear).length;
  const ewPreviousMonth = allAlunos.filter(a => a.vendedor === 'Ewerton' && new Date(a.dataCadastro).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) && new Date(a.dataCadastro).getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear)).length;
  calculateMonthlyTrend(ewCurrentMonth, ewPreviousMonth, 'ewerton-trend', 'alunos');

  const daCurrentMonth = allAlunos.filter(a => a.vendedor === 'Darlan' && new Date(a.dataCadastro).getMonth() === currentMonth && new Date(a.dataCadastro).getFullYear() === currentYear).length;
  const daPreviousMonth = allAlunos.filter(a => a.vendedor === 'Darlan' && new Date(a.dataCadastro).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) && new Date(a.dataCadastro).getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear)).length;
  calculateMonthlyTrend(daCurrentMonth, daPreviousMonth, 'darlan-trend', 'alunos');

  const concluidosCurrentMonth = allAlunos.filter(a => a.statusGeral === 'concluido' && new Date(a.dataCadastro).getMonth() === currentMonth && new Date(a.dataCadastro).getFullYear() === currentYear).length;
  const concluidosPreviousMonth = allAlunos.filter(a => a.statusGeral === 'concluido' && new Date(a.dataCadastro).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) && new Date(a.dataCadastro).getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear)).length;
  calculateMonthlyTrend(concluidosCurrentMonth, concluidosPreviousMonth, 'concluidos-trend', 'alunos');

  const andamentoCurrentMonth = allAlunos.filter(a => a.statusGeral === 'andamento' && new Date(a.dataCadastro).getMonth() === currentMonth && new Date(a.dataCadastro).getFullYear() === currentYear).length;
  const andamentoPreviousMonth = allAlunos.filter(a => a.statusGeral === 'andamento' && new Date(a.dataCadastro).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) && new Date(a.dataCadastro).getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear)).length;
  calculateMonthlyTrend(andamentoCurrentMonth, andamentoPreviousMonth, 'andamento-trend', 'alunos');

  const pendentesCurrentMonth = allAlunos.filter(a => a.statusGeral === 'pendente' && new Date(a.dataCadastro).getMonth() === currentMonth && new Date(a.dataCadastro).getFullYear() === currentYear).length;
  const pendentesPreviousMonth = allAlunos.filter(a => a.statusGeral === 'pendente' && new Date(a.dataCadastro).getMonth() === (currentMonth === 0 ? 11 : currentMonth - 1) && new Date(a.dataCadastro).getFullYear() === (currentMonth === 0 ? currentYear - 1 : currentYear)).length;
  calculateMonthlyTrend(pendentesCurrentMonth, pendentesPreviousMonth, 'pendentes-trend', 'alunos');


  try{
    const cfg = await loadSellerCfg();
    const em = document.getElementById('ewerton-meta'); if (em) em.textContent = `Meta: ${cfg.Ewerton?.meta||0} | Comissão: ${cfg.Ewerton?.comissao||0}%`;
    const dm = document.getElementById('darlan-meta'); if (dm) dm.textContent = `Meta: ${cfg.Darlan?.meta||0} | Comissão: ${cfg.Darlan?.comissao||0}%`;
  }catch(e){ console.warn("Falha ao carregar seller cfg:", e); }
}

/* ---------- hook para realtime.js ---------- */
export function renderAlunosFromList(list) {
  if (Array.isArray(list)) alunos = list.slice();
  renderTabela();
  refreshDashboard();
}
window.renderAlunosFromList = renderAlunosFromList;
