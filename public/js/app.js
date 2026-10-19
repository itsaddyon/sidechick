// Sidechick v2 — screens and flow. Vanilla ES modules, no build step.
import { $, h, rand, buzz, toast, confetti, sheet, share, emojiPicker } from './ui.js';
import { store, save, BADGES, touchStreak, bump, unlock, resetAll } from './store.js';
import { Conn, waitingCount } from './net.js';
import { GAMES, BANK, INTERESTS } from '../shared/questions.js';
import { renderGame, passAndPlay } from './game.js';

const app = $('#app');
const EMOJIS = ['😎', '🥳', '😈', '🤪', '🦊', '🐼', '🐸', '👻', '🤖', '🌸', '🍕', '⚡'];
const NAMES = ['Sleepy Panda', 'Chai Addict', 'Midnight Owl', 'Snack Goblin', 'Main Character', 'Lowkey Legend', 'Couch Potato', 'Meme Lord', 'Plot Twist', 'Wifi Ghost'];
const TIPS = ['Tap 💡 in the chat for an instant icebreaker.', 'Be kind. A real person is on the other side.', "Don't share your number or address.",
  'Not feeling it? Skip. No hard feelings.', 'Rooms vanish when you leave. Nothing is saved.', 'Picking interests helps you match faster.'];
const CODE_CHARS = [...'BCDFGHJKLMNPQRSTVWXZ'];
const newCode = () => Array.from({ length: 4 }, () => rand(CODE_CHARS)).join('');
const isMobileShare = () => !!navigator.share;

let conn = null, R = null, timers = [], navId = 0, pendingCode = null;
const every = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
function leaveAll() { navId++; timers.forEach(clearInterval); timers = []; if (conn) { conn.close(); conn = null; } R = null; $('#layer').replaceChildren(); }
const show = (...kids) => { app.replaceChildren(...kids); window.scrollTo(0, 0); };
const enter = () => { if (!history.state?.sc) history.pushState({ sc: 1 }, ''); };
window.addEventListener('popstate', () => home());

const logo = () => h('div', { class: 'logo' }, 'sidechick', h('span', {}, '.'));
const backBtn = fn => h('button', { class: 'back', 'aria-label': 'Back', onclick: () => fn() }, '←');
const tag18 = () => h('span', { class: 'tag18' }, '18+');
const link = () => `${location.origin}/?r=${R.code}`;
function award(id) { const b = unlock(id); if (b) { toast(`🏅 ${b.t} unlocked!`, 3200); confetti(22); } }

// ── onboarding ───────────────────────────────────────────────────────────────
function onboard() {
  let emoji = store.emoji || EMOJIS[0];
  const input = h('input', { maxlength: 16, value: store.name || rand(NAMES), placeholder: 'Your nickname', 'aria-label': 'Nickname' });
  show(h('div', { class: 'screen onboard' }, h('div', { class: 'inner' }, logo(),
    h('h1', {}, 'Hey 👋', h('br'), 'who are you tonight?'),
    emojiPicker(EMOJIS, emoji, e => { emoji = e; }),
    h('div', { class: 'name-row' }, input, h('button', { type: 'button', class: 'icon', 'aria-label': 'Random name', onclick: () => { input.value = rand(NAMES); buzz(6); } }, '🎲')),
    h('button', { class: 'btn big', onclick: () => {
      store.name = input.value.trim().slice(0, 16) || rand(NAMES); store.emoji = emoji; store.adult = true; save();
      buzz([10, 30, 10]); afterOnboard();
    } }, "I'm 18+ · Let's go →"),
    h('p', { class: 'tiny' }, 'Sidechick is for adults only. Tapping the button confirms you are 18 or older.'),
    h('button', { class: 'link', onclick: openPrivacy }, '🛡️ How privacy works'))));
}
function afterOnboard() { if (pendingCode) { const c = pendingCode; pendingCode = null; joinRoom(c); } else home(); }

// ── home ─────────────────────────────────────────────────────────────────────
const tile = (cls, emoji, title, sub, fn, extra) => h('button', { class: `tile ${cls}`, onclick: () => { buzz(8); fn(); } },
  h('span', { class: 't-emoji' }, emoji), h('span', { class: 't-text' }, h('b', {}, title), h('small', {}, sub)), extra || null, h('span', { class: 't-go' }, '→'));

function home() {
  leaveAll();
  if (!store.adult) return onboard();
  const live = h('span', { class: 'live', hidden: true });
  const code = h('input', { maxlength: 5, placeholder: 'CODE', autocapitalize: 'characters', autocomplete: 'off', 'aria-label': 'Room code' });
  show(h('div', { class: 'screen home' }, h('div', { class: 'inner' },
    h('div', { class: 'bar-top' }, logo(), h('div', { class: 'chips-top' },
      store.streak ? h('button', { class: 'chip fire', 'aria-label': 'Streak', onclick: openStuff }, `🔥 ${store.streak}`) : null,
      h('button', { class: 'chip avatar', 'aria-label': 'Your profile', onclick: openStuff }, store.emoji))),
    h('div', { class: 'hello' }, `Hey ${store.name} 👋`),
    h('h1', {}, "What's the move?"),
    tile('pink', '🎭', 'Meet someone new', 'Random chat. Skip anytime.', strangerIntro, live),
    tile('yellow', '🎮', 'Play a game', 'No chatting needed. Friends, strangers or one phone.', gamesHub),
    tile('blue', '🔒', 'Private room', 'Just you and your people.', () => joinRoom(newCode(), { create: true })),
    h('form', { class: 'code-row', onsubmit: e => { e.preventDefault(); joinByCode(code.value); } }, code, h('button', { class: 'btn alt' }, 'Join with code')),
    qotd(),
    h('div', { class: 'foot' }, h('button', { class: 'link', onclick: openPrivacy }, '🛡️ Privacy & safety'), ' · 18+ only'))));
  const poll = async () => { const n = await waitingCount(); live.hidden = !(n > 0); if (n > 0) live.textContent = `${n} waiting`; };
  poll(); every(() => { if (!document.hidden) poll(); }, 30000);
  if (store.streak >= 3) award('streak3');
}

function qotd() {
  const pool = BANK.same_brain, q = pool[Math.floor(Date.now() / 864e5) % pool.length];
  const opts = q.o.map(o => h('button', { class: 'chip opt-chip', onclick: ev => {
    ev.currentTarget.parentNode.querySelectorAll('button').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); buzz(8);
    toast('Locked in. Now find out who agrees 👀'); } }, o));
  return h('div', { class: 'qotd' }, h('small', {}, 'Question of the day'), h('b', {}, q.q), h('div', { class: 'row2' }, opts),
    h('button', { class: 'link', onclick: async () => { if (await share({ text: `${q.q} ${q.o.join(' or ')}? Tell me.`, url: location.origin }) === 'shared') award('inviter'); } }, 'Send it to someone ↗'));
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
  const chips = INTERESTS.map(i => h('button', { type: 'button', class: 'chip pick' + (picked.has(i) ? ' on' : ''), onclick: ev => {
    if (picked.has(i)) picked.delete(i); else if (picked.size < 5) picked.add(i); else toast('Up to 5 is plenty');
    ev.currentTarget.classList.toggle('on', picked.has(i)); buzz(5); } }, i));
  show(h('div', { class: 'screen sub' }, h('div', { class: 'inner' }, backBtn(home),
    h('h2', {}, 'Meet someone new 🎭'), h('p', { class: 'sub' }, 'Pick up to 5 interests to match faster. Or skip it.'),
    h('div', { class: 'chips-wrap' }, chips),
    h('div', { class: 'safe-card' }, h('b', {}, '🛡️ Quick rules'), h('span', {}, "Be kind. Don't share personal info. Skip or 🚩 report anyone who makes you uncomfortable. Nothing is saved.")),
    h('button', { class: 'btn big pink', onclick: () => { store.interests = [...picked]; save(); search({ pool: 'chat', interests: [...picked] }); } }, 'Find someone →'))));
}

function search({ pool, interests = [], title }) {
  leaveAll(); enter();
  let secs = 0, found = false;
  const timer = h('span', { class: 'timer' }, '0s'), tip = h('p', { class: 'tip' }, rand(TIPS));
  const quiet = h('div', { class: 'quiet', hidden: true }, h('b', {}, 'Pretty quiet right now 🌙'),
    h('span', {}, 'Bring a friend in, or play something on this phone while you wait.'),
    h('div', { class: 'row2' },
      h('button', { class: 'btn small', onclick: async () => { if (await share({ text: 'Come chat with me on Sidechick 👀', url: location.origin }) === 'shared') award('inviter'); } }, 'Invite a friend'),
      h('button', { class: 'btn small alt', onclick: gamesHub }, 'Play a game')));
  show(h('div', { class: 'screen search' }, h('div', { class: 'inner' },
    h('div', { class: 'radar' }, h('i'), h('i'), h('i'), h('span', { class: 'me' }, store.emoji)),
    h('h2', {}, title || 'Finding someone…'), timer, tip,
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
  show(h('div', { class: 'screen splash' }, h('div', { class: 'inner' }, h('div', { class: 'big-emoji pop' }, '🎉'), h('h2', {}, "You're connected!"),
    h('p', { class: 'sub' }, m.shared?.length ? `You both like ${m.shared.join(', ')}` : m.kind ? `Let's play ${GAMES[m.kind].name}` : 'Say hi 👋'))));
  buzz([30, 60, 30]); confetti(14);
  setTimeout(() => { if (navId === my) joinRoom(m.room, { mode: m.kind ? 'gamerandom' : 'random', kind: m.kind, random: true, shared: m.shared }); }, 1100);
}

// ── games hub ────────────────────────────────────────────────────────────────
function gameCard(k, onpick) {
  const g = GAMES[k];
  return h('button', { class: `gcard tier-${g.tier}`, onclick: () => { buzz(6); onpick(k); } },
    h('div', { class: 'e' }, g.emoji), h('div', {}, h('b', {}, g.name, g.nsfw ? tag18() : null), h('span', {}, g.pitch)));
}
const keysOf = group => Object.keys(GAMES).filter(k => GAMES[k].group === group);

function gamesHub() {
  leaveAll(); enter();
  show(h('div', { class: 'screen sub scroll' }, h('div', { class: 'inner' }, backBtn(home),
    h('h2', {}, 'Pick a game 🎮'), h('p', { class: 'sub' }, 'No chatting needed. Play with a friend, a stranger, or on one phone.'),
    h('h3', {}, 'For friends'), keysOf('friends').map(k => gameCard(k, modeSheet)),
    h('h3', {}, 'For couples 🔥'), keysOf('couples').map(k => gameCard(k, modeSheet)))));
}

function modeSheet(kind) {
  const meta = GAMES[kind], total = BANK[kind].length; let full = false;
  const opt = (e, t, d, fn, off) => h('button', { class: 'gcard', disabled: !!off, onclick: fn }, h('div', { class: 'e' }, e), h('div', {}, h('b', {}, t), h('span', {}, d)));
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, `${meta.emoji} ${meta.name}`), h('p', { class: 'sub' }, meta.pitch),
    total > 10 ? h('label', { class: 'toggle' }, h('input', { type: 'checkbox', onchange: e => { full = e.target.checked; } }), ` Play all ${total} questions`) : null,
    opt('🔗', 'Invite a friend', 'Share a link. It starts when they join.', () => { s.close(); joinRoom(newCode(), { create: true, mode: 'game', kind, rounds: full ? 'full' : 10 }); }),
    opt('🎭', 'Random stranger', meta.tier === 'spicy' ? 'Friends and private rooms only' : 'Matched with someone who is waiting', () => { s.close(); search({ pool: 'game:' + kind, title: `Finding a ${meta.name} partner…` }); }, meta.tier === 'spicy'),
    opt('📱', 'Same phone', 'Pass it back and forth.', () => { s.close(); passSetup(kind, full ? 'full' : 10); }),
    h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Cancel')));
}

function passSetup(kind, rounds) {
  const a = h('input', { maxlength: 16, value: store.name, 'aria-label': 'Player 1' }), b = h('input', { maxlength: 16, placeholder: 'Player 2', 'aria-label': 'Player 2' });
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Who is playing? 📱'), a, b,
    h('button', { class: 'btn big', onclick: () => { s.close(); startPass(kind, rounds, [a.value.trim() || 'Player 1', b.value.trim() || 'Player 2']); } }, 'Start')));
}
function startPass(kind, rounds, names) {
  leaveAll(); enter();
  const host = h('div', { class: 'host' }); show(host);
  const onDone = v => { bump('games'); award('first_game'); if (v.result.pct === 100) award('perfect'); if (new Date().getHours() < 5) award('night'); };
  passAndPlay(host, kind, names, rounds, { exit: () => home(), onDone, play: (k, restart) => restart(k) });
}

// ── rooms ────────────────────────────────────────────────────────────────────
function joinRoom(code, o = {}) {
  leaveAll(); enter();
  R = { code, mode: o.mode || 'private', kind: o.kind || null, rounds: o.rounds || 10, random: !!o.random, shared: o.shared || [], create: !!o.create,
        uid: null, users: [], game: null, els: {}, lastSender: null, ended: false, hidden: false, picks: {}, tries: 0, doneKey: '', typeT: null, intro: false };
  buildRoom(); connect();
}

function connect() {
  const mine = conn = new Conn('/ws/room/' + R.code, {
    open() { mine.send({ t: 'join', name: store.name, emoji: store.emoji, adult: true, cid: store.cid, create: R.create, mode: R.mode, kind: R.kind, rounds: R.rounds }); },
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

function buildRoom() {
  const ui = R.ui = {};
  ui.top = h('header', { class: 'top' });
  ui.feed = h('section', { class: 'feed', 'aria-live': 'polite' });
  ui.typing = h('div', { class: 'typing' });
  ui.input = h('input', { maxlength: 500, placeholder: R.random ? 'Say hi…' : 'Say something…', 'aria-label': 'Message', autocomplete: 'off' });
  ui.input.addEventListener('input', () => {
    if (!R.typing) { R.typing = true; conn?.send({ t: 'typing', on: true }); }
    clearTimeout(R.typeT); R.typeT = setTimeout(() => { R.typing = false; conn?.send({ t: 'typing', on: false }); }, 1500);
  });
  ui.form = h('form', { class: 'composer', autocomplete: 'off', onsubmit: e => {
    e.preventDefault(); const t = ui.input.value.trim(); if (!t || R.ended) return;
    conn?.send({ t: 'msg', text: t }); ui.input.value = ''; ui.input.focus(); conn?.send({ t: 'typing', on: false }); R.typing = false; } },
    h('button', { type: 'button', class: 'icon play', 'aria-label': 'Play a game', onclick: openPicker }, '🎮'),
    h('button', { type: 'button', class: 'icon spark', 'aria-label': 'Send an icebreaker question', onclick: () => conn?.send({ t: 'spark' }) }, '💡'),
    ui.input, h('button', { class: 'send', 'aria-label': 'Send' }, '↑'));
  ui.pill = h('button', { class: 'pill', hidden: true, onclick: () => { R.hidden = false; renderGameLayer(); } }, '🎮 Back to game');
  ui.gameHost = h('div', { class: 'game-host', hidden: true });
  ui.empty = h('div', { class: 'empty' });
  ui.feed.append(ui.empty);
  show(h('div', { class: 'screen room' }, ui.top, ui.feed, ui.typing, ui.form, ui.pill, ui.gameHost));
  renderTop();
}

function renderTop() {
  const top = R.ui.top, peer = R.users.find(u => u.uid !== R.uid);
  if (R.random) {
    top.replaceChildren(h('button', { class: 'icon', 'aria-label': 'Leave chat', onclick: leaveRoom }, '←'),
      h('div', { class: 'peer' }, h('span', { class: 'av' }, peer?.emoji || '🎭'), h('div', {}, h('b', {}, peer?.name || 'Stranger'), h('small', {}, 'stranger'))),
      h('div', { class: 'grow' }), h('div', { class: 'vibe', id: 'vibe' }, '✨'),
      h('button', { class: 'icon', 'aria-label': 'Report', onclick: reportSheet }, '🚩'),
      h('button', { class: 'btn small', onclick: skip }, 'Next ⏭'));
  } else {
    top.replaceChildren(h('button', { class: 'icon', 'aria-label': 'Leave room', onclick: leaveRoom }, '←'),
      h('button', { class: 'code-chip', 'aria-label': 'Copy room code', onclick: async () => { try { await navigator.clipboard.writeText(R.code); toast('Code copied'); } catch { toast('Code: ' + R.code); } } }, h('b', {}, R.code), h('small', {}, 'tap to copy')),
      h('div', { class: 'faces' }, R.users.map(u => h('span', { title: u.name }, u.emoji))),
      h('div', { class: 'vibe', id: 'vibe' }, '✨'), h('button', { class: 'btn small', onclick: shareRoom }, 'Invite'));
  }
}

async function shareRoom() {
  if (await share({ text: `Join me on Sidechick 👀 Code: ${R.code}`, url: link() }) === 'shared') award('inviter');
}
function leaveRoom() {
  if (R.random || R.users.length > 1) { if (!confirm('Leave this chat?')) return; }
  home();
}
function skip() {
  const pool = R.kind ? 'game:' + R.kind : 'chat';
  search({ pool, interests: store.interests || [] });
}
function reportSheet() {
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Report this person? 🚩'),
    h('p', { class: 'sub' }, "This ends the chat for both of you. Repeated reports put someone on a time-out. Nothing from the chat is saved or sent anywhere."),
    h('button', { class: 'btn danger big', onclick: () => { s.close(); conn?.send({ t: 'report' }); } }, 'Report and end chat'),
    h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Never mind')));
}

function emptyCard() {
  const e = R.ui.empty, anyChat = R.ui.feed.querySelector('.row,.spark-card');
  const waiting = R.users.length < 2 && !R.random;
  e.hidden = !waiting || !!anyChat;
  if (e.hidden) return;
  const gm = R.mode === 'game' && R.kind ? GAMES[R.kind] : null;
  e.replaceChildren(h('div', { class: 'big-emoji' }, gm ? gm.emoji : '🎉'), h('h3', {}, gm ? `${gm.name} is ready` : 'Your room is live'),
    h('p', {}, gm ? 'Waiting for your friend. The game starts the moment they join.' : 'Send the link to your people. This room vanishes when everyone leaves.'),
    h('div', { class: 'code-big' }, R.code), h('button', { class: 'btn', onclick: shareRoom }, 'Share invite link'));
}

function addMsg(m) {
  const feed = R.ui.feed;
  if (m.sys) { feed.append(h('div', { class: 'sys' }, m.text)); R.lastSender = null; }
  else if (m.spark) { feed.append(h('div', { class: 'spark-card' }, h('small', {}, `💡 ${m.by} sparked a question`), h('b', {}, m.text))); R.lastSender = null; }
  else {
    const mine = m.sid === R.uid;
    const bubble = h('div', { class: 'bubble' + (mine ? ' mine' : ''), onclick: () => { const p = R.els[m.id]?.querySelector('.picker'); if (p) p.hidden = !p.hidden; } }, m.text);
    const picker = h('div', { class: 'picker', hidden: true }, ['❤️', '😂', '🔥', '👍', '😮'].map(r => h('button', { onclick: ev => { ev.stopPropagation(); conn?.send({ t: 'react', id: m.id, emoji: r }); picker.hidden = true; } }, r)));
    const col = h('div', { class: 'col' }, !mine && R.lastSender !== m.sid ? h('div', { class: 'who' }, m.name) : null, bubble, h('div', { class: 'reacts' }), picker);
    const row = h('div', { class: 'row' + (mine ? ' mine' : '') }, h('div', { class: 'av' }, m.emoji), col);
    R.els[m.id] = row; R.lastSender = m.sid; feed.append(row); paintReacts(m.id, m.reacts || {});
    if (!mine && R.hidden && R.game) { R.unread = (R.unread || 0) + 1; renderGameLayer(); }
  }
  requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
  emptyCard();
}
function paintReacts(id, reacts) {
  const box = R.els[id]?.querySelector('.reacts'); if (!box) return;
  box.replaceChildren(...Object.entries(reacts).map(([e, who]) => h('button', { class: who.includes(R.uid) ? 'me' : '', onclick: () => conn?.send({ t: 'react', id, emoji: e }) }, `${e} ${who.length}`)));
}

function onMsg(m) {
  if (!R) return;
  switch (m.t) {
    case 'joined':
      Object.assign(R, { uid: m.you, users: m.users, mode: m.mode, kind: m.kind, create: false, tries: 0 });
      R.ui.feed.querySelectorAll('.row,.sys,.spark-card').forEach(n => n.remove()); R.els = {}; R.lastSender = null;
      m.history.forEach(addMsg); renderTop(); emptyCard();
      if (R.random && !R.intro) {
        R.intro = true; bump('chats'); award('first_chat');
        R.ui.feed.append(h('div', { class: 'sys safe' }, "You're connected. Be kind and don't share personal info. 🚩 reports end the chat."));
        if (R.shared.length) R.ui.feed.append(h('div', { class: 'sys' }, `You both like ${R.shared.join(', ')}`));
      }
      R.game = m.game; renderGameLayer(); break;
    case 'join_error':
      if (m.code === 'taken' && R.create) { R.code = newCode(); conn.close(); renderTop(); connect(); break; }
      toast(m.text, 3600); home(); break;
    case 'users': R.users = m.users; renderTop(); emptyCard(); break;
    case 'msg': addMsg(m.m); break;
    case 'reacts': paintReacts(m.id, m.reacts); break;
    case 'vibe': { const v = $('#vibe'); if (v) v.textContent = m.vibe; break; }
    case 'typing': R.ui.typing.textContent = m.on ? `${m.name} is typing…` : ''; clearTimeout(R.hideT); R.hideT = setTimeout(() => { if (R) R.ui.typing.textContent = ''; }, 3000); break;
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
    case 'reported': toast('Thanks. Chat ended. Stay safe 💛', 3600); home(); break;
  }
}

function endChat(text) {
  if (!R || R.ended) return;
  R.ended = true; conn?.close();
  R.ui.input.disabled = true; R.ui.input.placeholder = 'Chat ended'; R.ui.gameHost.hidden = true; R.ui.pill.hidden = true;
  R.ui.feed.append(h('div', { class: 'end-card' }, h('div', { class: 'big-emoji' }, '👋'), h('h3', {}, text),
    h('button', { class: 'btn big pink', onclick: () => search({ pool: R.kind ? 'game:' + R.kind : 'chat', interests: store.interests || [] }) }, 'Find someone new'),
    h('button', { class: 'btn ghost', onclick: () => home() }, 'Back home')));
  R.ui.feed.scrollTop = R.ui.feed.scrollHeight;
}

// ── in-room games ────────────────────────────────────────────────────────────
function openPicker() {
  if (R.ended) return;
  if (R.game && R.game.phase !== 'done') { R.hidden = false; return renderGameLayer(); }
  const usable = k => !(R.random && GAMES[k].tier === 'spicy');
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Pick a game 🎮'),
    R.random ? h('p', { class: 'sub' }, 'Your partner will get an invite first.') : null,
    h('h4', {}, 'For friends'), Object.keys(GAMES).filter(k => GAMES[k].group === 'friends').map(k => gameCard(k, () => { s.close(); conn?.send({ t: 'game_start', kind: k, rounds: 10 }); })),
    h('h4', {}, 'For couples 🔥'), Object.keys(GAMES).filter(k => GAMES[k].group === 'couples' && usable(k)).map(k => gameCard(k, () => { s.close(); conn?.send({ t: 'game_start', kind: k, rounds: 10 }); })),
    R.random ? h('p', { class: 'tiny' }, 'The spicy packs are for private rooms only.') : null,
    h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Close')));
}

function inviteSheet(m) {
  const g = GAMES[m.kind]; if (!g) return;
  buzz([20, 40, 20]);
  const s = sheet(h('div', { class: 'mode' }, h('div', { class: 'big-emoji' }, g.emoji), h('h3', {}, `${m.by} wants to play ${g.name}`), h('p', { class: 'sub' }, g.pitch),
    h('button', { class: 'btn big', onclick: () => { s.close(); conn?.send({ t: 'invite_reply', ok: true }); } }, "Let's play"),
    h('button', { class: 'btn ghost', onclick: () => { s.close(); conn?.send({ t: 'invite_reply', ok: false }); } }, 'Not now')));
}

function renderGameLayer() {
  const { ui } = R, g = R.game;
  if (!g) { ui.gameHost.hidden = true; ui.gameHost.replaceChildren(); ui.pill.hidden = true; R.picks = {}; return; }
  if (R.hidden && g.phase !== 'done') {
    ui.gameHost.hidden = true; ui.pill.hidden = false;
    ui.pill.textContent = R.unread ? `🎮 Back to game · ${R.unread} new` : '🎮 Back to game'; return;
  }
  R.unread = 0; R.hidden = false; ui.pill.hidden = true; ui.gameHost.hidden = false;
  const users = {}; R.users.forEach(u => { users[u.uid] = { name: u.name, emoji: u.emoji }; });
  ui.gameHost.replaceChildren(renderGame(g, {
    me: R.uid, users, picks: R.picks, exitLabel: R.random ? 'Back to chat' : 'Back to chat',
    pick: (i, c) => { R.picks[g.i] = c; conn?.send({ t: 'game_answer', i, choice: c }); renderGameLayer(); },
    next: i => conn?.send({ t: 'game_next', i }),
    end: () => { if (g.phase === 'done' || confirm('End the game for everyone?')) conn?.send({ t: 'game_end' }); },
    again: () => conn?.send({ t: 'game_start', kind: g.kind, rounds: 10 }),
    play: k => { conn?.send({ t: 'game_end' }); conn?.send({ t: 'game_start', kind: k, rounds: 10 }); },
    allow: k => !(R.random && GAMES[k].tier === 'spicy'),
    chat: () => { R.hidden = true; renderGameLayer(); },
  }));
  if (g.phase === 'done') {
    const key = `${g.kind}:${g.result.pct}:${g.total}`;
    if (R.doneKey !== key) { R.doneKey = key; bump('games'); award('first_game'); if (g.result.pct === 100) award('perfect'); if (new Date().getHours() < 5) award('night'); }
  }
}

// ── profile + privacy ────────────────────────────────────────────────────────
function openStuff() {
  let emoji = store.emoji;
  const input = h('input', { maxlength: 16, value: store.name, 'aria-label': 'Nickname' });
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Your stuff'),
    h('p', { class: 'sub' }, 'Saved on this device only. We never see it.'),
    emojiPicker(EMOJIS, emoji, e => { emoji = e; }), input,
    h('div', { class: 'stats' }, h('div', {}, h('b', {}, `🔥 ${store.streak || 0}`), h('small', {}, 'day streak')),
      h('div', {}, h('b', {}, String(store.games || 0)), h('small', {}, 'games')), h('div', {}, h('b', {}, String(store.chats || 0)), h('small', {}, 'chats'))),
    h('div', { class: 'badges' }, Object.entries(BADGES).map(([id, b]) => h('div', { class: 'badge' + (store.badges[id] ? ' on' : ''), title: b.d }, h('span', {}, store.badges[id] ? b.e : '🔒'), h('small', {}, b.t), h('i', {}, b.d)))),
    h('button', { class: 'btn big', onclick: () => { store.name = input.value.trim().slice(0, 16) || store.name; store.emoji = emoji; save(); s.close(); home(); } }, 'Save'),
    h('button', { class: 'link danger', onclick: () => { if (confirm('Erase your nickname, streak and badges from this device?')) { resetAll(); s.close(); onboard(); } } }, 'Erase everything on this device')));
}

function openPrivacy() {
  const li = (e, t, d) => h('div', { class: 'pv' }, h('span', {}, e), h('div', {}, h('b', {}, t), h('small', {}, d)));
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, 'Privacy & safety 🛡️'),
    li('💨', 'Nothing is saved', 'Messages and answers exist only in memory while a room is open. When everyone leaves, they are gone. No database, no accounts, no ads, no analytics.'),
    li('📱', 'Your profile stays on your phone', 'Nickname, avatar, streak and badges live in your browser. Erase them anytime.'),
    li('🎭', 'Strangers stay strangers', "Random chats block links, phone numbers and emails. Skip or report anyone. Reports end the chat and trigger a short time-out for repeat offenders, tracked anonymously in memory with no chat content."),
    li('🔞', '18+ only', 'We ask you to confirm your age but cannot verify it. The spicy packs only work in private rooms, never with strangers.'),
    li('🔓', 'Honest limit', 'Chats are not end-to-end encrypted: the server relays them in memory. Never share anything you would not say out loud.'),
    h('button', { class: 'btn big', onclick: () => s.close() }, 'Got it')));
}

// ── boot ─────────────────────────────────────────────────────────────────────
touchStreak();
const r = new URLSearchParams(location.search).get('r');
if (r) { history.replaceState({}, '', location.pathname); if (/^[A-Za-z]{4,5}$/.test(r)) pendingCode = r.toUpperCase(); }
if (!store.adult) onboard(); else afterOnboard();
