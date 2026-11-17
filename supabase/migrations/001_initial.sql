-- ========================================
-- Schema do blog URE Marília (Fase 2)
-- ARQUIVO APENAS — não aplicado automaticamente.
-- Aplique no projeto Supabase dedicado quando disponível.
-- ========================================

-- Schema
CREATE SCHEMA IF NOT EXISTS blog;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- Tabelas
-- ========================================

CREATE TABLE IF NOT EXISTS blog.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  nome TEXT,
  papel TEXT CHECK (papel IN ('admin', 'editor', 'author')) DEFAULT 'author',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cor TEXT DEFAULT '#2563EB',
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'noticia',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  resumo TEXT,
  conteudo TEXT,
  categoria TEXT,
  tags TEXT[] DEFAULT '{}',
  capa_url TEXT,
  capa_alt TEXT,
  autor_id UUID REFERENCES blog.profiles(id),
  destaque BOOLEAN DEFAULT FALSE,
  fixado BOOLEAN DEFAULT FALSE,
  demo BOOLEAN DEFAULT FALSE,
  publicado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  slug TEXT NOT NULL UNIQUE,
  seo_titulo TEXT,
  seo_descricao TEXT
);

CREATE TABLE IF NOT EXISTS blog.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  conteudo TEXT,
  publicado BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog.settings (
  chave TEXT PRIMARY KEY,
  valor JSONB DEFAULT '{}',
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog.post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES blog.posts(id) ON DELETE CASCADE,
  dados JSONB DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por UUID REFERENCES blog.profiles(id)
);

-- ========================================
-- Row Level Security (RLS)
-- ========================================

ALTER TABLE blog.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.post_revisions ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura (apenas publicados)
CREATE POLICY "posts_public_leitura" ON blog.posts
  FOR SELECT TO anon
  USING (status = 'published' AND publicado_em <= NOW());

CREATE POLICY "categories_public_leitura" ON blog.categories
  FOR SELECT TO anon USING (true);

CREATE POLICY "pages_public_leitura" ON blog.pages
  FOR SELECT TO anon USING (publicado = true);

CREATE POLICY "profiles_public_leitura" ON blog.profiles
  FOR SELECT TO anon USING (true);

-- Políticas para autenticados (autores editam próprios rascunhos)
CREATE POLICY "posts_autor_edicao" ON blog.posts
  FOR ALL TO authenticated
  USING (autor_id = auth.uid() AND status IN ('draft', 'review'))
  WITH CHECK (autor_id = auth.uid());

-- Editor publica qualquer post
CREATE POLICY "posts_editor_publica" ON blog.posts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog.profiles
      WHERE id = auth.uid() AND papel IN ('admin', 'editor')
    )
  );

-- Admin gerencia tudo
CREATE POLICY "admin_gerencia_tudo" ON blog.posts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM blog.profiles
      WHERE id = auth.uid() AND papel = 'admin'
    )
  );

-- ========================================
-- Storage: bucket de mídia
-- ========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Política de leitura pública do bucket media
CREATE POLICY "media_leitura_publica" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'media');

-- Política de escrita para autenticados
CREATE POLICY "media_escrita_autenticada" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');

-- ========================================
-- Trigger de revisões
-- ========================================

CREATE OR REPLACE FUNCTION blog.criar_revisao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO blog.post_revisions (post_id, dados, criado_por)
  VALUES (OLD.id, to_jsonb(OLD), auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_post_revisao
  AFTER UPDATE ON blog.posts
  FOR EACH ROW
  EXECUTE FUNCTION blog.criar_revisao();

-- ========================================
-- Seed: categorias iniciais
-- ========================================

INSERT INTO blog.categories (nome, slug, cor, descricao) VALUES
  ('Notícias', 'noticias', '#2563EB', 'Notícias da rede de ensino de Marília e região.'),
  ('Comunicados', 'comunicados', '#E86454', 'Comunicados oficiais e avisos importantes.'),
  ('Formações', 'formacoes', '#0D9488', 'Formações continuadas e eventos para professores e gestores.'),
  ('Materiais', 'materiais', '#D97706', 'Materiais didáticos e orientações para a sala de aula.'),
  ('Projetos', 'projetos', '#7C3AED', 'Projetos desenvolvidos pelas escolas da URE.')
ON CONFLICT (slug) DO NOTHING;
