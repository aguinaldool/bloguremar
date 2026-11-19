-- ========================================
-- Adiciona coluna de anexos nos posts
-- Idempotente.
-- ========================================

-- Coluna de anexos (array JSON com informações dos arquivos no Google Drive)
-- Estrutura: [{ id, nome, tamanho, tipo, url, driveId }]
ALTER TABLE blog.posts ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]';

-- Garantir que posts existentes tenham array vazio (não null)
UPDATE blog.posts SET anexos = '[]'::jsonb WHERE anexos IS NULL;
