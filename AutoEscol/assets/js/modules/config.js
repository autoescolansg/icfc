// assets/js/modules/config.js (Gestão de Usuários e Configurações de Vendedores)
import { supa, currentUser } from './auth.js';
import { showToast, validateForm } from './ux.js';
import { loadUsers, saveUser, deleteUser, loadSellerCfg, saveSellerCfg } from './storage.js';
import { authFetch } from '../utils/authFetch.js';

let users = [];
let sellerConfig = {};

export async function initConfig(){
  const configNavLink = document.querySelector('.sidebar-nav .nav-link[data-section="config"]');
  if (configNavLink) {
    if (currentUser?.role !== 'admin') {
      configNavLink.style.display = 'none';
    } else {
      configNavLink.style.display = 'flex';
    }
  }

  if (currentUser?.role !== 'admin') {
    return;
  }

  users = await loadUsers();
  if (!Array.isArray(users)) users = [];

  document.getElementById('colaborador-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (validateForm(e.target)) {
      await cadastrarColaborador();
    }
  });

  const tbody = document.querySelector('#colaboradoresTable tbody');
  tbody?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'excluir') deletarColaborador(btn.dataset.id);
  });

  renderColaboradoresTable();

  sellerConfig = await loadSellerCfg();
  populateSellerCfgForm();

  document.getElementById('seller-cfg-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    await onSaveSellerCfg();
  });
}

async function cadastrarColaborador(){
  const email = document.getElementById('colaborador-email').value.trim();
  const password = document.getElementById('colaborador-password').value.trim();
  const role = document.getElementById('colaborador-role').value;
  const seller = document.getElementById('colaborador-seller').value;

  if (role === 'colaborador' && !seller){
    showToast('Para colaboradores, o vendedor associado é obrigatório.', 'danger');
    document.getElementById('colaborador-seller').classList.add('is-invalid');
    return;
  } else {
    document.getElementById('colaborador-seller').classList.remove('is-invalid');
  }

  try {
    const { data: authData, error: authError } = await supa.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          role: role,
          seller: seller || null
        }
      }
    });

    if (authError) throw authError;

    const newProfile = {
      id: authData.user.id,
      email: email,
      role: role,
      seller: seller || null
    };

    await saveUser(newProfile);

    showToast('Colaborador cadastrado com sucesso! Verifique o email para confirmação.', 'success');
    document.getElementById('colaborador-form').reset();
    renderColaboradoresTable();

  } catch (error) {
    console.error('Erro ao cadastrar colaborador:', error);
    showToast('Erro ao cadastrar colaborador: ' + error.message, 'danger');
  }
}

async function deletarColaborador(userId){
  if (!confirm('Tem certeza que deseja excluir este colaborador? Isso removerá o usuário do sistema.')) return;

  try {
    const res = await authFetch(`${window.API_BASE}/profiles?id=${userId}`, { method: 'DELETE' });
    const body = await res.json().catch(()=> ({}));
    if (!res.ok) throw new Error(body?.error || `Falha ao excluir colaborador (${res.status})`);

    showToast('Colaborador excluído.', 'warn');
    renderColaboradoresTable();
  } catch (error) {
    console.error('Erro ao excluir colaborador:', error);
    showToast('Erro ao excluir colaborador: ' + error.message, 'danger');
  }
}

export async function renderColaboradoresTable(){
  users = await loadUsers();
  const tbody = document.querySelector('#colaboradoresTable tbody'); if (!tbody) return;
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-secondary">
          Nenhum colaborador cadastrado.
        </td>
      </tr>
    `;
    return;
  }

  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.email}</td>
      <td>${user.role === 'admin' ? 'Administrador' : 'Colaborador'}</td>
      <td>${user.seller || '-'}</td>
      <td>
        <div class="table-actions">
          ${user.id !== currentUser.id ? `<button class="btn btn-sm btn-danger" data-action="excluir" data-id="${user.id}"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

function populateSellerCfgForm() {
  const vendSelect = document.getElementById('cfgVend');
  const metaInput = document.getElementById('cfgMeta');
  const comissaoInput = document.getElementById('cfgComissao');

  if (!vendSelect || !metaInput || !comissaoInput) return;

  vendSelect.addEventListener('change', () => {
    const selectedVend = vendSelect.value;
    const cfg = sellerConfig[selectedVend] || { meta: 0, comissao: 0 };
    metaInput.value = cfg.meta;
    comissaoInput.value = cfg.comissao;
  });

  const initialVend = vendSelect.value;
  const cfg = sellerConfig[initialVend] || { meta: 0, comissao: 0 };
  metaInput.value = cfg.meta;
  comissaoInput.value = cfg.comissao;
}

async function onSaveSellerCfg() {
  const vend = document.getElementById('cfgVend').value;
  const meta = parseInt(document.getElementById('cfgMeta').value || '0', 10);
  const com = parseFloat(document.getElementById('cfgComissao').value || '0');

  sellerConfig[vend] = { meta, comissao: com };
  await saveSellerCfg(sellerConfig);
  showToast('Configurações salvas para ' + vend, 'success');
}
