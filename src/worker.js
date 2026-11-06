import { Room } from './room.js';
import { Matchmaker } from './matchmaker.js';
export { Room, Matchmaker };

const CODE_RE = /^[BCDFGHJKLMNPQRSTVWXZ]{4,5}$/;
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; " +
  "img-src 'self' data: blob:; worker-src 'self'; connect-src 'self' wss: ws:; manifest-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
const SECURITY = { 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'content-security-policy': CSP };

async function ipHash(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || '0';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${ip}|${env.SALT || 'sidechick'}`));
  return [...new Uint8Array(buf)].slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join('');   // short, one-way
}

function isAllowedOrigin(origin, env, host) {
  if (!origin) return true;
  try {
    if (new URL(origin).host === host) return true;
  } catch {}
  if (!env.ALLOWED_ORIGINS) return false;
  const list = env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  return list.includes('*') || list.includes(origin);
}

function corsHeaders(request, env, host) {
  const origin = request.headers.get('Origin');
  if (!origin || !isAllowedOrigin(origin, env, host)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  };
}

async function ws(request, env, url) {
  if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected websocket', { status: 426 });
  const origin = request.headers.get('Origin');
  if (origin && !isAllowedOrigin(origin, env, url.host))
    return new Response('Forbidden', { status: 403 });
  const req = new Request(request);
  req.headers.set('x-ip', await ipHash(request, env));
  if (url.pathname === '/ws/match') return env.MATCH.get(env.MATCH.idFromName('global')).fetch(req);
  const m = url.pathname.match(/^\/ws\/room\/([A-Za-z]+)$/);
  const code = m && m[1].toUpperCase();
  if (!code || !CODE_RE.test(code)) return new Response('Bad room code', { status: 400 });
  return env.ROOM.get(env.ROOM.idFromName(code)).fetch(req);
}

const json = (o, status = 200, extra = {}) =>
  Response.json(o, { status, headers: { 'cache-control': 'no-store', ...extra } });
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').trim().slice(0, n);

// Suggestions go straight to the developer's Telegram bot. The bot token lives only here, as a Worker secret:
// it is never sent to the browser and never committed to the repo.
async function feedback(request, env, url, cors = {}) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405, cors);
  const origin = request.headers.get('Origin');
  if (origin && !isAllowedOrigin(origin, env, url.host)) return json({ error: 'forbidden' }, 403, cors);
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return json({ error: 'not_configured' }, 503, cors);
  let b; try { b = await request.json(); } catch { return json({ error: 'bad_request' }, 400, cors); }
  if (b.website) return json({ ok: true }, 200, cors);                                   // honeypot field: bots fill it, people never see it
  const kinds = { idea: 'Idea', bug: 'Bug', question: 'Question idea', other: 'Other' };
  const message = clean(b.message, 600), contact = clean(b.contact, 60);
  if (message.length < 5) return json({ error: 'too_short' }, 400, cors);
  const ip = await ipHash(request, env);
  const rl = await env.MATCH.get(env.MATCH.idFromName('global')).fetch('https://m/rate?k=' + ip).then(r => r.json()).catch(() => ({ ok: true }));
  if (!rl.ok) return json({ error: 'rate_limited' }, 429, cors);
  const text = `Sidechick feedback\nType: ${kinds[b.kind] || 'Other'}\n\n${message}${contact ? `\n\nContact: ${contact}` : ''}`;
  try {
    const r = await fetch(`${env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }) });
    return r.ok ? json({ ok: true }, 200, cors) : json({ error: 'upstream' }, 502, cors);
  } catch { return json({ error: 'upstream' }, 502, cors); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    const cors = corsHeaders(request, env, url.host);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (p.startsWith('/ws/')) return ws(request, env, url);
    if (p === '/api/stats') {
      const r = await env.MATCH.get(env.MATCH.idFromName('global')).fetch('https://m/stats');
      return new Response(r.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors } });
    }
    if (p === '/api/qotd') {
      const stub = env.MATCH.get(env.MATCH.idFromName('global'));
      const r = await stub.fetch(`https://m/qotd${url.search}`, request);
      return new Response(r.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors } });
    }
    if (p === '/api/health') return json({ ok: true }, 200, cors);
    if (p === '/api/feedback') return feedback(request, env, url, cors);
    if (p.startsWith('/api/')) return json({ error: 'not_found' }, 404, cors);
    if (p === '/sw.js') {                                       // the service worker must never be cached by the browser
      const res = await env.ASSETS.fetch(request);
      return new Response(res.body, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache', 'service-worker-allowed': '/' } });
    }
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
    const res = await env.ASSETS.fetch(request);
    if (res.status === 404) {
      const page404 = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url), request));
      const raw = page404.ok ? await page404.text() : await res.text();
      const html = raw.replaceAll('__ORIGIN__', url.origin);
      return new Response(html, {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache, no-store', ...SECURITY },
      });
    }
    return res;
  },
};
