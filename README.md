# Blog URE Marília

Blog institucional da **Unidade Regional de Ensino de Marília** (URE Marília), Secretaria da Educação do Estado de São Paulo.

## Stack

- **11ty (Eleventy)** — gerador estático, build time apenas
- **Nunjucks** — templates
- **CSS puro** — design system "Rede conectada" (tokens, componentes, sem framework)
- **JS puro** — menu mobile, tema, busca
- **Pagefind** — busca estática indexada no build
- **Supabase** (Fase 2) — CMS, Auth, Storage
- **Vercel** — deploy e hospedagem

## Estrutura

```
src/
  _data/          dados do site (site.json, categorias.json)
  _includes/      layouts e componentes Nunjucks
  _includes/layouts/   base.njk, post.njk
  _includes/partials/  head.njk, header.njk, footer.njk
  assets/css/     tokens.css, main.css
  assets/js/      main.js
  assets/icons/   sprite SVG
  index.njk       home
  noticias/index.njk   listagem de notícias
  post.njk        página individual do post (gera /noticias/{slug}/)
  formacoes/index.njk  listagem de formações
  materiais/index.njk  listagem de materiais
  escolas/index.njk    diretório de escolas
  busca/index.njk      busca com Pagefind
  404.njk        página de erro
  feed.njk       RSS
  robots.txt     robots
content/
  posts/         posts em Markdown com frontmatter
  pages/         páginas institucionais (sobre, acessibilidade, privacidade)
supabase/
  migrations/    SQL do schema (apenas arquivo, não aplicado automaticamente)
scripts/
  pagefind.js    indexação de busca após o build
  generate-covers.js  geração de capas SVG (futuro)
```

## Conteúdo de demonstração

Os 8 posts iniciais são **conteúdo de demonstração**, claramente marcados com `demo: true` no frontmatter. Enquanto `site.demo` estiver `true` em `src/_data/site.json`:

- Uma faixa de aviso aparece no topo do site.
- O robots.txt envia `Disallow: /` (não indexar).
- O site inclui `noindex` nas páginas.

Para entrar em produção, defina `"demo": false` e substitua o conteúdo pelos posts reais.

## Comandos

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento com recarregamento
npm start

# Build de produção + indexação Pagefind
npm run build

# Exportar conteúdo para JSON (backup)
npm run export:content
```

## Deploy na Vercel

1. Conecte o repositório `aguinaldool/bloguremar` à Vercel.
2. Build command: `npm run build`
3. Output directory: `_site`
4. Domínio: configure em Project Settings → Domains.

## Supabase (Fase 2)

O schema SQL está em `supabase/migrations/`. Inclui:

- Tabelas: `posts`, `profiles`, `categories`, `pages`, `settings`
- Row Level Security (RLS) para segurança
- Autenticação e permissões por papel (admin, editor, author)
- Coluna `anexos` (JSONB) para arquivos anexados

### Painel Admin

Acesse `/admin/index.html` para gerenciar:

- **Postagens**: criar, editar, excluir, duplicar
- **Tags**: gerenciar tags e renomear em lote
- **Usuários**: cadastrar admins, editores e autores
- **Anexos**: upload de arquivos para Google Drive (via Apps Script)

### Anexos (Google Drive via Apps Script)

O sistema de anexos usa **Google Apps Script** (gratuito, sem cartão de crédito):

1. Crie uma pasta no Google Drive
2. Configure o Apps Script (código em `scripts/google-apps-script.js`)
3. Faça deploy como Web App
4. Cole a URL em `src/admin/index.njk` (variável `APPS_SCRIPT_URL`)

**Guia completo:** [`docs/APPS_SCRIPT_SETUP.md`](docs/APPS_SCRIPT_SETUP.md)

Os arquivos ficam públicos automaticamente e são armazenados no Google Drive (15 GB grátis).

---

## Licença

Uso institucional — URE Marília / SEDUC-SP.
