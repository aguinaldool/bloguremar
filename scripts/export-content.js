const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "content");
const dest = path.join(__dirname, "..", "backup", "content.json");

if (!fs.existsSync(src)) {
  console.error("❌ Pasta content/ não encontrada.");
  process.exit(1);
}

const posts = [];
const postsDir = path.join(src, "posts");
if (fs.existsSync(postsDir)) {
  for (const file of fs.readdirSync(postsDir)) {
    if (file.endsWith(".md")) {
      posts.push({ file });
    }
  }
}

const pagesDir = path.join(src, "pages");
const pages = [];
if (fs.existsSync(pagesDir)) {
  for (const file of fs.readdirSync(pagesDir)) {
    if (file.endsWith(".md")) {
      pages.push({ file });
    }
  }
}

const exportData = {
  exportadoEm: new Date().toISOString(),
  posts,
  pages,
  totalPosts: posts.length,
  totalPages: pages.length,
};

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(exportData, null, 2));

console.log(`✅ Conteúdo exportado: ${dest}`);
console.log(`   ${posts.length} posts, ${pages.length} páginas.`);
