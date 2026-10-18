/* Sidechick v2 — one small file, no framework. */
const BACKEND = window.SIDECHICK_BACKEND ||
  (location.hostname.endsWith('vercel.app') ? 'https://sidechick-syej.onrender.com' : '');
const $ = s => document.querySelector(s);
const EMOJIS = ['😎','🥳','😈','🤪','🦊','🐼','🐸','👻','🤖','🌸','🍕','⚡'];
const NAMES = ['Sleepy Panda','Chai Addict','Midnight Owl','Snack Goblin','Main Character','Lowkey Legend','Couch Potato','Meme Lord','Plot Twist','Wifi Ghost'];
const REACTS = ['❤️','😂','🔥','👍','😮'];
const GAME_LIST = [
  {kind:'same_brain', e:'🧠', t:'Same Brain?', d:'Pick one. See if you think alike.'},
  {kind:'hot_takes',  e:'🔥', t:'Hot Takes',   d:'Agree or nope. Defend your take.'},
  {kind:'know_me',    e:'🫵', t:'Know Me',     d:'One answers. Everyone else guesses.'},
];

const S = { sid:null, room:null, users:[], game:null, emoji:localStorage.sc_emoji||EMOJIS[0],
            name:localStorage.sc_name||'', pendingCode:null, picks:{}, els:{}, lastSender:null, joined:false };

// ── tiny DOM helper ──
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(k)); }
  return e;
}
function show(id) { document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id)); }
let toastT;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600); }
const inviteUrl = () => `${location.origin}${location.pathname}?r=${S.room}`;
async function share() {
  const text = `Join my Sidechick room 👀 Code: ${S.room}`;
  try { if (navigator.share) { await navigator.share({ title: 'Sidechick', text, url: inviteUrl() }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text}\n${inviteUrl()}`); toast('Invite link copied 📋'); } catch { toast(`Code: ${S.room}`); }
}

// ── connection ──
const socket = io(BACKEND || undefined, { transports: ['websocket', 'polling'], reconnectionDelayMax: 3000 });
if (BACKEND) fetch(BACKEND + '/health').catch(() => {});   // wake a sleeping server early
socket.on('connect', () => {
  $('#conn').classList.add('ok'); $('#btn-create').disabled = false; $('#btn-join').disabled = false;
  if (S.joined && S.room) socket.emit('join', { room: S.room, name: S.name, emoji: S.emoji });   // quiet rejoin
});
socket.on('disconnect', () => { $('#conn').classList.remove('ok'); $('#conn').textContent = 'Reconnecting…'; });

// ── home ──
const qs = new URLSearchParams(location.search).get('r');
if (qs) { S.pendingCode = qs.toUpperCase().slice(0, 4); history.replaceState({}, '', location.pathname); }
$('#btn-create').onclick = () => socket.emit('create');
socket.on('created', d => goWho(d.room));
$('#join-form').onsubmit = e => {
  e.preventDefault();
  const c = $('#code-input').value.trim().toUpperCase();
  if (c.length === 4) goWho(c); else toast('Codes have 4 letters');
};
function goWho(code) {
  S.pendingCode = code;
  $('#who-room').textContent = `Room ${code}`;
  $('#name-input').value = S.name || NAMES[Math.floor(Math.random() * NAMES.length)];
  renderEmojis(); show('who');
}
$('#who-back').onclick = () => { S.pendingCode = null; show('home'); };
function renderEmojis() {
  const g = $('#emoji-grid'); g.replaceChildren();
  EMOJIS.forEach(e => g.append(h('button', { class: e === S.emoji ? 'on' : '', onclick: ev => {
    S.emoji = e; g.querySelectorAll('button').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on');
  } }, e)));
}
$('#btn-enter').onclick = () => {
  S.name = $('#name-input').value.trim() || 'Guest';
  localStorage.sc_name = S.name; localStorage.sc_emoji = S.emoji;
  socket.emit('join', { room: S.pendingCode, name: S.name, emoji: S.emoji });
};
socket.on('join_error', d => { toast(d.text); if (S.joined) { resetRoom(); show('home'); } else show('home'); });

// ── room ──
socket.on('joined', d => {
  S.joined = true; S.sid = d.you; S.room = d.room; S.users = d.users; S.game = d.game;
  $('#room-code').textContent = d.room; $('#vibe').textContent = d.vibe;
  $('#feed').querySelectorAll('.row,.sys').forEach(n => n.remove()); S.els = {}; S.lastSender = null;
  d.history.forEach(addMsg); renderFaces(); renderGame(S.game); show('room'); syncEmpty();
});
function resetRoom() { S.joined = false; S.room = null; S.game = null; renderGame(null); }
socket.on('users', u => { S.users = u; renderFaces(); });
socket.on('vibe', d => { $('#vibe').textContent = d.vibe; });
function renderFaces() { const f = $('#faces'); f.replaceChildren(...S.users.map(u => h('span', { title: u.name }, u.emoji))); }
function syncEmpty() { $('#empty').hidden = S.users.length > 1 || $('#feed').querySelector('.row'); }

const feed = $('#feed');
function addMsg(m) {
  if (m.sys) { feed.append(h('div', { class: 'sys' }, m.text)); S.lastSender = null; scroll(); syncEmpty(); return; }
  const mine = m.sid === S.sid;
  const bubble = h('div', { class: 'bubble' + (mine ? ' mine' : ''), onclick: () => togglePicker(m.id) }, m.text);
  const col = h('div', { class: 'col' },
    !mine && S.lastSender !== m.sid ? h('div', { class: 'who' }, m.name) : null,
    bubble, h('div', { class: 'reacts' }), h('div', { class: 'picker', hidden: true }, REACTS.map(r => h('button', { onclick: ev => { ev.stopPropagation(); socket.emit('react', { id: m.id, emoji: r }); togglePicker(m.id); } }, r))));
  const row = h('div', { class: 'row' + (mine ? ' mine' : '') }, h('div', { class: 'av' }, m.emoji), col);
  S.els[m.id] = row; S.lastSender = m.sid; feed.append(row); paintReacts(m.id, m.reacts || {}); scroll(); syncEmpty();
}
function togglePicker(id) { const p = S.els[id]?.querySelector('.picker'); if (p) p.hidden = !p.hidden; }
function paintReacts(id, reacts) {
  const box = S.els[id]?.querySelector('.reacts'); if (!box) return;
  box.replaceChildren(...Object.entries(reacts).map(([e, who]) =>
    h('button', { class: who.includes(S.sid) ? 'me' : '', onclick: () => socket.emit('react', { id, emoji: e }) }, `${e} ${who.length}`)));
}
function scroll() { requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; }); }
socket.on('msg', addMsg);
socket.on('reacts', d => paintReacts(d.id, d.reacts));
socket.on('toast', d => toast(d.text));

$('#composer').onsubmit = e => {
  e.preventDefault();
  const i = $('#msg-input'), t = i.value.trim(); if (!t) return;
  socket.emit('msg', { text: t }); i.value = ''; i.focus(); socket.emit('typing', { on: false });
};
let typT, typing = false;
$('#msg-input').oninput = () => {
  if (!typing) { typing = true; socket.emit('typing', { on: true }); }
  clearTimeout(typT); typT = setTimeout(() => { typing = false; socket.emit('typing', { on: false }); }, 1500);
};
let hideT;
socket.on('typing', d => { const el = $('#typing'); el.textContent = d.on ? `${d.name} is typing…` : ''; clearTimeout(hideT); hideT = setTimeout(() => el.textContent = '', 3000); });
$('#btn-code').onclick = async () => { try { await navigator.clipboard.writeText(S.room); toast('Code copied'); } catch { toast(`Code: ${S.room}`); } };
$('#btn-invite').onclick = $('#btn-invite2').onclick = share;
$('#btn-leave').onclick = () => { if (confirm('Leave this room?')) { socket.emit('leave'); resetRoom(); show('home'); } };

// ── game picker ──
$('#btn-play').onclick = () => {
  if (S.game && S.game.phase !== 'done') { renderGame(S.game); return; }
  const list = $('#game-list'); list.replaceChildren(...GAME_LIST.map(g =>
    h('button', { class: 'gcard', onclick: () => { socket.emit('game_start', { kind: g.kind }); $('#sheet').hidden = true; } },
      h('div', { class: 'e' }, g.e), h('div', {}, h('b', {}, g.t), h('span', {}, g.d)))));
  $('#sheet').hidden = false;
};
$('#sheet-close').onclick = () => { $('#sheet').hidden = true; };
$('#sheet').onclick = e => { if (e.target.id === 'sheet') $('#sheet').hidden = true; };

// ── game screen ──
socket.on('game', g => { S.game = g; renderGame(g); });
const userOf = sid => S.users.find(u => u.sid === sid);
const pick = (i, c) => { S.picks[i] = c; socket.emit('game_answer', { i, choice: c }); };

function renderGame(g) {
  const box = $('#game');
  if (!g) { box.hidden = true; box.replaceChildren(); S.picks = {}; return; }
  box.hidden = false; $('#sheet').hidden = true;
  const head = h('div', { class: 'g-head' },
    h('button', { class: 'icon', 'aria-label': 'Close game', onclick: () => { if (g.phase === 'done' || confirm('End the game for everyone?')) socket.emit('game_end'); } }, '✕'),
    h('div', { class: 'g-title' }, `${g.emoji} ${g.title}`), h('div', { class: 'g-count' }, g.phase === 'done' ? '' : `${g.i + 1}/${g.total}`));
  const bar = h('div', { class: 'bar' }, h('i', { style: `width:${Math.round(((g.phase === 'done' ? g.total : g.i + (g.phase === 'reveal' ? 1 : 0)) / g.total) * 100)}%` }));
  box.replaceChildren(head, bar, g.phase === 'done' ? doneView(g) : questionView(g));
}

function questionView(g) {
  const body = h('div', { class: 'g-body' });
  const isTarget = g.engine === 'guess' && g.target && g.target.sid === S.sid;
  if (g.engine === 'guess' && g.target)
    body.append(h('div', { class: 'g-tag' }, isTarget ? 'Your turn · pick your real answer 🤫' : `Guess what ${g.target.name} ${g.target.emoji} picked`));
  body.append(h('div', { class: 'g-q' }, g.q));
  const mine = g.phase === 'reveal' ? g.reveal[S.sid] : S.picks[g.i];
  const answered = g.answered.includes(S.sid) || mine !== undefined;
  g.o.forEach((text, idx) => {
    const dots = g.phase === 'reveal'
      ? h('div', { class: 'dots' }, Object.entries(g.reveal).filter(([, c]) => c === idx).map(([sid]) => h('span', {}, userOf(sid)?.emoji || '🙂'))) : null;
    const isTargetPick = g.phase === 'reveal' && g.engine === 'guess' && g.target && g.reveal[g.target.sid] === idx;
    body.append(h('button', { class: 'opt' + (mine === idx ? ' picked' : '') + (isTargetPick ? ' star' : ''), disabled: answered || g.phase === 'reveal',
      onclick: () => pick(g.i, idx) }, h('span', {}, text), dots));
  });
  if (g.phase === 'answer' && answered) {
    const left = g.answered.length;
    body.append(h('div', { class: 'wait' }, `Locked in 🔒 Waiting for the others… (${left}/${S.users.length})`));
  }
  if (g.phase === 'reveal') {
    const hit = g.hit;
    const msg = g.engine === 'guess'
      ? (hit === 1 ? 'Nailed it! 🎯' : hit > 0 ? 'Some got it 👀' : 'Nobody got it 😬')
      : (hit === 1 ? 'Matched! 🎯' : hit > 0 ? 'Almost there 👀' : 'Totally different 😬');
    body.append(h('div', { class: 'headline' }, msg),
      h('button', { class: 'btn big', onclick: () => socket.emit('game_next', { i: g.i }) }, g.i + 1 >= g.total ? 'See results →' : 'Next →'));
  }
  return body;
}

function doneView(g) {
  const r = g.result;
  const body = h('div', { class: 'g-body' },
    h('div', { class: 'pct' }, String(r.pct), h('sup', {}, '%')),
    h('div', { class: 'verdict' }, r.verdict),
    r.best ? h('div', { class: 'verdict' }, `🏆 ${r.best} knows them best`) : null,
    h('div', { class: 'chips' }, r.recap.map(x => h('span', { class: x.hit >= 0.5 ? 'hit' : '' }, (x.hit >= 0.5 ? '✓ ' : '✗ ') + x.q.slice(0, 26) + (x.q.length > 26 ? '…' : '')))),
    h('div', { class: 'stack' },
      h('button', { class: 'btn big', onclick: shareResult }, 'Share result'),
      h('button', { class: 'btn alt', onclick: () => { socket.emit('game_end'); setTimeout(() => $('#btn-play').click(), 150); } }, 'Play another'),
      h('button', { class: 'btn ghost', onclick: () => socket.emit('game_end') }, 'Back to chat')));
  if (r.pct >= 80 && !S.confettiFor?.includes(g.kind + r.pct)) { S.confettiFor = (S.confettiFor || '') + g.kind + r.pct; confetti(); }
  return body;
}
async function shareResult() {
  const g = S.game; if (!g) return;
  const text = `We got ${g.result.pct}% on ${g.title} ${g.emoji} — ${g.result.verdict}\nTry Sidechick: ${location.origin}${location.pathname}`;
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('Result copied 📋'); } catch { toast('Screenshot it! 📸'); }
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  for (let i = 0; i < 40; i++) {
    const c = h('div', { class: 'confetti', style: `left:${Math.random() * 100}vw;animation-delay:${Math.random() * .6}s` }, ['🎉','✨','💛','🎊'][i % 4]);
    document.body.append(c); setTimeout(() => c.remove(), 3500);
  }
}

// invite link → straight to the "who's joining" screen once connected
socket.once('connect', () => { if (S.pendingCode) goWho(S.pendingCode); });
