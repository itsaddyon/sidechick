// Single global Durable Object that pairs up strangers. In-memory only.
import { GAMES } from '../public/shared/questions.js';

const CODE_CHARS = 'BCDFGHJKLMNPQRSTVWXZ';
const PATIENCE_MS = 6000, MAX_WAIT_MS = 5 * 60 * 1000, RECENT_MS = 3 * 60 * 1000;
const STRIKE_WINDOW = 60 * 60 * 1000, COOLDOWN_MS = 30 * 60 * 1000;
const makeCode = n => Array.from({ length: n }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

export class Matchmaker {
  constructor(ctx, env) {
    this.env = env; this.q = []; this.timer = null; this.busy = false;
    this.strikes = new Map(); this.cool = new Map(); this.recent = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/stats') return Response.json({ waiting: this.q.length });
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
    const e = { ws: conn.ws, conn, ip: conn.ip, cid: String(m.cid || '').slice(0, 40) || 'anon-' + Math.random(), pool, interests, since: Date.now() };
    const mins = this.cooling(e);
    if (mins) { this.send(conn.ws, { t: 'cooldown', minutes: mins }); try { conn.ws.close(1000); } catch {} return; }
    this.q.push(e); conn.entry = e;
    this.send(conn.ws, { t: 'waiting' });
    if (!this.timer) this.timer = setInterval(() => this.tick(), 2000);
    this.tick();
  }

  drop(conn) {
    if (conn.entry) { this.q = this.q.filter(x => x !== conn.entry); conn.entry = null; }
    this.stopIfEmpty();
  }
  stopIfEmpty() { if (!this.q.length && this.timer) { clearInterval(this.timer); this.timer = null; } }

  met(a, b) {
    const t = this.recent.get(a.cid + '|' + b.cid) || this.recent.get(b.cid + '|' + a.cid);
    return !!t && t > Date.now();
  }

  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const now = Date.now();
      for (const e of this.q.filter(x => now - x.since > MAX_WAIT_MS)) {       // give up on very old waiters
        this.send(e.ws, { t: 'timeout' }); try { e.ws.close(1000); } catch {} this.drop(e.conn);
      }
      for (let guard = 0; guard < 50; guard++) {
        let best = null;
        for (let i = 0; i < this.q.length; i++) for (let j = i + 1; j < this.q.length; j++) {
          const a = this.q[i], b = this.q[j];
          if (a.pool !== b.pool || a.cid === b.cid || this.met(a, b)) continue;
          const shared = [...a.interests].filter(x => b.interests.has(x));
          const eager = a.pool !== 'chat' || (!a.interests.size && !b.interests.size) ||
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
    const kind = a.pool === 'chat' ? null : a.pool.slice(5);
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    for (let tries = 0; tries < 4; tries++) {
      const code = makeCode(5);
      const stub = this.env.ROOM.get(this.env.ROOM.idFromName(code));
      let res;
      try { res = await stub.fetch('https://room/init', { method: 'POST', body: JSON.stringify({ code, token, mode: kind ? 'gamerandom' : 'random', kind, rounds: 10 }) }); }
      catch { return false; }
      if (res.status === 409) continue;
      this.q = this.q.filter(x => x !== a && x !== b); a.conn.entry = b.conn.entry = null;
      this.recent.set(a.cid + '|' + b.cid, Date.now() + RECENT_MS);
      for (const [k, t] of this.recent) if (t < Date.now()) this.recent.delete(k);
      for (const e of [a, b]) {
        this.send(e.ws, { t: 'matched', room: code, token, kind, shared });
        try { e.ws.close(1000); } catch {}
      }
      return true;
    }
    return false;
  }
}
