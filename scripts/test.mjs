// End-to-end backend test. Boots `wrangler dev` locally, then drives it with real WebSockets.
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import http from 'node:http';

const PORT = 8799, BASE = `http://127.0.0.1:${PORT}`, WS = `ws://127.0.0.1:${PORT}`;
let failed = 0;
const ok = (c, msg) => { console.log((c ? '  ✓ ' : '  ✗ ') + msg); if (!c) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function client(path) {
  const ws = new WebSocket(WS + path, { headers: { Origin: BASE } });
  const c = { ws, msgs: [], waiters: [] };
  ws.on('message', d => {
    const m = JSON.parse(d.toString()); c.msgs.push(m);
    c.waiters = c.waiters.filter(w => (w.t === m.t && (!w.pred || w.pred(m))) ? (w.res(m), false) : true);
  });
  c.open = new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  c.send = o => ws.send(JSON.stringify(o));
  c.last = t => [...c.msgs].reverse().find(m => m.t === t);
  c.wait = (t, pred, ms = 8000) => {
    const hit = c.msgs.find(m => m.t === t && (!pred || pred(m))); if (hit) return Promise.resolve(hit);
    return new Promise((res, rej) => { c.waiters.push({ t, pred, res }); setTimeout(() => rej(new Error('timeout waiting for ' + t)), ms); });
  };
  c.close = () => ws.close();
  return c;
}
const join = async (code, extra = {}) => {
  const c = client('/ws/room/' + code); await c.open;
  c.send({ t: 'join', name: extra.name || 'Ana', av: extra.av || 'a0', adult: true, cid: extra.cid || Math.random().toString(36), ...extra });
  return c;
};
const find = async (extra = {}) => {
  const c = client('/ws/match'); await c.open;
  c.send({ t: 'find', pool: 'chat', interests: [], adult: true, cid: Math.random().toString(36), ...extra });
  return c;
};
async function playThrough(a, b, kind) {
  const g0 = await a.wait('game', g => g.game && g.game.kind === kind);
  let g = g0.game, n = 0;
  while (g.phase !== 'done' && n++ < 40) {
    const i = g.i;
    for (const c of [a, b]) c.send({ t: 'game_answer', i, choice: 0 });
    g = (await a.wait('game', x => x.game && x.game.i === i && x.game.phase === 'reveal')).game;
    a.send({ t: 'game_next', i });
    await sleep(120);
    g = a.last('game').game;
  }
  return g;
}
const pair = async (extra = {}) => {                         // two strangers -> both inside the random room
  const s1 = await find(extra.f1), s2 = await find(extra.f2);
  const m1 = await s1.wait('matched'), m2 = await s2.wait('matched');
  const r1 = await join(m1.room, { name: 'S1', cid: 'cid-one', token: m1.token }), r2 = await join(m2.room, { name: 'S2', cid: 'cid-two', token: m2.token });
  await r1.wait('joined'); await r2.wait('joined');
  return { m1, m2, r1, r2 };
};

const TG = []; const MOCK = 8797;
http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => { TG.push(JSON.parse(b || '{}')); res.setHeader('content-type', 'application/json'); res.end('{"ok":true}'); }); }).listen(MOCK);
const dev = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--local', '--log-level', 'warn', '--var', 'TELEGRAM_CHAT_ID:42', '--var', 'TELEGRAM_API_BASE:http://127.0.0.1:' + MOCK], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; dev.stdout.on('data', d => logs += d); dev.stderr.on('data', d => logs += d);
for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await sleep(1000); }

try {
  console.log('basics + SEO');
  ok((await (await fetch(BASE + '/api/health')).json()).ok, 'health');
  const page = await fetch(BASE + '/'); const html = await page.text();
  ok(page.status === 200 && html.includes(`<link rel="canonical" href="${BASE}/">`), 'index.html served with canonical filled in');
  ok(html.includes(`content="${BASE}/og.png"`) && !html.includes('__ORIGIN__'), 'og:image is absolute, no placeholders left');
  ok(page.headers.get('content-security-policy')?.includes("script-src 'self'"), 'security headers set');
  const robots = await (await fetch(BASE + '/robots.txt')).text(); ok(robots.includes(`Sitemap: ${BASE}/sitemap.xml`) && robots.includes('Disallow: /ws/'), 'robots.txt');
  ok((await (await fetch(BASE + '/sitemap.xml')).text()).includes(`<loc>${BASE}/</loc>`), 'sitemap.xml');
  for (const f of ['/og.png', '/logo.svg', '/favicon.svg', '/manifest.webmanifest', '/brand/icon-512.png', '/brand/apple-touch-icon.png'])
    ok((await fetch(BASE + f)).status === 200, 'asset ' + f);
  ok((await (await fetch(BASE + '/api/stats')).json()).waiting === 0, 'stats');
  const p404 = await fetch(BASE + '/non-existent-page');
  const h404 = await p404.text();
  ok(p404.status === 404 && h404.includes('Page vanished') && p404.headers.get('content-security-policy')?.includes("script-src 'self'"), 'custom 404 page served with 404 status and security headers');
  const api404 = await fetch(BASE + '/api/unknown_endpoint');
  ok(api404.status === 404 && (await api404.json()).error === 'not_found', 'unknown API endpoint returns 404 JSON');

  console.log('private room + chat (max 2)');
  const noAdult = client('/ws/room/KXPT'); await noAdult.open; noAdult.send({ t: 'join', name: 'x', create: true });
  ok((await noAdult.wait('join_error')).code === 'adult', '18+ gate enforced');
  const miss = await join('BBBB'); ok((await miss.wait('join_error')).code === 'missing', 'unknown code rejected');
  const a = await join('KXPT', { create: true, name: 'Ana' }); const ja = await a.wait('joined');
  ok(ja.mode === 'private' && ja.users.length === 1, 'room created');
  const dup = await join('KXPT', { create: true }); ok((await dup.wait('join_error')).code === 'taken', 'duplicate create rejected');
  const b = await join('KXPT', { name: 'Ana', av: 'a5' }); const jb = await b.wait('joined');
  ok(jb.users.map(u => u.name).sort().join() === 'Ana,Ana 2' && jb.users.some(u => u.av === 'a5'), 'duplicate names get suffix, avatars relayed');
  const third = await join('KXPT', { name: 'Third' }); ok((await third.wait('join_error')).code === 'full', 'a third person cannot join');
  a.send({ t: 'msg', text: 'lol hello' }); const got = await b.wait('msg', x => !x.m.sys);
  ok(got.m.text === 'lol hello' && got.m.av === 'a0', 'message delivered with avatar');
  b.send({ t: 'react', id: got.m.id, emoji: '🔥' }); ok((await a.wait('reacts')).reacts['🔥'].length === 1, 'reaction works');
  const vibe = await a.wait('vibe'); ok(vibe.vibe === 'laugh', 'vibe is an id, not an emoji');
  await sleep(300); a.send({ t: 'msg', text: 'i will kill you' }); ok((await a.wait('toast')).text.includes('Threats'), 'threat blocked');
  await sleep(300); a.send({ t: 'msg', text: 'check https://example.com' }); await sleep(300);
  ok(b.msgs.filter(m => m.t === 'msg' && m.m.text?.includes('example.com')).length === 1, 'links allowed between friends');

  console.log('games (private, incl. spicy)');
  for (const kind of ['same_brain', 'know_me', 'spicy_or_sweet', 'compatibility_quiz']) {
    a.msgs.length = 0; b.msgs.length = 0;
    a.send({ t: 'game_start', kind, rounds: 4 });
    const g = await playThrough(a, b, kind);
    ok(g.phase === 'done' && typeof g.result.pct === 'number' && !/[\u{1F300}-\u{1FAFF}]/u.test(g.result.verdict), `${kind}: finished with ${g.result?.pct}% "${g.result?.verdict}"`);
    a.send({ t: 'game_end' }); await sleep(150);
  }
  b.close(); await sleep(300);
  a.msgs.length = 0; a.send({ t: 'game_start', kind: 'same_brain' });
  ok((await a.wait('toast')).text.includes('one more'), 'cannot start game alone');
  a.close();

  console.log('game-only room (no chat needed)');
  const h = await join('GGGG', { create: true, mode: 'game', kind: 'hot_takes', name: 'Host' }); await h.wait('joined');
  const f = await join('GGGG', { name: 'Friend' }); await f.wait('joined');
  const gg = await h.wait('game', x => x.game);
  ok(gg.game.kind === 'hot_takes' && gg.game.total === 10 && gg.game.theme === 'hot_takes', 'game auto-starts when 2nd player joins (10 rounds, themed)');
  h.close(); f.close();

  console.log('random chat: matching, token, cap, filters');
  const { m1, r1, r2 } = await pair();
  ok(m1.room.length === 5 && !!m1.token, 'strangers matched into a 5-letter room with a token');
  const sneak = await join(m1.room, { name: 'Sneak' }); ok((await sneak.wait('join_error')).code === 'missing', 'joining a random room by code alone fails');
  const sneak2 = await join(m1.room, { name: 'Sneak', token: m1.token }); ok((await sneak2.wait('join_error')).code === 'full', 'even with the token a third person cannot join');
  r1.send({ t: 'msg', text: 'call me on 9876543210' }); ok((await r2.wait('msg', x => !x.m.sys)).m.text.includes('9876543210'), 'phone numbers are allowed');
  await sleep(400); r1.send({ t: 'msg', text: 'mail me a@b.co' }); await sleep(400);
  r1.send({ t: 'msg', text: 'visit https://x.com/me' }); ok((await r1.wait('toast', x => x.text.includes('Links'))).text.length > 0, 'links blocked in random chat');
  await sleep(300); r1.send({ t: 'msg', text: 'i will find you' }); ok((await r1.wait('toast', x => x.text.includes('Threats'))).text.length > 0, 'threats blocked in random chat');
  await sleep(300); r1.send({ t: 'msg', text: 'send nudes lol' }); await sleep(300);
  ok(r2.msgs.filter(m => m.t === 'msg' && m.m.text === 'send nudes lol').length === 1, 'no other restrictions (explicit talk is not filtered)');
  r1.msgs.length = 0; r2.msgs.length = 0; r1.send({ t: 'game_start', kind: 'spicy_or_sweet' });
  const inv = await r2.wait('invite'); ok(inv.kind === 'spicy_or_sweet', 'spicy game with a stranger starts as an invite');
  r2.send({ t: 'invite_reply', ok: false }); ok((await r1.wait('toast', x => x.text.includes('passed'))).text.length > 0, 'stranger can decline');
  await sleep(150); r2.msgs.length = 0; r1.msgs.length = 0;
  r1.send({ t: 'game_start', kind: 'spicy_or_sweet' }); await r2.wait('invite');
  r2.send({ t: 'invite_reply', ok: true });
  const sg = await r1.wait('game', x => x.game); ok(sg.game.kind === 'spicy_or_sweet' && sg.game.nsfw, 'spicy game starts after accept');
  r2.close(); ok(!!(await r1.wait('peer_left')), 'peer_left sent when stranger leaves'); r1.close();

  console.log('interests + patience');
  const t0 = Date.now();
  const i1 = await find({ interests: ['Music'] }), i2 = await find({ interests: ['Music', 'Gaming'] });
  const im = await i1.wait('matched'); ok(im.shared.includes('Music') && Date.now() - t0 < 5000, 'shared interest matches immediately');
  await i2.wait('matched'); i1.close(); i2.close(); await sleep(200);
  const t1 = Date.now();
  const p1 = await find({ interests: ['Movies'] }), p2 = await find({ interests: ['Cricket'] });
  await p1.wait('matched', null, 15000); ok(Date.now() - t1 >= 4500, 'no overlap: waits, then matches anyone (patience)');
  await p2.wait('matched', null, 15000); p1.close(); p2.close(); await sleep(200);
  const c1 = await find(); await sleep(300); ok((await (await fetch(BASE + '/api/stats')).json()).waiting === 1, 'stats show 1 waiting');
  c1.send({ t: 'cancel' }); await sleep(300); ok((await (await fetch(BASE + '/api/stats')).json()).waiting === 0, 'cancel leaves the queue');

  console.log('game matchmaking + safety');
  const g1 = await find({ pool: 'game:spicy_or_sweet' }), g2 = await find({ pool: 'game:spicy_or_sweet' });
  const gm = await g1.wait('matched'); await g2.wait('matched');
  const q1 = await join(gm.room, { name: 'G1', token: gm.token }), q2 = await join(gm.room, { name: 'G2', token: gm.token });
  const qg = await q1.wait('game', x => x.game); ok(qg.game.kind === 'spicy_or_sweet', 'strangers can queue for a spicy game and drop straight in');
  q1.close(); q2.close();
  const na = await find({ adult: false }); ok((await na.wait('error')).text.includes('18+'), 'matchmaker enforces 18+');
  for (let k = 0; k < 3; k++) {
    const x = await find({ cid: 'reporter-' + k }), y = await find({ cid: 'badguy' });
    const mx = await x.wait('matched'), my = await y.wait('matched');
    const rx = await join(mx.room, { cid: 'reporter-' + k, token: mx.token }), ry = await join(my.room, { cid: 'badguy', token: my.token });
    await rx.wait('joined'); await ry.wait('joined'); rx.send({ t: 'report' });
    await rx.wait('reported'); await ry.wait('closed'); await sleep(500);
  }
  const cool = await find({ cid: 'badguy' }); ok((await cool.wait('cooldown')).minutes > 0, '3 reports => 30 min cooldown');

  console.log('typing indicator relays');
  const ty1 = await join('TTKP', { create: true, name: 'T1' }), ty2 = await join('TTKP', { name: 'T2' }); await ty1.wait('joined'); await ty2.wait('joined');
  ty1.send({ t: 'typing', on: true }); ok((await ty2.wait('typing', x => x.on)).name === 'T1', 'typing=on reaches the other person');
  ty1.send({ t: 'typing', on: true }); await sleep(200); ok(ty2.msgs.filter(m => m.t === 'typing' && m.on).length >= 2, 'repeat heartbeats are relayed too');
  ty1.send({ t: 'typing', on: false }); ok((await ty2.wait('typing', x => !x.on)).on === false, 'typing=off reaches the other person');

  console.log('view-once photos');
  const JPG = 'data:image/jpeg;base64,' + 'QUJD'.repeat(500);
  ty1.send({ t: 'photo', data: JPG, secs: 3 });
  const pm = await ty2.wait('msg', x => x.m.photo);
  ok(pm.m.state === 'sent' && !pm.m.data && pm.m.secs === 3, 'photo arrives as a placeholder with no image data in it');
  ty1.send({ t: 'photo_open', id: pm.m.id }); ok((await ty1.wait('toast', x => x.text.includes('You sent'))).text.length > 0, 'the sender cannot open their own photo');
  ty2.send({ t: 'photo_open', id: pm.m.id });
  const pd = await ty2.wait('photo_data'); ok(pd.data === JPG && pd.secs === 3, 'the other person receives the photo once');
  ok((await ty1.wait('photo_state', x => x.state === 'opened')).id === pm.m.id, 'the sender is told it was opened');
  ty2.msgs.length = 0; ty2.send({ t: 'photo_open', id: pm.m.id }); ok((await ty2.wait('toast', x => x.text.includes('gone'))).text.length > 0, 'a second open is refused: the server already deleted it');
  ok(!!(await ty1.wait('photo_state', x => x.state === 'gone', 10000)), 'the photo is marked gone after its timer');
  await sleep(4200); ty1.send({ t: 'photo', data: 'data:image/png;base64,AAAA', secs: 5 }); ok((await ty1.wait('toast', x => x.text.includes("couldn't"))).text.length > 0, 'non-JPEG data is rejected');
  await sleep(4200); ty1.msgs.length = 0; ty1.send({ t: 'photo', data: 'data:image/jpeg;base64,' + 'A'.repeat(900000), secs: 5 }); await sleep(600);
  ok(!ty1.msgs.some(m => m.t === 'msg' && m.m.photo), 'oversized photos are refused');
  ty1.close(); ty2.close();

  console.log('open chat connects to a game waiter (mixed matching)');
  const gw = await find({ pool: 'game:same_brain', cid: 'gw-1' }), cw = await find({ cid: 'cw-1' });
  const gm1 = await gw.wait('matched'), cm1 = await cw.wait('matched');
  ok(gm1.room === cm1.room && gm1.invite === 'same_brain' && gm1.inviter === true && cm1.inviter === false, 'a chat waiter and a game waiter are matched; the game waiter will invite');
  const rg = await join(gm1.room, { name: 'GW', cid: 'gw-1', token: gm1.token }), rc = await join(cm1.room, { name: 'CW', cid: 'cw-1', token: cm1.token });
  const inv2 = await rc.wait('invite'); ok(inv2.kind === 'same_brain' && inv2.by === 'GW', 'the chat person gets the game invite as soon as both are in');
  rc.send({ t: 'invite_reply', ok: true }); ok((await rg.wait('game', x => x.game)).game.kind === 'same_brain', 'accepting starts the game');
  rg.close(); rc.close(); await sleep(600);
  const h1 = await find({ pool: 'game:hot_takes', cid: 'h-1' }); await sleep(300); const h2 = await find({ pool: 'game:know_me', cid: 'h-2' });
  const hm1 = await h1.wait('matched'), hm2 = await h2.wait('matched');
  ok(hm1.kind === null && hm1.inviter === true && hm1.invite === 'hot_takes' && hm2.inviter === false, 'people waiting for different games match; the longer waiter invites');

  console.log('suggestions -> Telegram (mocked)');
  const post = (body, hdr = {}) => fetch(BASE + '/api/feedback', { method: 'POST', headers: { 'content-type': 'application/json', Origin: BASE, ...hdr }, body: JSON.stringify(body) });
  let r = await post({ kind: 'idea', message: 'Add a leaderboard please', contact: '@someone' });
  ok(r.status === 200 && TG.length === 1 && TG[0].chat_id === '42' && TG[0].text.includes('Type: Idea') && TG[0].text.includes('Add a leaderboard') && TG[0].text.includes('@someone'), 'a suggestion is forwarded to the Telegram API with the right chat id');
  r = await post({ kind: 'bug', message: 'bot spam', website: 'http://spam' }); ok(r.status === 200 && TG.length === 1, 'honeypot submissions are silently dropped');
  r = await post({ kind: 'bug', message: 'hi' }); ok(r.status === 400, 'too-short messages are rejected');
  r = await post({ kind: 'bug', message: 'valid message' }, { Origin: 'http://evil.example' }); ok(r.status === 403, 'cross-site posts are refused');
  r = await fetch(BASE + '/api/feedback'); ok(r.status === 405, 'GET is not allowed');
  await post({ kind: 'other', message: 'second valid one' }); await post({ kind: 'other', message: 'third valid one' });
  r = await post({ kind: 'other', message: 'fourth valid one' }); ok(r.status === 429 && TG.length === 3, 'rate limit: 3 suggestions per 10 minutes');
  ok(!JSON.stringify(await (await fetch(BASE + '/')).text()).includes('AAH'), 'no bot token anywhere in the served page');
} catch (e) { failed++; console.log('  ✗ ' + e.message); }

dev.kill(); process.on('exit', () => {}); if (process.platform === 'win32') spawn('taskkill', ['/pid', String(dev.pid), '/T', '/F']);
if (failed && logs.trim()) console.log('\n--- wrangler output ---\n' + logs.slice(-1500));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED'); process.exit(failed ? 1 : 0);
