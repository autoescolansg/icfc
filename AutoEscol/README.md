# AutoEscola NSG – API Serverless (Netlify + Supabase)

Este pacote cria os endpoints `/api/alunos` e `/api/seller` como **Netlify Functions**
e salva os dados no **Supabase (Postgres)**. Ideal para hospedar o **frontend no Netlify**
e manter os dados sincronizados entre vários clientes.

## Passo a passo

1. **Crie um projeto no Supabase** e anote:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY  (não é a anon key)

2. **Crie as tabelas** rodando este SQL no Supabase (SQL editor):

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table if not exists public.alunos (
  id uuid primary key default gen_random_uuid(),
  cpf text unique not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.seller (
  nome text primary key,
  meta numeric not null default 0,
  comissao numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.alunos enable row level security;
alter table public.seller enable row level security;
```

> As Functions usam SERVICE_ROLE_KEY, então não precisa criar policies agora.

3. **No Netlify**, adicione as variáveis de ambiente no site:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. Suba esta pasta para o repositório e faça deploy no Netlify.
   - A rota `/api/*` já aponta para `/.netlify/functions/:splat` via `netlify.toml`.

5. **No frontend**, use API relativa:
   ```html
   <script>window.API_BASE = "/api";</script>
   ```
