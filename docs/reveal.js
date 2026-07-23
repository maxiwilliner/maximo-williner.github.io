/* ============================================================
   Portfolio scripting — single deferred bundle
   ------------------------------------------------------------
   1. Hero HLS video (Mux)
   2. Scroll reveal (.fade-up/.fade-in -> .show)
   3. Scrollspy (navbar active link)
   4. Scroll progress bar
   5. Count-up stats
   6. Card spotlight + 3D tilt (.glass-panel)
   7. Cursor-follow page glow (#cursor-glow)
   8. Back to top
   9. Copy email
  10. Interactive CLI terminal (hero)
  11. Pipeline data-flow visualizer (bento)
   All motion respects prefers-reduced-motion; reveals gated by
   html.js-enabled so no-JS users never stay hidden.
   ============================================================ */

/* ============================================================
   1. Hero HLS video
   Mux .m3u8 stream. hls.js where supported (Chromium/Firefox);
   native HLS on Safari. Muted + autoplay + playsinline so mobile
   browsers allow autoplay.
   ============================================================ */
(function () {
  var heroVideo = document.getElementById("hero-video");
  var streamUrl = "https://stream.mux.com/kimF2ha9zLrX64H00UgLGPflCzNtl1T0215MlAmeOztv8.m3u8";
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
})();

/* ============================================================
   2. Scroll reveal
   ============================================================ */
(function () {
  var up  = document.querySelectorAll(".fade-up");
  var inf = document.querySelectorAll(".fade-in");
  var all = Array.prototype.slice.call(up).concat(Array.prototype.slice.call(inf));

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!("IntersectionObserver" in window) || reduce) {
    all.forEach(function (el) { el.classList.add("show"); });
  } else {
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
})();

/* ============================================================
   3. Scrollspy
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
})();

/* ============================================================
   4. Scroll progress bar
   ============================================================ */
(function () {
  var bar = document.getElementById("scroll-progress");
  if (!bar) return;
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
})();

/* ============================================================
   5. Count-up: [data-count][data-suffix] animate 0 -> target
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var counters = document.querySelectorAll("[data-count]");
  function finalText(el) {
    return el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
  }
  if (!counters.length) return;
  if (reduce || !("IntersectionObserver" in window)) {
    counters.forEach(function (el) { el.textContent = finalText(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent = "0" + (el.getAttribute("data-suffix") || "");
    });
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        var el     = e.target;
        var target = parseInt(el.getAttribute("data-count"), 10) || 0;
        var suffix = el.getAttribute("data-suffix") || "";
        var dur = 1100, t0 = null;
        function tick(ts) {
          if (!t0) t0 = ts;
          var p     = Math.min((ts - t0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }
})();

/* ============================================================
   6. Card spotlight + subtle 3D tilt
   --mx/--my drive the radial spotlight; --rx/--ry drive the tilt.
   .float-bob cards keep their CSS bob animation (no tilt).
   ============================================================ */
(function () {
  var reduce   = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  if (!canHover || reduce) return;

  document.querySelectorAll(".glass-panel").forEach(function (card) {
    var tilt = !card.classList.contains("float-bob");
    card.addEventListener("mousemove", function (ev) {
      var r  = card.getBoundingClientRect();
      var px = (ev.clientX - r.left) / r.width;
      var py = (ev.clientY - r.top) / r.height;
      card.style.setProperty("--mx", (px * 100).toFixed(2) + "%");
      card.style.setProperty("--my", (py * 100).toFixed(2) + "%");
      if (tilt) {
        card.style.setProperty("--ry", ((px - 0.5) * 6).toFixed(2) + "deg");
        card.style.setProperty("--rx", ((0.5 - py) * 6).toFixed(2) + "deg");
      }
    });
    card.addEventListener("mouseleave", function () {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    });
  });
})();

/* ============================================================
   7. Cursor-follow page glow
   A fixed radial-gradient layer that lerps after the pointer.
   ============================================================ */
(function () {
  var glow = document.getElementById("cursor-glow");
  if (!glow) return;
  var reduce   = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  if (!canHover || reduce) return;

  var gx = window.innerWidth / 2, gy = window.innerHeight / 3;
  var tx = gx, ty = gy;
  var raf = null, on = false;

  function loop() {
    gx += (tx - gx) * 0.12;
    gy += (ty - gy) * 0.12;
    glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0) translate(-50%,-50%)";
    if (Math.abs(tx - gx) > 0.2 || Math.abs(ty - gy) > 0.2) {
      raf = window.requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  }
  document.addEventListener("mousemove", function (e) {
    tx = e.clientX; ty = e.clientY;
    if (!on) { on = true; glow.classList.add("on"); }
    if (!raf) raf = window.requestAnimationFrame(loop);
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", function () {
    on = false;
    glow.classList.remove("on");
  });
})();

/* ============================================================
   8. Back to top
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var btt = document.getElementById("back-to-top");
  if (!btt) return;
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
})();

/* ============================================================
   9. Copy email
   ============================================================ */
(function () {
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

/* ============================================================
   10. Interactive CLI terminal (hero)
   A hidden <input> captures keystrokes (mobile-friendly); a
   mirror renders the styled line with a blinking block cursor
   and fish-style ghost autocompletion (Tab / ArrowRight).
   ============================================================ */
(function () {
  var term    = document.getElementById("terminal");
  if (!term) return;
  var body    = document.getElementById("term-body");
  var output  = document.getElementById("term-output");
  var input   = document.getElementById("term-input");
  var typedEl = document.getElementById("term-typed");
  var ghostEl = document.getElementById("term-ghost");
  var hints   = document.getElementById("term-hints");
  var reduce  = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PROMPT_HTML =
    '<span class="tp-user">maximo@42</span><span class="tp-sep">:</span>' +
    '<span class="tp-path">~/portfolio</span>&nbsp;<span class="tp-char">%</span>';

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- command registry ---------- */
  var CMDS = {
    "help": {
      desc: "list available commands",
      lines: [
        '<span class="t-gold">Available commands</span>',
        '  <span class="t-cmd">help</span>           list available commands',
        '  <span class="t-cmd">cat about.txt</span>  who I am',
        '  <span class="t-cmd">skills</span>         my tech stack',
        '  <span class="t-cmd">42madrid</span>       the 42 journey',
        '  <span class="t-cmd">projects</span>       selected work',
        '  <span class="t-cmd">contact</span>        get in touch',
        '  <span class="t-cmd">whoami</span> · <span class="t-cmd">ls</span> · <span class="t-cmd">clear</span>',
        '<span class="t-dim">tip: Tab autocompletes · ↑/↓ history · ctrl+l clears</span>'
      ]
    },
    "cat about.txt": {
      desc: "who I am",
      lines: [
        '<span class="t-gold"># about.txt</span>',
        'Software Developer &amp; Data Analyst — trained at <span class="t-cmd">42 Madrid</span>.',
        'Low-level rigor (<span class="t-str">C</span>, <span class="t-str">shell</span>, <span class="t-str">Unix</span>) meets a marketing brain',
        '(<span class="t-str">funnels</span>, <span class="t-str">KPIs</span>, <span class="t-str">consumer metrics</span>).',
        'I turn raw, messy data into pipelines, dashboards and tools',
        'that answer real business questions.',
        '<span class="t-dim">— EOF —</span>'
      ]
    },
    "skills": {
      desc: "my tech stack",
      lines: [
        '<span class="t-gold">core</span>     C · Shell · Unix · Git · Algorithms',
        '<span class="t-gold">data</span>     Python · SQL · Pandas · PostgreSQL · Streamlit',
        '<span class="t-gold">bi</span>       Tableau · Power BI · Plotly · Seaborn',
        '<span class="t-gold">growth</span>   Funnels · Cohort analysis · A/B testing · Attribution'
      ]
    },
    "42madrid": {
      desc: "the 42 journey",
      lines: [
        '<span class="t-ok">✓</span> <span class="t-gold">Piscine</span> ......... passed — 26 days of pure C &amp; shell',
        '<span class="t-cmd">▸</span> <span class="t-gold">Common Core</span> ..... in progress',
        '    libft · ft_printf · memory &amp; data structures',
        '    peer-to-peer reviews · no frameworks, just C',
        '<span class="t-dim">"peer learning: the docs are your teacher"</span>'
      ]
    },
    "projects": {
      desc: "selected work",
      lines: [
        '<span class="t-gold">[1]</span> job-market-scraper   <span class="t-dim">Python · SQL · Streamlit</span>',
        '<span class="t-gold">[2]</span> unit-economics       <span class="t-dim">Pandas · Cohorts · LTV</span>',
        '<span class="t-gold">[3]</span> c-system-tooling     <span class="t-dim">C · Unix · 42 Madrid</span>',
        '<span class="t-dim">→</span> <span class="t-link">github.com/maxiwilliner</span>'
      ]
    },
    "contact": {
      desc: "get in touch",
      lines: [
        '<span class="t-gold">email</span>    maximowilliner35@gmail.com',
        '<span class="t-gold">github</span>   github.com/maxiwilliner',
        '<span class="t-gold">linkedin</span> /in/maximo-williner-12155a292',
        '<span class="t-dim">or scroll to the footer — the buttons work too</span>'
      ]
    },
    "whoami": {
      desc: "print current user",
      lines: [
        'maximo — software developer &amp; data analyst',
        '<span class="t-dim">uid=42(madrid) groups=piscine,core,marketing</span>'
      ]
    },
    "ls": {
      desc: "list directory",
      lines: [
        '<span class="t-cmd">about.txt</span>  <span class="t-cmd">projects/</span>  <span class="t-cmd">skills.md</span>  <span class="t-cmd">contact.txt</span>'
      ]
    },
    "sudo": {
      desc: "nice try",
      lines: [
        '<span class="t-err">maximo is not in the sudoers file. This incident will be reported.</span>'
      ]
    }
  };
  var CMD_NAMES = Object.keys(CMDS).concat(["clear", "cat about.txt"]);
  var history = [], hIdx = -1, draft = "";

  /* ---------- rendering ---------- */
  function scrollBottom() { body.scrollTop = body.scrollHeight; }

  function print(lines, cls) {
    lines.forEach(function (html, i) {
      var div = document.createElement("div");
      div.className = "t-line" + (cls ? " " + cls : "");
      if (!reduce) div.style.animationDelay = Math.min(i * 45, 500) + "ms";
      div.innerHTML = html;
      output.appendChild(div);
    });
    scrollBottom();
  }

  function echo(cmdRaw) {
    var div = document.createElement("div");
    div.className = "t-line t-echo";
    div.innerHTML = PROMPT_HTML + "&nbsp;" + esc(cmdRaw);
    output.appendChild(div);
    scrollBottom();
  }

  function run(cmdRaw) {
    var cmd = cmdRaw.trim().replace(/\s+/g, " ");
    echo(cmdRaw);
    if (!cmd) return;
    history.push(cmdRaw); hIdx = history.length; draft = "";
    var key = cmd.toLowerCase();

    if (key === "clear") { output.innerHTML = ""; return; }
    if (CMDS[key]) { print(CMDS[key].lines); return; }
    if (key === "cat" || key.indexOf("cat ") === 0) {
      print(['cat: ' + esc(key.slice(4)) + ': No such file or directory',
             '<span class="t-dim">try</span> <span class="t-cmd">cat about.txt</span>'], "t-err");
      return;
    }
    print(['zsh: command not found: ' + esc(key),
           '<span class="t-dim">type</span> <span class="t-cmd">help</span> <span class="t-dim">to see available commands</span>'], "t-err");
  }

  /* ---------- ghost autocomplete ---------- */
  function suggestion(val) {
    if (!val) return "";
    var v = val.toLowerCase();
    if (v !== val) return ""; /* keep ghost simple: lowercase commands only */
    for (var i = 0; i < CMD_NAMES.length; i++) {
      if (CMD_NAMES[i].indexOf(v) === 0 && CMD_NAMES[i] !== v) return CMD_NAMES[i];
    }
    return "";
  }

  function render() {
    var val = input.value;
    typedEl.textContent = val;
    var s = suggestion(val);
    ghostEl.textContent = s ? s.slice(val.length) : "";
    scrollBottom();
  }

  function acceptGhost() {
    var s = suggestion(input.value);
    if (s) { input.value = s; render(); return true; }
    return false;
  }

  /* ---------- events ---------- */
  input.addEventListener("input", render);

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var v = input.value;
      input.value = ""; render();
      run(v);
      e.preventDefault();
    } else if (e.key === "Tab") {
      if (acceptGhost()) e.preventDefault();
      else e.preventDefault();
    } else if (e.key === "ArrowRight") {
      if (input.selectionStart === input.value.length && ghostEl.textContent) {
        acceptGhost();
        e.preventDefault();
      }
    } else if (e.key === "ArrowUp") {
      if (history.length) {
        if (hIdx === history.length) draft = input.value;
        hIdx = Math.max(0, hIdx - 1);
        input.value = history[hIdx]; render();
        window.setTimeout(function () {
          input.setSelectionRange(input.value.length, input.value.length);
        }, 0);
      }
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (history.length) {
        hIdx = Math.min(history.length, hIdx + 1);
        input.value = hIdx === history.length ? draft : history[hIdx];
        render();
      }
      e.preventDefault();
    } else if (e.key === "l" && e.ctrlKey) {
      output.innerHTML = "";
      e.preventDefault();
    } else if (e.key === "c" && e.ctrlKey) {
      echo(input.value + "^C");
      input.value = ""; render();
      e.preventDefault();
    } else if (e.key === "u" && e.ctrlKey) {
      input.value = ""; render();
      e.preventDefault();
    } else if (e.key === "Escape") {
      input.blur();
    }
  });

  body.addEventListener("click", function () {
    input.focus({ preventScroll: true });
  });
  term.addEventListener("click", function (e) {
    if (e.target.closest(".term-hint")) return;
    input.focus({ preventScroll: true });
  });
  input.addEventListener("focus", function () { term.classList.add("focused"); });
  input.addEventListener("blur",  function () { term.classList.remove("focused"); });

  if (hints) {
    hints.querySelectorAll(".term-hint").forEach(function (btn) {
      btn.addEventListener("click", function () {
        run(btn.getAttribute("data-cmd") || "");
        input.focus({ preventScroll: true });
      });
    });
  }

  /* ---------- boot sequence ---------- */
  var boot = [
    '<span class="t-dim">Last login: Thu Jul 23 09:41:02 on ttys000</span>',
    'Welcome to <span class="t-gold">maximo.sh</span> — interactive portfolio terminal',
    'Type <span class="t-cmd">help</span> to see what I can do <span class="t-dim">(or click a command below)</span>'
  ];
  window.setTimeout(function () { print(boot); }, reduce ? 0 : 1100);
})();

/* ============================================================
   11. Pipeline data-flow visualizer
   Click a stage -> connections glow up to it and the console
   streams that stage's simulated output. Auto-runs once when
   scrolled into view; replay via the Run button.
   ============================================================ */
(function () {
  var card    = document.getElementById("pipeline-card");
  if (!card) return;
  var nodes   = Array.prototype.slice.call(card.querySelectorAll(".pipe-node"));
  var links   = Array.prototype.slice.call(card.querySelectorAll(".pipe-link"));
  var fileEl  = document.getElementById("pipe-file");
  var statEl  = document.getElementById("pipe-status");
  var codeEl  = document.getElementById("pipe-code");
  var runBtn  = document.getElementById("pipeline-run");
  var reduce  = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ORDER = ["extract", "transform", "load", "visualize"];

  var STEPS = {
    extract: {
      file: "extract_jobs.py",
      lines: [
        '<span class="pk-c">$ python extract_jobs.py --source linkedin,infojobs</span>',
        '<span class="pk-d">  fetching page 1/4 … 200 OK (1.2s)</span>',
        '<span class="pk-d">  fetching page 2/4 … 200 OK (0.9s)</span>',
        '<span class="pk-d">→ raw_jobs.json</span>',
        '{',
        '  <span class="pk-k">"source"</span>: <span class="pk-s">"linkedin"</span>,',
        '  <span class="pk-k">"role"</span>: <span class="pk-s">"Data Analyst"</span>,',
        '  <span class="pk-k">"skills"</span>: [<span class="pk-s">"SQL"</span>, <span class="pk-s">"Python"</span>, <span class="pk-s">"Tableau"</span>],',
        '  <span class="pk-k">"scraped_at"</span>: <span class="pk-s">"2026-07-23T09:41:02Z"</span>',
        '}',
        '<span class="pk-ok">✓ 312 raw records captured</span>'
      ]
    },
    transform: {
      file: "transform.py",
      lines: [
        '<span class="pk-c">$ python transform.py --in raw_jobs.json</span>',
        '<span class="pk-d">  normalizing titles … dedupe on (company, role)</span>',
        '<span class="pk-d">  parsing skills taxonomy … 97% matched</span>',
        '<span class="pk-d">→ clean_jobs.parquet</span>',
        '{',
        '  <span class="pk-k">"rows_in"</span>: <span class="pk-n">312</span>,  <span class="pk-k">"rows_out"</span>: <span class="pk-n">287</span>,',
        '  <span class="pk-k">"dupes_dropped"</span>: <span class="pk-n">25</span>,',
        '  <span class="pk-k">"nulls_imputed"</span>: <span class="pk-n">41</span>',
        '}',
        '<span class="pk-ok">✓ schema validated · 8 columns</span>'
      ]
    },
    load: {
      file: "warehouse.sql",
      lines: [
        '<span class="pk-c">$ dbt run --models marts.fct_jobs</span>',
        '<span class="pk-sql">INSERT INTO</span> warehouse.fct_jobs',
        '<span class="pk-sql">SELECT</span> * <span class="pk-sql">FROM</span> staging.clean_jobs;',
        '<span class="pk-t">┌────────────┬──────┐</span>',
        '<span class="pk-t">│</span> table      <span class="pk-t">│</span> rows <span class="pk-t">│</span>',
        '<span class="pk-t">├────────────┼──────┤</span>',
        '<span class="pk-t">│</span> fct_jobs   <span class="pk-t">│</span>  <span class="pk-n">287</span> <span class="pk-t">│</span>',
        '<span class="pk-t">│</span> dim_skills <span class="pk-t">│</span>   <span class="pk-n">34</span> <span class="pk-t">│</span>',
        '<span class="pk-t">└────────────┴──────┘</span>',
        '<span class="pk-ok">✓ loaded in 0.8s — tests 14/14 passed</span>'
      ]
    },
    visualize: {
      file: "dashboard.py",
      lines: [
        '<span class="pk-c">$ streamlit run dashboard.py</span>',
        '<span class="pk-sql">SELECT</span> skill, <span class="pk-sql">COUNT</span>(*) <span class="pk-sql">AS</span> demand',
        '<span class="pk-sql">FROM</span> fct_jobs <span class="pk-sql">GROUP BY</span> 1 <span class="pk-sql">ORDER BY</span> 2 <span class="pk-sql">DESC</span>;',
        '<span class="pk-t">┌─────────┬────────┐</span>',
        '<span class="pk-t">│</span> sql     <span class="pk-t">│</span>    <span class="pk-n">198</span> <span class="pk-t">│</span>',
        '<span class="pk-t">│</span> python  <span class="pk-t">│</span>    <span class="pk-n">171</span> <span class="pk-t">│</span>',
        '<span class="pk-t">│</span> tableau <span class="pk-t">│</span>     <span class="pk-n">96</span> <span class="pk-t">│</span>',
        '<span class="pk-t">└─────────┴────────┘</span>',
        '<span class="pk-ok">✓ live dashboard → localhost:8501</span>'
      ]
    }
  };

  var runToken = 0; /* cancels pending timers when user interacts */
  var LINE_DELAY = reduce ? 0 : 55;

  function paintRail(activeIdx) {
    nodes.forEach(function (n) {
      var i = ORDER.indexOf(n.getAttribute("data-step"));
      n.classList.toggle("active", i === activeIdx);
      n.classList.toggle("done", i > -1 && i < activeIdx);
      n.setAttribute("aria-pressed", i === activeIdx ? "true" : "false");
    });
    links.forEach(function (l, i) {
      l.classList.toggle("active", i < activeIdx);
    });
  }

  function streamLines(lines, token, done) {
    codeEl.innerHTML = "";
    if (reduce) {
      codeEl.innerHTML = lines.join("\n");
      if (done) done();
      return;
    }
    var i = 0;
    (function next() {
      if (token !== runToken) return;
      if (i >= lines.length) { if (done) done(); return; }
      var span = document.createElement("span");
      span.className = "pk-line";
      span.innerHTML = lines[i];
      codeEl.appendChild(span);
      codeEl.appendChild(document.createTextNode("\n"));
      i++;
      window.setTimeout(next, LINE_DELAY);
    })();
  }

  function selectStep(key) {
    var idx = ORDER.indexOf(key);
    if (idx < 0) return;
    runToken++;
    var token = runToken;
    paintRail(idx);
    var step = STEPS[key];
    fileEl.textContent = step.file;
    statEl.textContent = "running";
    statEl.className = "pc-status is-running";
    streamLines(step.lines, token, function () {
      if (token !== runToken) return;
      statEl.textContent = "done ✓";
      statEl.className = "pc-status is-done";
    });
  }

  function runAll() {
    runToken++;
    var token = runToken;
    runBtn.classList.add("is-running");
    runBtn.disabled = true;
    var stepIdx = 0;
    (function nextStep() {
      if (token !== runToken) { runBtn.classList.remove("is-running"); runBtn.disabled = false; return; }
      if (stepIdx >= ORDER.length) {
        runBtn.classList.remove("is-running");
        runBtn.disabled = false;
        return;
      }
      var key = ORDER[stepIdx];
      selectStep(key);
      token = runToken; /* selectStep bumps token; adopt it */
      stepIdx++;
      var wait = reduce ? 60 : STEPS[key].lines.length * LINE_DELAY + 620;
      window.setTimeout(nextStep, wait);
    })();
  }

  nodes.forEach(function (n) {
    n.addEventListener("click", function () {
      selectStep(n.getAttribute("data-step"));
    });
  });
  if (runBtn) runBtn.addEventListener("click", runAll);

  /* initial state + one-time auto-run when scrolled into view */
  paintRail(-1);
  if (reduce) {
    selectStep("extract");
  } else if ("IntersectionObserver" in window) {
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          pio.unobserve(e.target);
          runAll();
        }
      });
    }, { threshold: 0.35 });
    pio.observe(card);
  } else {
    selectStep("extract");
  }
})();
