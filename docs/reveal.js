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

/* ============================================================
   Enhancements round 2
   - Count-up: [data-count][data-suffix] animate 0 -> target on view
   - Spotlight: --mx/--my cursor tracking on .glass-panel (hover devices)
   - Back to top: #back-to-top visibility + smooth scroll
   - Copy email: .copy-email copies data-email with feedback
   All respect prefers-reduced-motion.
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Count-up ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function finalText(el) {
    return el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
  }
  if (counters.length) {
    if (reduce || !("IntersectionObserver" in window)) {
      counters.forEach(function (el) { el.textContent = finalText(el); });
    } else {
      // start from zero before first paint, animate once when visible
      counters.forEach(function (el) {
        el.textContent = "0" + (el.getAttribute("data-suffix") || "");
      });
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          cio.unobserve(e.target);
          var el      = e.target;
          var target  = parseInt(el.getAttribute("data-count"), 10) || 0;
          var suffix  = el.getAttribute("data-suffix") || "";
          var dur     = 1100, t0 = null;
          function tick(ts) {
            if (!t0) t0 = ts;
            var p     = Math.min((ts - t0) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);  /* easeOutCubic */
            el.textContent = Math.round(target * eased) + suffix;
            if (p < 1) window.requestAnimationFrame(tick);
          }
          window.requestAnimationFrame(tick);
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    }
  }

  /* ---------- Cursor spotlight on glass panels ---------- */
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  if (canHover && !reduce) {
    document.querySelectorAll(".glass-panel, .bento-card, .work-card").forEach(function (card) {
      card.addEventListener("mousemove", function (ev) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (((ev.clientX - r.left) / r.width) * 100).toFixed(2) + "%");
        card.style.setProperty("--my", (((ev.clientY - r.top) / r.height) * 100).toFixed(2) + "%");
      });
    });
  }

  /* ---------- Back to top ---------- */
  var btt = document.getElementById("back-to-top");
  if (btt) {
    var SHOW_AT = 600, bTicking = false;
    function bUpdate() {
      btt.classList.toggle("visible", window.scrollY > SHOW_AT);
      bTicking = false;
    }
    window.addEventListener("scroll", function () {
      if (!bTicking) { window.requestAnimationFrame(bUpdate); bTicking = true; }
    }, { passive: true });
    bUpdate();
    btt.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* ---------- Copy email ---------- */
  document.querySelectorAll(".copy-email").forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener("click", function () {
      var email = btn.getAttribute("data-email") || "";
      function done() {
        btn.classList.add("copied");
        btn.textContent = "Copied ✓";
        window.setTimeout(function () {
          btn.classList.remove("copied");
          btn.textContent = label;
        }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done).catch(done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = email;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        done();
      }
    });
  });
})();