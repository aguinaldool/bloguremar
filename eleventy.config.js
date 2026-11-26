const rssPlugin = require("@11ty/eleventy-plugin-rss");
const { DateTime } = require("luxon");

/* ============================================================
   Gerador de capas cartográficas (port do tema "Meridiano")
   Capas determinísticas a partir do slug + título do post.
   ============================================================ */
function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function ringPath(cx, cy, r, ph, am) {
  let d = "";
  const N = 72;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2;
    const w = 1 + am[0] * Math.sin(3 * t + ph[0]) + am[1] * Math.sin(5 * t + ph[1]) + am[2] * Math.sin(8 * t + ph[2]);
    const x = cx + r * w * Math.cos(t);
    const y = cy + r * w * Math.sin(t) * 0.78;
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d + "Z";
}
function patContornos(R) {
  const cx = 220 + R() * 360, cy = 130 + R() * 80;
  const ph = [R() * 6.28, R() * 6.28, R() * 6.28];
  const am = [0.12 + R() * 0.08, 0.06 + R() * 0.05, 0.03 + R() * 0.03];
  let s = "";
  for (let k = 0; k < 9; k++) {
    s += '<path class="cv-line' + (k % 3 === 2 ? " cv-index" : "") + '" d="' + ringPath(cx, cy, 26 + k * 25, ph, am) + '"/>';
  }
  const alt = 800 + Math.floor(R() * 900);
  s += '<path class="cv-tri" d="M' + cx + " " + (cy - 7) + ' l6 10 h-12 Z"/>';
  s += '<text class="cv-spot" x="' + (cx + 12) + '" y="' + (cy + 4) + '">' + alt + " m</text>";
  return s;
}
function patCordilheira(R) {
  let s = '<circle class="cv-sun" cx="' + (620 + R() * 100).toFixed(0) + '" cy="' + (48 + R() * 24).toFixed(0) + '" r="20"/>';
  for (let l = 0; l < 5; l++) {
    const base = 108 + l * 52, amp = 52 - l * 7, p1 = R() * 6.28, p2 = R() * 6.28;
    let d = "M-10 350";
    for (let x = -10; x <= 810; x += 26) {
      const y = base - amp * (0.6 * Math.sin(x * 0.006 + p1) + 0.4 * Math.sin(x * 0.017 + p2)) - l * 3;
      d += "L" + x + " " + y.toFixed(1);
    }
    d += "L810 350Z";
    s += '<path class="cv-r' + l + '" d="' + d + '"/>';
  }
  return s;
}
function patHidrografia(R) {
  const pts = [];
  let x = 90 + R() * 90;
  for (let y = -10; y <= 350; y += 24) {
    x += (R() - 0.42) * 58;
    x = Math.max(50, Math.min(750, x));
    pts.push([x, y]);
  }
  const stem = "M" + pts.map((p) => p[0].toFixed(0) + " " + p[1]).join("L");
  let s = '<path class="cv-watershed" d="' + ringPath(400, 170, 250, [R() * 6, R() * 6, R() * 6], [0.1, 0.06, 0.03]) + '"/>';
  for (let b = 0; b < 6; b++) {
    const idx = 2 + Math.floor(R() * (pts.length - 4));
    const bx = pts[idx][0], by = pts[idx][1];
    const dir = R() > 0.5 ? 1 : -1;
    let tx = bx, ty = by, d = "M" + bx.toFixed(0) + " " + by;
    const steps = 4 + Math.floor(R() * 3);
    for (let k = 0; k < steps; k++) {
      tx += dir * (22 + R() * 26);
      ty -= 10 + R() * 16;
      d += "L" + tx.toFixed(0) + " " + ty.toFixed(0);
    }
    s += '<path class="cv-flow1" d="' + d + '"/>';
    let sx = tx, sy = ty, d2 = "M" + sx.toFixed(0) + " " + sy.toFixed(0);
    for (let k = 0; k < 3; k++) {
      sx += dir * (14 + R() * 18);
      sy -= 8 + R() * 12;
      d2 += "L" + sx.toFixed(0) + " " + sy.toFixed(0);
    }
    s += '<path class="cv-flow2" d="' + d2 + '"/>';
  }
  s += '<path class="cv-flow0" d="' + stem + '"/>';
  const st = pts[Math.floor(pts.length * 0.6)];
  s += '<circle class="cv-station" cx="' + st[0].toFixed(0) + '" cy="' + st[1] + '" r="6"/>';
  s += '<text class="cv-label" x="' + (st[0] + 14).toFixed(0) + '" y="' + (st[1] + 4) + '">EST. 042</text>';
  return s;
}
function patQuadricula(R) {
  let s = "";
  for (let x = 80; x < 800; x += 80) s += '<path class="cv-grid" d="M' + x + ' 0V340"/>';
  for (let y = 68; y < 340; y += 68) s += '<path class="cv-grid" d="M0 ' + y + 'H800"/>';
  const cellX = 80 * Math.floor(R() * 9), cellY = 68 * Math.floor(R() * 4);
  s += '<rect class="cv-cell" x="' + cellX + '" y="' + cellY + '" width="80" height="68"/>';
  const specials = [];
  for (let k = 0; k < 14; k++) {
    const px = 30 + R() * 740, py = 30 + R() * 280;
    if (k < 3) {
      specials.push([px, py]);
      s += '<path class="cv-cross" d="M' + (px - 7).toFixed(0) + " " + py.toFixed(0) + 'h14M' + px.toFixed(0) + " " + (py - 7).toFixed(0) + 'v14"/>';
    } else {
      s += '<circle class="cv-pt" cx="' + px.toFixed(0) + '" cy="' + py.toFixed(0) + '" r="2.6"/>';
    }
  }
  const rd = "M" + specials.map((p) => p[0].toFixed(0) + " " + p[1].toFixed(0)).join("L");
  s += '<path class="cv-route" d="' + rd + '"/>';
  const e = specials[specials.length - 1];
  s += '<path class="cv-cross" d="M' + (e[0] - 6).toFixed(0) + " " + (e[1] - 8).toFixed(0) + 'l6 8 6-8" />';
  s += '<text class="cv-label" x="24" y="322">E 432 500 · N 7 394 200</text>';
  return s;
}
function coverSVG(post) {
  const R = mulberry32(hashStr(post.id + "|" + post.title));
  const pat = post.cover.style === "cordilheira" ? patCordilheira(R)
    : post.cover.style === "hidrografia" ? patHidrografia(R)
    : post.cover.style === "quadricula" ? patQuadricula(R)
    : patContornos(R);
  const sheet = ("0" + (post.sheet || 1)).slice(-2);
  return '<svg class="cover-svg hue-' + post.cover.hue + '" viewBox="0 0 800 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
    + '<rect class="cv-bg" width="800" height="340"/>' + pat
    + '<path class="cv-tick" d="M14 26V14h12M774 14h12v12M786 314v12h-12M26 326H14v-12"/>'
    + '<text class="cv-label" x="34" y="26">FOLHA ' + sheet + '</text>'
    + '<text class="cv-label" x="766" y="26" text-anchor="end">1:50.000</text>'
    + '<rect class="cv-scale-a" x="700" y="318" width="28" height="4"/>'
    + '<rect class="cv-scale-b" x="728" y="318" width="28" height="4"/>'
    + '<text class="cv-label" x="694" y="324" text-anchor="end">500 m</text>'
    + "</svg>";
}
const COVER_HUE = { noticia: "blue", comunicado: "orange", formacao: "teal", evento: "green", material: "amber", projeto: "violet" };
const COVER_STYLE = ["contornos", "quadricula", "hidrografia", "cordilheira"];

module.exports = function (eleventyConfig) {
  // Plugins
  eleventyConfig.addPlugin(rssPlugin);

  // Arquivos passthrough
  eleventyConfig.addPassthroughCopy("src/assets");

  // Datas puras (AAAA-MM-DD) são interpretadas pelo 11ty como meia-noite UTC.
  // Mantemos o "horário local" ao trocar para America/Sao_Paulo para não
  // regressar um dia (UTC-3).
  const spDate = (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" })
      .setZone("America/Sao_Paulo", { keepLocalTime: true });

  // Filtro de data (pt-BR)
  eleventyConfig.addFilter("dateBR", (dateObj, format = "dd/MM/yyyy") => {
    return spDate(dateObj).toFormat(format);
  });

  // Filtro de data ISO
  eleventyConfig.addFilter("dateISO", (dateObj) => {
    return spDate(dateObj).toISODate();
  });

  // Filtro de slug
  eleventyConfig.addFilter("slug", (str) => {
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  });

  // Filtro de leitura (tempo estimado)
  eleventyConfig.addFilter("readingTime", (text) => {
    const wordsPerMinute = 200;
    const words = String(text || "").split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes < 1 ? 1 : minutes;
  });

  // Filtro de seção → cor (cartográfica)
  eleventyConfig.addFilter("sectionColor", (type) => {
    const map = {
      noticia: "#2563EB",
      comunicado: "#DC2626",
      formacao: "#0D9488",
      evento: "#16A34A",
      material: "#D97706",
      projeto: "#7C3AED",
    };
    return map[type] || "#2563EB";
  });

  // Capa cartográfica determinística para um post
  eleventyConfig.addFilter("coverSVG", function (slug, title, categoria) {
    const hue = COVER_HUE[categoria] || "teal";
    const style = COVER_STYLE[hashStr(String(slug)) % COVER_STYLE.length];
    const sheet = 1 + (hashStr(String(slug)) % 99);
    return coverSVG({ id: String(slug), title: String(title || ""), cover: { style, hue }, sheet });
  });

  // Nuvem de tags com contagem (ordenada), ignorando a tag de coleção "post"
  eleventyConfig.addFilter("tagCloud", (posts) => {
    const m = new Map();
    (posts || []).forEach((p) =>
      (p.data.tags || []).forEach((t) => {
        if (!t || t === "post") return;
        m.set(t, (m.get(t) || 0) + 1);
      })
    );
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
  });

  // Remove a tag de coleção "post" da lista de tags de um post
  eleventyConfig.addFilter("realTags", (arr) =>
    (arr || []).filter((t) => t && t !== "post")
  );

  // Formata tamanho de arquivo em bytes para formato legível
  eleventyConfig.addFilter("fileSize", (bytes) => {
    if (!bytes || typeof bytes !== "number") return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  });

  // Matiz de uma tag (determínistico)
  eleventyConfig.addFilter("tagHue", (name) => {
    const hues = ["amber", "blue", "green", "magenta", "orange", "teal", "violet", "lime"];
    return hues[hashStr(String(name).toLowerCase()) % hues.length];
  });

  // Filtro de seção → label
  eleventyConfig.addFilter("sectionLabel", (type) => {
    const map = {
      noticia: "Notícia",
      comunicado: "Comunicado",
      formacao: "Formação",
      evento: "Evento",
      material: "Material",
      projeto: "Projeto",
    };
    return map[type] || "Publicação";
  });

  // Data global "now"
  eleventyConfig.addGlobalData("now", () => new Date());

  // Coleções
  eleventyConfig.addCollection("posts", (collection) => {
    return collection.getFilteredByTag("post").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("featured", (collection) => {
    return collection.getFilteredByTag("post").filter((i) => i.data.destaque).sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("formacoes", (collection) => {
    return collection.getFilteredByTag("post").filter((i) => i.data.tipo === "formacao" || i.data.categoria === "formacao").sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("materiais", (collection) => {
    return collection.getFilteredByTag("post").filter((i) => i.data.tipo === "material" || i.data.categoria === "material").sort((a, b) => b.date - a.date);
  });

  return {
    markdownTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md"],
  };
};
