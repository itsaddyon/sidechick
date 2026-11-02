// One Durable Object = one live room (max 2 people). Everything lives in memory only: no storage, no logs.
// When the last person leaves (or the room goes idle) the object clears itself. Poof.
import { Game } from '../public/shared/engine.js';
import { GAMES } from '../public/shared/questions.js';

const MAX_USERS = 2;
const IDLE_MS = 10 * 60 * 1000, MAX_LIFE_MS = 3 * 60 * 60 * 1000, EMPTY_MS = 60 * 1000;
const MAX_HISTORY = 120, REACTS = ['❤️', '😂', '🔥', '👍', '😮'];
const PHOTO_PREFIX = 'data:image/jpeg;base64,', PHOTO_MAX = 800_000, PHOTO_UNOPENED_MS = 10 * 60 * 1000, MAX_PENDING_PHOTOS = 4;

const THREAT = /\b(i('ll| will) kill you|kill yourself|kys|i know where you live|i will find you|rape you)\b/i;
const LINK = /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|net|org|io|me|ly|gg|xyz|co)\b/i;   // random chats only
const VIBES = [
  ['laugh', ['lol', 'lmao', 'haha', 'hehe', '😂', '🤣', '💀', 'rofl']],
  ['love', ['love', 'miss you', 'miss u', 'cute', '❤', '😍', '🥰']],
  ['sad', ['sad', 'cry', 'hurt', 'lonely', '😢', '😭', '🥺']],
  ['angry', ['angry', 'hate', 'annoying', 'ugh', '😡', '🤬']],
  ['hype', ['wow', 'omg', 'insane', 'crazy', 'fire', '🔥', 'yaaas']],
];

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const uid8 = () => crypto.randomUUID().slice(0, 8);

export class Room {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.r = null; }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/init') {                       // called by the matchmaker for random rooms
      if (this.r) return new Response('taken', { status: 409 });
      this.create(await request.json());
      return new Response('ok');
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const conn = { ws: server, uid: null, code: url.pathname.split('/').pop(), ip: request.headers.get('x-ip') || '' };
    server.addEventListener('message', ev => this.onMessage(conn, ev.data));
    server.addEventListener('close', () => this.onClose(conn));
    server.addEventListener('error', () => this.onClose(conn));
    return new Response(null, { status: 101, webSocket: client });
  }

  // ── lifecycle ────────────────────────────────────────────────────────────
  create(o) {
    const now = Date.now();
    this.r = { code: o.code, mode: o.mode, token: o.token || null, kind: GAMES[o.kind] ? o.kind : null, rounds: o.rounds || 10,
               autoInvite: GAMES[o.invite?.kind] ? o.invite : null,          // { kind, cid }: a waiting stranger asked for a game
               users: new Map(), history: [], photos: new Map(), nextId: 0, game: null, invite: null, created: now, last: now, timer: null };
    this.r.timer = setInterval(() => {
      const r = this.r; if (!r) return;
      const t = Date.now();
      if ((!r.users.size && t - r.created > EMPTY_MS) || t - r.last > IDLE_MS || t - r.created > MAX_LIFE_MS) return this.destroy('Room closed.');
      for (const [id, p] of r.photos) if (p.data && t - p.at > PHOTO_UNOPENED_MS) this.setPhotoState(id, 'gone');
    }, 15000);
  }

  destroy(text) {
    const r = this.r; if (!r) return;
    clearInterval(r.timer); r.photos.clear();
    for (const u of r.users.values()) { this.send(u, { t: 'closed', text }); try { u.ws.close(1000, 'closed'); } catch {} }
    this.r = null;
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  send(u, o) { try { (u.ws || u).send(JSON.stringify(o)); } catch {} }
  all(o, except) { if (this.r) for (const u of this.r.users.values()) if (u !== except) this.send(u, o); }
  isRandom() { return this.r.mode === 'random' || this.r.mode === 'gamerandom'; }
  usersView() { return [...this.r.users.values()].map(u => ({ uid: u.uid, name: u.name, av: u.av })); }
  usersMap() { const m = {}; for (const u of this.r.users.values()) m[u.uid] = { name: u.name, av: u.av }; return m; }
  present() { return [...this.r.users.keys()]; }
  gameView() { const r = this.r; return r.game ? r.game.view(this.usersMap(), this.present()) : null; }
  pushGame() { if (this.r) this.all({ t: 'game', game: this.gameView() }); }
  vibe() {
    const tally = {};
    for (const m of this.r.history.slice(-8)) {
      if (m.sys || m.photo) continue;
      const t = m.text.toLowerCase();
      for (const [id, words] of VIBES) if (words.some(w => t.includes(w))) tally[id] = (tally[id] || 0) + 1;
    }
    const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : 'calm';
  }
  pushHistory(m) {
    const r = this.r; m.id = ++r.nextId; m.ts = Date.now();
    r.history.push(m); if (r.history.length > MAX_HISTORY) r.history.shift();
    this.all({ t: 'msg', m });
    return m;
  }
  sys(text) { if (this.r && !this.isRandom()) this.pushHistory({ sys: true, text }); }

  // ── incoming ─────────────────────────────────────────────────────────────
  onMessage(conn, raw) {
    if (typeof raw !== 'string' || raw.length > 1_000_000) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (raw.length > 4000 && m.t !== 'photo') return;
    if (m.t === 'ping') return this.send(conn, { t: 'pong' });
    if (!conn.uid) return m.t === 'join' ? this.onJoin(conn, m) : undefined;
    const r = this.r; const u = r?.users.get(conn.uid); if (!u) return;
    switch (m.t) {
      case 'msg': return this.onChat(u, m);
      case 'typing': return this.all({ t: 'typing', uid: u.uid, name: u.name, on: !!m.on }, u);
      case 'react': return this.onReact(u, m);
      case 'photo': return this.onPhoto(u, m);
      case 'photo_open': return this.onPhotoOpen(u, m);
      case 'game_start': return this.onGameStart(u, m);
      case 'game_invite': return this.onInvite(u, m);
      case 'invite_reply': return this.onInviteReply(u, m);
      case 'game_answer': return this.onAnswer(u, m);
      case 'game_next': return this.onNext(u, m);
      case 'game_end': r.game = null; r.last = Date.now(); return this.pushGame();
      case 'report': return this.onReport(u);
    }
  }

  onJoin(conn, m) {
    const fail = (text, code) => { this.send(conn, { t: 'join_error', text, code }); try { conn.ws.close(1000); } catch {} };
    if (m.adult !== true) return fail('Sidechick is for 18+ only.', 'adult');
    if (m.create) {
      if (this.r) return fail('That code is taken. Try again.', 'taken');
      const mode = m.mode === 'game' ? 'game' : 'private';
      this.create({ code: conn.code, mode, kind: mode === 'game' ? m.kind : null, rounds: m.rounds });
    } else if (!this.r) return fail('No room with that code. Check it and try again.', 'missing');
    const r = this.r;
    if (this.isRandom() && (!r.token || m.token !== r.token)) return fail('No room with that code. Check it and try again.', 'missing');
    if (r.users.size >= MAX_USERS) return fail('That room already has two people.', 'full');
    let name = clean(m.name, 16) || 'Guest', n = 2;
    const taken = new Set([...r.users.values()].map(x => x.name.toLowerCase()));
    const base = name; while (taken.has(name.toLowerCase())) name = `${base} ${n++}`;
    const u = { uid: uid8(), ws: conn.ws, name, av: /^a\d{1,2}$/.test(m.av) ? m.av : 'a0', cid: clean(m.cid, 40), ip: conn.ip, last: 0, lastPhoto: 0, stamps: [] };
    conn.uid = u.uid; r.users.set(u.uid, u); r.last = Date.now();
    this.send(u, { t: 'joined', room: r.code, mode: r.mode, kind: r.kind, you: u.uid, users: this.usersView(),
                   history: r.history, game: this.gameView(), vibe: this.vibe(), photos: !this.isRandom() });
    this.all({ t: 'users', users: this.usersView() });
    this.sys(`${name} joined`);
    if (!r.game && r.kind && r.users.size >= 2 && (r.mode === 'game' || r.mode === 'gamerandom')) this.startGame(r.kind, r.rounds);
    else if (r.autoInvite && r.users.size >= 2 && !r.game) {
      const from = [...r.users.values()].find(x => x.cid && x.cid === r.autoInvite.cid), to = [...r.users.values()].find(x => x !== from);
      if (from && to) { r.invite = { kind: r.autoInvite.kind, rounds: 10, from: from.uid }; this.send(to, { t: 'invite', kind: r.autoInvite.kind, by: from.name, from: from.uid }); this.send(from, { t: 'toast', text: 'Game invite sent.' }); }
      r.autoInvite = null;
    }
  }

  onClose(conn) {
    const r = this.r; if (!r || !conn.uid) return;
    const u = r.users.get(conn.uid); if (!u) return;
    r.users.delete(u.uid); conn.uid = null;
    if (this.isRandom()) {                                   // stranger chats end for both
      this.all({ t: 'peer_left', name: u.name });
      setTimeout(() => this.destroy('Chat ended.'), 400);
      return;
    }
    if (!r.users.size) return this.destroy();
    this.sys(`${u.name} left`);
    this.all({ t: 'users', users: this.usersView() });
    if (r.game) { if (r.game.check(this.present()) === 'abort') { r.game = null; this.all({ t: 'toast', text: 'Game ended. You need two people to play.' }); } this.pushGame(); }
  }

  onChat(u, m) {
    const r = this.r, now = Date.now();
    const text = clean(m.text, 500); if (!text) return;
    u.stamps = u.stamps.filter(t => now - t < 60000);
    if (now - u.last < 250 || u.stamps.length >= 60) return;
    u.last = now; u.stamps.push(now);
    if (THREAT.test(text)) return this.send(u, { t: 'toast', text: "Not sent. Threats aren't okay here." });
    if (this.isRandom() && LINK.test(text)) return this.send(u, { t: 'toast', text: "Not sent. Links aren't allowed in random chats." });
    r.last = now;
    this.pushHistory({ sid: u.uid, name: u.name, av: u.av, text, reacts: {} });
    this.all({ t: 'vibe', vibe: this.vibe() });
  }

  onReact(u, m) {
    const r = this.r; if (!REACTS.includes(m.emoji)) return;
    const msg = r.history.find(x => x.id === m.id && !x.sys); if (!msg) return;
    const who = (msg.reacts[m.emoji] ||= []);
    const k = who.indexOf(u.uid); if (k >= 0) who.splice(k, 1); else who.push(u.uid);
    if (!who.length) delete msg.reacts[m.emoji];
    this.all({ t: 'reacts', id: msg.id, reacts: msg.reacts });
  }

  // ── view-once photos (private rooms only) ────────────────────────────────
  // The picture lives in memory until the other person opens it, is sent to them once, then is deleted here.
  onPhoto(u, m) {
    const r = this.r, now = Date.now();
    if (this.isRandom()) return this.send(u, { t: 'toast', text: 'Photos are only available in private rooms.' });
    if (r.users.size < 2) return this.send(u, { t: 'toast', text: 'Wait for the other person to join first.' });
    const data = String(m.data || '');
    if (!data.startsWith(PHOTO_PREFIX) || data.length > PHOTO_MAX || !/^[A-Za-z0-9+/=]+$/.test(data.slice(PHOTO_PREFIX.length)))
      return this.send(u, { t: 'toast', text: "That photo couldn't be sent." });
    if (now - u.lastPhoto < 4000) return this.send(u, { t: 'toast', text: 'One photo at a time.' });
    if ([...r.photos.values()].filter(p => p.data).length >= MAX_PENDING_PHOTOS) return this.send(u, { t: 'toast', text: 'Too many unopened photos. Let them look first.' });
    u.lastPhoto = now; r.last = now;
    const secs = Math.min(30, Math.max(3, Math.round(Number(m.secs)) || 10));
    const msg = this.pushHistory({ photo: true, sid: u.uid, name: u.name, av: u.av, state: 'sent', secs, reacts: {} });
    r.photos.set(msg.id, { from: u.uid, data, secs, at: now });
  }
  onPhotoOpen(u, m) {
    const r = this.r, p = r.photos.get(m.id);
    if (!p || !p.data) return this.send(u, { t: 'toast', text: 'That photo is gone.' });
    if (p.from === u.uid) return this.send(u, { t: 'toast', text: 'You sent this one. Only they can open it.' });
    this.send(u, { t: 'photo_data', id: m.id, data: p.data, secs: p.secs });
    p.data = null;                                            // delete our copy right now
    this.setPhotoState(m.id, 'opened');
    setTimeout(() => this.setPhotoState(m.id, 'gone'), (p.secs + 4) * 1000);
  }
  setPhotoState(id, state) {
    const r = this.r; if (!r) return;
    const msg = r.history.find(x => x.id === id); if (msg) msg.state = state;
    if (state === 'gone') { const p = r.photos.get(id); if (p) p.data = null; r.photos.delete(id); }
    this.all({ t: 'photo_state', id, state });
  }

  // ── games ────────────────────────────────────────────────────────────────
  startGame(kind, rounds) {
    const r = this.r; r.last = Date.now();
    r.game = new Game(kind, this.present(), { rounds });
    this.sys(`${GAMES[kind].name} started`);
    this.pushGame();
  }
  onGameStart(u, m) {
    const r = this.r;
    if (!GAMES[m.kind]) return this.send(u, { t: 'toast', text: 'Unknown game.' });
    if (this.isRandom()) return this.onInvite(u, m);          // strangers must agree first
    if (r.game && r.game.phase !== 'done') return this.send(u, { t: 'toast', text: 'A game is already running.' });
    if (r.users.size < 2) return this.send(u, { t: 'toast', text: 'You need one more person to play.' });
    this.startGame(m.kind, m.rounds);
  }
  onInvite(u, m) {
    const r = this.r;
    if (!GAMES[m.kind]) return this.send(u, { t: 'toast', text: 'Unknown game.' });
    if (r.game && r.game.phase !== 'done') return this.send(u, { t: 'toast', text: 'A game is already running.' });
    if (r.users.size < 2) return this.send(u, { t: 'toast', text: 'Waiting for someone to join first.' });
    r.invite = { kind: m.kind, rounds: m.rounds, from: u.uid };
    this.all({ t: 'invite', kind: m.kind, by: u.name, from: u.uid }, u);
    this.send(u, { t: 'toast', text: 'Invite sent.' });
  }
  onInviteReply(u, m) {
    const r = this.r, inv = r.invite; if (!inv || inv.from === u.uid) return;
    r.invite = null;
    if (m.ok) return this.startGame(inv.kind, inv.rounds);
    const from = r.users.get(inv.from); if (from) this.send(from, { t: 'toast', text: 'They passed on the game for now.' });
  }
  onAnswer(u, m) {
    const g = this.r.game; if (!g) return;
    this.r.last = Date.now();
    this.afterGame(g.submit(u.uid, m.i, m.choice, this.present()));
  }
  onNext(u, m) {
    const g = this.r.game; if (!g) return;
    this.afterGame(g.next(m.i, this.present()));
  }
  afterGame(res) {
    const r = this.r; if (!r?.game || res === 'noop') return;
    if (res === 'abort') { r.game = null; this.all({ t: 'toast', text: 'Game ended. You need two people to play.' }); }
    this.pushGame();
  }

  // ── safety ───────────────────────────────────────────────────────────────
  async onReport(u) {
    const r = this.r; if (!this.isRandom()) return;
    const other = [...r.users.values()].find(x => x.uid !== u.uid);
    if (other) {
      try {
        await this.env.MATCH.get(this.env.MATCH.idFromName('global')).fetch('https://m/strike', {
          method: 'POST', body: JSON.stringify({ cid: other.cid, ip: other.ip }) });
      } catch {}
    }
    this.send(u, { t: 'reported' });
    if (other) this.send(other, { t: 'closed', text: 'Chat ended.' });
    setTimeout(() => this.destroy('Chat ended.'), 300);
  }
}
