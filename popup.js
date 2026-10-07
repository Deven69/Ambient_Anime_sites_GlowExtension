const DEFAULTS = {
  enabled: true, strength: 0.9, blur: 80, size: 1.5, softSpread: 0.5, smoothing: 0.5,
  saturation: 1.4, brightness: 1, quality: 64, fps: 30,
  mode: "auto", allowedSites: [], disabledSites: [],
};

const SLIDERS = [
  { k: "strength",   label: "Strength",          min: 0,   max: 1,   step: 0.05 },
  { k: "blur",       label: "Blur",              min: 10,  max: 250, step: 1 },
  { k: "size",       label: "Spread size",       min: 1,   max: 3,   step: 0.01 },
  { k: "softSpread", label: "Soft falloff",      min: 0,   max: 1,   step: 0.05 },
  { k: "smoothing",  label: "Colour smoothing",  min: 0,   max: 0.9, step: 0.05 },
  { k: "saturation", label: "Saturation",        min: 0.5, max: 3,   step: 0.05 },
  { k: "brightness", label: "Brightness",        min: 0.5, max: 1.5, step: 0.05 },
];

const PRESETS = {
  Subtle:    { strength: 0.6,  blur: 100, size: 1.3, softSpread: 0.6, smoothing: 0.6, saturation: 1.2, brightness: 1,    quality: 64 },
  Balanced:  { strength: 0.9,  blur: 80,  size: 1.5, softSpread: 0.5, smoothing: 0.5, saturation: 1.4, brightness: 1,    quality: 64 },
  Cinematic: { strength: 0.95, blur: 120, size: 1.8, softSpread: 0.7, smoothing: 0.6, saturation: 1.5, brightness: 1.05, quality: 128 },
  Intense:   { strength: 1,    blur: 70,  size: 2.2, softSpread: 0.4, smoothing: 0.3, saturation: 2,   brightness: 1.1,  quality: 128 },
};

const $ = (id) => document.getElementById(id);
let settings = { ...DEFAULTS };
let host = "";
let tabId = null;
let siteActive = null; // true / false / null (unknown)

const save = (obj) => { Object.assign(settings, obj); chrome.storage.local.set(obj); };

// Sliders
const box = $("sliders");
for (const s of SLIDERS) {
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `<label><span>${s.label}</span><span id="${s.k}V"></span></label>
    <input type="range" id="${s.k}" min="${s.min}" max="${s.max}" step="${s.step}">`;
  box.appendChild(row);
  row.querySelector("input").addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    $(s.k + "V").textContent = val;
    save({ [s.k]: val });
  });
}

// Presets
for (const name of Object.keys(PRESETS)) {
  const b = document.createElement("button");
  b.textContent = name;
  b.addEventListener("click", () => { save(PRESETS[name]); render(); });
  $("presets").appendChild(b);
}

for (const k of ["quality", "fps"]) {
  $(k).addEventListener("change", (e) => save({ [k]: parseInt(e.target.value, 10) }));
}
$("enabled").addEventListener("change", (e) => { save({ enabled: e.target.checked }); loadStatus(); });
$("mode").addEventListener("change", (e) => { save({ mode: e.target.value }); loadStatus(); });

// Per-site switch: turns the current site on (adds it to your list) or off (blocks it).
$("site").addEventListener("click", () => {
  if (!host) return;
  const allowed = new Set(settings.allowedSites);
  const disabled = new Set(settings.disabledSites);
  if (siteActive) {
    disabled.add(host);
    allowed.delete(host);
  } else {
    allowed.add(host);
    disabled.delete(host);
  }
  save({ allowedSites: [...allowed], disabledSites: [...disabled] });
  loadStatus();
});

$("reset").addEventListener("click", () => {
  save({ ...DEFAULTS, allowedSites: settings.allowedSites, disabledSites: settings.disabledSites });
  render();
  loadStatus();
});

function loadStatus() {
  setTimeout(() => {
    if (tabId == null) return renderSite();
    chrome.tabs.sendMessage(tabId, { type: "getStatus" }, { frameId: 0 }, (res) => {
      if (chrome.runtime.lastError || !res) {
        siteActive = null;
        $("status").textContent = "Not available on this page.";
      } else {
        siteActive = res.active;
        $("status").textContent = (res.active ? "Active here: " : "Off here: ") + res.reason + ".";
      }
      renderSite();
    });
  }, 250);
}

function renderSite() {
  const btn = $("site");
  btn.disabled = siteActive === null || !host;
  btn.textContent = siteActive ? "Disable on this site" : "Enable on this site";
  $("host").textContent = host;
}

function render() {
  $("enabled").checked = settings.enabled;
  $("mode").value = settings.mode;
  for (const s of SLIDERS) {
    $(s.k).value = settings[s.k];
    $(s.k + "V").textContent = settings[s.k];
  }
  $("quality").value = String(settings.quality);
  $("fps").value = String(settings.fps);
  renderSite();
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  tabId = tab ? tab.id : null;
  try { host = new URL(tab.url).hostname.toLowerCase().replace(/^www\./, ""); } catch (e) { host = ""; }
  chrome.storage.local.get(DEFAULTS, (s) => {
    settings = { ...DEFAULTS, ...s };
    render();
    loadStatus();
  });
});
