-- ========================================
-- Ajustes para o admin gravar no banco (Fase 2.1)
-- Idempotente.
-- ========================================

-- Coluna autor como texto livre (o admin usa o nome do autor, não uma FK)
ALTER TABLE blog.posts ADD COLUMN IF NOT EXISTS autor TEXT;

-- Perfis: permitir autocadastro (próprio perfil) e gestão por admin/editor
DROP POLICY IF EXISTS "profiles_autor_cadastro" ON blog.profiles;
CREATE POLICY "profiles_autor_cadastro" ON blog.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_gerencia" ON blog.profiles;
CREATE POLICY "profiles_admin_gerencia" ON blog.profiles
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM blog.profiles p
    WHERE p.id = auth.uid() AND p.papel IN ('admin', 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM blog.profiles p
    WHERE p.id = auth.uid() AND p.papel IN ('admin', 'editor')
  ));

-- ========================================
-- Bootstrap do primeiro admin
-- ========================================
-- O primeiro usuário deve se cadastrar (signUp) e inserir o próprio perfil.
-- Depois, promova-o a admin rodando no SQL Editor (com service role):
--   UPDATE blog.profiles SET papel = 'admin' WHERE email = 'seu-email@exemplo.com';
