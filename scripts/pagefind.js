const { execSync } = require("child_process");

try {
  execSync("npx pagefind --site _site", { stdio: "inherit" });
  console.log("✅ Pagefind indexado com sucesso.");
} catch (err) {
  console.error("❌ Falha ao indexar Pagefind:", err.message);
  process.exit(1);
}
