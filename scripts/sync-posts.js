/* ============================================================
   Sincroniza postagens do Supabase (blog.posts) -> src/posts/*.md
   Uso:
     SUPABASE_URL=https://xxxx.supabase.co \
     SUPABASE_SERVICE_ROLE_KEY=eyJ... \
     npm run sync:posts
   Opções:
     --all    inclui rascunhos/review/archived (não só publicados)
     --clean  remove .md em src/posts que não existem no Supabase
   ============================================================ */
const fs = require("fs");
const path = require("path");

const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || "";
const outDir = path.join(__dirname, "..", "src", "posts");
const all = process.argv.includes("--all");
const clean = process.argv.includes("--clean");

if (!url || !key) {
  console.error("❌ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_KEY).");
  console.error("   Ex.: SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run sync:posts");
  process.exit(1);
}

function slugify(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ymd(iso) {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return String(iso).slice(0, 10);
}

function q(s) {
  return '"' + String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function render(p) {
  const data = ymd(p.publicado_em || p.criado_em);
  const categoria = p.categoria || p.tipo || "noticia";
  const tipo = p.tipo || categoria;
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const lines = [
    "---",
    "title: " + q(p.titulo),
    "resumo: " + q(p.resumo || ""),
    "categoria: " + q(categoria),
    "tipo: " + q(tipo),
    "tags: [" + tags.map(q).join(", ") + "]",
    "destaque: " + (p.destaque ? "true" : "false"),
    "date: " + q(data),
    "data: " + q(data),
    "autor: " + q(p.autor || ""),
    "demo: " + (p.demo ? "true" : "false"),
    "---",
    "",
    p.conteudo || "",
    "",
  ];
  return lines.join("\n");
}

async function main() {
  const params = new URLSearchParams({ select: "*" });
  params.set("order", "publicado_em.desc");
  if (!all) params.set("status", "eq.published");

  const res = await fetch(url + "/rest/v1/posts?" + params.toString(), {
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Accept-Profile": "blog",
    },
  });
  if (!res.ok) {
    console.error("❌ Erro ao buscar posts:", res.status, await res.text());
    process.exit(1);
  }

  const posts = await res.json();
  fs.mkdirSync(outDir, { recursive: true });

  const written = new Set();
  for (const p of posts) {
    const slug = p.slug || slugify(p.titulo) || "post-" + Date.now();
    const file = path.join(outDir, slug + ".md");
    fs.writeFileSync(file, render(p));
    written.add(slug + ".md");
  }

  if (clean) {
    for (const f of fs.readdirSync(outDir)) {
      if (f.endsWith(".md") && !written.has(f)) {
        fs.unlinkSync(path.join(outDir, f));
        console.log("   removido:", f);
      }
    }
  }

  console.log(`✅ ${posts.length} post(s) exportados para ${path.relative(process.cwd(), outDir)}`);
  if (!all) console.log("   (somente publicados — use --all para incluir rascunhos)");
  if (clean) console.log("   (--clean removeu .md que não estavam no Supabase)");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
