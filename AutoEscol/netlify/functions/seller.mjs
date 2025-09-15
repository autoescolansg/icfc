import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function handler(event, context) {
  const { httpMethod, body } = event;

  try {
    if (httpMethod === 'GET') {
      // Retorna as configurações de todos os vendedores
      const { data, error } = await supabase
        .from('seller')
        .select('*');

      if (error) throw error;

      // Formata para um objeto { nome: { meta, comissao } }
      const formattedData = data.reduce((acc, item) => {
        acc[item.nome] = { meta: item.meta, comissao: item.comissao };
        return acc;
      }, {});

      return {
        statusCode: 200,
        body: JSON.stringify(formattedData),
      };
    }

    if (httpMethod === 'PUT') {
      // Atualiza as configurações de vendedores
      if (!body) {
        return { statusCode: 400, body: 'Missing request body' };
      }
      const sellerConfigs = JSON.parse(body); // Espera um objeto como { "Ewerton": { meta: X, comissao: Y }, "Darlan": { meta: A, comissao: B } }

      const updates = Object.keys(sellerConfigs).map(name => ({
        nome: name,
        meta: sellerConfigs[name].meta,
        comissao: sellerConfigs[name].comissao,
      }));

      // Usa upsert para inserir ou atualizar
      const { data, error } = await supabase
        .from('seller')
        .upsert(updates, { onConflict: 'nome' })
        .select();

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  } catch (error) {
    console.error('Error in seller function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
