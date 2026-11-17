-- ========================================
-- Segurança do admin (Fase 2.2)
-- - Autocadastro só pode criar perfil "author"
-- - Usuário autenticado pode ler o próprio perfil
-- Idempotente.
-- ========================================

DROP POLICY IF EXISTS "profiles_autor_cadastro" ON blog.profiles;
CREATE POLICY "profiles_autor_cadastro" ON blog.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND papel = 'author');

DROP POLICY IF EXISTS "profiles_autor_leitura" ON blog.profiles;
CREATE POLICY "profiles_autor_leitura" ON blog.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());
