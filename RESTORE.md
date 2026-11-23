# Restore do Supabase — Blog URE Marília

Este guia restaura o projeto `lymrixekprobknxvoomk` a partir de um snapshot
gerado por `scripts/backup-supabase.js`.

## 1. Preparar um projeto novo (ou limpar o atual)

- Crie um projeto Supabase novo.
- Anote a **project ref** e configure `SUPABASE_PROJECT_REF` se for diferente.
- Defina `SUPABASE_PAT` com um token da Management API que tenha acesso ao projeto.

> ⚠️ Nunca rode o restore no projeto de produção sem antes fazer um snapshot atual.

## 2. Aplicar a estrutura (migrações)

As migrações versionadas estão em `supabase/migrations/`. Aplique em ordem:

```bash
for f in supabase/migrations/*.sql; do
  echo "Aplicando $f"
  # via Management API, ou: supabase db push / psql
done
```

Migrações existentes: `001` a `007` (schema `blog`, RLS, perfis, deploy hook,
correção de recursão, anexos e trigger otimizado).

## 3. Reaplicar configurações que não são migração

1. **PostgREST**: garanta que `blog` está em *Exposed schemas*.
   O snapshot `config_postgrest.json` mostra o valor usado (`public,graphql_public,blog`).
2. **Storage**: crie o bucket `media` (público) e as policies de leitura/escrita
   conforme `storage_buckets.json` e `storage_pg_policies.json`.
3. **Auth**:
   - reative a confirmação automática de e-mail se ela estiver desligada;
   - configure os domínios de redirect permitidos (inclua `https://blogeducamar.vercel.app/admin/`).
4. **Deploy Hook**: a URL fica **somente** dentro de `blog.disparar_deploy_hook()`.
   Ela não foi salva no snapshot por segurança — reinsira no SQL da função:

```sql
CREATE OR REPLACE FUNCTION blog.disparar_deploy_hook()
RETURNS TRIGGER AS $fn$
BEGIN
  PERFORM net.http_post(
    url := 'COLOQUE_A_URL_DO_DEPLOY_HOOK_AQUI',
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  RETURN COALESCE(NEW, OLD);
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, net;
```

## 4. Restaurar os dados

Use `POST /v1/projects/{ref}/database/query` com a Management API (ou `psql`)
para cada arquivo `*.json` do snapshot:

- `blog_posts.json` → `blog.posts`
- `blog_profiles.json` → `blog.profiles`
- `blog_categories.json` → `blog.categories`
- `blog_pages.json` → `blog.pages`
- `blog_settings.json` → `blog.settings`
- `blog_post_revisions.json` → `blog.post_revisions`
- `auth_users.json` → **não** inserir diretamente em `auth.users` com senha;
  recrie os usuários via GoTrue Admin API (`POST /auth/v1/admin/users`) usando
  os e-mails do snapshot e uma senha temporária, depois atualize
  `blog.profiles` com o `id` retornado.

> Ordem importante: insira `blog.profiles` **depois** dos usuários do Auth,
> para que os IDs de `auth.users` e `blog.profiles` coincidam.

## 5. Verificação

```sql
SELECT count(*) FROM blog.posts;
SELECT id, email, papel FROM blog.profiles;
SELECT tgname FROM pg_trigger
  WHERE tgrelid='blog.posts'::regclass AND NOT tgisinternal;
```

Depois dispare o Deploy Hook e confirme que o site em
`https://blogeducamar.vercel.app/` foi atualizado.

## 6. Segredos

Após o restore, **rotacione**:

- PAT da Supabase;
- `jwt_secret` do Auth (foi redacionado no backup);
- chaves anon/service role (o anon é pública; a service role não);
- URL do Deploy Hook.
