import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function handler(event, context) {
  const { httpMethod, queryStringParameters, body } = event;

  // Autenticação básica: você pode implementar validação de token JWT aqui se quiser
  // Para simplificar, assumimos que a função é protegida por Netlify Identity ou outra camada

  try {
    if (httpMethod === 'GET') {
      // Retorna todas as transações do usuário autenticado (ou todas, se admin)
      // Aqui, para simplicidade, retornamos todas as transações
      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .order('data', { ascending: false });

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify(data),
      };
    }

    if (httpMethod === 'POST') {
      // Adiciona uma nova transação
      if (!body) {
        return { statusCode: 400, body: 'Missing request body' };
      }
      const transacao = JSON.parse(body);

      // Validação básica
      if (!transacao.descricao || !transacao.valor || !transacao.tipo || !transacao.data) {
        return { statusCode: 400, body: 'Missing required fields' };
      }

      const { data, error } = await supabase
        .from('transacoes')
        .insert([transacao])
        .select()
        .single();

      if (error) throw error;

      return {
        statusCode: 201,
        body: JSON.stringify(data),
      };
    }

    if (httpMethod === 'DELETE') {
      // Deleta uma transação pelo id
      const id = queryStringParameters?.id;
      if (!id) {
        return { statusCode: 400, body: 'Missing id parameter' };
      }

      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Transação excluída' }),
      };
    }

    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  } catch (error) {
    console.error('Error in transacoes function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}