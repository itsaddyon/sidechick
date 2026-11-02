// Sidechick v2 — screens and flow. Vanilla ES modules, no build step.
import { $, h, rand, buzz, toast, confetti, sheet, shareSheet, icon, avatar, avatarPicker, iconBox, setTheme, initBackdrop, prefs } from './ui.js';
import { store, save, BADGES, currentStreak, doneToday, recordActivity, bump, unlock, resetAll } from './store.js';
import { Conn, waitingCount, backend } from './net.js';
import { GAMES, BANK, INTERESTS, ICEBREAKERS } from '../shared/questions.js';
import { renderGame, passAndPlay } from './game.js';

const app = $('#app');
const BASE_TITLE = document.title;
const NAMES = ['Sleepy Panda', 'Chai Addict', 'Midnight Owl', 'Snack Goblin', 'Main Character', 'Lowkey Legend', 'Couch Potato', 'Meme Lord', 'Plot Twist', 'Wifi Ghost'];
const TIPS = ['Tap the bulb for an instant icebreaker.', 'Be kind. A real person is on the other side.', 'Not feeling it? Skip. No hard feelings.',
  'Rooms vanish when you leave. Nothing is saved.', 'Picking interests helps you match faster.', 'Two truths and a lie always works.'];
const VIBE_ICON = { calm: 'waves', laugh: 'laugh', love: 'heart', sad: 'frown', angry: 'angry', hype: 'zap' };
const CODE_CHARS = [...'BCDFGHJKLMNPQRSTVWXZ'];
const newCode = () => Array.from({ length: 4 }, () => rand(CODE_CHARS)).join('');

let conn = null, R = null, timers = [], navId = 0, pendingCode = null, lastSpark = '', wake = null, closeViewer = null, installEvt = null, unread = 0;
const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
function leaveAll() {
  navId++; timers.forEach(clearInterval); timers = []; if (conn) { conn.close(); conn = null; } R = null;
  closeViewer?.(); try { wake?.release?.(); } catch {} wake = null;
  $('#layer').replaceChildren(); setTheme('brand');
}
const show = (...kids) => { app.replaceChildren(...kids); window.scrollTo(0, 0); };
const enter = () => { if (!history.state?.sc) history.pushState({ sc: 1 }, ''); };
window.addEventListener('popstate', () => home());
const applyPrefs = () => { prefs.haptics = store.prefs.haptics !== false; document.body.classList.toggle('calm', store.prefs.bg === false); };

const logo = () => h('img', { class: 'logo-img', src: '/logo.svg', alt: 'Sidechick', height: 30 });
const backBtn = fn => h('button', { class: 'back', 'aria-label': 'Back', onclick: () => fn() }, icon('arrow-left', 20));
const tag18 = () => h('span', { class: 'tag18' }, '18+');
const link = () => `${location.origin}/?r=${R.code}`;
function award(id) { const b = unlock(id); if (b) { toast(`Badge unlocked: ${b.t}`, 3200); confetti(18); } }
function activity() {
  if (recordActivity()) { toast(`${currentStreak()} day streak. Come back tomorrow to keep it.`, 3200); if (currentStreak() >= 3) award('streak3'); }
}

// ── credit ───────────────────────────────────────────────────────────────────
const credit = (cls = '') => h('button', { class: 'credit ' + cls, type: 'button', 'aria-label': 'Made by itsaddyon', onclick: openMadeBy },
  h('span', { class: 'mono' }, 'A', h('sup', {}, '2')), h('span', { class: 'credit-text' }, h('small', {}, 'crafted by'), h('b', {}, 'itsaddyon')));

function openMadeBy() {
  const s = sheet(h('div', { class: 'mode center madeby' }, h('span', { class: 'mono xl' }, 'A', h('sup', {}, '2')),
    h('h3', { class: 'who-big' }, 'itsaddyon'), h('p', { class: 'sub' }, 'Designed and coded Sidechick. Chat. Play. Poof.'),
    h('a', { class: 'btn big line', href: 'https://github.com/itsaddyon', target: '_blank', rel: 'noopener' }, icon('external-link', 18), 'See the code on GitHub'),
    h('button', { class: 'btn big', onclick: () => { s.close(); openFeedback(); } }, icon('lightbulb', 18), 'Send a suggestion'),
    h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Close')));
}

// ── suggestions (sent to the developer's Telegram by the Worker; the bot token never reaches the browser) ───────────
function openFeedback() {
  let kind = 'idea';
  const kinds = [['idea', 'Idea', 'lightbulb'], ['bug', 'Bug', 'bug'], ['question', 'New question', 'circle-help'], ['other', 'Other', 'message-circle']];
  const msg = h('textarea', { maxlength: 600, rows: 5, placeholder: 'What should we add, fix or ask?', 'aria-label': 'Your suggestion' });
  const contact = h('input', { maxlength: 60, placeholder: 'Optional: how can I reply? (a handle)', 'aria-label': 'Contact (optional)' });
  const trap = h('input', { class: 'hp', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
  const note = h('p', { class: 'tiny left' }, 'Goes straight to the developer on Telegram. Nothing else is stored.');
  const chips = h('div', { class: 'chips-wrap' }, kinds.map(([id, label, ic]) => h('button', { type: 'button', class: 'chip pick' + (id === kind ? ' on' : ''), onclick: ev => {
    kind = id; ev.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); buzz(5); } }, icon(ic, 16), label)));
  const send = h('button', { class: 'btn big', onclick: async () => {
    const text = msg.value.trim(); if (text.length < 5) return toast('Write a little more first');
    send.disabled = true; note.textContent = 'Sending…';
    try {
      const r = await fetch(backend() + '/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, message: text, contact: contact.value.trim(), website: trap.value }) });
      if (r.ok) { box.replaceChildren(iconBox('check', 34, 'lg'), h('h3', {}, 'Sent. Thank you.'), h('p', { class: 'sub' }, 'Every suggestion gets read.'), h('button', { class: 'btn big', onclick: () => s.close() }, 'Done')); box.classList.add('center'); award('inviter'); return; }
      note.textContent = r.status === 503 ? "Suggestions aren't switched on yet." : r.status === 429 ? 'Easy there. Try again in a few minutes.' : "Couldn't send. Try again.";
    } catch { note.textContent = "Couldn't reach the server. Try again."; }
    send.disabled = false;
  } }, icon('send', 18), 'Send');
  const box = h('div', { class: 'mode' }, h('h3', {}, 'Suggest something'), h('p', { class: 'sub' }, 'Ideas, bugs, question packs you want. All welcome.'), chips, msg, contact, trap, note, send, h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Cancel'));
  const s = sheet(box);
}

// ── onboarding ───────────────────────────────────────────────────────────────
function onboard() {
  setTheme('brand');
  let av = store.av || 'a0';
  const input = h('input', { maxlength: 16, value: store.name || rand(NAMES), placeholder: 'Your nickname', 'aria-label': 'Nickname' });
  show(h('div', { class: 'screen onboard' }, h('div', { class: 'inner' }, logo(),
    h('h1', {}, 'Who is showing up tonight?'),
    h('p', { class: 'sub' }, 'Pick a face and a name. That is all we need.'),
    avatarPicker(av, id => { av = id; }),
    h('div', { class: 'name-row' }, input, h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Random name', onclick: () => { input.value = rand(NAMES); buzz(6); } }, icon('dices', 20))),
    h('button', { class: 'btn big', onclick: () => {
      store.name = input.value.trim().slice(0, 16) || rand(NAMES); store.av = av; store.adult = true; save();
      buzz([10, 30, 10]); afterOnboard();
    } }, "I'm 18+. Let's go", icon('arrow-right', 20)),
    h('p', { class: 'tiny' }, 'Sidechick is for adults only. Tapping the button confirms you are 18 or older.'),
    h('div', { class: 'foot-row' }, h('button', { class: 'link', onclick: openPrivacy }, icon('shield-check', 14), 'How privacy works'), credit()))));
}
function afterOnboard() { if (pendingCode) { const c = pendingCode; pendingCode = null; joinRoom(c); } else home(); }

// ── home ─────────────────────────────────────────────────────────────────────
const tile = (cls, ic, title, sub, fn, extra) => h('button', { class: `tile ${cls}`, onclick: () => { buzz(8); fn(); } },
  iconBox(ic, 26), h('span', { class: 't-text' }, h('b', {}, title), h('small', {}, sub)), extra || null, h('span', { class: 't-go' }, icon('arrow-right', 22)));

function installChip() {
  return h('button', { class: 'chip install-chip', hidden: !installEvt, 'aria-label': 'Install the app', onclick: async ev => {
    if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch {} installEvt = null; ev.currentTarget.hidden = true; } }, icon('download', 16), 'Install');
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const c = $('.install-chip'); if (c) c.hidden = false; });

function home() {
  leaveAll();
  if (!store.adult) return onboard();
  const live = h('span', { class: 'live', hidden: true });
  const code = h('input', { maxlength: 5, placeholder: 'ROOM CODE', autocapitalize: 'characters', autocomplete: 'off', 'aria-label': 'Room code' });
  const streak = currentStreak();
  show(h('div', { class: 'screen home' }, h('div', { class: 'inner' },
    h('div', { class: 'bar-top' }, logo(), h('div', { class: 'chips-top' }, installChip(),
      streak ? h('button', { class: 'chip fire' + (doneToday() ? ' lit' : ''), 'aria-label': `${streak} day streak`, onclick: openStuff }, icon('flame', 16), String(streak)) : null,
      h('button', { class: 'avatar-btn', 'aria-label': 'Your profile', onclick: openStuff }, avatar(store.av, 38)))),
    h('div', { class: 'hello' }, `Hey ${store.name}`),
    h('h1', {}, "What's the move?"),
    tile('primary', 'dices', 'Meet someone new', 'Random chat or a game. Skip anytime.', strangerIntro, live),
    tile('', 'gamepad-2', 'Play a game', 'No chatting needed. Friends, strangers or one phone.', gamesHub),
    tile('', 'lock', 'Private room', 'Just you and one other person.', () => joinRoom(newCode(), { create: true })),
    h('form', { class: 'code-row', onsubmit: e => { e.preventDefault(); joinByCode(code.value); } }, code, h('button', { class: 'btn line' }, 'Join')),
    qotd(),
    h('div', { class: 'foot-row' }, h('div', { class: 'links' },
      h('button', { class: 'link', onclick: openPrivacy }, icon('shield-check', 14), 'Privacy'),
      h('button', { class: 'link', onclick: openFeedback }, icon('lightbulb', 14), 'Suggest something')), credit()))));
  const poll = async () => { const n = await waitingCount(); live.hidden = !(n > 0); if (n > 0) live.textContent = `${n} waiting`; };
  poll(); every(() => { if (!document.hidden) poll(); }, 30000);
}

function qotd() {
  const pool = BANK.same_brain, q = pool[Math.floor(Date.now() / 864e5) % pool.length];
  const opts = q.o.map(o => h('button', { class: 'chip opt-chip', onclick: ev => {
    ev.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); buzz(8);
    toast('Locked in. Now find out who agrees.'); } }, o));
  return h('div', { class: 'qotd' }, h('small', {}, 'Question of the day'), h('b', {}, q.q), h('div', { class: 'row2' }, opts),
    h('button', { class: 'link', onclick: () => shareSheet({ title: 'Send it to someone', text: `${q.q} ${q.o.join(' or ')}? Tell me.`, url: location.origin }, () => award('inviter')) }, icon('share-2', 14), 'Send it to someone'));
}

function joinByCode(v) {
  const c = String(v || '').trim().toUpperCase();
  if (!/^[A-Z]{4,5}$/.test(c)) return toast('Codes are 4 or 5 letters');
  joinRoom(c);
}

// ── strangers ────────────────────────────────────────────────────────────────
function strangerIntro() {
  leaveAll(); enter();
  const picked = new Set(store.interests || []);
  const chips = INTERESTS.map(i => h('button', { type: 'button', class: 'chip pick' + (picked.has(i.label) ? ' on' : ''), onclick: ev => {
    if (picked.has(i.label)) picked.delete(i.label); else if (picked.size < 5) picked.add(i.label); else toast('Up to 5 is plenty');
    ev.currentTarget.classList.toggle('on', picked.has(i.label)); buzz(5); } }, icon(i.icon, 16), i.label));
  show(h('div', { class: 'screen sub' }, h('div', { class: 'inner' }, backBtn(home),
    h('h2', {}, 'Meet someone new'), h('p', { class: 'sub' }, 'Pick up to 5 interests to match faster. Or skip it.'),
    h('div', { class: 'chips-wrap' }, chips),
    h('div', { class: 'safe-card' }, icon('shield-check', 20), h('span', {}, 'Be kind. Skip or report anyone who makes you uncomfortable. Nothing is saved, but strangers are strangers: think before you share personal details.')),
    h('button', { class: 'btn big', onclick: () => { store.interests = [...picked]; save(); search({ pool: 'chat', interests: [...picked] }); } }, 'Find someone', icon('arrow-right', 20)))));
}

function search({ pool, interests = [], title }) {
  leaveAll(); enter();
  const my = navId;
  let secs = 0, found = false;
  try { navigator.wakeLock?.request('screen').then(l => { if (navId === my) wake = l; else l.release(); }).catch(() => {}); } catch {}
  const timer = h('span', { class: 'timer' }, '0s'), tip = h('p', { class: 'tip' }, rand(TIPS));
  const quiet = h('div', { class: 'quiet', hidden: true }, h('b', {}, 'Pretty quiet right now'),
    h('span', {}, 'Bring a friend in, or play something on this phone while you wait.'),
    h('div', { class: 'row2' },
      h('button', { class: 'btn small', onclick: () => shareSheet({ title: 'Invite a friend', text: 'Come chat with me on Sidechick', url: location.origin }, () => award('inviter')) }, 'Invite a friend'),
      h('button', { class: 'btn small line', onclick: gamesHub }, 'Play a game')));
  show(h('div', { class: 'screen search' }, h('div', { class: 'inner' },
    h('div', { class: 'radar' }, h('i'), h('i'), h('i'), avatar(store.av, 84, 'me')),
    h('h2', {}, title || 'Finding someone'), timer, tip,
    interests.length ? h('div', { class: 'chips-wrap small' }, interests.map(i => h('span', { class: 'chip on' }, i))) : null,
    quiet, h('button', { class: 'btn ghost', onclick: () => home() }, 'Cancel'))));
  every(() => { secs++; timer.textContent = secs + 's'; if (secs % 5 === 0) tip.textContent = rand(TIPS); if (secs === 25) quiet.hidden = false; }, 1000);
  const mine = conn = new Conn('/ws/match', {
    open() { mine.send({ t: 'find', pool, interests, adult: true, cid: store.cid }); },
    msg(m) {
      if (m.t === 'matched') { found = true; matched(m); }
      else if (m.t === 'cooldown') { toast(`Take a breather. Try again in ${m.minutes} min.`, 4000); home(); }
      else if (m.t === 'error') { toast(m.text); home(); }
      else if (m.t === 'timeout') { toast('Nobody showed up. Try again in a bit.'); home(); }
    },
    close() { if (!found) { toast("Couldn't connect. Check your internet and try again."); home(); } },
  });
}

function matched(m) {
  const my = navId;
  const line = m.shared?.length ? `You both like ${m.shared.join(', ')}`
    : m.kind ? `Let's play ${GAMES[m.kind].name}`
    : m.invite ? (m.inviter ? `We'll ask them to play ${GAMES[m.invite].name}` : `They'd like to play ${GAMES[m.invite].name}. Your call.`) : 'Say hi';
  show(h('div', { class: 'screen splash' }, h('div', { class: 'inner' }, h('div', { class: 'pop-icon' }, icon('party-popper', 56)), h('h2', {}, "You're connected"), h('p', { class: 'sub' }, line))));
  buzz([30, 60, 30]); confetti(14);
  setTimeout(() => { if (navId === my) joinRoom(m.room, { mode: m.kind ? 'gamerandom' : 'random', kind: m.kind, random: true, shared: m.shared, token: m.token }); }, 1100);
}

// ── games hub ────────────────────────────────────────────────────────────────
function gameCard(k, onpick) {
  const g = GAMES[k];
  return h('button', { class: 'gcard', onclick: () => { buzz(6); onpick(k); } },
    iconBox(g.icon, 24), h('div', { class: 'gtext' }, h('b', {}, g.name, g.nsfw ? tag18() : null), h('span', {}, g.pitch)), icon('arrow-right', 18, 'go'));
}
const keysOf = group => Object.keys(GAMES).filter(k => GAMES[k].group === group);

function gamesHub() {
  leaveAll(); enter();
  show(h('div', { class: 'screen sub scroll' }, h('div', { class: 'inner' }, backBtn(home),
    h('h2', {}, 'Pick a game'), h('p', { class: 'sub' }, 'No chatting needed. Play with a friend, a stranger, or on one phone.'),
    h('h3', {}, 'For friends'), keysOf('friends').map(k => gameCard(k, modeSheet)),
    h('h3', {}, 'For couples'), keysOf('couples').map(k => gameCard(k, modeSheet)))));
}

function modeSheet(kind) {
  const meta = GAMES[kind], total = BANK[kind].length; let full = false;
  const opt = (ic, t, d, fn) => h('button', { class: 'gcard', onclick: fn }, iconBox(ic, 24), h('div', { class: 'gtext' }, h('b', {}, t), h('span', {}, d)), icon('arrow-right', 18, 'go'));
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, meta.name, meta.nsfw ? tag18() : null), h('p', { class: 'sub' }, meta.pitch),
    total > 10 ? h('label', { class: 'toggle' }, h('input', { type: 'checkbox', onchange: e => { full = e.target.checked; } }), ` Play all ${total} questions`) : null,
    opt('link', 'Invite a friend', 'Share a link. It starts when they join.', () => { s.close(); joinRoom(newCode(), { create: true, mode: 'game', kind, rounds: full ? 'full' : 10 }); }),
    opt('dices', 'Random stranger', 'Matched with anyone who is waiting.', () => { s.close(); search({ pool: 'game:' + kind, title: `Finding someone for ${meta.name}` }); }),
    opt('smartphone', 'Same phone', 'Pass it back and forth.', () => { s.close(); passSetup(kind, full ? 'full' : 10); }),
    h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Cancel')));
}

function passSetup(kind, rounds) {
  const a = h('input', { maxlength: 16, value: store.name, 'aria-label': 'Player 1' }), b = h('input', { maxlength: 16, placeholder: 'Player 2', 'aria-label': 'Player 2' });
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Who is playing?'), a, b,
    h('button', { class: 'btn big', onclick: () => { s.close(); startPass(kind, rounds, [a.value.trim() || 'Player 1', b.value.trim() || 'Player 2']); } }, 'Start')));
}
function gameDone(pct) { bump('games'); award('first_game'); if (pct === 100) award('perfect'); if (new Date().getHours() < 5) award('night'); activity(); }
function startPass(kind, rounds, names) {
  leaveAll(); enter();
  const host = h('div', { class: 'host' }); show(host);
  passAndPlay(host, kind, names, rounds, { exit: () => home(), onDone: v => gameDone(v.result.pct) });
}

// ── rooms ────────────────────────────────────────────────────────────────────
function joinRoom(code, o = {}) {
  leaveAll(); enter();
  R = { code, mode: o.mode || 'private', kind: o.kind || null, rounds: o.rounds || 10, random: !!o.random, shared: o.shared || [], token: o.token || null, create: !!o.create,
        uid: null, users: [], game: null, els: {}, photos: {}, lastSender: null, ended: false, hidden: false, picks: {}, tries: 0, doneKey: '', typeT: null, typingSent: 0, intro: false };
  buildRoom(); connect();
}

function connect() {
  const mine = conn = new Conn('/ws/room/' + R.code, {
    open() { mine.send({ t: 'join', name: store.name, av: store.av, adult: true, cid: store.cid, create: R.create, mode: R.mode, kind: R.kind, rounds: R.rounds, token: R.token }); },
    msg: onMsg,
    close() {
      if (!R || R.ended) return;
      if (R.random) return endChat('Connection lost.');
      if (R.tries >= 4) { toast('Lost connection to the room.'); return home(); }
      R.tries++; toast('Reconnecting…');
      setTimeout(() => { if (R && !R.ended) { R.create = false; connect(); } }, 1200 * R.tries);
    },
  });
}

function pickSpark() {
  let s; do { s = rand(ICEBREAKERS); } while (s === lastSpark && ICEBREAKERS.length > 1);
  return (lastSpark = s);
}

function buildRoom() {
  const ui = R.ui = {};
  ui.top = h('header', { class: 'top' });
  ui.feed = h('section', { class: 'feed', 'aria-live': 'polite' });
  ui.typing = h('div', { class: 'typing' });
  ui.input = h('input', { maxlength: 500, placeholder: R.random ? 'Say hi…' : 'Say something…', 'aria-label': 'Message', autocomplete: 'off' });
  // keep telling the other side we're typing (every 2s) for as long as keys are being pressed
  ui.input.addEventListener('input', () => {
    const now = Date.now();
    if (now - R.typingSent > 2000) { R.typingSent = now; conn?.send({ t: 'typing', on: true }); }
    clearTimeout(R.typeT); R.typeT = setTimeout(() => { R.typingSent = 0; conn?.send({ t: 'typing', on: false }); }, 2500);
  });
  ui.photoInput = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: onPickPhoto });
  ui.form = h('form', { class: 'composer', autocomplete: 'off', onsubmit: e => {
    e.preventDefault(); const t = ui.input.value.trim(); if (!t || R.ended) return;
    conn?.send({ t: 'msg', text: t }); ui.input.value = ''; ui.input.focus(); clearTimeout(R.typeT); R.typingSent = 0; conn?.send({ t: 'typing', on: false }); activity(); } },
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Play a game', onclick: openPicker }, icon('gamepad-2', 20)),
    R.random ? null : h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Send a view-once photo', onclick: () => ui.photoInput.click() }, icon('image', 20)),
    h('button', { type: 'button', class: 'icon-btn spark', 'aria-label': 'Suggest an icebreaker', onclick: () => { ui.input.value = pickSpark(); ui.input.focus(); } }, icon('lightbulb', 20)),
    ui.input, ui.photoInput, h('button', { class: 'send', 'aria-label': 'Send' }, icon('arrow-up', 22)));
  ui.pill = h('button', { class: 'pill', hidden: true, onclick: () => { R.hidden = false; renderGameLayer(); } }, icon('gamepad-2', 18), h('span', {}, 'Back to game'));
  ui.gameHost = h('div', { class: 'game-host', hidden: true });
  ui.empty = h('div', { class: 'empty' });
  ui.feed.append(ui.empty);
  show(h('div', { class: 'screen room' }, ui.top, ui.feed, ui.typing, ui.form, ui.pill, ui.gameHost));
  renderTop();
}

function setVibe(id) { const v = $('#vibe'); if (v) v.replaceChildren(icon(VIBE_ICON[id] || 'waves', 22)); }

function renderTop() {
  const top = R.ui.top, peer = R.users.find(u => u.uid !== R.uid);
  if (R.random) {
    top.replaceChildren(h('button', { class: 'icon-btn', 'aria-label': 'Leave chat', onclick: leaveRoom }, icon('arrow-left', 20)),
      h('div', { class: 'peer' }, peer ? avatar(peer.av, 36) : h('span', { class: 'avatar ghosty' }, icon('ghost', 20)), h('div', {}, h('b', {}, peer?.name || 'Stranger'), h('small', {}, 'stranger'))),
      h('div', { class: 'grow' }), h('div', { class: 'vibe', id: 'vibe', title: 'Room vibe' }),
      h('button', { class: 'icon-btn', 'aria-label': 'Report', onclick: reportSheet }, icon('flag', 18)),
      h('button', { class: 'btn small', onclick: skip }, 'Next', icon('skip-forward', 16)));
  } else {
    top.replaceChildren(h('button', { class: 'icon-btn', 'aria-label': 'Leave room', onclick: leaveRoom }, icon('arrow-left', 20)),
      h('button', { class: 'code-chip', 'aria-label': 'Copy room code', onclick: async () => { try { await navigator.clipboard.writeText(R.code); toast('Code copied'); } catch { toast('Code: ' + R.code); } } }, h('b', {}, R.code), h('small', {}, 'tap to copy')),
      h('div', { class: 'faces' }, R.users.map(u => avatar(u.av, 32))),
      h('div', { class: 'vibe', id: 'vibe', title: 'Room vibe' }), h('button', { class: 'btn small', onclick: shareRoom }, icon('share-2', 16), 'Invite'));
  }
  setVibe(R.vibe || 'calm');
}

function shareRoom() { shareSheet({ title: 'Invite someone', text: `Join me on Sidechick. Room code: ${R.code}`, url: link() }, () => award('inviter')); }
function leaveRoom() {
  if (R.random || R.users.length > 1) { if (!confirm('Leave this chat?')) return; }
  home();
}
function skip() { search({ pool: R.kind ? 'game:' + R.kind : 'chat', interests: store.interests || [] }); }
function reportSheet() {
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Report this person?'),
    h('p', { class: 'sub' }, 'This ends the chat for both of you. Repeated reports put someone on a time-out. Nothing from the chat is saved or sent anywhere.'),
    h('button', { class: 'btn danger big', onclick: () => { s.close(); conn?.send({ t: 'report' }); } }, 'Report and end chat'),
    h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Never mind')));
}

function emptyCard() {
  const e = R.ui.empty, anyChat = R.ui.feed.querySelector('.row');
  const waiting = R.users.length < 2 && !R.random;
  e.hidden = !waiting || !!anyChat;
  if (e.hidden) return;
  const gm = R.mode === 'game' && R.kind ? GAMES[R.kind] : null;
  e.replaceChildren(iconBox(gm ? gm.icon : 'message-circle', 34, 'lg'), h('h3', {}, gm ? `${gm.name} is ready` : 'Your room is live'),
    h('p', {}, gm ? 'Waiting for your friend. The game starts the moment they join.' : 'Send the link to the one person you want here. This room holds two and vanishes when you both leave.'),
    h('div', { class: 'code-big' }, R.code), h('button', { class: 'btn', onclick: shareRoom }, icon('share-2', 18), 'Share invite link'));
}

function addMsg(m) {
  const feed = R.ui.feed;
  if (m.sys) { feed.append(h('div', { class: 'sys' }, m.text)); R.lastSender = null; }
  else {
    const mine = m.sid === R.uid;
    const body = m.photo ? photoCard(m, mine)
      : h('div', { class: 'bubble' + (mine ? ' mine' : ''), onclick: () => { const p = R.els[m.id]?.querySelector('.picker'); if (p) p.hidden = !p.hidden; } }, m.text);
    const picker = h('div', { class: 'picker', hidden: true }, ['❤️', '😂', '🔥', '👍', '😮'].map(r => h('button', { onclick: ev => { ev.stopPropagation(); conn?.send({ t: 'react', id: m.id, emoji: r }); picker.hidden = true; } }, r)));
    const col = h('div', { class: 'col' }, !mine && R.lastSender !== m.sid ? h('div', { class: 'who' }, m.name) : null, body, h('div', { class: 'reacts' }), picker);
    const row = h('div', { class: 'row' + (mine ? ' mine' : '') }, avatar(m.av, 30), col);
    R.els[m.id] = row; R.lastSender = m.sid; feed.append(row); paintReacts(m.id, m.reacts || {});
    if (!mine) { ping(); if (R.hidden && R.game) { R.unread = (R.unread || 0) + 1; renderGameLayer(); } }
  }
  requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
  emptyCard();
}
function paintReacts(id, reacts) {
  const box = R.els[id]?.querySelector('.reacts'); if (!box) return;
  box.replaceChildren(...Object.entries(reacts).map(([e, who]) => h('button', { class: who.includes(R.uid) ? 'me' : '', onclick: () => conn?.send({ t: 'react', id, emoji: e }) }, `${e} ${who.length}`)));
}

// tab title + buzz when something arrives while you're elsewhere
document.addEventListener('visibilitychange', () => { if (!document.hidden) { unread = 0; document.title = BASE_TITLE; } });
function ping() { if (!document.hidden) return; unread++; document.title = `(${unread}) New message | Sidechick`; buzz(60); }

// ── view-once photos (private rooms) ─────────────────────────────────────────
function photoCard(m, mine) {
  const btn = h('button', { type: 'button', class: 'photo-card' + (mine ? ' mine' : '') });
  R.photos[m.id] = { btn, mine, state: m.state, secs: m.secs };
  btn.addEventListener('click', () => { const p = R.photos[m.id]; if (p && !p.mine && p.state === 'sent') { buzz(10); conn?.send({ t: 'photo_open', id: m.id }); } });
  paintPhoto(m.id); return btn;
}
function paintPhoto(id) {
  const p = R.photos[id]; if (!p) return;
  const [ic, text] = p.state === 'sent' ? (p.mine ? ['timer', 'Photo sent. Waiting for them to open it.'] : ['eye', `Tap to view once (${p.secs}s)`])
    : p.state === 'opened' ? ['eye-off', p.mine ? 'They opened it.' : 'You opened it.'] : ['image', 'Photo gone.'];
  p.btn.disabled = !(p.state === 'sent' && !p.mine);
  p.btn.replaceChildren(icon(ic, 20), h('span', {}, text));
}

async function onPickPhoto(ev) {
  const file = ev.target.files?.[0]; ev.target.value = ''; if (!file) return;
  try { photoPreview(await compressPhoto(file)); } catch { toast("Couldn't use that photo. Try another one."); }
}
async function compressPhoto(file) {
  if (!/^image\//.test(file.type)) throw new Error('not an image');
  const bmp = await createImageBitmap(file);          // re-drawing also strips location data and other EXIF
  let max = 1280, q = 0.72;
  for (let i = 0; i < 6; i++) {
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', q); if (url.length <= 700000) return url;
    q = Math.max(0.4, q - 0.1); max = Math.round(max * 0.82);
  }
  throw new Error('too big');
}
function photoPreview(url) {
  let secs = 10;
  const chips = h('div', { class: 'chips-wrap' }, [5, 10, 30].map(n => h('button', { type: 'button', class: 'chip pick' + (n === secs ? ' on' : ''), onclick: ev => {
    secs = n; ev.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); } }, icon('timer', 16), `${n}s`)));
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Send a view-once photo'), h('img', { class: 'pv-img', src: url, alt: 'Your photo' }),
    h('p', { class: 'tiny left' }, 'How long can they look?'), chips,
    h('p', { class: 'tiny left' }, "It disappears after one view and is never saved. Browsers can't fully block screenshots, so it is hidden whenever they leave the screen and tagged with their name."),
    h('button', { class: 'btn big', onclick: () => { conn?.send({ t: 'photo', data: url, secs }); s.close(); } }, icon('send', 18), 'Send'),
    h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Cancel')));
}
function showPhoto(m) {
  if (closeViewer) return;
  const esc = x => String(x).replace(/[<>&"']/g, '');
  const label = `${esc(store.name)} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='230' height='150'><text x='12' y='84' transform='rotate(-24 115 75)' font-family='sans-serif' font-size='19' font-weight='700' fill='white' fill-opacity='.3' stroke='black' stroke-opacity='.2' stroke-width='.6'>${label}</text></svg>`;
  const img = h('img', { src: m.data, alt: 'View-once photo', draggable: 'false' }), bar = h('i'), left = h('span', {}, `${m.secs}s`);
  const view = h('div', { class: 'viewer' },
    h('div', { class: 'v-top' }, left, h('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: () => close(true) }, icon('x', 20))),
    h('div', { class: 'v-img' }, img, h('div', { class: 'wm', style: `background-image:url("data:image/svg+xml,${encodeURIComponent(tile)}")` })),
    h('div', { class: 'v-bar' }, bar), h('p', { class: 'v-note' }, 'Gone after this. Leaving the screen closes it.'));
  const block = e => e.preventDefault();
  const hide = () => close(true);
  const onVis = () => { if (document.hidden) hide(); };
  const onKey = e => { if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey) || (e.ctrlKey && /^[ps]$/i.test(e.key))) { e.preventDefault(); try { navigator.clipboard?.writeText(' '); } catch {} hide(); } };
  document.addEventListener('visibilitychange', onVis); window.addEventListener('blur', hide); window.addEventListener('pagehide', hide);
  document.addEventListener('keydown', onKey); document.addEventListener('keyup', onKey); document.addEventListener('contextmenu', block);
  const t0 = Date.now();
  const iv = setInterval(() => { const rem = m.secs - (Date.now() - t0) / 1000; left.textContent = Math.max(0, Math.ceil(rem)) + 's'; bar.style.width = Math.max(0, 100 * rem / m.secs) + '%'; if (rem <= 0) close(false); }, 100);
  function close(early) {
    if (!closeViewer) return; closeViewer = null; clearInterval(iv);
    document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', hide); window.removeEventListener('pagehide', hide);
    document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKey); document.removeEventListener('contextmenu', block);
    img.removeAttribute('src'); view.remove(); if (early) toast('Photo closed. It stays gone.');
  }
  closeViewer = () => close(false);
  $('#layer').append(view);
}

function onMsg(m) {
  if (!R) return;
  switch (m.t) {
    case 'joined':
      Object.assign(R, { uid: m.you, users: m.users, mode: m.mode, kind: m.kind, create: false, tries: 0, vibe: m.vibe });
      R.ui.feed.querySelectorAll('.row,.sys').forEach(n => n.remove()); R.els = {}; R.photos = {}; R.lastSender = null;
      m.history.forEach(addMsg); renderTop(); emptyCard();
      if (R.random && !R.intro) {
        R.intro = true; bump('chats'); award('first_chat'); activity();
        R.ui.feed.append(h('div', { class: 'sys safe' }, "You're connected. Be kind. The flag at the top reports and ends the chat."));
        if (R.shared.length) R.ui.feed.append(h('div', { class: 'sys' }, `You both like ${R.shared.join(', ')}`));
      }
      R.game = m.game; renderGameLayer(); break;
    case 'join_error':
      if (m.code === 'taken' && R.create) { R.code = newCode(); conn.close(); renderTop(); connect(); break; }
      toast(m.text, 3600); home(); break;
    case 'users': R.users = m.users; renderTop(); emptyCard(); break;
    case 'msg': addMsg(m.m); break;
    case 'reacts': paintReacts(m.id, m.reacts); break;
    case 'vibe': R.vibe = m.vibe; setVibe(m.vibe); break;
    case 'typing':
      clearTimeout(R.hideT);
      if (m.on) { R.ui.typing.textContent = `${m.name} is typing…`; R.hideT = setTimeout(() => { if (R) R.ui.typing.textContent = ''; }, 4500); }   // refreshed by every heartbeat
      else R.ui.typing.textContent = '';
      break;
    case 'photo_data': showPhoto(m); break;
    case 'photo_state': if (R.photos[m.id]) { R.photos[m.id].state = m.state; paintPhoto(m.id); } break;
    case 'toast': toast(m.text); break;
    case 'invite': inviteSheet(m); break;
    case 'game': {
      const prev = R.game;
      if (!prev || prev.phase === 'done' || (m.game && prev.kind !== m.game.kind)) R.picks = {};
      R.game = m.game; if (m.game && m.game.i === 0 && m.game.phase === 'answer') { R.hidden = false; R.unread = 0; }
      renderGameLayer(); emptyCard(); break;
    }
    case 'peer_left': endChat(`${m.name || 'They'} left the chat.`); break;
    case 'closed': if (R.random) endChat(m.text || 'Chat ended.'); else { toast(m.text || 'Room closed.'); home(); } break;
    case 'reported': toast('Thanks. Chat ended. Stay safe.', 3600); home(); break;
  }
}

function endChat(text) {
  if (!R || R.ended) return;
  R.ended = true; conn?.close(); setTheme('brand'); closeViewer?.();
  R.ui.input.disabled = true; R.ui.input.placeholder = 'Chat ended'; R.ui.gameHost.hidden = true; R.ui.pill.hidden = true;
  R.ui.feed.append(h('div', { class: 'end-card' }, iconBox('wind', 30, 'lg'), h('h3', {}, text),
    h('button', { class: 'btn big', onclick: () => search({ pool: R.kind ? 'game:' + R.kind : 'chat', interests: store.interests || [] }) }, 'Find someone new'),
    h('button', { class: 'btn ghost', onclick: () => home() }, 'Back home')));
  R.ui.feed.scrollTop = R.ui.feed.scrollHeight;
}

// ── in-room games ────────────────────────────────────────────────────────────
function openPicker() {
  if (R.ended) return;
  if (R.game && R.game.phase !== 'done') { R.hidden = false; return renderGameLayer(); }
  const go = k => { s.close(); conn?.send({ t: 'game_start', kind: k, rounds: 10 }); };
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Pick a game'),
    R.random ? h('p', { class: 'sub' }, 'Your partner gets an invite first and can say no.') : null,
    h('h4', {}, 'For friends'), keysOf('friends').map(k => gameCard(k, go)),
    h('h4', {}, 'For couples'), keysOf('couples').map(k => gameCard(k, go)),
    h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Close')));
}

function inviteSheet(m) {
  const g = GAMES[m.kind]; if (!g) return;
  buzz([20, 40, 20]);
  const s = sheet(h('div', { class: 'mode center' }, iconBox(g.icon, 34, 'lg'), h('h3', {}, `${m.by} wants to play ${g.name}`), h('p', { class: 'sub' }, g.nsfw ? `${g.pitch} This one is 18+ and spicy.` : g.pitch),
    h('button', { class: 'btn big', onclick: () => { s.close(); conn?.send({ t: 'invite_reply', ok: true }); } }, "Let's play"),
    h('button', { class: 'btn ghost', onclick: () => { s.close(); conn?.send({ t: 'invite_reply', ok: false }); } }, 'Not now')));
}

function renderGameLayer() {
  const { ui } = R, g = R.game;
  if (!g) { ui.gameHost.hidden = true; ui.gameHost.replaceChildren(); ui.pill.hidden = true; R.picks = {}; setTheme('brand'); return; }
  if (R.hidden && g.phase !== 'done') {
    ui.gameHost.hidden = true; ui.pill.hidden = false; setTheme('brand');
    ui.pill.replaceChildren(icon('gamepad-2', 18), h('span', {}, R.unread ? `Back to game · ${R.unread} new` : 'Back to game')); return;
  }
  R.unread = 0; R.hidden = false; ui.pill.hidden = true; ui.gameHost.hidden = false;
  const users = {}; R.users.forEach(u => { users[u.uid] = { name: u.name, av: u.av }; });
  ui.gameHost.replaceChildren(renderGame(g, {
    me: R.uid, users, picks: R.picks, exitLabel: 'Back to chat',
    pick: (i, c) => { R.picks[g.i] = c; conn?.send({ t: 'game_answer', i, choice: c }); renderGameLayer(); },
    next: i => conn?.send({ t: 'game_next', i }),
    end: () => { if (g.phase === 'done' || confirm('End the game for everyone?')) conn?.send({ t: 'game_end' }); },
    again: () => conn?.send({ t: 'game_start', kind: g.kind, rounds: 10 }),
    play: k => { conn?.send({ t: 'game_end' }); conn?.send({ t: 'game_start', kind: k, rounds: 10 }); },
    allow: () => true,
    chat: () => { R.hidden = true; renderGameLayer(); },
  }));
  if (g.phase === 'done') {
    const key = `${g.kind}:${g.result.pct}:${g.total}`;
    if (R.doneKey !== key) { R.doneKey = key; gameDone(g.result.pct); }
  }
}

// ── profile + privacy ────────────────────────────────────────────────────────
function openStuff() {
  let av = store.av;
  const input = h('input', { maxlength: 16, value: store.name, 'aria-label': 'Nickname' });
  const toggle = (label, key) => h('label', { class: 'switch' }, h('input', { type: 'checkbox', checked: store.prefs[key] !== false, onchange: e => { store.prefs[key] = e.target.checked; save(); applyPrefs(); } }), h('span', { class: 'sw' }), label);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent || '') && !navigator.standalone;
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Your stuff'),
    h('p', { class: 'sub' }, 'Saved in this browser only. We never see it.'),
    avatarPicker(av, id => { av = id; }), input,
    h('div', { class: 'stats' }, h('div', {}, h('b', {}, String(currentStreak())), h('small', {}, 'day streak')),
      h('div', {}, h('b', {}, String(store.games || 0)), h('small', {}, 'games')), h('div', {}, h('b', {}, String(store.chats || 0)), h('small', {}, 'chats'))),
    h('p', { class: 'tiny left' }, 'Play a game or chat once a day to keep your streak. It lives on this device, so clearing your browser data or switching phones resets it.'),
    h('div', { class: 'badges' }, Object.entries(BADGES).map(([id, b]) => h('div', { class: 'badge' + (store.badges[id] ? ' on' : ''), title: b.d }, icon(store.badges[id] ? b.icon : 'lock', 22), h('small', {}, b.t), h('i', {}, b.d)))),
    toggle('Animated background', 'bg'), toggle('Vibration', 'haptics'),
    ios ? h('p', { class: 'tiny left' }, 'Install: tap the Share button in Safari, then Add to Home Screen.') : null,
    h('button', { class: 'btn big', onclick: () => { store.name = input.value.trim().slice(0, 16) || store.name; store.av = av; save(); s.close(); home(); } }, 'Save'),
    h('button', { class: 'link danger', onclick: () => { if (confirm('Erase your nickname, streak and badges from this device?')) { resetAll(); applyPrefs(); s.close(); onboard(); } } }, icon('trash-2', 14), 'Erase everything on this device')));
}

function openPrivacy() {
  const li = (ic, t, d) => h('div', { class: 'pv' }, iconBox(ic, 20), h('div', {}, h('b', {}, t), h('small', {}, d)));
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Privacy and safety'),
    li('wind', 'Nothing is saved', 'Messages and answers exist only in memory while a room is open. When you both leave, they are gone. No database, no accounts, no ads, no analytics.'),
    li('smartphone', 'Your profile stays on your device', 'Nickname, avatar, streak and badges live in your browser. The streak is just a counter on your phone. Erase it any time.'),
    li('users', 'Two people per room', 'Every room, private or random, holds exactly two people. Nobody else can join.'),
    li('dices', 'Random chats', 'Anyone can say anything except threats, which are blocked, and links, which are not allowed with strangers. Skip or report anyone. A report ends the chat and repeat offenders get a short time-out, tracked anonymously in memory with no chat content.'),
    li('cherry', 'Spicy games', 'The 18+ packs can be played with strangers, but only if the other person accepts your invite. Say no any time.'),
    li('image', 'View-once photos', 'Available in private rooms only. A photo is held in memory until the other person opens it, sent once, then deleted. It is hidden if they leave the screen and tagged with their name. No website can fully block screenshots, so only send what you trust them with.'),
    li('lightbulb', 'Suggestions', 'If you send a suggestion, the text you type goes to the developer on Telegram. That is the only thing that ever leaves this app.'),
    li('eye-off', 'Strangers stay strangers', 'We never ask who you are. Think before you share personal details, photos or contact info.'),
    li('info', 'Honest limits', 'Age confirmation is a tap, not a check, so we cannot verify it. Chats are not end-to-end encrypted: the server relays them in memory. Never share anything you would not say out loud.'),
    h('button', { class: 'btn big', onclick: () => s.close() }, 'Got it')));
}

// ── boot ─────────────────────────────────────────────────────────────────────
applyPrefs(); initBackdrop();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
const r = new URLSearchParams(location.search).get('r');
if (r) { history.replaceState({}, '', location.pathname); if (/^[A-Za-z]{4,5}$/.test(r)) pendingCode = r.toUpperCase(); }
if (!store.adult) onboard(); else afterOnboard();
