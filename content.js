(() => {
  const IS_TOP = window.top === window;
  const MSG = "__ambientGlow";
  const DEFAULTS = { enabled: true, strength: 0.9, blur: 80, size: 1.5, disabledSites: [] };
  let settings = { ...DEFAULTS };
  const MIN_W = 200, MIN_H = 100, MIN_INTERVAL = 33;
  const rid = () => Math.random().toString(36).slice(2);

  const topHost = (() => {
    try {
      const o = location.ancestorOrigins && location.ancestorOrigins[0];
      return new URL(o || location.href).hostname;
    } catch (e) { return location.hostname; }
  })();
  const isActive = () => settings.enabled && !settings.disabledSites.includes(topHost);
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

    create(id) {
      const wrap = document.createElement("div");
      Object.assign(wrap.style, { position: "absolute", inset: "0", pointerEvents: "none" });
      const canvas = document.createElement("canvas");
      canvas.width = 48; canvas.height = 27;
      Object.assign(canvas.style, { position: "absolute", pointerEvents: "none" });
      wrap.appendChild(canvas);
      this.root.appendChild(wrap);
      const it = { wrap, canvas, ctx: canvas.getContext("2d", { alpha: false }), inner: null, iframeEl: null };
      this.items.set(id, it);
      return it;
    },

    set(id, d) {
      this.ensureRoot();
      const it = this.items.get(id) || this.create(id);
      it.inner = d.inner;
      it.iframeEl = d.iframeEl || null;
      const cv = it.canvas;
      if (d.video) {
        const v = d.video;
        const h = Math.max(9, Math.round((48 * v.videoHeight) / v.videoWidth));
        if (cv.width !== 48 || cv.height !== h) { cv.width = 48; cv.height = h; }
        try { it.ctx.drawImage(v, 0, 0, cv.width, cv.height); } catch (e) {}
      } else if (d.bitmap) {
        if (cv.width !== d.bitmap.width || cv.height !== d.bitmap.height) {
          cv.width = d.bitmap.width; cv.height = d.bitmap.height;
        }
        it.ctx.drawImage(d.bitmap, 0, 0);
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
      const s = it.canvas.style;
      s.left = r.x + "px"; s.top = r.y + "px";
      s.width = r.w + "px"; s.height = r.h + "px";
      s.transform = `scale(${settings.size})`;
      s.filter = `blur(${settings.blur}px) saturate(1.4)`;
      s.opacity = String(settings.strength);
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
      Renderer.set(m.id, { inner: m.rect, iframeEl: f, bitmap: m.bitmap });
    } else {
      const b = f.getBoundingClientRect();
      const rect = {
        x: b.left + f.clientLeft + m.rect.x,
        y: b.top + f.clientTop + m.rect.y,
        w: m.rect.w, h: m.rect.h,
      };
      postUp({ [MSG]: 1, type: "frame", id: m.id, rect, bitmap: m.bitmap }, m.bitmap ? [m.bitmap] : []);
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
      this.onDraw = () => this.draw();
      this.onMove = () => {
        if (this.pending) return;
        this.pending = true;
        requestAnimationFrame(() => { this.pending = false; this.draw(); });
      };
      this.onFs = () => {
        if (!IS_TOP) Renderer.clear();
        if (Renderer.root) Renderer.ensureRoot();
        this.draw();
      };
      this.onHide = () => this.hide();

      video.addEventListener("play", this.onPlay);
      video.addEventListener("playing", this.onPlay);
      video.addEventListener("pause", this.onPause);
      ["seeked", "loadeddata", "loadedmetadata"].forEach((ev) => video.addEventListener(ev, this.onDraw));
      window.addEventListener("scroll", this.onMove, true);
      window.addEventListener("resize", this.onMove);
      document.addEventListener("fullscreenchange", this.onFs);
      window.addEventListener("pagehide", this.onHide);

      this.ro = new ResizeObserver(this.onMove);
      this.ro.observe(video);
      this.io = new IntersectionObserver((entries) => {
        this.inView = entries[0].isIntersecting;
        if (this.inView) { this.draw(); this.start(); } else { this.stop(); this.hide(); }
      });
      this.io.observe(video);

      this.draw();
      this.start();
    }

    hide() {
      Renderer.remove(this.id);
      if (!IS_TOP) postUp({ [MSG]: 1, type: "remove", id: this.id });
      this.wasLocal = null;
    }

    draw() {
      const v = this.video;
      if (!this.inView || v.readyState < 2 || !v.videoWidth) return;
      const b = v.getBoundingClientRect();
      const rect = { x: b.left, y: b.top, w: b.width, h: b.height };
      if (rect.w < MIN_W || rect.h < MIN_H) { this.hide(); return; }

      const local = canRender();
      if (this.wasLocal !== null && local !== this.wasLocal) {
        if (local) postUp({ [MSG]: 1, type: "remove", id: this.id });
        else Renderer.remove(this.id);
      }
      this.wasLocal = local;

      if (local) {
        Renderer.set(this.id, { inner: rect, video: v });
      } else {
        if (this.busy) return;
        this.busy = true;
        const h = Math.max(9, Math.round((48 * v.videoHeight) / v.videoWidth));
        createImageBitmap(v, { resizeWidth: 48, resizeHeight: h })
          .then((bmp) => postUp({ [MSG]: 1, type: "frame", id: this.id, rect, bitmap: bmp }, [bmp]))
          .catch(() => {})
          .finally(() => { this.busy = false; });
      }
    }

    loop(now) {
      if (!this.running) return;
      if (now - this.last >= MIN_INTERVAL) { this.last = now; this.draw(); }
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
      ["seeked", "loadeddata", "loadedmetadata"].forEach((ev) => v.removeEventListener(ev, this.onDraw));
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
  const debouncedScan = () => { clearTimeout(timer); timer = setTimeout(scan, 300); };

  chrome.storage.sync.get(DEFAULTS, (s) => {
    settings = { ...DEFAULTS, ...s };
    scan();
    new MutationObserver(debouncedScan).observe(document.documentElement, { childList: true, subtree: true });
  });

  chrome.storage.onChanged.addListener((changes) => {
    for (const k in changes) settings[k] = changes[k].newValue;
    Renderer.layoutAll();
    scan();
  });
})();
