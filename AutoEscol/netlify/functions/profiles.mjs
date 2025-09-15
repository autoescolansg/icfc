import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function handler(event, context) {
  const { httpMethod, queryStringParameters, body } = event;

  try {
    if (httpMethod === 'GET') {
      // Retorna todos os perfis
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('email', { ascending: true });

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify(data),
      };
    }

    if (httpMethod === 'POST') {
      // Cria ou atualiza um perfil
      if (!body) {
        return { statusCode: 400, body: 'Missing request body' };
      }
      const profile = JSON.parse(body);

      if (!profile.id || !profile.email || !profile.role) {
        return { statusCode: 400, body: 'Missing required fields (id, email, role)' };
      }

      // Upsert (insere ou atualiza)
      const { data, error } = await supabase
        .from('profiles')
        .upsert([profile], { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify(data),
      };
    }

    if (httpMethod === 'DELETE') {
      // Deleta um perfil e o usuário auth correspondente
      const id = queryStringParameters?.id;
      if (!id) {
        return { statusCode: 400, body: 'Missing id parameter' };
      }

      // Deleta o perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (profileError) throw profileError;

      // Deleta o usuário auth (requer SERVICE_ROLE_KEY)
      const { error: authError } = await supabase.auth.admin.deleteUser (id);

      if (authError) throw authError;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Perfil e usuário excluídos' }),
      };
    }

    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  } catch (error) {
    console.error('Error in profiles function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}