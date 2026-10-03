const DEFAULTS = { enabled: true, strength: 0.9, blur: 80, size: 1.5, disabledSites: [] };
const $ = (id) => document.getElementById(id);
let settings = { ...DEFAULTS };
let host = "";

function render() {
  $("enabled").checked = settings.enabled;
  for (const k of ["strength", "blur", "size"]) {
    $(k).value = settings[k];
    $(k + "V").textContent = settings[k];
  }
  const off = settings.disabledSites.includes(host);
  $("site").textContent = off ? "Enable on this site" : "Disable on this site";
  $("host").textContent = host;
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  try { host = new URL(tabs[0].url).hostname; } catch (e) { host = ""; }
  chrome.storage.sync.get(DEFAULTS, (s) => {
    settings = { ...DEFAULTS, ...s };
    render();
  });
});

$("enabled").addEventListener("change", (e) => {
  settings.enabled = e.target.checked;
  chrome.storage.sync.set({ enabled: settings.enabled });
});

for (const k of ["strength", "blur", "size"]) {
  $(k).addEventListener("input", (e) => {
    settings[k] = parseFloat(e.target.value);
    $(k + "V").textContent = settings[k];
    chrome.storage.sync.set({ [k]: settings[k] });
  });
}

$("site").addEventListener("click", () => {
  if (!host) return;
  const list = new Set(settings.disabledSites);
  list.has(host) ? list.delete(host) : list.add(host);
  settings.disabledSites = [...list];
  chrome.storage.sync.set({ disabledSites: settings.disabledSites });
  render();
});
