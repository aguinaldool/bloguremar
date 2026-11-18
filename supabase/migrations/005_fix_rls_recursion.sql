-- ========================================
-- Correção de recursão infinita nas policies e trigger de perfil (Fase 2.3)
-- Usa função SECURITY DEFINER para consultar o papel do usuário
-- sem disparar recursão de RLS em blog.profiles.
-- Idempotente.
-- ========================================

CREATE OR REPLACE FUNCTION blog.meu_papel()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = blog, public
AS $$
  SELECT papel FROM blog.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION blog.meu_papel() TO anon, authenticated, service_role;

-- Trigger automática: todo usuário criado em auth.users ganha perfil em blog.profiles
CREATE OR REPLACE FUNCTION blog.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = blog, public
AS $fn$
BEGIN
  INSERT INTO blog.profiles (id, email, nome, papel)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'papel', 'author')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        nome = COALESCE(EXCLUDED.nome, blog.profiles.nome),
        papel = COALESCE(NEW.raw_user_meta_data->>'papel', blog.profiles.papel);
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION blog.handle_new_user();

-- Garantir que todos os usuários existentes em auth.users tenham perfil em blog.profiles
INSERT INTO blog.profiles (id, email, nome, papel)
SELECT id, email, split_part(email, '@', 1), 'admin'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Recriar policies de blog.profiles sem auto-referência recursiva
DROP POLICY IF EXISTS "profiles_public_leitura" ON blog.profiles;
DROP POLICY IF EXISTS "profiles_autor_leitura" ON blog.profiles;
DROP POLICY IF EXISTS "profiles_autor_cadastro" ON blog.profiles;
DROP POLICY IF EXISTS "profiles_admin_gerencia" ON blog.profiles;

CREATE POLICY "profiles_autor_leitura" ON blog.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR blog.meu_papel() IN ('admin', 'editor'));

CREATE POLICY "profiles_autor_cadastro" ON blog.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    (id = auth.uid() AND papel = 'author')
    OR blog.meu_papel() IN ('admin', 'editor')
  );

CREATE POLICY "profiles_admin_gerencia" ON blog.profiles
  FOR ALL TO authenticated
  USING (blog.meu_papel() IN ('admin', 'editor'))
  WITH CHECK (blog.meu_papel() IN ('admin', 'editor'));

-- Recriar policies de blog.posts usando blog.meu_papel() e com WITH CHECK explícito
DROP POLICY IF EXISTS "posts_public_leitura" ON blog.posts;
DROP POLICY IF EXISTS "posts_autor_edicao" ON blog.posts;
DROP POLICY IF EXISTS "posts_editor_publica" ON blog.posts;
DROP POLICY IF EXISTS "admin_gerencia_tudo" ON blog.posts;

CREATE POLICY "posts_public_leitura" ON blog.posts
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR blog.meu_papel() IN ('admin', 'editor') OR autor_id = auth.uid());

CREATE POLICY "posts_autor_edicao" ON blog.posts
  FOR ALL TO authenticated
  USING (autor_id = auth.uid() AND status IN ('draft', 'review'))
  WITH CHECK (autor_id = auth.uid());

CREATE POLICY "posts_editor_publica" ON blog.posts
  FOR ALL TO authenticated
  USING (blog.meu_papel() IN ('admin', 'editor'))
  WITH CHECK (blog.meu_papel() IN ('admin', 'editor'));

CREATE POLICY "admin_gerencia_tudo" ON blog.posts
  FOR ALL TO authenticated
  USING (blog.meu_papel() = 'admin')
  WITH CHECK (blog.meu_papel() = 'admin');

-- Permitir que post_revisions seja inserida pelo trigger quando autenticado
DROP POLICY IF EXISTS "revisions_authenticated_all" ON blog.post_revisions;
CREATE POLICY "revisions_authenticated_all" ON blog.post_revisions
  FOR ALL TO authenticated
  USING (blog.meu_papel() IN ('admin', 'editor') OR criado_por = auth.uid())
  WITH CHECK (true);
