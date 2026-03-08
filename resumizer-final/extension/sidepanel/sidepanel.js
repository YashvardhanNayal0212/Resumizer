// ══════════════════════════════════════════════════
//  Resumizer — Side Panel Logic (End to End)
// ══════════════════════════════════════════════════

const $ = id => document.getElementById(id);

// ── App State ──────────────────────────────────────
const state = {
  resumeText: '',
  resumeFileName: '',
  jdText: '',
  jdTitle: '',
  jdCompany: '',
  jdSite: '',
  lastResult: null,
  history: [],       // [{ title, company, score, date, result }]
  usedToday: 0,
  activeTab: 'home'
};

const DAILY_LIMIT = 5;

// ── Boot ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadFromStorage();

  if (!state.resumeText) {
    hideTabbar();
    showPage('setup');
  } else {
    showTabbar();
    showPage('home');
    scanCurrentPage();
    updateProfileUI();
  }

  bindEvents();
});

// ── Storage ────────────────────────────────────────
async function loadFromStorage() {
  return new Promise(resolve => {
    chrome.storage.local.get([
      'resumeText', 'resumeFileName', 'history', 'usedToday', 'usedDate'
    ], d => {
      state.resumeText    = d.resumeText || '';
      state.resumeFileName= d.resumeFileName || '';
      state.history       = d.history || [];

      // Reset daily count if new day
      const today = new Date().toDateString();
      if (d.usedDate !== today) {
        state.usedToday = 0;
        chrome.storage.local.set({ usedToday: 0, usedDate: today });
      } else {
        state.usedToday = d.usedToday || 0;
      }

      resolve();
    });
  });
}

function saveToStorage(extra = {}) {
  chrome.storage.local.set({
    resumeText:     state.resumeText,
    resumeFileName: state.resumeFileName,
    history:        state.history,
    usedToday:      state.usedToday,
    usedDate:       new Date().toDateString(),
    ...extra
  });
}

// ── Page / Tab routing ─────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = $(`page-${name}`);
  if (page) page.classList.add('active');
  state.activeTab = name;

  // Sync tab bar highlight
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === name);
  });
}

function showTabbar()  { $('tabbar').style.display = 'flex'; }
function hideTabbar()  { $('tabbar').style.display = 'none'; }

// ── Event bindings ─────────────────────────────────
function bindEvents() {

  // Tab bar
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      if (name === 'results' && !state.lastResult) {
        showToast('Run an analysis first');
        return;
      }
      if (name === 'history') renderHistory();
      if (name === 'profile') updateProfileUI();
      showPage(name);
    });
  });

  // Topbar
  $('refreshJdBtn').addEventListener('click', () => {
    $('scanningCard').style.display = 'block';
    $('jobDetectedCard').style.display = 'none';
    $('noJobCard').style.display = 'none';
    scanCurrentPage();
  });
  $('helpBtn').addEventListener('click', () =>
    showToast('Open any job page, then click Analyze'));

  // Setup
  $('setupResumeFile').addEventListener('change', e => handleFileSelect(e.target.files[0], 'setup'));
  const uz = $('setupUploadZone');
  uz.addEventListener('dragover', e => { e.preventDefault(); uz.classList.add('drag-over'); });
  uz.addEventListener('dragleave', () => uz.classList.remove('drag-over'));
  uz.addEventListener('drop', e => { e.preventDefault(); uz.classList.remove('drag-over'); handleFileSelect(e.dataTransfer.files[0], 'setup'); });
  $('setupSaveBtn').addEventListener('click', handleSetupSave);

  // Home
  $('analyzeBtn').addEventListener('click', () => startAnalysis(state.jdText, state.jdTitle));
  $('changeResumeBtn').addEventListener('click', () => showPage('setup'));
  $('manualToggleBtn').addEventListener('click', toggleManual);
  $('pasteManualBtn').addEventListener('click', toggleManual);
  $('analyzeManualBtn').addEventListener('click', () => {
    const text = $('manualJdInput').value.trim();
    if (text.length < 50) { showToast('⚠ Please paste a full job description'); return; }
    startAnalysis(text, 'Job Position');
  });

  // Results
  $('copyResumeBtn').addEventListener('click', () => {
    navigator.clipboard.writeText($('optimizedText').textContent)
      .then(() => showToast('✓ Copied to clipboard!'));
  });
  $('downloadResumeBtn').addEventListener('click', downloadResume);
  $('reanalyzeBtn').addEventListener('click', () => showPage('home'));

  // Profile
  $('settingResume').addEventListener('click', () => showPage('setup'));
  $('settingClear').addEventListener('click', () => {
    if (!confirm('Clear all Resumizer data including your resume?')) return;
    chrome.storage.local.clear(() => {
      state.resumeText = ''; state.resumeFileName = '';
      state.history = []; state.usedToday = 0;
      hideTabbar();
      showPage('setup');
      showToast('All data cleared');
    });
  });
}

// ── File handling ──────────────────────────────────
function handleFileSelect(file, context) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showError('setupError', 'File too large. Max 5MB.'); return; }

  const reader = new FileReader();
  reader.readAsText(file);
  reader.onload = () => {
    state._pendingText = reader.result;
    state._pendingName = file.name;

    if (context === 'setup') {
      $('setupUploadZone').classList.add('filled');
      $('setupUploadTitle').textContent = `✓ ${file.name}`;
    }
  };
  reader.onerror = () => showError('setupError', 'Could not read file. Try a .txt version.');
}

// ── Setup save ─────────────────────────────────────
function handleSetupSave() {
  const errEl = $('setupError');
  errEl.classList.remove('show');

  const text = state._pendingText || state.resumeText;
  const name = state._pendingName || state.resumeFileName;

  if (!text) {
    showError('setupError', 'Please upload your resume to continue.');
    return;
  }

  const btn = $('setupSaveBtn');
  btn.disabled = true; btn.textContent = 'Saving...';

  state.resumeText = text;
  state.resumeFileName = name;
  saveToStorage();

  $('resumeStripName').textContent = name;
  btn.disabled = false; btn.textContent = 'Get Started →';
  showTabbar();
  showPage('home');
  showToast('✓ Resume saved!');
  scanCurrentPage();
  updateProfileUI();
}

// ── JD scanning ────────────────────────────────────
function scanCurrentPage() {
  chrome.runtime.sendMessage({ action: 'getJD' }, res => {
    $('scanningCard').style.display = 'none';

    if (!res || !res.success || !res.data || res.data.jd.length < 100) {
      $('noJobCard').style.display = 'block';
      $('jobDetectedCard').style.display = 'none';
      return;
    }

    const { jd, title, company, site } = res.data;
    state.jdText    = jd;
    state.jdTitle   = title;
    state.jdCompany = company;
    state.jdSite    = site || 'Job Page';

    $('detectedJobTitle').textContent  = title;
    $('detectedSiteName').textContent  = state.jdSite;
    $('detectedSnippet').textContent   = jd.substring(0, 160) + '...';
    $('detectedCompany').textContent   = company || state.jdSite;
    $('noJobCard').style.display       = 'none';
    $('jobDetectedCard').style.display = 'block';
    $('resumeStripName').textContent   = state.resumeFileName || 'resume.pdf';
  });
}

function toggleManual() {
  const area = $('manualArea');
  const isOpen = area.classList.contains('show');
  area.classList.toggle('show', !isOpen);
  $('manualToggleBtn').title = isOpen ? 'Paste JD manually' : 'Hide manual input';
}

// ── Analysis ───────────────────────────────────────
function startAnalysis(jd, title) {
  if (!state.resumeText) {
    showToast('⚠ Please upload your resume first');
    showPage('setup'); return;
  }
  if (!jd || jd.length < 50) {
    showToast('⚠ No job description found'); return;
  }

  const remaining = DAILY_LIMIT - state.usedToday;
  if (remaining <= 0) {
    showToast('⚠ Daily limit reached. Resets tomorrow.');
    return;
  }

  showPage('loading');
  animateLoadingSteps();

  chrome.runtime.sendMessage({
    action: 'analyze',
    payload: { resumeText: state.resumeText, jdText: jd, jobTitle: title }
  }, res => {
    if (!res || !res.success) {
      showPage('home');
      showToast('❌ ' + (res?.error || 'Analysis failed. Try again.'));
      return;
    }

    state.usedToday++;
    state.lastResult = res.data;
    saveToStorage();

    // Save to history
    state.history.unshift({
      title: title || 'Job Position',
      company: state.jdCompany,
      site: state.jdSite,
      score: res.data.matchScore,
      date: new Date().toISOString(),
      result: res.data
    });
    if (state.history.length > 20) state.history = state.history.slice(0, 20);
    saveToStorage();

    renderResults(res.data);
    showPage('results');
    updateProfileUI();
  });
}

// ── Loading steps animation ────────────────────────
function animateLoadingSteps() {
  const steps = ['lstep1','lstep2','lstep3','lstep4'];
  steps.forEach(s => {
    const el = $(s);
    el.classList.remove('active','done');
  });
  $('lstep1').classList.add('active');

  let current = 0;
  const advance = () => {
    if (current < steps.length - 1) {
      $(steps[current]).classList.remove('active');
      $(steps[current]).classList.add('done');
      current++;
      $(steps[current]).classList.add('active');
    }
  };
  setTimeout(advance, 900);
  setTimeout(advance, 2000);
  setTimeout(advance, 3400);
}

// ── Render results ─────────────────────────────────
function renderResults(data) {
  const score = Math.min(100, Math.max(0, data.matchScore || 0));

  // Ring
  const circ = 207.3;
  const arc = $('scoreArc');
  setTimeout(() => {
    arc.style.strokeDashoffset = circ - (score / 100) * circ;
    arc.style.stroke = score >= 70 ? 'var(--green)' : score >= 45 ? 'var(--amber)' : 'var(--red)';
  }, 100);
  $('scoreRingPct').textContent = `${score}%`;

  // Badge
  const badge = $('scoreBadge');
  if (score >= 70) {
    badge.className = 'score-badge strong'; badge.textContent = '✓ Strong Match';
  } else if (score >= 55) {
    badge.className = 'score-badge good'; badge.textContent = '⚡ Good Match';
  } else if (score >= 40) {
    badge.className = 'score-badge fair'; badge.textContent = '⚠ Fair Match';
  } else {
    badge.className = 'score-badge weak'; badge.textContent = '✕ Weak Match';
  }

  $('scoreTitle').textContent = data.scoreTitle || 'Match Score';
  $('scoreDesc').textContent  = data.scoreDesc  || '';

  // Usage dots
  const remaining = Math.max(0, DAILY_LIMIT - state.usedToday);
  $('usageText').textContent = `${remaining} of ${DAILY_LIMIT} left today`;
  const dotsEl = $('usageDots');
  dotsEl.innerHTML = '';
  for (let i = 0; i < DAILY_LIMIT; i++) {
    const d = document.createElement('div');
    d.className = 'usage-dot' + (i < state.usedToday ? ' used' : '');
    dotsEl.appendChild(d);
  }

  // Keywords
  $('matchedKw').innerHTML = (data.matchedKeywords || []).map(k =>
    `<div class="kw-chip matched"><span class="check">✓</span>${esc(k)}</div>`).join('');
  $('missingKw').innerHTML = (data.missingKeywords || []).map(k =>
    `<div class="kw-chip missing">${esc(k)}</div>`).join('');

  // Insights
  $('insightsList').innerHTML = (data.insights || []).map(i =>
    `<div class="insight-item"><span class="insight-bullet">→</span><span>${esc(i)}</span></div>`
  ).join('');

  // Suggestions
  const suggEl = $('suggestionsList');
  suggEl.innerHTML = '';
  const typeIcons = {
    'Bullet Rewrite': '✏',
    'Skill Addition': '➕',
    'Summary Update': '📝',
    'Keyword Alignment': '🎯'
  };
  (data.suggestions || []).forEach((s, idx) => {
    const card = document.createElement('div');
    card.className = 'suggestion-card';
    card.id = `sugg-${idx}`;
    card.innerHTML = `
      <div class="sugg-header">
        <div class="sugg-type">
          <span class="tag-icon">${typeIcons[s.type] || '✏'}</span>
          ${esc(s.type)}
        </div>
        <span class="sugg-status" id="sugg-status-${idx}">Not applied</span>
      </div>
      <div class="sugg-body">
        ${s.before ? `<div class="sugg-from">${esc(s.before)}</div><div class="sugg-arrow">↓</div>` : ''}
        <div class="sugg-to">${highlightKeywords(s.after, data.missingKeywords)}</div>
        <div class="sugg-reason">💡 <span>${esc(s.reason)}</span></div>
      </div>
      <div class="sugg-actions">
        <button class="btn btn-green btn-sm" onclick="applysuggestion(${idx})">✓ Apply</button>
        <button class="btn btn-ghost btn-sm" onclick="copysuggestion(${idx}, '${encodeURIComponent(s.after)}')">📋 Copy</button>
      </div>
    `;
    suggEl.appendChild(card);
  });

  // Optimized resume
  $('optimizedText').textContent = data.optimizedResume || 'Optimized resume not available.';
}

// ── Suggestion actions (global for onclick) ────────
window.applysuggestion = (idx) => {
  const card = $(`sugg-${idx}`);
  if (!card) return;
  card.classList.add('applied');
  const status = $(`sugg-status-${idx}`);
  if (status) { status.textContent = '✓ Applied'; status.className = 'sugg-status applied-label'; }
  showToast('✓ Suggestion applied!');
};

window.copysuggestion = (idx, encoded) => {
  navigator.clipboard.writeText(decodeURIComponent(encoded))
    .then(() => showToast('✓ Copied!'));
};

// ── History ────────────────────────────────────────
function renderHistory() {
  const el = $('historyList');
  if (!state.history.length) {
    el.innerHTML = `<div class="history-empty"><div class="history-empty-icon">📭</div><p>No analyses yet.<br/>Open a job posting and click Analyze.</p></div>`;
    return;
  }
  el.innerHTML = state.history.map((item, i) => {
    const score = item.score || 0;
    const cls = score >= 70 ? 'hi' : score >= 45 ? 'mid' : 'lo';
    const date = new Date(item.date);
    const ago = timeAgo(date);
    return `
      <div class="history-item" onclick="loadHistoryItem(${i})">
        <div class="history-item-icon">📊</div>
        <div class="history-item-info">
          <div class="history-item-title">${esc(item.title)}</div>
          <div class="history-item-meta">${esc(item.site || item.company || 'Job Board')} · ${ago}</div>
        </div>
        <div class="history-score-badge ${cls}">${score}%</div>
      </div>
    `;
  }).join('');
}

window.loadHistoryItem = (idx) => {
  const item = state.history[idx];
  if (!item?.result) return;
  state.lastResult = item.result;
  renderResults(item.result);
  showPage('results');
};

// ── Profile ────────────────────────────────────────
function updateProfileUI() {
  $('profileResumeName').textContent = state.resumeFileName || 'No resume uploaded';
  $('settingResumeVal').textContent  = state.resumeFileName || 'None';

  const total = state.history.length;
  const avg = total > 0
    ? Math.round(state.history.reduce((s, h) => s + (h.score || 0), 0) / total)
    : 0;
  const remaining = Math.max(0, DAILY_LIMIT - state.usedToday);

  $('statTotal').textContent = total;
  $('statAvg').textContent   = total > 0 ? `${avg}%` : '—';
  $('statToday').textContent = remaining;
}

// ── Download ───────────────────────────────────────
function downloadResume() {
  const text = $('optimizedText').textContent;
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `resume_optimized_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ Resume downloaded!');
}

// ── Utilities ──────────────────────────────────────
function showPage_and_highlight(name, tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  showPage(name);
}

function highlightKeywords(text, keywords) {
  if (!keywords || !keywords.length) return esc(text);
  let result = esc(text);
  keywords.forEach(kw => {
    const safe = esc(kw);
    const re = new RegExp(`(${safe})`, 'gi');
    result = result.replace(re, '<strong>$1</strong>');
  });
  return result;
}

function showError(id, msg) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec/3600)}h ago`;
  return `${Math.floor(sec/86400)}d ago`;
}
