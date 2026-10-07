// Keeps track of whether each tab's top page is "active" so embedded iframes
// (which can't read the top page) know whether they should run.
const key = (tabId) => "tab" + tabId;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab && sender.tab.id;
  if (tabId == null) return;

  if (msg.type === "report" && sender.frameId === 0) {
    chrome.storage.session.set({ [key(tabId)]: { host: msg.host, active: msg.active } }).then(() => {
      chrome.tabs.sendMessage(tabId, { type: "status", host: msg.host, active: msg.active }).catch(() => {});
    });
  } else if (msg.type === "query") {
    chrome.storage.session.get(key(tabId)).then((r) => {
      sendResponse(r[key(tabId)] || { host: null, active: false });
    });
    return true; // async response
  }
});

chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(key(tabId)));
