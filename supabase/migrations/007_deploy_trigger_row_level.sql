-- ========================================
-- Otimização do deploy hook: 1 build por mudança pública relevante
-- ----------------------------------------
-- O upsert do PostgREST (INSERT ... ON CONFLICT DO UPDATE) dispara
-- statement-level triggers de INSERT e UPDATE. Com o trigger anterior
-- (FOR EACH STATEMENT), cada "Salvar" gerava 2 builds na Vercel.
--
-- Esta migration substitui o trigger por 3 triggers FOR EACH ROW:
--   - INSERT: só quando o post nasce publicado
--   - UPDATE: só quando o post é/era publicado E algum campo público mudou
--   - DELETE: só quando o post excluído estava publicado
--
-- Rascunhos e mudanças internas (ex.: atualizado_em) não geram build.
-- A função blog.disparar_deploy_hook() NÃO é alterada — a URL do hook
-- (segredo) permanece intacta no banco.
-- Idempotente.
-- ========================================

DROP TRIGGER IF EXISTS trg_deploy_hook ON blog.posts;
DROP TRIGGER IF EXISTS trg_deploy_hook_insert ON blog.posts;
DROP TRIGGER IF EXISTS trg_deploy_hook_update ON blog.posts;
DROP TRIGGER IF EXISTS trg_deploy_hook_delete ON blog.posts;

CREATE TRIGGER trg_deploy_hook_insert
  AFTER INSERT ON blog.posts
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION blog.disparar_deploy_hook();

CREATE TRIGGER trg_deploy_hook_update
  AFTER UPDATE ON blog.posts
  FOR EACH ROW
  WHEN (
    (OLD.status = 'published' OR NEW.status = 'published')
    AND ROW(
      OLD.titulo, OLD.subtitulo, OLD.resumo, OLD.conteudo, OLD.categoria,
      OLD.tipo, OLD.tags, OLD.capa_url, OLD.capa_alt, OLD.destaque,
      OLD.fixado, OLD.demo, OLD.publicado_em, OLD.slug, OLD.autor,
      OLD.anexos, OLD.status
    ) IS DISTINCT FROM ROW(
      NEW.titulo, NEW.subtitulo, NEW.resumo, NEW.conteudo, NEW.categoria,
      NEW.tipo, NEW.tags, NEW.capa_url, NEW.capa_alt, NEW.destaque,
      NEW.fixado, NEW.demo, NEW.publicado_em, NEW.slug, NEW.autor,
      NEW.anexos, NEW.status
    )
  )
  EXECUTE FUNCTION blog.disparar_deploy_hook();

CREATE TRIGGER trg_deploy_hook_delete
  AFTER DELETE ON blog.posts
  FOR EACH ROW
  WHEN (OLD.status = 'published')
  EXECUTE FUNCTION blog.disparar_deploy_hook();
