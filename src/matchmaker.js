// Single global Durable Object that pairs up strangers. In-memory only.
import { GAMES } from '../public/shared/questions.js';

const CODE_CHARS = 'BCDFGHJKLMNPQRSTVWXZ';
const PATIENCE_MS = 6000, MAX_WAIT_MS = 5 * 60 * 1000, RECENT_MS = 3 * 60 * 1000;
const STRIKE_WINDOW = 60 * 60 * 1000, COOLDOWN_MS = 30 * 60 * 1000;
const makeCode = n => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export class Matchmaker {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env; this.q = []; this.timer = null; this.busy = false;
    this.strikes = new Map(); this.cool = new Map(); this.recent = new Map(); this.rates = new Map();
    this.qotd = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/stats') {
      this.cleanQueue();
      return Response.json({ waiting: this.q.length });
    }
    if (url.pathname === '/qotd') {
      if (request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        return Response.json(await this.voteQotd(body));
      }
      const day = Number(url.searchParams.get('day')) || Math.floor(Date.now() / 864e5);
      return Response.json(await this.getQotd(day));
    }
    if (url.pathname === '/rate') {                                  // tiny rate limiter for the feedback form: 3 per 10 min
      const k = url.searchParams.get('k') || '', now = Date.now(), list = (this.rates.get(k) || []).filter(t => now - t < 600000), ok = list.length < 3;
      if (ok) list.push(now);
      this.rates.set(k, list);
      for (const [kk, l] of this.rates) if (!l.some(t => now - t < 600000)) this.rates.delete(kk);
      return Response.json({ ok });
    }
    if (url.pathname === '/strike' && request.method === 'POST') {
      const { cid, ip } = await request.json();
      if (cid) this.strike(cid, 3);
      if (ip) this.strike('ip:' + ip, 10);        // higher bar: campus Wi-Fi shares one IP
      return new Response('ok');
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const conn = { ws: server, ip: request.headers.get('x-ip') || '' };
    server.addEventListener('message', ev => this.onMessage(conn, ev.data));
    server.addEventListener('close', () => this.drop(conn));
    server.addEventListener('error', () => this.drop(conn));
    return new Response(null, { status: 101, webSocket: client });
  }

  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch {} }

  strike(key, limit) {
    const now = Date.now();
    const list = (this.strikes.get(key) || []).filter(t => now - t < STRIKE_WINDOW); list.push(now);
    this.strikes.set(key, list);
    if (list.length >= limit) this.cool.set(key, now + COOLDOWN_MS);
  }
  cooling(e) {
    const now = Date.now();
    const until = Math.max(this.cool.get(e.cid) || 0, this.cool.get('ip:' + e.ip) || 0);
    return until > now ? Math.ceil((until - now) / 60000) : 0;
  }

  onMessage(conn, raw) {
    if (typeof raw !== 'string' || raw.length > 2000) return;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (conn.entry) conn.entry.lastSeen = Date.now();
    if (m.t === 'ping') return this.send(conn.ws, { t: 'pong' });
    if (m.t === 'cancel') return this.drop(conn);
    if (m.t !== 'find') return;
    if (m.adult !== true) return this.send(conn.ws, { t: 'error', text: 'Sidechick is for 18+ only.' });
    let pool = 'chat';
    if (typeof m.pool === 'string' && m.pool.startsWith('game:')) {
      const kind = m.pool.slice(5);
      if (!GAMES[kind]) return this.send(conn.ws, { t: 'error', text: 'Unknown game.' });
      pool = m.pool;
    }
    const interests = new Set((Array.isArray(m.interests) ? m.interests : []).slice(0, 5).map(s => String(s).slice(0, 24)));
    this.drop(conn);
    const now = Date.now();
    const e = { ws: conn.ws, conn, ip: conn.ip, cid: String(m.cid || '').slice(0, 40) || 'anon-' + Math.random(), pool, interests, since: now, lastSeen: now };
    const mins = this.cooling(e);
    if (mins) { this.send(conn.ws, { t: 'cooldown', minutes: mins }); try { conn.ws.close(1000); } catch {} return; }
    this.q.push(e); conn.entry = e;
    this.send(conn.ws, { t: 'waiting' });
    if (!this.timer) this.timer = setInterval(() => this.tick(), 2000);
    this.tick();
  }

  cleanQueue() {
    const now = Date.now();
    this.q = this.q.filter(e => {
      if (now - e.since > MAX_WAIT_MS) {
        try { e.ws.close(1000); } catch {}
        if (e.conn) e.conn.entry = null;
        return false;
      }
      if (typeof e.ws.readyState === 'number' && e.ws.readyState > 1) {
        if (e.conn) e.conn.entry = null;
        return false;
      }
      if (e.lastSeen && now - e.lastSeen > 14000) {
        try { e.ws.close(1000); } catch {}
        if (e.conn) e.conn.entry = null;
        return false;
      }
      return true;
    });
    this.stopIfEmpty();
  }

  drop(conn) {
    if (conn.entry) { this.q = this.q.filter(x => x !== conn.entry); conn.entry = null; }
    this.stopIfEmpty();
  }
  stopIfEmpty() { if (!this.q.length && this.timer) { clearInterval(this.timer); this.timer = null; } }

  async getQotd(day) {
    let data = this.qotd.get(day);
    if (!data && this.ctx?.storage) {
      data = await this.ctx.storage.get(`qotd:${day}`);
      if (data) this.qotd.set(day, data);
    }
    if (!data) data = { counts: {}, total: 0 };
    return { day, counts: data.counts || {}, total: data.total || 0 };
  }

  async voteQotd({ day, choice, cid }) {
    day = Number(day) || Math.floor(Date.now() / 864e5);
    choice = Number(choice);
    if (isNaN(choice) || choice < 0 || choice > 10) return { ok: false, error: 'bad choice' };
    const voterKey = String(cid || '').slice(0, 40) || 'anon';
    let data = this.qotd.get(day);
    if (!data && this.ctx?.storage) {
      data = await this.ctx.storage.get(`qotd:${day}`);
    }
    if (!data) data = { counts: {}, voters: {}, total: 0 };
    data.counts ||= {};
    data.voters ||= {};

    const prevChoice = data.voters[voterKey];
    if (prevChoice === choice) {
      return { ok: true, day, counts: data.counts, total: data.total, yourChoice: choice };
    }

    if (typeof prevChoice === 'number' && data.counts[prevChoice]) {
      data.counts[prevChoice] = Math.max(0, data.counts[prevChoice] - 1);
    } else {
      data.total = (data.total || 0) + 1;
    }

    data.counts[choice] = (data.counts[choice] || 0) + 1;
    data.voters[voterKey] = choice;

    this.qotd.set(day, data);
    if (this.ctx?.storage) {
      this.ctx.storage.put(`qotd:${day}`, data).catch(() => {});
    }

    return { ok: true, day, counts: data.counts, total: data.total, yourChoice: choice };
  }

  met(a, b) {
    const t = this.recent.get(a.cid + '|' + b.cid) || this.recent.get(b.cid + '|' + a.cid);
    return !!t && t > Date.now();
  }

  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      this.cleanQueue();
      const now = Date.now();
      for (let guard = 0; guard < 50; guard++) {
        let best = null;
        for (let i = 0; i < this.q.length; i++) for (let j = i + 1; j < this.q.length; j++) {
          const a = this.q[i], b = this.q[j];
          if (a.cid === b.cid || this.met(a, b)) continue;
          const shared = [...a.interests].filter(x => b.interests.has(x));
          const eager = a.pool !== 'chat' || b.pool !== 'chat' || (!a.interests.size && !b.interests.size) ||
                        now - a.since >= PATIENCE_MS || now - b.since >= PATIENCE_MS;
          if (!shared.length && !eager) continue;
          const score = shared.length * 1000 + Math.min(now - a.since, now - b.since) / 1000;
          if (!best || score > best.score) best = { a, b, shared, score };
        }
        if (!best) break;
        if (!(await this.pair(best.a, best.b, best.shared))) break;
      }
    } finally { this.busy = false; this.stopIfEmpty(); }
  }

  async pair(a, b, shared) {
    // Same game on both sides: straight into the game. Otherwise it's a normal chat, and whoever asked for a
    // game (the one who has waited longest, if both did) sends the other an invite as soon as both are inside.
    const ka = a.pool === 'chat' ? null : a.pool.slice(5), kb = b.pool === 'chat' ? null : b.pool.slice(5);
    const kind = ka && ka === kb ? ka : null;
    const inviter = kind ? null : (ka && kb ? (a.since <= b.since ? a : b) : ka ? a : kb ? b : null);
    const invite = inviter ? { kind: inviter.pool.slice(5), cid: inviter.cid } : null;
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    for (let tries = 0; tries < 4; tries++) {
      const code = makeCode(5);
      const stub = this.env.ROOM.get(this.env.ROOM.idFromName(code));
      let res;
      try { res = await stub.fetch('https://room/init', { method: 'POST', body: JSON.stringify({ code, token, mode: kind ? 'gamerandom' : 'random', kind, invite, rounds: 10 }) }); }
      catch { return false; }
      if (res.status === 409) continue;
      this.q = this.q.filter(x => x !== a && x !== b); a.conn.entry = b.conn.entry = null;
      this.recent.set(a.cid + '|' + b.cid, Date.now() + RECENT_MS);
      for (const [k, t] of this.recent) if (t < Date.now()) this.recent.delete(k);
      for (const e of [a, b]) {
        this.send(e.ws, { t: 'matched', room: code, token, kind, shared, invite: invite?.kind || null, inviter: inviter === e });
        try { e.ws.close(1000); } catch {}
      }
      return true;
    }
    return false;
  }
}
