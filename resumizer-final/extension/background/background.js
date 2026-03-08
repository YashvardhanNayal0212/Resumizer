// ── Resumizer Background Service Worker ──────────────────────

// 🔧 SET THIS after deploying your Render backend
const BACKEND_URL = 'https://resumizer-backend.onrender.com';

// Enable sidepanel on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Also handle manual clicks just in case
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Message handler
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.action === 'analyze') {
    callBackend(msg.payload)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (msg.action === 'getJD') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { sendResponse({ success: false }); return; }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extractJD' }, (res) => {
        if (chrome.runtime.lastError || !res) {
          sendResponse({ success: false, error: 'Could not read page' });
        } else {
          sendResponse({ success: true, data: res });
        }
      });
    });
    return true;
  }

  if (msg.action === 'ping') {
    fetch(`${BACKEND_URL}/health`)
      .then(r => r.json())
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
});

async function callBackend({ resumeText, jdText, jobTitle }) {
  const res = await fetch(`${BACKEND_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jdText, jobTitle })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}
