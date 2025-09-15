// assets/js/modules/config.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { showToast } from './ux.js'; // Importa showToast

const SUPABASE_URL_KEY = 'supabase_url';
const SUPABASE_ANON_KEY_KEY = 'supabase_key';

export function initConfig() {
  const btnSaveConfig = document.getElementById('btnSaveConfig');
  const supabaseUrlInput = document.getElementById('supabase-url');
  const supabaseKeyInput = document.getElementById('supabase-key');

  // Carregar configuração salva ao iniciar
  loadConfig();

  btnSaveConfig?.addEventListener('click', async () => {
    const url = supabaseUrlInput.value.trim();
    const key = supabaseKeyInput.value.trim();

    if (url && key) {
      localStorage.setItem(SUPABASE_URL_KEY, url);
      localStorage.setItem(SUPABASE_ANON_KEY_KEY, key);
      
      // Define as variáveis globais para outros módulos
      window.SUPABASE_URL = url;
      window.SUPABASE_ANON_KEY = key;

      await testConnection(url, key);
      // Dispara um evento para que outros módulos saibam que a configuração está pronta
      window.dispatchEvent(new Event('config:ready'));
    } else {
      showToast('Por favor, preencha ambos os campos de configuração do Supabase.', 'danger');
    }
  });

  // Define a data de matrícula padrão para hoje no formulário de cadastro
  const dataMatriculaInput = document.getElementById('data-cadastro');
  if (dataMatriculaInput) {
    dataMatriculaInput.valueAsDate = new Date();
  }
}

function loadConfig() {
  const savedUrl = localStorage.getItem(SUPABASE_URL_KEY);
  const savedKey = localStorage.getItem(SUPABASE_ANON_KEY_KEY);
  
  const supabaseUrlInput = document.getElementById('supabase-url');
  const supabaseKeyInput = document.getElementById('supabase-key');

  if (savedUrl && savedKey) {
    if (supabaseUrlInput) supabaseUrlInput.value = savedUrl;
    if (supabaseKeyInput) supabaseKeyInput.value = savedKey;

    // Define as variáveis globais imediatamente se a configuração já existe
    window.SUPABASE_URL = savedUrl;
    window.SUPABASE_ANON_KEY = savedKey;
    window.dispatchEvent(new Event('config:ready')); // Dispara o evento
  }
}

async function testConnection(url, key) {
  try {
    const testSupabase = createClient(url, key);
    
    // Testar uma consulta simples para verificar a conexão
    const { error } = await testSupabase
      .from('alunos')
      .select('count')
      .limit(1);
    
    if (error && error.code === '42P01') { // '42P01' é o código para "undefined_table"
      showToast('Conexão bem-sucedida! A tabela "alunos" não existe ainda, mas você pode criá-la conforme o README.', 'warn');
    } else if (error) {
      throw error;
    } else {
      showToast('Conexão Supabase bem-sucedida! Configuração salva.', 'success');
    }
  } catch (error) {
    console.error('Erro de conexão com Supabase:', error);
    showToast('Erro na conexão com Supabase: ' + error.message + '\nVerifique se a URL e a chave estão corretas.', 'danger');
  }
}