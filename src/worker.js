import { Room } from './room.js';
import { Matchmaker } from './matchmaker.js';
export { Room, Matchmaker };

const CODE_RE = /^[BCDFGHJKLMNPQRSTVWXZ]{4,5}$/;
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
  "img-src 'self' data:; connect-src 'self' wss: ws:; manifest-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
const SECURITY = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'content-security-policy': CSP };

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
    const p = url.pathname;
    if (p.startsWith('/ws/')) return ws(request, env, url);
    if (p === '/api/stats') {
      const r = await env.MATCH.get(env.MATCH.idFromName('global')).fetch('https://m/stats');
      return new Response(r.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    if (p === '/api/health') return Response.json({ ok: true });
    if (p === '/robots.txt')
      return new Response(`User-agent: *\nAllow: /\nDisallow: /ws/\nDisallow: /api/\n\nSitemap: ${url.origin}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
    if (p === '/sitemap.xml')
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${url.origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>\n`,
        { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
    if (p === '/') {                                           // fill in absolute URLs for canonical + social previews
      const res = await env.ASSETS.fetch(request);
      const html = (await res.text()).replaceAll('__ORIGIN__', url.origin);
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', ...SECURITY } });
    }
    return env.ASSETS.fetch(request);
  },
};
