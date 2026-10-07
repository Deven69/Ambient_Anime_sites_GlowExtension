(() => {
  const IS_TOP = window.top === window;
  const MSG = "__ambientGlow";
  const DEFAULTS = {
    enabled: true,
    strength: 0.9,     // overall glow opacity
    blur: 80,          // blur radius in px
    size: 1.5,         // how far the glow spreads
    softSpread: 0.5,   // second, tighter layer for a smoother falloff (0 = off)
    smoothing: 0.5,    // colour smoothing between frames (0 = none)
    saturation: 1.4,
    brightness: 1,
    quality: 64,       // source resolution (canvas width)
    fps: 30,
    mode: "auto",        // "auto" = anime sites only, "allowlist" = only sites you add, "all" = everywhere
    allowedSites: [],    // sites you added manually
    disabledSites: [],   // sites you turned off (always wins)
  };
  let settings = { ...DEFAULTS };
  const MIN_W = 200, MIN_H = 100;
  const minInterval = () => 1000 / (settings.fps || 30) - 4;
  const rid = () => Math.random().toString(36).slice(2);
  const heightFor = (w, v) => Math.max(9, Math.round((w * v.videoHeight) / v.videoWidth));

  // ---------- Site detection: decide whether the glow should run on this page ----------
  const normHost = (h) => (h || "").toLowerCase().replace(/^www\./, "");
  const hostMatches = (list, host) => list.some((e) => host === e || host.endsWith("." + e));
  const ownHost = normHost(location.hostname);
  const ancestorHost = (() => {
    try {
      const a = location.ancestorOrigins;
      return a && a.length ? normHost(new URL(a[a.length - 1]).hostname) : null;
    } catch (e) { return null; }
  })();

  // Sites that are never auto-enabled (general video and learning platforms).
  const NEVER_AUTO = [
    "youtube.com", "youtu.be", "vimeo.com", "coursera.org", "udemy.com", "khanacademy.org",
    "edx.org", "linkedin.com", "zoom.us", "teams.microsoft.com", "meet.google.com",
    "classroom.google.com",
  ];
  const EDU_HOST = /(\.edu(\.[a-z]{2})?$|\.ac\.[a-z]{2}$|moodle|instructure|blackboard|(^|[.-])lms([.-]|$))/;

  function looksLikeAnime() {
    if (hostMatches(NEVER_AUTO, ownHost) || EDU_HOST.test(ownHost)) return false;
    const meta = (n) => {
      const el = document.querySelector(`meta[name="${n}"],meta[property="${n}"]`);
      return el && el.content ? el.content.toLowerCase() : "";
    };
    const word = /\b(anime|donghua)\b/;
    const title = (document.title || "").toLowerCase();
    let score = 0;
    if (/anime|donghua/.test(ownHost)) score += 3;
    if (word.test(meta("og:site_name"))) score += 2;
    if (word.test(title)) score += 1;
    if (word.test(meta("keywords") + " " + meta("description") + " " + meta("og:description"))) score += 1;
    if (/anime|donghua/.test(location.pathname.toLowerCase())) score += 1;
    if (/\b(subbed|dubbed|english sub|eng sub)\b/.test(title)) score += 1;
    if (/episode\s*\d+/.test(title)) score += 1;
    if (/^video\.(episode|tv_show)/.test(meta("og:type"))) score += 1;
    return score >= 2;
  }

  let siteStatus = { active: false, reason: "starting" };
  let pageActive = false;
  const isActive = () => pageActive;

  function decide() {
    if (!settings.enabled) return { active: false, reason: "extension is off" };
    if (hostMatches(settings.disabledSites, ownHost)) return { active: false, reason: "disabled by you" };
    if (settings.mode === "all") return { active: true, reason: "all-sites mode" };
    if (hostMatches(settings.allowedSites, ownHost)) return { active: true, reason: "added by you" };
    if (settings.mode === "auto" && looksLikeAnime()) return { active: true, reason: "anime site detected" };
    return { active: false, reason: settings.mode === "auto" ? "not detected as an anime site" : "not in your list" };
  }

  let lastReport = "";
  function refreshStatus() {
    if (!IS_TOP) return;
    siteStatus = decide();
    pageActive = siteStatus.active;
    const sig = ownHost + "|" + siteStatus.active;
    if (sig !== lastReport) {
      lastReport = sig;
      try { chrome.runtime.sendMessage({ type: "report", host: ownHost, active: siteStatus.active }); } catch (e) {}
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "getStatus" && IS_TOP) {
      sendResponse(siteStatus);
    } else if (msg.type === "status" && !IS_TOP) {
      if (!ancestorHost || msg.host === ancestorHost) { pageActive = msg.active; scan(); }
    }
  });
  const postUp = (msg, transfer) => {
    try { window.parent.postMessage(msg, "*", transfer || []); } catch (e) {}
  };
  const canRender = () => IS_TOP || !!document.fullscreenElement;

  // ---------- Renderer: draws glow overlays in this frame ----------
  const Renderer = {
    root: null,
    items: new Map(),

    ensureRoot() {
      if (!this.root) {
        const r = document.createElement("div");
        Object.assign(r.style, {
          position: "fixed", inset: "0", zIndex: "2147483646", pointerEvents: "none",
          overflow: "hidden", mixBlendMode: "screen", margin: "0", padding: "0", border: "0",
        });
        this.root = r;
      }
      const fs = document.fullscreenElement;
      const bad = fs && ["VIDEO", "IFRAME", "CANVAS", "IMG"].includes(fs.tagName);
      const host = fs && !bad ? fs : document.body || document.documentElement;
      if (this.root.parentNode !== host) host.appendChild(this.root);
    },

    makeCanvas() {
      const c = document.createElement("canvas");
      c.width = 64; c.height = 36;
      Object.assign(c.style, { position: "absolute", pointerEvents: "none" });
      return c;
    },

    create(id) {
      const wrap = document.createElement("div");
      Object.assign(wrap.style, { position: "absolute", inset: "0", pointerEvents: "none" });
      const far = this.makeCanvas();   // wide, soft glow
      const near = this.makeCanvas();  // tighter glow for smoother falloff
      wrap.appendChild(far);
      wrap.appendChild(near);
      this.root.appendChild(wrap);
      const it = {
        wrap, far, near,
        fctx: far.getContext("2d", { alpha: false }),
        nctx: near.getContext("2d", { alpha: false }),
        inner: null, iframeEl: null, fresh: true,
      };
      this.items.set(id, it);
      return it;
    },

    paint(it, src, w, h, hard) {
      if (it.far.width !== w || it.far.height !== h) {
        it.far.width = w; it.far.height = h;
        it.near.width = w; it.near.height = h;
        it.fresh = true;
      }
      const ctx = it.fctx;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      // Blending each frame over the previous one gives smooth colour transitions.
      ctx.globalAlpha = it.fresh || hard ? 1 : Math.max(0.06, 1 - settings.smoothing);
      try { ctx.drawImage(src, 0, 0, w, h); } catch (e) {}
      ctx.globalAlpha = 1;
      it.fresh = false;
      if (settings.softSpread > 0) it.nctx.drawImage(it.far, 0, 0);
    },

    set(id, d) {
      this.ensureRoot();
      const it = this.items.get(id) || this.create(id);
      it.inner = d.inner;
      it.iframeEl = d.iframeEl || null;
      if (d.video) {
        const w = settings.quality;
        this.paint(it, d.video, w, heightFor(w, d.video), d.hard);
      } else if (d.bitmap) {
        this.paint(it, d.bitmap, d.bitmap.width, d.bitmap.height, d.hard);
        if (d.bitmap.close) d.bitmap.close();
      }
      this.layout(id, it);
    },

    layout(id, it) {
      let r = it.inner;
      if (!r) return;
      if (it.iframeEl) {
        if (!it.iframeEl.isConnected) { this.remove(id); return; }
        const f = it.iframeEl.getBoundingClientRect();
        r = {
          x: f.left + it.iframeEl.clientLeft + r.x,
          y: f.top + it.iframeEl.clientTop + r.y,
          w: r.w, h: r.h,
        };
      }
      const off = r.x + r.w < 0 || r.y + r.h < 0 || r.x > innerWidth || r.y > innerHeight;
      const tiny = r.w < MIN_W || r.h < MIN_H;
      it.wrap.style.display = off || tiny ? "none" : "block";
      const x2 = r.x + r.w, y2 = r.y + r.h;
      // Cut a hole where the video is so the glow never covers it.
      it.wrap.style.clipPath =
        `polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,` +
        `${r.x}px ${r.y}px,${r.x}px ${y2}px,${x2}px ${y2}px,${x2}px ${r.y}px,${r.x}px ${r.y}px)`;

      const color = `saturate(${settings.saturation}) brightness(${settings.brightness})`;
      const place = (cv, blur, scale, opacity) => {
        const s = cv.style;
        s.left = r.x + "px"; s.top = r.y + "px";
        s.width = r.w + "px"; s.height = r.h + "px";
        s.transform = `scale(${scale})`;
        s.filter = `blur(${blur}px) ${color}`;
        s.opacity = String(opacity);
      };
      place(it.far, settings.blur, settings.size, settings.strength);
      const soft = settings.softSpread > 0;
      it.near.style.display = soft ? "block" : "none";
      if (soft) {
        place(it.near, settings.blur * 0.45, 1 + (settings.size - 1) * 0.45,
          settings.strength * settings.softSpread);
      }
    },

    layoutAll() { this.items.forEach((it, id) => this.layout(id, it)); },

    remove(id) {
      const it = this.items.get(id);
      if (it) { it.wrap.remove(); this.items.delete(id); }
    },

    clear() { [...this.items.keys()].forEach((id) => this.remove(id)); },
  };

  let layoutPending = false;
  const relayout = () => {
    if (layoutPending) return;
    layoutPending = true;
    requestAnimationFrame(() => { layoutPending = false; Renderer.layoutAll(); });
  };
  window.addEventListener("scroll", relayout, true);
  window.addEventListener("resize", relayout);

  // ---------- Frame relay: iframes send frames up to the top page ----------
  const findIframe = (win) => {
    for (const f of document.querySelectorAll("iframe")) {
      try { if (f.contentWindow === win) return f; } catch (e) {}
    }
    return null;
  };

  window.addEventListener("message", (e) => {
    const m = e.data;
    if (!m || m[MSG] !== 1 || e.source === window) return;
    if (m.type === "remove") {
      Renderer.remove(m.id);
      if (!IS_TOP) postUp({ [MSG]: 1, type: "remove", id: m.id });
      return;
    }
    const f = findIframe(e.source);
    if (!f) return;
    if (canRender()) {
      Renderer.set(m.id, { inner: m.rect, iframeEl: f, bitmap: m.bitmap, hard: m.hard });
    } else {
      const b = f.getBoundingClientRect();
      const rect = {
        x: b.left + f.clientLeft + m.rect.x,
        y: b.top + f.clientTop + m.rect.y,
        w: m.rect.w, h: m.rect.h,
      };
      postUp({ [MSG]: 1, type: "frame", id: m.id, rect, hard: m.hard, bitmap: m.bitmap },
        m.bitmap ? [m.bitmap] : []);
    }
  });

  setInterval(() => {
    Renderer.items.forEach((it, id) => {
      if (it.iframeEl && !it.iframeEl.isConnected) Renderer.remove(id);
    });
  }, 2000);

  // ---------- Glow: one per <video> ----------
  const glows = new Map();

  class Glow {
    constructor(video) {
      this.video = video;
      this.id = rid();
      this.running = false;
      this.handle = null;
      this.busy = false;
      this.last = 0;
      this.inView = true;
      this.wasLocal = null;
      this.pending = false;
      this.useRVFC = "requestVideoFrameCallback" in video;

      this.onPlay = () => this.start();
      this.onPause = () => { this.stop(); this.draw(); };
      this.onCut = () => this.draw(true);
      this.onMove = () => {
        if (this.pending) return;
        this.pending = true;
        requestAnimationFrame(() => { this.pending = false; this.draw(); });
      };
      this.onFs = () => {
        if (!IS_TOP) Renderer.clear();
        if (Renderer.root) Renderer.ensureRoot();
        this.draw(true);
      };
      this.onHide = () => this.hide();

      video.addEventListener("play", this.onPlay);
      video.addEventListener("playing", this.onPlay);
      video.addEventListener("pause", this.onPause);
      ["seeked", "loadeddata", "loadedmetadata"].forEach((ev) => video.addEventListener(ev, this.onCut));
      window.addEventListener("scroll", this.onMove, true);
      window.addEventListener("resize", this.onMove);
      document.addEventListener("fullscreenchange", this.onFs);
      window.addEventListener("pagehide", this.onHide);

      this.ro = new ResizeObserver(this.onMove);
      this.ro.observe(video);
      this.io = new IntersectionObserver((entries) => {
        this.inView = entries[0].isIntersecting;
        if (this.inView) { this.draw(true); this.start(); } else { this.stop(); this.hide(); }
      });
      this.io.observe(video);

      this.draw(true);
      this.start();
    }

    hide() {
      Renderer.remove(this.id);
      if (!IS_TOP) postUp({ [MSG]: 1, type: "remove", id: this.id });
      this.wasLocal = null;
    }

    draw(hard) {
      const v = this.video;
      if (!this.inView || v.readyState < 2 || !v.videoWidth) return;
      const b = v.getBoundingClientRect();
      const rect = { x: b.left, y: b.top, w: b.width, h: b.height };
      if (rect.w < MIN_W || rect.h < MIN_H) { this.hide(); return; }

      const local = canRender();
      if (this.wasLocal !== null && local !== this.wasLocal) {
        if (local) postUp({ [MSG]: 1, type: "remove", id: this.id });
        else Renderer.remove(this.id);
        hard = true;
      }
      this.wasLocal = local;

      if (local) {
        Renderer.set(this.id, { inner: rect, video: v, hard });
      } else {
        if (this.busy) return;
        this.busy = true;
        const w = settings.quality;
        createImageBitmap(v, { resizeWidth: w, resizeHeight: heightFor(w, v), resizeQuality: "high" })
          .then((bmp) => postUp({ [MSG]: 1, type: "frame", id: this.id, rect, hard: !!hard, bitmap: bmp }, [bmp]))
          .catch(() => {})
          .finally(() => { this.busy = false; });
      }
    }

    loop(now) {
      if (!this.running) return;
      if (now - this.last >= minInterval()) { this.last = now; this.draw(false); }
      this.schedule();
    }

    schedule() {
      if (this.useRVFC) this.handle = this.video.requestVideoFrameCallback((n) => this.loop(n));
      else this.handle = requestAnimationFrame((n) => this.loop(n));
    }

    start() {
      if (this.running || !this.inView || this.video.paused || this.video.ended) return;
      this.running = true;
      this.schedule();
    }

    stop() {
      this.running = false;
      if (this.handle != null) {
        if (this.useRVFC) this.video.cancelVideoFrameCallback(this.handle);
        else cancelAnimationFrame(this.handle);
        this.handle = null;
      }
    }

    destroy() {
      this.stop();
      const v = this.video;
      v.removeEventListener("play", this.onPlay);
      v.removeEventListener("playing", this.onPlay);
      v.removeEventListener("pause", this.onPause);
      ["seeked", "loadeddata", "loadedmetadata"].forEach((ev) => v.removeEventListener(ev, this.onCut));
      window.removeEventListener("scroll", this.onMove, true);
      window.removeEventListener("resize", this.onMove);
      document.removeEventListener("fullscreenchange", this.onFs);
      window.removeEventListener("pagehide", this.onHide);
      this.ro.disconnect();
      this.io.disconnect();
      this.hide();
    }
  }

  function scan() {
    for (const [video, glow] of glows) {
      if (!video.isConnected || !isActive()) { glow.destroy(); glows.delete(video); }
    }
    if (!isActive()) return;
    document.querySelectorAll("video").forEach((video) => {
      if (!glows.has(video) && video.parentElement) glows.set(video, new Glow(video));
    });
  }

  let timer = null;
  const debouncedScan = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (IS_TOP) refreshStatus(); scan(); }, 300);
  };

  chrome.storage.local.get(DEFAULTS, (s) => {
    settings = { ...DEFAULTS, ...s };
    if (IS_TOP) {
      refreshStatus();
      scan();
    } else {
      // Embedded player: ask whether the top page is an active site.
      chrome.runtime.sendMessage({ type: "query" }, (res) => {
        void chrome.runtime.lastError;
        if (res && res.active && (!ancestorHost || res.host === ancestorHost)) {
          pageActive = true;
          scan();
        }
      });
    }
    new MutationObserver(debouncedScan).observe(document.documentElement, { childList: true, subtree: true });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const k in changes) settings[k] = changes[k].newValue;
    Renderer.layoutAll();
    if (IS_TOP) refreshStatus();
    scan();
    glows.forEach((g) => g.draw(true)); // redraw so quality changes apply even when paused
  });
})();
