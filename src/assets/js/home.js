/* ============================================================
   Blog URE Marília — interações da home (estilo "Meridiano")
   Sem dependências externas.
   ============================================================ */
(function () {
  "use strict";

  var grid = document.getElementById("postsList");
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(".post-card"));
  var countInfo = document.getElementById("countInfo");
  var filterChips = document.getElementById("filterChips");
  var clearTagBtn = document.getElementById("clearTagBtn");
  var searchInput = document.getElementById("searchInput");
  var searchWrap = document.getElementById("searchWrap");
  var searchClear = document.getElementById("searchClear");
  var sortSel = document.getElementById("sortSel");
  var empty = document.getElementById("emptyState");
  var mobileTags = document.getElementById("mobileTags");

  var activeTag = null;
  var query = "";
  var sort = "new";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function tagsOf(el) {
    var t = el.getAttribute("data-tags");
    return t ? t.split(",") : [];
  }

  function matches(el) {
    if (activeTag && tagsOf(el).indexOf(activeTag) === -1) return false;
    if (query) {
      var hay = (el.getAttribute("data-search") || "").toLowerCase();
      if (hay.indexOf(query) === -1) return false;
    }
    return true;
  }

  function apply() {
    var visible = [];
    cards.forEach(function (c) {
      var ok = matches(c);
      c.classList.toggle("is-hidden", !ok);
      if (ok) visible.push(c);
    });

    visible.sort(function (a, b) {
      if (sort === "az") {
        return (a.getAttribute("data-title") || "").localeCompare(b.getAttribute("data-title") || "", "pt-BR");
      }
      var da = a.getAttribute("data-date") || "";
      var db = b.getAttribute("data-date") || "";
      if (sort === "old") return da < db ? -1 : da > db ? 1 : 0;
      return da > db ? -1 : da < db ? 1 : 0;
    });
    visible.forEach(function (c) { grid.appendChild(c); });

    var n = visible.length;
    countInfo.textContent = n + (n === 1 ? " publicação" : " publicações");
    if (clearTagBtn) clearTagBtn.hidden = !activeTag;
    if (empty) empty.hidden = n > 0;

    var chips = "";
    if (activeTag) chips += '<button class="filter-chip" data-action="clear-tag">' + esc(activeTag) + " ✕</button> ";
    if (query) chips += '<button class="filter-chip blue" data-action="clear-search">“' + esc(query) + '” ✕</button> ';
    filterChips.innerHTML = chips;
  }

  function syncTagUI() {
    document.querySelectorAll(".tag-row").forEach(function (r) {
      r.classList.toggle("active", r.getAttribute("data-tag") === activeTag);
    });
    if (mobileTags) {
      mobileTags.querySelectorAll(".chip").forEach(function (ch) {
        ch.classList.toggle("active", ch.getAttribute("data-tag") === activeTag);
      });
    }
  }

  function setTag(t) {
    activeTag = activeTag === t ? null : t;
    syncTagUI();
    apply();
  }

  function clearTag() {
    activeTag = null;
    syncTagUI();
    apply();
  }

  function clearSearch() {
    query = "";
    if (searchInput) searchInput.value = "";
    if (searchWrap) searchWrap.classList.remove("has-value");
    if (searchClear) searchClear.style.display = "none";
    apply();
  }

  // Tags (barra lateral + chips dos cards + faixa mobile)
  document.querySelectorAll("[data-tag]").forEach(function (btn) {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", function () { setTag(btn.getAttribute("data-tag")); });
  });

  if (clearTagBtn) clearTagBtn.addEventListener("click", clearTag);

  filterChips.addEventListener("click", function (e) {
    var b = e.target.closest("[data-action]");
    if (!b) return;
    if (b.dataset.action === "clear-tag") clearTag();
    if (b.dataset.action === "clear-search") clearSearch();
  });

  // Busca
  var st;
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      var v = e.target.value;
      if (searchWrap) searchWrap.classList.toggle("has-value", !!v);
      if (searchClear) searchClear.style.display = v ? "inline-flex" : "none";
      clearTimeout(st);
      st = setTimeout(function () {
        query = v.trim().toLowerCase();
        apply();
      }, 130);
    });
  }
  if (searchClear) searchClear.addEventListener("click", clearSearch);

  if (sortSel) sortSel.addEventListener("change", function (e) { sort = e.target.value; apply(); });

  // Atalho de teclado: "/" foca a busca
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
      if (searchInput) { e.preventDefault(); searchInput.focus(); }
    }
  });

  // Revelação ao rolar
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.06 });
    cards.forEach(function (c) { io.observe(c); });
  } else {
    cards.forEach(function (c) { c.classList.add("in"); });
  }

  // Fundo de curvas de nível (port do tema Meridiano)
  buildBackground();

  function buildBackground() {
    var el = document.getElementById("bgContours");
    if (!el) return;

    function mul(a) {
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    function ring(cx, cy, r, ph, am) {
      var d = "", N = 72;
      for (var i = 0; i <= N; i++) {
        var t = (i / N) * Math.PI * 2;
        var w = 1 + am[0] * Math.sin(3 * t + ph[0]) + am[1] * Math.sin(5 * t + ph[1]) + am[2] * Math.sin(8 * t + ph[2]);
        var x = cx + r * w * Math.cos(t), y = cy + r * w * Math.sin(t) * 0.78;
        d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      }
      return d + "Z";
    }

    var R = mul(20261112);
    var ph1 = [R() * 6, R() * 6, R() * 6], ph2 = [R() * 6, R() * 6, R() * 6];
    var am = [0.14, 0.07, 0.035];
    var a = "", b = "";
    for (var k = 0; k < 8; k++) {
      a += '<path class="' + (k % 3 === 2 ? (k === 5 ? "bgc-amber" : "bgc-index") : "bgc-line") + '" d="' + ring(300, 240, 60 + k * 54, ph1, am) + '"/>';
      b += '<path class="' + (k % 3 === 2 ? (k === 2 ? "bgc-blue" : "bgc-index") : "bgc-line") + '" d="' + ring(1150, 640, 50 + k * 60, ph2, am) + '"/>';
    }
    el.innerHTML = '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"><g class="bgc-a">' + a + '</g><g class="bgc-b">' + b + '</g></svg>';
  }
})();
