/* ============================================================
   Snapshot de configuração e dados do Supabase do blog URE Marília
   ------------------------------------------------------------
   Uso:
     SUPABASE_PAT=sbp_... node scripts/backup-supabase.js

   Variáveis opcionais:
     SUPABASE_PROJECT_REF  (default: lymrixekprobknxvoomk)

   Saída: backups/YYYYMMDD-HHmm/  (fora do git — ver .gitignore)

   Segredos são REDACTED: jwt_secret, service_role, anon key e a
   URL do Deploy Hook não são gravados. Senhas de usuários nunca
   são lidas (apenas id, e-mail e metadados do Auth).
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const PAT = process.env.SUPABASE_PAT || process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || "lymrixekprobknxvoomk";
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "backups");

if (!PAT) {
  console.error("❌ Defina SUPABASE_PAT (ou SUPABASE_ACCESS_TOKEN) no ambiente.");
  process.exit(1);
}

function api(pathname, method, body) {
  return new Promise((resolve, reject) => {
    const data = body == null ? null : JSON.stringify(body);
    const headers = {
      Authorization: "Bearer " + PAT,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (data) headers["Content-Length"] = Buffer.byteLength(data);
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: "/v1/projects/" + REF + pathname,
        method: method || "GET",
        headers,
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            return reject(new Error(pathname + " → HTTP " + res.statusCode + " " + raw.slice(0, 300)));
          }
          try {
            resolve(raw ? JSON.parse(raw) : null);
          } catch (e) {
            resolve(raw);
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

const query = (sql) => api("/database/query", "POST", { query: sql });

const TABLES = [
  "blog.posts",
  "blog.profiles",
  "blog.categories",
  "blog.pages",
  "blog.settings",
  "blog.post_revisions",
];

const AUTH_SQL =
  "SELECT id, email, raw_user_meta_data, created_at, confirmed_at, last_sign_in_at " +
  "FROM auth.users ORDER BY created_at";

const STORAGE_SQL = [
  ["storage.buckets", "SELECT id, name, public, created_at, updated_at FROM storage.buckets ORDER BY name"],
  [
    "storage_pg_policies",
    "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check " +
      "FROM pg_policies WHERE schemaname='storage' ORDER BY tablename, policyname",
  ],
];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear() +
    p(d.getUTCMonth() + 1) +
    p(d.getUTCDate()) +
    "-" +
    p(d.getUTCHours()) +
    p(d.getUTCMinutes())
  );
}

function writeJson(dir, name, value) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + "\n");
}

async function main() {
  const ts = stamp();
  const dir = path.join(OUT, ts);
  fs.mkdirSync(dir, { recursive: true });
  console.log("📦 Snapshot", ts);

  const counts = {};

  for (const table of TABLES) {
    try {
      const rows = await query("SELECT * FROM " + table);
      writeJson(dir, table.replace(".", "_") + ".json", rows);
      counts[table] = rows.length;
      console.log("   ✓", table, "(" + rows.length + " linhas)");
    } catch (e) {
      counts[table] = "ERRO: " + e.message;
      console.warn("   ⚠", table, e.message);
    }
  }

  try {
    const users = await query(AUTH_SQL);
    // Remove qualquer campo sensível que apareça no futuro.
    const safe = users.map((u) => ({
      id: u.id,
      email: u.email,
      raw_user_meta_data: u.raw_user_meta_data || null,
      created_at: u.created_at,
      confirmed_at: u.confirmed_at,
      last_sign_in_at: u.last_sign_in_at,
    }));
    writeJson(dir, "auth_users.json", safe);
    counts["auth.users"] = safe.length;
    console.log("   ✓ auth.users (" + safe.length + " usuários, sem senhas)");
  } catch (e) {
    counts["auth.users"] = "ERRO: " + e.message;
    console.warn("   ⚠ auth.users", e.message);
  }

  for (const [name, sql] of STORAGE_SQL) {
    try {
      const rows = await query(sql);
      writeJson(dir, name.replace(".", "_") + ".json", rows);
      counts[name] = rows.length;
      console.log("   ✓", name, "(" + rows.length + ")");
    } catch (e) {
      counts[name] = "ERRO: " + e.message;
      console.warn("   ⚠", name, e.message);
    }
  }

  let postgrest = null;
  try {
    postgrest = await api("/postgrest");
  } catch (e) {
    postgrest = { erro: e.message };
  }
  if (postgrest && postgrest.jwt_secret) postgrest.jwt_secret = "<REDACTED>";
  writeJson(dir, "config_postgrest.json", postgrest);
  console.log("   ✓ config PostgREST (jwt_secret redacionado)");

  let apiKeys = null;
  try {
    apiKeys = await api("/apikeys");
    if (Array.isArray(apiKeys)) {
      apiKeys = apiKeys.map((k) => ({
        id: k.id,
        name: k.name,
        type: k.type,
        preview: k.api_key ? k.api_key.slice(0, 8) + "…<REDACTED>" : "<REDACTED>",
      }));
    }
  } catch (e) {
    apiKeys = { erro: e.message };
  }
  writeJson(dir, "config_apikeys.json", apiKeys);
  console.log("   ✓ chaves de API (valores redacionados)");

  const migDir = path.join(ROOT, "supabase", "migrations");
  const migrations = fs.existsSync(migDir)
    ? fs
        .readdirSync(migDir)
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .map((f) => ({ arquivo: f, sha256: sha256(path.join(migDir, f)) }))
    : [];

  let commit = "desconhecido";
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch (_) {}

  const manifest = {
    criadoEm: new Date().toISOString(),
    projeto: REF,
    commitOrigem: commit,
    redacted: ["postgrest.jwt_secret", "apikeys.valores", "auth.users.password_hash", "DEPLOY_HOOK_URL"],
    tabelas: counts,
    migracoes: migrations,
    observacoes:
      "A URL do Deploy Hook fica somente dentro de blog.disparar_deploy_hook(). " +
      "Reinsira-a manualmente no restore; não foi gravada neste snapshot.",
  };
  writeJson(dir, "manifest.json", manifest);

  console.log("✅ Snapshot concluído em", path.relative(ROOT, dir));
}

main().catch((e) => {
  console.error("❌ Falha no backup:", e.message);
  process.exit(1);
});
