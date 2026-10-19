// One Durable Object = one live room. Everything lives in memory only: no storage, no logs.
// When the last person leaves (or the room goes idle) the object clears itself. Poof.
import { Game } from '../public/shared/engine.js';
import { GAMES, ICEBREAKERS } from '../public/shared/questions.js';

const MAX_USERS = { private: 8, game: 8, random: 2, gamerandom: 2 };
const IDLE_MS = 10 * 60 * 1000, MAX_LIFE_MS = 3 * 60 * 60 * 1000, EMPTY_MS = 60 * 1000;
const MAX_HISTORY = 120, REACTS = ['❤️', '😂', '🔥', '👍', '😮'];

const THREAT = /\b(i('ll| will) kill you|kill yourself|kys|i know where you live|i will find you|rape you)\b/i;
const STRANGER_BLOCKS = [
  [/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|net|org|io|me|ly|gg|xyz|co)\b/i, "Links aren't allowed in random chats."],
  [/\b\d[\d\s-]{8,}\d\b/, "Phone numbers aren't allowed in random chats."],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, "Emails aren't allowed in random chats."],
  [/\b(nudes?|send pics|dick ?pic|horny|sex ?chat)\b/i, 'Keep it clean with strangers.'],
];
const VIBES = [
  ['😂', ['lol', 'lmao', 'haha', 'hehe', '😂', '🤣', '💀', 'rofl']],
  ['😍', ['love', 'miss you', 'miss u', 'cute', '❤', '😍', '🥰']],
  ['😢', ['sad', 'cry', 'hurt', 'lonely', '😢', '😭', '🥺']],
  ['😡', ['angry', 'hate', 'annoying', 'ugh', '😡', '🤬']],
  ['🔥', ['wow', 'omg', 'insane', 'crazy', 'fire', '🔥', 'yaaas']],
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
    this.r = { code: o.code, mode: o.mode, kind: GAMES[o.kind] ? o.kind : null, rounds: o.rounds || 10,
               users: new Map(), history: [], nextId: 0, game: null, invite: null, created: now, last: now, sparkAt: 0, timer: null };
    this.r.timer = setInterval(() => {
      const r = this.r; if (!r) return;
      const t = Date.now();
      if ((!r.users.size && t - r.created > EMPTY_MS) || t - r.last > IDLE_MS || t - r.created > MAX_LIFE_MS) this.destroy('Room closed.');
    }, 15000);
  }

  destroy(text) {
    const r = this.r; if (!r) return;
    clearInterval(r.timer);
    for (const u of r.users.values()) { this.send(u, { t: 'closed', text }); try { u.ws.close(1000, 'closed'); } catch {} }
    this.r = null;
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  send(u, o) { try { (u.ws || u).send(JSON.stringify(o)); } catch {} }
  all(o, except) { if (this.r) for (const u of this.r.users.values()) if (u !== except) this.send(u, o); }
  isRandom() { return this.r.mode === 'random' || this.r.mode === 'gamerandom'; }
  usersView() { return [...this.r.users.values()].map(u => ({ uid: u.uid, name: u.name, emoji: u.emoji })); }
  usersMap() { const m = {}; for (const u of this.r.users.values()) m[u.uid] = { name: u.name, emoji: u.emoji }; return m; }
  present() { return [...this.r.users.keys()]; }
  gameView() { const r = this.r; return r.game ? r.game.view(this.usersMap(), this.present()) : null; }
  pushGame() { if (this.r) this.all({ t: 'game', game: this.gameView() }); }
  vibe() {
    const tally = {};
    for (const m of this.r.history.slice(-8)) {
      if (m.sys || m.spark) continue;
      const t = m.text.toLowerCase();
      for (const [e, words] of VIBES) if (words.some(w => t.includes(w))) tally[e] = (tally[e] || 0) + 1;
    }
    const best = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : '✨';
  }
  pushHistory(m) {
    const r = this.r; m.id = ++r.nextId; m.ts = Date.now();
    r.history.push(m); if (r.history.length > MAX_HISTORY) r.history.shift();
    this.all({ t: 'msg', m });
  }
  sys(text) { if (this.r && !this.isRandom()) this.pushHistory({ sys: true, text }); }

  // ── incoming ─────────────────────────────────────────────────────────────
  onMessage(conn, raw) {
    if (typeof raw !== 'string' || raw.length > 4000) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'ping') return this.send(conn, { t: 'pong' });
    if (!conn.uid) return m.t === 'join' ? this.onJoin(conn, m) : undefined;
    const r = this.r; const u = r?.users.get(conn.uid); if (!u) return;
    switch (m.t) {
      case 'msg': return this.onChat(u, m);
      case 'typing': return this.all({ t: 'typing', uid: u.uid, name: u.name, on: !!m.on }, u);
      case 'react': return this.onReact(u, m);
      case 'spark': return this.onSpark(u);
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
    if (r.users.size >= MAX_USERS[r.mode]) return fail('That room is full.', 'full');
    let name = clean(m.name, 16) || 'Guest', n = 2;
    const taken = new Set([...r.users.values()].map(x => x.name.toLowerCase()));
    const base = name; while (taken.has(name.toLowerCase())) name = `${base} ${n++}`;
    const u = { uid: uid8(), ws: conn.ws, name, emoji: clean(m.emoji, 8) || '😎', cid: clean(m.cid, 40), ip: conn.ip, last: 0, stamps: [] };
    conn.uid = u.uid; r.users.set(u.uid, u); r.last = Date.now();
    this.send(u, { t: 'joined', room: r.code, mode: r.mode, kind: r.kind, you: u.uid, users: this.usersView(),
                   history: r.history, game: this.gameView(), vibe: this.vibe() });
    this.all({ t: 'users', users: this.usersView() });
    this.sys(`${name} joined`);
    if (!r.game && r.kind && r.users.size >= 2 && (r.mode === 'game' || r.mode === 'gamerandom')) this.startGame(r.kind, r.rounds);
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
    if (r.game) { if (r.game.check(this.present()) === 'abort') { r.game = null; this.all({ t: 'toast', text: 'Game ended. You need at least 2 people.' }); } this.pushGame(); }
  }

  onChat(u, m) {
    const r = this.r, now = Date.now();
    const text = clean(m.text, 500); if (!text) return;
    u.stamps = u.stamps.filter(t => now - t < 60000);
    if (now - u.last < 250 || u.stamps.length >= 60) return;
    u.last = now; u.stamps.push(now);
    if (THREAT.test(text)) return this.send(u, { t: 'toast', text: "Not sent. Threats aren't okay here." });
    if (this.isRandom()) for (const [re, why] of STRANGER_BLOCKS) if (re.test(text)) return this.send(u, { t: 'toast', text: `Not sent. ${why}` });
    r.last = now;
    this.pushHistory({ sid: u.uid, name: u.name, emoji: u.emoji, text, reacts: {} });
    this.all({ t: 'vibe', vibe: this.vibe() });
  }

  onReact(u, m) {
    const r = this.r; if (!REACTS.includes(m.emoji)) return;
    const msg = r.history.find(x => x.id === m.id && !x.sys && !x.spark); if (!msg) return;
    const who = (msg.reacts[m.emoji] ||= []);
    const k = who.indexOf(u.uid); if (k >= 0) who.splice(k, 1); else who.push(u.uid);
    if (!who.length) delete msg.reacts[m.emoji];
    this.all({ t: 'reacts', id: msg.id, reacts: msg.reacts });
  }

  onSpark(u) {
    const r = this.r, now = Date.now();
    if (now - r.sparkAt < 4000) return this.send(u, { t: 'toast', text: 'Easy! One spark at a time ✨' });
    r.sparkAt = now; r.last = now;
    this.pushHistory({ spark: true, by: u.name, text: ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)] });
  }

  // ── games ────────────────────────────────────────────────────────────────
  allowed(kind) {
    if (!GAMES[kind]) return 'Unknown game.';
    if (this.isRandom() && GAMES[kind].tier === 'spicy') return 'That one is for private rooms only.';
    return null;
  }
  startGame(kind, rounds) {
    const r = this.r; r.last = Date.now();
    r.game = new Game(kind, this.present(), { rounds });
    this.sys(`${GAMES[kind].name} ${GAMES[kind].emoji} started`);
    this.pushGame();
  }
  onGameStart(u, m) {
    const r = this.r, why = this.allowed(m.kind);
    if (why) return this.send(u, { t: 'toast', text: why });
    if (this.isRandom()) return this.onInvite(u, m);          // strangers must agree first
    if (r.game && r.game.phase !== 'done') return this.send(u, { t: 'toast', text: 'A game is already running.' });
    if (r.users.size < 2) return this.send(u, { t: 'toast', text: 'Invite one more person to play 👯' });
    this.startGame(m.kind, m.rounds);
  }
  onInvite(u, m) {
    const r = this.r, why = this.allowed(m.kind);
    if (why) return this.send(u, { t: 'toast', text: why });
    if (r.game && r.game.phase !== 'done') return this.send(u, { t: 'toast', text: 'A game is already running.' });
    if (r.users.size < 2) return this.send(u, { t: 'toast', text: 'Waiting for someone to join first.' });
    r.invite = { kind: m.kind, rounds: m.rounds, from: u.uid };
    this.all({ t: 'invite', kind: m.kind, by: u.name, from: u.uid }, u);
    this.send(u, { t: 'toast', text: 'Invite sent 🎮' });
  }
  onInviteReply(u, m) {
    const r = this.r, inv = r.invite; if (!inv || inv.from === u.uid) return;
    r.invite = null;
    if (m.ok) return this.startGame(inv.kind, inv.rounds);
    const from = r.users.get(inv.from); if (from) this.send(from, { t: 'toast', text: 'They passed on the game. Maybe later 🙃' });
  }
  onAnswer(u, m) {
    const g = this.r.game; if (!g) return;
    this.r.last = Date.now();
    const res = g.submit(u.uid, m.i, m.choice, this.present());
    this.afterGame(res);
  }
  onNext(u, m) {
    const g = this.r.game; if (!g) return;
    this.afterGame(g.next(m.i, this.present()));
  }
  afterGame(res) {
    const r = this.r; if (!r?.game || res === 'noop') return;
    if (res === 'abort') { r.game = null; this.all({ t: 'toast', text: 'Game ended. You need at least 2 people.' }); }
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
