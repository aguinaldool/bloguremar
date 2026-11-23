/* ============================================================
   Verificação rápida da página de post:
   se o post foi excluído ou despublicado no Supabase, mostra 404
   na hora — sem esperar o próximo rebuild da Vercel.
   ============================================================ */
(function () {
  "use strict";

  var article = document.querySelector("article.article[data-live-slug]");
  if (!article || !window.URE_LIVE) return;

  var slug = article.getAttribute("data-live-slug");
  if (!slug) return;

  window.URE_LIVE.postExists(slug).then(function (exists) {
    if (exists !== false) return;

    article.hidden = true;

    var box = document.createElement("div");
    box.className = "error";
    box.innerHTML =
      '<div class="container"><h1>404</h1>'
      + "<p>Esta publicação não está mais disponível.</p>"
      + '<a href="/" class="btn btn-primary">Ir para a página inicial</a></div>';
    article.parentNode.insertBefore(box, article);

    document.title = "Página não encontrada | URE Marília";
    var meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
  });
})();
