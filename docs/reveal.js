/* ============================================================
   One-pager scripting
   - Scroll reveal: .fade-up/.fade-in -> .show (IntersectionObserver)
   - Stagger: .stagger-1/2/3 get transition-delay
   - Scrollspy: highlight navbar link for #home/#about/#work/#experience/#contact
   - Scroll progress: #scroll-progress width = scroll pct
   Gated by html.js-enabled (set in <head>) so no-JS users never
   stay trapped in the hidden state.
   ============================================================ */
(function () {
  /* ============================================================
     Hero HLS video
     Mux .m3u8 stream. Use hls.js where supported (Chromium/Firefox);
     fall back to native HLS on Safari. Muted + autoplay + playsinline
     so mobile browsers allow autoplay.
     hls.js is loaded deferred from _quarto.yml include-in-header; this
     script is also deferred so Hls is available by the time we run.
     ============================================================ */
  var heroVideo = document.getElementById("hero-video");
  var streamUrl  = "https://stream.mux.com/kimF2ha9zLrX64H00UgLGPflCzNtl1T0215MlAmeOztv8.m3u8";
  if (heroVideo && streamUrl) {
    var canNative = heroVideo.canPlayType("application/vnd.apple.mpegurl") !== "";
    if (window.Hls && Hls.isSupported() && !canNative) {
      var hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        capLevelToPlayerSize: true,
        startLevel: -1
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(heroVideo);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        var p = heroVideo.play();
        if (p && p.catch) p.catch(function () {});
      });
      hls.on(Hls.Events.ERROR, function (_evt, data) {
        if (data.fatal) {
          // Try one full reload before giving up.
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else hls.destroy();
        }
      });
    } else if (canNative) {
      heroVideo.src = streamUrl;
      heroVideo.addEventListener("loadedmetadata", function () {
        var p = heroVideo.play();
        if (p && p.catch) p.catch(function () {});
      });
    }
  }

  var up   = document.querySelectorAll(".fade-up");
  var inf  = document.querySelectorAll(".fade-in");
  var all  = Array.prototype.slice.call(up).concat(Array.prototype.slice.call(inf));

  // reduced motion: show everything immediately, skip observers
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Progressive enhancement fallback
  if (!("IntersectionObserver" in window) || reduce) {
    all.forEach(function (el) { el.classList.add("show"); });
  } else {
    // Stagger delays: read .stagger-N class and set transition-delay inline
    all.forEach(function (el) {
      if (el.classList.contains("stagger-1")) el.style.transitionDelay = "0s";
      if (el.classList.contains("stagger-2")) el.style.transitionDelay = ".15s";
      if (el.classList.contains("stagger-3")) el.style.transitionDelay = ".30s";
    });

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("show");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );
    all.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     Scrollspy: highlight the navbar link for the section in view
     ============================================================ */
  var sectionIds = ["home", "about", "work", "experience", "contact"];
  var sections = sectionIds
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  var navLinks = {};
  document.querySelectorAll(".navbar .nav-link").forEach(function (link) {
    var href = link.getAttribute("href") || "";
    var m = href.match(/#(home|about|work|experience|contact)$/);
    if (m) navLinks[m[1]] = link;
  });

  if ("IntersectionObserver" in window && sections.length && !reduce) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            Object.keys(navLinks).forEach(function (id) {
              navLinks[id].classList.remove("active");
            });
            if (navLinks[e.target.id]) navLinks[e.target.id].classList.add("active");
          }
        });
      },
      { threshold: 0.4, rootMargin: "-45% 0px -45% 0px" }
    );
    sections.forEach(function (sec) { spy.observe(sec); });
  }

  /* ============================================================
     Scroll progress bar
     ============================================================ */
  var bar = document.getElementById("scroll-progress");
  if (bar) {
    var ticking = false;
    function update() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = pct.toFixed(2) + "%";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }
})();