/* ========================================
   Blog URE Marília — JavaScript principal
   Sem dependências externas.
   ======================================== */

(function () {
  "use strict";

  // Tema claro/escuro (claro por padrão; escuro deferido)
  function initTheme() {
    var btn = document.querySelector("[data-action='toggle-theme']");
    if (!btn) return;
    var html = document.documentElement;
    var saved = localStorage.getItem("ure-theme");
    if (saved === "dark") {
      html.classList.add("dark");
      btn.setAttribute("aria-pressed", "true");
    }
    btn.addEventListener("click", function () {
      var isDark = html.classList.toggle("dark");
      btn.setAttribute("aria-pressed", isDark);
      localStorage.setItem("ure-theme", isDark ? "dark" : "light");
    });
  }

  // Menu mobile
  function initMobileMenu() {
    var toggle = document.querySelector(".nav-toggle");
    var overlay = document.querySelector(".menu-mobile-overlay");
    var close = document.querySelector(".menu-mobile-close");
    if (!toggle || !overlay) return;

    function open() {
      overlay.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }

    function closeMenu() {
      overlay.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", open);
    close.addEventListener("click", closeMenu);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });
  }

  // Toast
  function toast(message, tipo) {
    var el = document.createElement("div");
    el.className = "toast" + (tipo === "danger" ? " is-danger" : "");
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.classList.add("is-visible");
    });
    setTimeout(function () {
      el.classList.remove("is-visible");
      setTimeout(function () {
        el.remove();
      }, 250);
    }, 3000);
  }

  window.ureToast = toast;

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initMobileMenu();
  });
})();
