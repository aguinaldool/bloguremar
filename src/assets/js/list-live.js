/* ============================================================
   Listas (Notícias / Formações / Materiais) em tempo real.
   ============================================================ */
(function () {
  "use strict";

  var container = document.querySelector("[data-live-cat]");
  if (!container || !window.URE_LIVE) return;

  var L = window.URE_LIVE;
  var cat = container.getAttribute("data-live-cat") || "all";
  var grid = container.querySelector(".grid");
  if (!grid) return;

  L.fetchPosts().then(function (rows) {
    if (!Array.isArray(rows)) return;

    var filtered = rows.filter(function (p) {
      if (cat === "all") return true;
      return (p.tipo || p.categoria) === cat || p.categoria === cat;
    });

    if (!filtered.length) {
      grid.innerHTML =
        '<p style="color:var(--color-muted);">Nenhuma publicação encontrada no momento.</p>';
      return;
    }

    grid.innerHTML = filtered.map(function (p) {
      var title = p.titulo || "(sem título)";
      var c = p.categoria || p.tipo || "noticia";
      var url = "/noticias/" + encodeURIComponent(p.slug || p.id) + "/";
      return '<article class="card">'
        + '<div class="card-body">'
        + '<div class="card-meta"><span>' + L.esc(L.dateBR(p.publicado_em || p.criado_em)) + "</span>"
        + "<span>·</span>"
        + '<span style="color:' + L.sectionColor(c) + '">' + L.esc(L.sectionLabel(c)) + "</span></div>"
        + '<h3 class="card-title"><a href="' + L.esc(url) + '">' + L.esc(title) + "</a></h3>"
        + (p.capa_url
            ? '<figure class="card-figure"><img src="' + L.esc(p.capa_url) + '" alt="' + L.esc(title) + '"></figure>'
            : "")
        + '<p class="card-excerpt">' + L.esc(p.resumo || "") + "</p>"
        + "</div></article>";
    }).join("");
  });
})();
