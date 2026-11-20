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
  console.warn("⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não definidas — pulando sync (usando posts locais).");
  process.exit(0);
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
  const anexos = Array.isArray(p.anexos) ? p.anexos : [];
  const lines = [
    "---",
    "title: " + q(p.titulo),
    "resumo: " + q(p.resumo || ""),
    "capa_url: " + q(p.capa_url || ""),
    "capa_alt: " + q(p.capa_alt || ""),
    "categoria: " + q(categoria),
    "tipo: " + q(tipo),
    "tags: [" + tags.map(q).join(", ") + "]",
    "destaque: " + (p.destaque ? "true" : "false"),
    "date: " + q(data),
    "data: " + q(data),
    "autor: " + q(p.autor || ""),
    "demo: " + (p.demo ? "true" : "false"),
  ];
  
  // Adiciona anexos no front matter se houver
  if (anexos.length > 0) {
    lines.push("anexos:");
    for (const anexo of anexos) {
      lines.push("  - id: " + q(anexo.id || ""));
      lines.push("    nome: " + q(anexo.nome || ""));
      lines.push("    tamanho: " + (anexo.tamanho || 0));
      lines.push("    tipo: " + q(anexo.tipo || ""));
      lines.push("    url: " + q(anexo.url || ""));
      lines.push("    driveId: " + q(anexo.driveId || ""));
    }
  }
  
  lines.push("---");
  lines.push("");
  lines.push(p.conteudo || "");
  lines.push("");
  
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
    console.warn("⚠️  Erro ao buscar posts (" + res.status + ") — pulando sync para não quebrar o build.");
    process.exit(0);
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
  console.warn("⚠️  Sync pulado por erro:", e.message);
  process.exit(0);
});
