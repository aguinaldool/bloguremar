/* ============================================================
   Cliente público de leitura do Supabase (somente posts publicados)
   A anon key é pública por design — a segurança é feita pelo RLS,
   que permite apenas SELECT de posts com status = 'published'.
   ============================================================ */
(function () {
  "use strict";

  var URL = "https://lymrixekprobknxvoomk.supabase.co";
  var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXJpeGVrcHJvYmtueHZvb21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NDM1MjcsImV4cCI6MjExMDQxOTUyN30.ZK0wp4o2XZwJ98a6EdPzKe85fTA1S3G9ex2SmsgBcbw";

  var HEADERS = {
    apikey: KEY,
    Authorization: "Bearer " + KEY,
    "Accept-Profile": "blog",
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function hashStr(str) {
    var h = 2166136261;
    str = String(str || "");
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  var HUES = ["amber", "blue", "green", "magenta", "orange", "teal", "violet", "lime"];
  function tagHue(name) {
    return HUES[hashStr(String(name || "").toLowerCase()) % HUES.length];
  }

  var COLORS = {
    noticia: "#54B8FF",
    comunicado: "#FF7A48",
    formacao: "#3BD6B4",
    evento: "#84DD84",
    material: "#FFB454",
    projeto: "#B79CFF",
  };
  var LABELS = {
    noticia: "Notícia",
    comunicado: "Comunicado",
    formacao: "Formação",
    evento: "Evento",
    material: "Material",
    projeto: "Projeto",
  };
  function sectionColor(c) { return COLORS[c] || "#54B8FF"; }
  function sectionLabel(c) { return LABELS[c] || "Publicação"; }

  function dateBR(iso) {
    var p = String(iso || "").slice(0, 10).split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : "";
  }
  function dateISO(iso) { return String(iso || "").slice(0, 10); }

  function readingTime(text) {
    var words = String(text || "").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  function realTags(p) {
    return (Array.isArray(p.tags) ? p.tags : []).filter(function (t) {
      return t && t !== "post";
    });
  }

  async function fetchPosts() {
    try {
      var qs =
        "?select=*&status=eq.published&order=publicado_em.desc,criado_em.desc";
      var r = await fetch(URL + "/rest/v1/posts" + qs, {
        headers: HEADERS,
        cache: "no-store",
      });
      return r.ok ? await r.json() : null;
    } catch (e) {
      return null;
    }
  }

  async function postExists(slug) {
    try {
      var qs =
        "?select=id&status=eq.published&slug=eq." +
        encodeURIComponent(slug) +
        "&limit=1";
      var r = await fetch(URL + "/rest/v1/posts" + qs, {
        headers: HEADERS,
        cache: "no-store",
      });
      if (!r.ok) return null;
      return (await r.json()).length > 0;
    } catch (e) {
      return null;
    }
  }

  window.URE_LIVE = {
    fetchPosts: fetchPosts,
    postExists: postExists,
    esc: esc,
    hashStr: hashStr,
    tagHue: tagHue,
    sectionColor: sectionColor,
    sectionLabel: sectionLabel,
    dateBR: dateBR,
    dateISO: dateISO,
    readingTime: readingTime,
    realTags: realTags,
  };
})();
