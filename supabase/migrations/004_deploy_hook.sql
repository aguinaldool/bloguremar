-- ========================================
-- Deploy Hook: dispara rebuild da Vercel quando posts mudam
-- Usa pg_net (assíncrono) para chamar o Deploy Hook.
-- A URL é um segredo — configure via dashboard ou edite abaixo.
-- Idempotente.
-- ========================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION blog.disparar_deploy_hook()
RETURNS TRIGGER AS $fn$
BEGIN
  PERFORM net.http_post(
    url := 'https://api.vercel.com/v1/integrations/deploy/prj_K2plYHAOWGFTMaJieDA4bVhEiT0W/eLtt7N6eut',
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
  RETURN COALESCE(NEW, OLD);
END;
$fn$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, net;

DROP TRIGGER IF EXISTS trg_deploy_hook ON blog.posts;
CREATE TRIGGER trg_deploy_hook
  AFTER INSERT OR UPDATE OR DELETE ON blog.posts
  FOR EACH STATEMENT
  EXECUTE FUNCTION blog.disparar_deploy_hook();
