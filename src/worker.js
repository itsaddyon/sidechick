import { Room } from './room.js';
import { Matchmaker } from './matchmaker.js';
export { Room, Matchmaker };

const CODE_RE = /^[BCDFGHJKLMNPQRSTVWXZ]{4,5}$/;

async function ipHash(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || '0';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${env.SALT || 'sidechick'}`));
  return [...new Uint8Array(buf)].slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join('');   // short, one-way
}

async function ws(request, env, url) {
  if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== url.host && !(env.ALLOWED_ORIGINS || '').split(',').includes(origin))
    return new Response('Forbidden', { status: 403 });
  const req = new Request(request);
  req.headers.set('x-ip', await ipHash(request, env));
  if (url.pathname === '/ws/match') return env.MATCH.get(env.MATCH.idFromName('global')).fetch(req);
  const m = url.pathname.match(/^\/ws\/room\/([A-Za-z]+)$/);
  const code = m && m[1].toUpperCase();
  if (!code || !CODE_RE.test(code)) return new Response('Bad room code', { status: 400 });
  return env.ROOM.get(env.ROOM.idFromName(code)).fetch(req);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/ws/')) return ws(request, env, url);
    if (url.pathname === '/api/stats') {
      const r = await env.MATCH.get(env.MATCH.idFromName('global')).fetch('https://m/stats');
      return new Response(r.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    if (url.pathname === '/api/health') return Response.json({ ok: true });
    return env.ASSETS.fetch(request);
  },
};
