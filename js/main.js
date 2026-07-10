/* ==========================================================================
   GRAMA SPHERE — shared site behaviour
   Vanilla JS, no dependencies.
   ========================================================================== */

(function () {
  "use strict";

  /* ---------- Header scroll state ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 40) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Scroll reveal (IntersectionObserver) ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = (i % 6) * 70 + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Subtle hero parallax ---------- */
  var heroMedia = document.querySelector(".hero-media");
  var heroRing = document.querySelector(".hero .sphere-ring, .page-intro .sphere-ring");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && (heroMedia || heroRing)) {
    document.addEventListener(
      "scroll",
      function () {
        var y = window.scrollY;
        if (heroMedia && y < window.innerHeight) {
          heroMedia.style.transform = "translateY(" + y * 0.18 + "px)";
        }
        if (heroRing) {
          heroRing.style.transform = "translate(-50%," + y * 0.08 + "px)";
        }
      },
      { passive: true }
    );
  }
})();

/* ==========================================================================
   Lightbox — used on gallery.html and menu.html
   Any element with [data-lightbox-group] + child <img> becomes a trigger.
   ========================================================================== */
(function () {
  "use strict";
  var triggers = document.querySelectorAll("[data-lightbox-group]");
  if (!triggers.length) return;

  var groups = {};
  triggers.forEach(function (el, idx) {
    var group = el.getAttribute("data-lightbox-group");
    if (!groups[group]) groups[group] = [];
    var img = el.querySelector("img");
    groups[group].push({ src: img.currentSrc || img.src, alt: img.alt || "" });
    el.setAttribute("data-lightbox-index", groups[group].length - 1);
    el.addEventListener("click", function (e) {
      e.preventDefault();
      openLightbox(group, parseInt(el.getAttribute("data-lightbox-index"), 10));
    });
  });

  var lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.innerHTML =
    '<button class="lightbox-close" aria-label="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '<button class="lightbox-prev" aria-label="Sebelumnya"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>' +
    '<div class="lightbox-frame"><img alt=""></div>' +
    '<button class="lightbox-next" aria-label="Berikutnya"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>' +
    '<div class="lightbox-counter"></div>';
  document.body.appendChild(lightbox);

  var imgEl = lightbox.querySelector("img");
  var counterEl = lightbox.querySelector(".lightbox-counter");
  var currentGroup = null;
  var currentIndex = 0;

  function render() {
    var item = groups[currentGroup][currentIndex];
    imgEl.src = item.src;
    imgEl.alt = item.alt;
    counterEl.textContent = (currentIndex + 1) + " / " + groups[currentGroup].length;
  }
  function openLightbox(group, index) {
    currentGroup = group;
    currentIndex = index;
    render();
    lightbox.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("is-open");
    document.body.style.overflow = "";
  }
  function next() {
    currentIndex = (currentIndex + 1) % groups[currentGroup].length;
    render();
  }
  function prev() {
    currentIndex = (currentIndex - 1 + groups[currentGroup].length) % groups[currentGroup].length;
    render();
  }

  lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  lightbox.querySelector(".lightbox-next").addEventListener("click", next);
  lightbox.querySelector(".lightbox-prev").addEventListener("click", prev);
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", function (e) {
    if (!lightbox.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  /* touch swipe */
  var touchStartX = 0;
  lightbox.addEventListener("touchstart", function (e) { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  lightbox.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
  }, { passive: true });
})();

/* ==========================================================================
   Masonry gallery layout (gallery.html)
   Computes each card's grid-row-end span from its real aspect ratio so the
   CSS Grid masonry fills every column evenly (fixes column-count bugs).
   ========================================================================== */
(function () {
  "use strict";
  var grids = document.querySelectorAll(".masonry");
  if (!grids.length) return;

  function layoutGrid(grid) {
    var styles = window.getComputedStyle(grid);
    var rowHeight = parseFloat(styles.getPropertyValue("grid-auto-rows")) || 1;
    var rowGap = parseFloat(styles.getPropertyValue("row-gap")) || parseFloat(styles.getPropertyValue("gap")) || 0;
    var items = grid.querySelectorAll(".media-card");
    items.forEach(function (item) {
      var img = item.querySelector("img");
      if (!img) return;
      var colWidth = item.getBoundingClientRect().width;
      var naturalW = parseFloat(img.getAttribute("width"));
      var naturalH = parseFloat(img.getAttribute("height"));
      if (!colWidth || !naturalW || !naturalH) return;
      var renderedHeight = colWidth * (naturalH / naturalW);
      var span = Math.ceil((renderedHeight + rowGap) / (rowHeight + rowGap));
      item.style.gridRowEnd = "span " + span;
    });
  }

  function layoutAll() {
    grids.forEach(layoutGrid);
  }

  layoutAll();
  window.addEventListener("load", layoutAll);
  var resizeTimer;
  window.addEventListener(
    "resize",
    function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layoutAll, 150);
    },
    { passive: true }
  );
})();

/* ==========================================================================
   Menu filter tabs (menu.html)
   ========================================================================== */
(function () {
  "use strict";
  var tabs = document.querySelectorAll(".filter-btn");
  var cards = document.querySelectorAll(".menu-card");
  if (!tabs.length) return;

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
      var filter = tab.getAttribute("data-filter");
      cards.forEach(function (card) {
        var cat = card.getAttribute("data-category");
        if (filter === "all" || filter === cat) card.classList.remove("is-hidden");
        else card.classList.add("is-hidden");
      });
    });
  });
})();
