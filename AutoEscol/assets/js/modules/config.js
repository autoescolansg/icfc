// assets/js/modules/config.js (Gestão de Usuários e Configurações de Vendedores)
import { supa, currentUser } from './auth.js';
import { showToast, validateForm } from './ux.js'; // Adicionado validateForm
import { loadUsers, saveUser, deleteUser, loadSellerCfg, saveSellerCfg } from './storage.js';
import { authFetch } from '../utils/authFetch.js'; // Para deletar colaborador

let users = [];
let sellerConfig = {};

export async function initConfig(){
  // Apenas administradores podem acessar esta seção
  const configNavLink = document.querySelector('.sidebar-menu a[data-section="config"]');
  if (configNavLink) {
    if (currentUser?.role !== 'admin') {
      configNavLink.style.display = 'none';
    } else {
      configNavLink.style.display = 'flex'; // Garante que esteja visível para admin
    }
  }

  // Se o usuário não for admin, não inicializa o resto da lógica de gestão de usuários e vendedores
  if (currentUser?.role !== 'admin') {
    return;
  }

  // --- Gestão de Colaboradores ---
  users = await loadUsers();
  if (!Array.isArray(users)) users = [];

  document.getElementById('colaborador-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if (validateForm(e.target)) { // Valida o formulário antes de cadastrar
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

  // --- Configurações de Vendedores ---
  sellerConfig = await loadSellerCfg();
  populateSellerCfgForm();

  document.getElementById('seller-cfg-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    // Não há validação complexa aqui, apenas salvar
    await onSaveSellerCfg();
  });
}

// --- Funções de Gestão de Colaboradores ---
async function cadastrarColaborador(){
  const email = document.getElementById('colaborador-email').value.trim();
  const password = document.getElementById('colaborador-password').value.trim();
  const role = document.getElementById('colaborador-role').value;
  const seller = document.getElementById('colaborador-seller').value;

  // Validações já feitas pelo validateForm, mas mantemos algumas para redundância ou lógica específica
  if (role === 'colaborador' && !seller){
    showToast('Para colaboradores, o vendedor associado é obrigatório.', 'danger');
    // Adiciona classe de erro ao select do vendedor
    document.getElementById('colaborador-seller').classList.add('is-invalid');
    return;
  } else {
    document.getElementById('colaborador-seller').classList.remove('is-invalid');
  }

  try {
    // Cadastrar usuário no Supabase Auth
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

    // Criar/Atualizar perfil na tabela 'profiles'
    const newProfile = {
      id: authData.user.id,
      email: email,
      role: role,
      seller: seller || null
    };

    await saveUser(newProfile); // Salva na tabela 'profiles' via API

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
    // Excluir perfil da tabela 'profiles' e o usuário auth via Netlify Function
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
  users = await loadUsers(); // Recarrega a lista de usuários
  const tbody = document.querySelector('#colaboradoresTable tbody'); if (!tbody) return;
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
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

// --- Funções de Configurações de Vendedores ---
function populateSellerCfgForm() {
  const vendSelect = document.getElementById('cfgVend');
  const metaInput = document.getElementById('cfgMeta');
  const comissaoInput = document.getElementById('cfgComissao');

  if (!vendSelect || !metaInput || !comissaoInput) return;

  // Carrega a config do vendedor selecionado
  vendSelect.addEventListener('change', () => {
    const selectedVend = vendSelect.value;
    const cfg = sellerConfig[selectedVend] || { meta: 0, comissao: 0 };
    metaInput.value = cfg.meta;
    comissaoInput.value = cfg.comissao;
  });

  // Inicializa com o primeiro vendedor
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
