const socket = io();

let myName = '';
let myRoom = '';
let ghostText = '';
let typingTimer = null;
let timelineCanvas = null;
let timelineCtx = null;
let timelineData = [];
let currentLevel = 0;
let theirLastMsg = '';
let aiAvailable = false;
let sidekickTone = 'balanced';
let autoSummaryEnabled = false;
let autoSummaryEvery = 6;
let msgCountSinceSummary = 0;
let messageHistory = [];
let lastInferRequestId = null;
let themeMode = 'light';
let toastTimer = null;

const MOOD_ICONS = {
  ANGRY: 'ANG',
  SAD: 'SAD',
  SCARED: 'ALR',
  HAPPY: 'POS',
  LOVING: 'AFF',
  NEUTRAL: 'NEU',
  UPSET: 'UPS',
  THREATENING: 'CRT'
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function switchIntelTab(name, evt) {
  document.querySelectorAll('.intel-tab').forEach((btn) => btn.classList.remove('active'));
  document.querySelectorAll('.intel-pane').forEach((panel) => {
    panel.classList.remove('is-active');
    panel.classList.add('is-hidden');
  });
  const panel = document.getElementById('intel-' + name);
  if (panel) {
    panel.classList.remove('is-hidden');
    requestAnimationFrame(() => panel.classList.add('is-active'));
  }
  if (evt && evt.target) evt.target.classList.add('active');
}

function renderSuggestions(sugg) {
  const row = document.getElementById('sugg-row');
  if (!row) return;
  row.innerHTML = '';
  if (!sugg || !Object.keys(sugg).length) {
    row.innerHTML = '<div class="suggestion-empty">Intervention shortcuts will appear once you type.</div>';
    return;
  }
  Object.entries(sugg).forEach(([key, text]) => {
    const chip = document.createElement('button');
    chip.className = 'sugg-chip ' + key;
    chip.textContent = text;
    chip.onclick = () => {
      const input = document.getElementById('msg-input');
      input.value = text;
      autoResizeComposer();
      input.focus();
    };
    row.appendChild(chip);
  });
}

function autoResizeComposer() {
  const input = document.getElementById('msg-input');
  if (!input) return;
  input.style.height = 'auto';
  input.style.height = Math.min(Math.max(input.scrollHeight, 60), 150) + 'px';
}

function showDetectiveToast(message) {
  const toast = document.getElementById('mode-toast');
  if (!toast) return;
  toast.textContent = message || 'Detective mode: off';
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1000);
}

function setSidekickEnabled(enabled) {
  const app = document.getElementById('app');
  const panel = document.getElementById('ai-panel');
  const btn = document.getElementById('toggle-ai-btn');
  if (!app || !panel || !btn) return;
  if (enabled) {
    app.classList.remove('ai-off');
    panel.style.display = 'flex';
    btn.textContent = '🕵️';
    btn.classList.add('active');
  } else {
    app.classList.add('ai-off');
    panel.style.display = 'none';
    btn.textContent = '🕵️';
    btn.classList.remove('active');
  }
  btn.title = enabled ? 'Detective Mode On' : 'Detective Mode Off';
  btn.setAttribute('aria-label', btn.title);
  btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
  localStorage.setItem('sidekick_enabled', enabled ? 'true' : 'false');
}

function setThemeMode(mode) {
  themeMode = mode === 'dark' ? 'dark' : 'light';
  document.body.classList.toggle('theme-dark', themeMode === 'dark');
  localStorage.setItem('theme', themeMode);
  updateThemeToggles();
}

function updateThemeToggles() {
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.textContent = themeMode === 'dark' ? '☀️' : '🌙';
    btn.title = themeMode === 'dark' ? 'Light Mode' : 'Dark Mode';
    btn.setAttribute('aria-label', btn.title);
    btn.setAttribute('aria-pressed', themeMode === 'dark' ? 'true' : 'false');
  });
}

function toggleTheme() {
  setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
}

function initTheme() {
  const stored = localStorage.getItem('theme');
  if (stored) {
    setThemeMode(stored);
    return;
  }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  setThemeMode(prefersDark ? 'dark' : 'light');
}

function bindThemeToggles() {
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', toggleTheme);
  });
  updateThemeToggles();
}

function updateAISummaryAvailability(enabled) {
  aiAvailable = !!enabled;
  const btn = document.getElementById('ai-summary-btn');
  const text = document.getElementById('ai-summary-text');
  if (!btn || !text) return;
  btn.disabled = !aiAvailable;
  btn.classList.toggle('disabled', !aiAvailable);
  if (aiAvailable) {
    if (!text.textContent || text.textContent.includes('OPENROUTER')) {
      text.textContent = 'Insights are ready.';
    }
  } else {
    text.textContent = 'Insights need OPENROUTER_API_KEY.';
  }
}

function updateAIStatus(status) {
  const el = document.getElementById('ai-status');
  if (!el) return;
  if (!status) {
    el.textContent = 'Insights unavailable';
    el.className = 'panel-status warn';
    return;
  }
  if (!status.openrouter) {
    el.textContent = 'Insights limited';
    el.className = 'panel-status warn';
    return;
  }
  el.textContent = 'Insights on';
  el.className = 'panel-status ok';
}

async function refreshAIStatus() {
  try {
    const response = await fetch('/api/ai-status');
    const data = await response.json();
    updateAIStatus(data);
    updateAISummaryAvailability(!!data.openrouter);
    populateModelEvaluation(data.sequence_model);
  } catch (error) {
    updateAIStatus(null);
  }
}

function populateModelEvaluation(sequenceModel) {
  const evaluation = sequenceModel && sequenceModel.summary && sequenceModel.summary.evaluation;
  if (!evaluation) return;
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  set('eval-accuracy', Math.round((evaluation.accuracy || 0) * 100) + '%');
  set('eval-precision', Math.round((evaluation.precision || 0) * 100) + '%');
  set('eval-recall', Math.round((evaluation.recall || 0) * 100) + '%');
  set('eval-f1', Math.round((evaluation.f1 || 0) * 100) + '%');
}

function loadSidekickSettings() {
  const storedTone = localStorage.getItem('sidekick_tone');
  const storedAuto = localStorage.getItem('sidekick_auto_summary');
  const storedEvery = localStorage.getItem('sidekick_auto_every');
  if (storedTone) sidekickTone = storedTone;
  if (storedAuto) autoSummaryEnabled = storedAuto === 'true';
  if (storedEvery) autoSummaryEvery = parseInt(storedEvery, 10) || 6;
  const toneSelect = document.getElementById('tone-select');
  const autoToggle = document.getElementById('auto-summary-toggle');
  const autoEvery = document.getElementById('auto-summary-every');
  if (toneSelect) toneSelect.value = sidekickTone;
  if (autoToggle) autoToggle.checked = autoSummaryEnabled;
  if (autoEvery) autoEvery.value = String(autoSummaryEvery);
  if (!autoToggle || !autoEvery) {
    autoSummaryEnabled = false;
    autoSummaryEvery = 6;
  }
}

function initSidekickControls() {
  const toneSelect = document.getElementById('tone-select');
  const autoToggle = document.getElementById('auto-summary-toggle');
  const autoEvery = document.getElementById('auto-summary-every');

  if (toneSelect && !toneSelect.dataset.bound) {
    toneSelect.dataset.bound = 'true';
    toneSelect.addEventListener('change', () => {
      sidekickTone = toneSelect.value;
      localStorage.setItem('sidekick_tone', sidekickTone);
    });
  }
  if (autoToggle && !autoToggle.dataset.bound) {
    autoToggle.dataset.bound = 'true';
    autoToggle.addEventListener('change', () => {
      autoSummaryEnabled = autoToggle.checked;
      localStorage.setItem('sidekick_auto_summary', autoSummaryEnabled ? 'true' : 'false');
    });
  }
  if (autoEvery && !autoEvery.dataset.bound) {
    autoEvery.dataset.bound = 'true';
    autoEvery.addEventListener('change', () => {
      autoSummaryEvery = parseInt(autoEvery.value, 10) || 6;
      localStorage.setItem('sidekick_auto_every', String(autoSummaryEvery));
    });
  }
}

function toggleSidekick() {
  const app = document.getElementById('app');
  if (!app) return;
  const enabled = app.classList.contains('ai-off');
  setSidekickEnabled(enabled);
  showDetectiveToast(enabled ? 'Detective mode: on' : 'Detective mode: off');
}

function joinChat() {
  const u = document.getElementById('username-input').value.trim();
  const r = document.getElementById('room-input').value.trim();
  if (!u || !r) {
    alert('Enter your name and room code.');
    return;
  }

  myName = u;
  myRoom = r;
  ghostText = '';
  timelineData = [];
  messageHistory = [];
  msgCountSinceSummary = 0;
  hideThreatStop();
  document.getElementById('messages').innerHTML = '';
  const empty = document.getElementById('messages-empty');
  if (empty) empty.style.display = 'grid';
  socket.emit('join', { username: u, room: r });

  document.getElementById('lobby').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.body.classList.add('app-active');
  document.getElementById('header-title').textContent = 'Room ' + r;
  document.getElementById('header-sub').textContent = "You're chatting as " + u + '.';
  document.getElementById('room-badge').textContent = '#' + r;
  const heroCallout = document.getElementById('hero-callout');
  if (heroCallout) {
    heroCallout.textContent = 'Your chat stays in this room. Only people with the code can join.';
  }

  initChart();
  loadSidekickSettings();
  initSidekickControls();
  refreshAIStatus();
  setSidekickEnabled(false);
  showDetectiveToast('Detective mode: off');
  autoResizeComposer();
}

function leaveChat() {
  hideThreatStop();
  document.getElementById('app').style.display = 'none';
  document.getElementById('lobby').style.display = 'flex';
  document.body.classList.remove('app-active');
  myName = '';
  myRoom = '';
  const empty = document.getElementById('messages-empty');
  if (empty) empty.style.display = 'grid';
  socket.disconnect();
  socket.connect();
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && document.getElementById('lobby').style.display !== 'none') {
    joinChat();
  }
});

function initChart() {
  timelineCanvas = document.getElementById('timeline-chart');
  if (!timelineCanvas) return;
  timelineCtx = timelineCanvas.getContext('2d');
  drawTimeline([]);
  if (!window.__sidechickChartBound) {
    window.__sidechickChartBound = true;
    window.addEventListener('resize', () => drawTimeline(timelineData));
  }
}

function updateChart(timeline) {
  timelineData = Array.isArray(timeline) ? timeline.slice(-16) : [];
  drawTimeline(timelineData);
}

function drawTimeline(timeline) {
  if (!timelineCanvas || !timelineCtx) return;
  const ctx = timelineCtx;
  const dpr = window.devicePixelRatio || 1;
  const rect = timelineCanvas.getBoundingClientRect();
  const width = rect.width || 300;
  const height = rect.height || 100;

  if (timelineCanvas.width !== width * dpr || timelineCanvas.height !== height * dpr) {
    timelineCanvas.width = width * dpr;
    timelineCanvas.height = height * dpr;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#f97316');

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1;
  for (let row = 1; row <= 3; row += 1) {
    const y = (height / 4) * row;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  if (!timeline.length) return;

  const pad = 12;
  const span = Math.max(1, timeline.length - 1);
  const xStep = (width - pad * 2) / span;
  const mid = height / 2;
  const amplitude = height * 0.32;

  ctx.lineWidth = 3;
  ctx.strokeStyle = gradient;
  ctx.beginPath();
  timeline.forEach((point, index) => {
    const x = pad + index * xStep;
    const y = mid - (point.p || 0) * amplitude;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  timeline.forEach((point, index) => {
    const x = pad + index * xStep;
    const y = mid - (point.p || 0) * amplitude;
    const color = point.p > 0.2 ? '#22c55e' : point.p > -0.1 ? '#f59e0b' : '#ef4444';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateVibeBadge(level, label, alertMsg, stageCode, criticalAction) {
  currentLevel = level;
  const levelLabels = ['Calm', 'A bit tense', 'Heated', 'Very tense', 'Unsafe'];
  const levelIcons = ['🙂', '😬', '😤', '🚩', '🛑'];
  const badge = document.getElementById('vibe-badge');
  const icon = document.getElementById('vibe-icon');
  const labelEl = document.getElementById('vibe-label');
  const detail = document.getElementById('vibe-detail');
  const banner = document.getElementById('escalation-banner');
  const heroCallout = document.getElementById('hero-callout');
  const displayIcon = levelIcons[level] || '🙂';
  const displayLabel = levelLabels[level] || 'Calm';

  if (badge) badge.className = 'vibe-badge level-' + level;
  if (icon) icon.textContent = displayIcon;
  if (labelEl) labelEl.textContent = displayLabel;
  if (detail) detail.textContent = alertMsg || 'All good so far.';
  if (heroCallout) {
    heroCallout.textContent = level >= 4
      ? 'This feels unsafe. Consider leaving or taking a break.'
      : level === 3
        ? 'Tension feels high. Slow it down.'
        : level === 2
          ? 'Heat is rising. Try a softer reply.'
          : level === 1
            ? 'A little tension. Stay kind and clear.'
            : 'All good. Keep it friendly.';
  }

  if (level > 0 && banner) {
    banner.style.display = 'block';
    banner.className = 'alert-banner level-' + level;
    banner.textContent = alertMsg || 'Heads up: the vibe is shifting.';
  } else if (banner) {
    banner.style.display = 'none';
  }

  if (criticalAction === 'suggest_end_chat') {
    const note = document.getElementById('intervention-note');
    if (note) note.textContent = 'This feels unsafe. It is okay to leave.';
  }

  if (criticalAction === 'terminate_chat') {
    const note = document.getElementById('intervention-note');
    if (note) note.textContent = 'This chat should pause for safety.';
    showThreatStop(alertMsg || 'This chat feels unsafe. You cannot continue.');
  }
}

function showThreatStop(message) {
  const overlay = document.getElementById('threat-stop-overlay');
  const text = document.getElementById('threat-stop-text');
  const input = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');
  if (text) text.textContent = message || 'This chat feels unsafe. You cannot continue.';
  if (overlay) overlay.style.display = 'flex';
  if (input) input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;
}

function hideThreatStop() {
  const overlay = document.getElementById('threat-stop-overlay');
  const input = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');
  if (overlay) overlay.style.display = 'none';
  if (input) input.disabled = false;
  if (sendBtn) sendBtn.disabled = false;
}

function exitThreatSession() {
  hideThreatStop();
  leaveChat();
}

function updateDriftPanel(drift) {
  if (!drift) return;
  const byId = (id) => document.getElementById(id);
  const driftScore = typeof drift.drift_score === 'number' ? drift.drift_score : '--';
  const riskScore = typeof drift.risk_score === 'number' ? drift.risk_score : '--';
  const forecastScore = typeof drift.forecast_score === 'number' ? drift.forecast_score : '--';
  const recoveryScore = typeof drift.recovery_score === 'number' ? drift.recovery_score : '--';
  const momentum = typeof drift.momentum === 'number' ? drift.momentum : '--';
  const volatility = typeof drift.volatility === 'number' ? drift.volatility : '--';

  if (byId('drift-score')) byId('drift-score').textContent = driftScore + '/100';
  if (byId('drift-risk')) byId('drift-risk').textContent = (drift.risk_level || '--') + ' (' + riskScore + ')';
  if (byId('forecast-score')) byId('forecast-score').textContent = (drift.forecast_label || '--') + ' (' + forecastScore + ')';
  if (byId('recovery-score')) byId('recovery-score').textContent = recoveryScore + '/100';
  if (byId('primary-driver')) byId('primary-driver').textContent = drift.primary_driver || 'No dominant signal yet.';

  const triggers = Array.isArray(drift.triggers) ? drift.triggers : [];
  const tips = Array.isArray(drift.tips) ? drift.tips : [];
  if (byId('drift-triggers')) {
    byId('drift-triggers').textContent = triggers.length ? triggers.join(' • ') : 'No signals yet.';
  }
  if (byId('drift-tips')) {
    byId('drift-tips').textContent = tips.length ? tips.join(' • ') : 'Tips will appear here.';
  }
  if (byId('intervention-note')) {
    byId('intervention-note').textContent = drift.intervention || 'Tips update as the chat moves.';
  }
}

function updateFactCheck(data) {
  const box = document.getElementById('fact-check');
  if (!box || !data) return;
  const verdict = data.verdict || 'Unclear';
  const conf = typeof data.confidence === 'number' ? Math.round(data.confidence * 100) : 0;
  const note = data.note ? ' • ' + data.note : '';
  box.textContent = verdict + ' (' + conf + '%)' + note;
  box.dataset.verdict = verdict.toLowerCase().replace(/\s+/g, '-');
}

function maybeShowFactCheckLoading(text) {
  const box = document.getElementById('fact-check');
  if (!box || !text) return;
  const t = text.toLowerCase();
  const looksLikeClaim = /\d/.test(text) || /according to|study|report|data|statistics|percent|%|always|never|research/.test(t);
  if (looksLikeClaim) {
    box.textContent = 'Checking claim confidence...';
    box.dataset.verdict = 'unclear';
  }
}

function renderMessage(data) {
  const isMine = data.username === myName;
  const div = document.createElement('div');
  div.className = 'msg slide-in ' + (isMine ? 'mine' : 'theirs');

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = (data.username || '?').charAt(0).toUpperCase();

  const body = document.createElement('div');
  body.className = 'msg-body';

  if (!isMine && data.thinking) {
    const thinking = document.createElement('div');
    thinking.className = 'msg-thinking';
    thinking.textContent = data.thinking;
    body.appendChild(thinking);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = data.text;
  body.appendChild(bubble);

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = `<span>${escapeHtml(data.timestamp || '')}</span><span>${escapeHtml(MOOD_ICONS[data.mood] || 'NEU')} ${escapeHtml(data.mood || 'NEUTRAL')}</span>`;
  body.appendChild(meta);

  if (isMine) {
    div.appendChild(body);
    div.appendChild(avatar);
  } else {
    div.appendChild(avatar);
    div.appendChild(body);
  }

  const feed = document.getElementById('messages');
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
  const empty = document.getElementById('messages-empty');
  if (empty) empty.style.display = 'none';

  messageHistory.push({ speaker: isMine ? 'You' : 'Other', text: data.text });
  if (messageHistory.length > 30) messageHistory.shift();
  if (!isMine) msgCountSinceSummary += 1;

  if (!isMine) {
    theirLastMsg = data.text;
    maybeShowFactCheckLoading(data.text);
    if (data.thinking) document.getElementById('their-thinking').textContent = data.thinking;
    if (data.expecting) document.getElementById('their-expectation').textContent = data.expecting;
    if (data.their_mood || data.mood) {
      document.getElementById('their-mood').textContent = (data.their_mood || data.mood);
    }

    if (aiAvailable) {
      lastInferRequestId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
      socket.emit('ai_infer_request', {
        room: myRoom,
        text: data.text,
        tone: sidekickTone,
        context: messageHistory.slice(-3),
        request_id: lastInferRequestId
      });
    }

    if (autoSummaryEnabled && msgCountSinceSummary >= autoSummaryEvery) {
      requestAISummary(true);
      msgCountSinceSummary = 0;
    }
  }
}


function exportSession(format) {
  if (!myRoom) {
    alert('Open a room first.');
    return;
  }
  window.location.href = '/api/export/' + encodeURIComponent(myRoom) + '?format=' + encodeURIComponent(format || 'json');
}

socket.on('connect', () => console.log('Sidechick connected'));
socket.on('disconnect', () => console.log('Sidechick disconnected'));
socket.on('message', renderMessage);

socket.on('system', (data) => {
  const div = document.createElement('div');
  div.className = 'sys-msg';
  div.textContent = data.msg;
  const feed = document.getElementById('messages');
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
  const empty = document.getElementById('messages-empty');
  if (empty) empty.style.display = 'none';
});

socket.on('user_joined', (data) => {
  if (data.username !== myName) {
    document.getElementById('header-sub').textContent = data.username + ' joined the room.';
  }
});

socket.on('user_left', (data) => {
  document.getElementById('header-sub').textContent = data.username + ' left the room.';
});

socket.on('ai_config', (data) => {
  updateAISummaryAvailability(!!data.openrouter);
  refreshAIStatus();
});

socket.on('ai_infer', (data) => {
  if (!data || !data.text) return;
  if (lastInferRequestId && data.request_id && data.request_id !== lastInferRequestId) return;
  if (data.text !== theirLastMsg) return;
  if (data.thinking) document.getElementById('their-thinking').textContent = data.thinking;
  if (data.expecting) document.getElementById('their-expectation').textContent = data.expecting;
  if (data.mood) document.getElementById('their-mood').textContent = data.mood;
});

socket.on('fact_check', (data) => {
  if (!data || !data.fact) return;
  if (data.sender && data.sender === myName) return;
  updateFactCheck(data.fact);
});

socket.on('ai_update', (data) => {
  updateVibeBadge(data.level, data.label, data.alert_msg, data.stage_code || (data.drift && data.drift.stage_code), data.critical_action || (data.drift && data.drift.critical_action));
  if (data.drift) updateDriftPanel(data.drift);
  if (data.timeline) updateChart(data.timeline);
  if (data.prediction) document.getElementById('prediction-text').textContent = data.prediction;
  if (data.thinking && data.sender && data.sender !== myName) {
    document.getElementById('their-thinking').textContent = data.thinking;
  }
});

socket.on('typing_insight', (data) => {
  if (data.level !== undefined) updateVibeBadge(data.level, data.label || 'Stable', data.alert || '', data.stage_code, data.critical_action);
  const replyTip = document.getElementById('reply-tip');
  if (data.suggestion && replyTip) replyTip.textContent = data.suggestion;
  const draftReply = document.getElementById('draft-reply');
  if (data.ghost) {
    ghostText = data.ghost;
    if (draftReply) draftReply.textContent = data.ghost;
  }
  if (data.prediction) document.getElementById('prediction-text').textContent = data.prediction;
  if (data.sugg) renderSuggestions(data.sugg);
});

socket.on('suggestions', (data) => {
  renderSuggestions(data.sugg);
});

socket.on('ai_summary', (data) => {
  const box = document.getElementById('ai-summary-text');
  const btn = document.getElementById('ai-summary-btn');
  if (!box) return;
  const summary = data.summary;
  if (summary && typeof summary === 'object') {
    box.innerHTML = `
      <div class="summary-grid">
        <div class="summary-row"><span>Situation</span><strong>${escapeHtml(summary.situation)}</strong></div>
        <div class="summary-row"><span>Speaker Need</span><strong>${escapeHtml(summary.they_want)}</strong></div>
        <div class="summary-row"><span>Best Move</span><strong>${escapeHtml(summary.best_move)}</strong></div>
        <div class="summary-row"><span>Avoid</span><strong>${escapeHtml(summary.avoid)}</strong></div>
      </div>
      ${summary.alert ? `<div class="summary-alert">${escapeHtml(summary.alert)}</div>` : ''}
    `;
  } else {
    box.textContent = summary || 'No playbook available.';
  }
  if (btn) btn.classList.remove('loading');
});

function onTyping() {
  autoResizeComposer();
  const text = document.getElementById('msg-input').value;
  clearTimeout(typingTimer);
  socket.emit('typing_analysis', { text, room: myRoom });
}

function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;
  socket.emit('message', { room: myRoom, username: myName, text });
  input.value = '';
  const suggRow = document.getElementById('sugg-row');
  if (suggRow) suggRow.innerHTML = '';
  autoResizeComposer();
}

function handleKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

function useGhost() {
  if (ghostText) {
    document.getElementById('msg-input').value = ghostText;
    autoResizeComposer();
    document.getElementById('msg-input').focus();
  }
}

function useDraft() {
  useGhost();
}

function requestAISummary(auto = false) {
  if (!aiAvailable) {
    updateAISummaryAvailability(false);
    return;
  }
  const btn = document.getElementById('ai-summary-btn');
  const textBox = document.getElementById('ai-summary-text');
  if (!btn || !textBox) return;
  btn.classList.add('loading');
  textBox.textContent = auto ? 'Refreshing insights...' : 'Generating insights...';
  socket.emit('ai_summary_request', { room: myRoom, tone: sidekickTone, window: 8, auto });
}

initTheme();
bindThemeToggles();
