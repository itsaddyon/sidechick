// Offline shell: the app (and same-phone games) keep working without a connection.
// Chat, matching and feedback always go to the network. Bump VERSION when you ship changes.
const VERSION = 'sc-v3';
const SHELL = ['/', '/css/style.css', '/js/app.js', '/js/game.js', '/js/ui.js', '/js/store.js', '/js/net.js', '/js/icons.js', '/js/avatars.js',
  '/shared/engine.js', '/shared/questions.js', '/shared/banks.js', '/vendor/uqr.js', '/logo.svg', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/ws/') || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;
  if (req.mode === 'navigate') {                           // pages: fresh when online, cached shell when offline
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put('/', c)); return r; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {            // assets: instant from cache, refreshed in the background
    const net = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
