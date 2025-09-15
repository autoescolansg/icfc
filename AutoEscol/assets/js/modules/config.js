// assets/js/modules/config.js (Gestão de Usuários)
import { supa, currentUser } from './auth.js';
import { showToast } from './ux.js';
import { loadUsers, saveUser, deleteUser } from './storage.js'; // Funções para gerenciar profiles

let users = [];

export async function initConfig(){
  // Apenas administradores podem acessar esta seção
  if (currentUser?.role !== 'admin') {
    // Ocultar a aba de configurações ou desabilitar o acesso
    const configNavLink = document.querySelector('.sidebar-menu a[data-section="config"]');
    if (configNavLink) configNavLink.style.display = 'none';
    return;
  }

  users = await loadUsers();
  if (!Array.isArray(users)) users = [];

  document.getElementById('colaborador-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault(); await cadastrarColaborador();
  });

  const tbody = document.querySelector('#colaboradoresTable tbody');
  tbody?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.action === 'excluir') deletarColaborador(btn.dataset.id);
  });

  renderColaboradoresTable();
}

async function cadastrarColaborador(){
  const email = document.getElementById('colaborador-email').value.trim();
  const password = document.getElementById('colaborador-password').value.trim();
  const role = document.getElementById('colaborador-role').value;
  const seller = document.getElementById('colaborador-seller').value;

  if (!email || !password){
    showToast('Email e Senha são obrigatórios.', 'danger');
    return;
  }
  if (role === 'colaborador' && !seller){
    showToast('Para colaboradores, o vendedor associado é obrigatório.', 'danger');
    return;
  }

  try {
    // Cadastrar usuário no Supabase Auth
    const { data: authData, error: authError } = await supa.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          role: role,
          seller: seller || null // Adiciona role e seller aos metadados do usuário
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

    showToast('Colaborador cadastrado com sucesso!', 'success');
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
    // Excluir perfil da tabela 'profiles'
    await deleteUser(userId);

    // Excluir usuário do Supabase Auth (requer privilégios de admin ou service_role_key no backend)
    // Esta parte geralmente é feita via backend (Netlify Function) para segurança
    // Para simplificar, vamos assumir que a exclusão do profile já é suficiente para o frontend
    // ou que a Netlify Function de deleteUser também cuida do auth.users
    // Se você tiver uma Netlify Function para gerenciar usuários, ela deve ser chamada aqui.
    // Ex: await authFetch(`${window.API_BASE}/users?id=${userId}`, { method: 'DELETE' });

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