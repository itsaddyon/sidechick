// End-to-end backend test. Boots `wrangler dev` locally, then drives it with real WebSockets.
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

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
  c.send({ t: 'join', name: extra.name || 'Ana', emoji: extra.emoji || '🦊', adult: true, cid: extra.cid || Math.random().toString(36), ...extra });
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
    const i = g.i, order = [a, b];
    for (const c of order) c.send({ t: 'game_answer', i, choice: 0 });
    g = (await a.wait('game', x => x.game && x.game.i === i && x.game.phase === 'reveal')).game;
    a.send({ t: 'game_next', i });
    await sleep(120);
    g = a.last('game').game;
  }
  return g;
}

// ── boot ──
const dev = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--local', '--log-level', 'warn'], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; dev.stdout.on('data', d => logs += d); dev.stderr.on('data', d => logs += d);
for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await sleep(1000); }

try {
  console.log('basics');
  ok((await (await fetch(BASE + '/api/health')).json()).ok, 'health');
  ok((await fetch(BASE + '/')).status === 200, 'serves index.html');
  ok((await (await fetch(BASE + '/api/stats')).json()).waiting === 0, 'stats');

  console.log('private room + chat');
  const noAdult = client('/ws/room/KXPT'); await noAdult.open; noAdult.send({ t: 'join', name: 'x', create: true });
  ok((await noAdult.wait('join_error')).code === 'adult', '18+ gate enforced');
  const miss = await join('BBBB'); ok((await miss.wait('join_error')).code === 'missing', 'unknown code rejected');
  const a = await join('KXPT', { create: true, name: 'Ana' }); const ja = await a.wait('joined');
  ok(ja.mode === 'private' && ja.users.length === 1, 'room created');
  const dup = await join('KXPT', { create: true }); ok((await dup.wait('join_error')).code === 'taken', 'duplicate create rejected');
  const b = await join('KXPT', { name: 'Ana', emoji: '🐼' }); const jb = await b.wait('joined');
  ok(jb.users.map(u => u.name).sort().join() === 'Ana,Ana 2', 'duplicate names get suffix');
  a.send({ t: 'msg', text: 'lol hello' }); const got = await b.wait('msg', x => !x.m.sys);
  ok(got.m.text === 'lol hello', 'message delivered');
  b.send({ t: 'react', id: got.m.id, emoji: '🔥' }); ok((await a.wait('reacts')).reacts['🔥'].length === 1, 'reaction works');
  await sleep(300); a.send({ t: 'msg', text: 'i will kill you' }); ok((await a.wait('toast')).text.includes('Threats'), 'threat blocked');
  await sleep(300); a.send({ t: 'msg', text: 'check https://evil.com' }); await sleep(300);
  ok(b.msgs.filter(m => m.t === 'msg' && m.m.text?.includes('evil')).length === 1, 'links allowed between friends');

  console.log('games (private)');
  for (const kind of ['same_brain', 'know_me', 'spicy_or_sweet', 'compatibility_quiz']) {
    a.msgs.length = 0; b.msgs.length = 0;
    a.send({ t: 'game_start', kind, rounds: 4 });
    const g = await playThrough(a, b, kind);
    ok(g.phase === 'done' && typeof g.result.pct === 'number', `${kind}: finished with ${g.result?.pct}% "${g.result?.verdict}"`);
    a.send({ t: 'game_end' }); await sleep(150);
  }
  a.send({ t: 'game_start', kind: 'nope' }); await sleep(150);
  b.close(); await sleep(300);
  a.msgs.length = 0; a.send({ t: 'game_start', kind: 'same_brain' });
  ok((await a.wait('toast')).text.includes('one more'), 'cannot start game alone');
  a.close();

  console.log('game-only room (no chat needed)');
  const h = await join('GGGG', { create: true, mode: 'game', kind: 'hot_takes', name: 'Host' }); await h.wait('joined');
  const f = await join('GGGG', { name: 'Friend' }); await f.wait('joined');
  const gg = await h.wait('game', x => x.game);
  ok(gg.game.kind === 'hot_takes' && gg.game.total === 10, 'game auto-starts when 2nd player joins (10 rounds)');
  h.close(); f.close();

  console.log('random chat matching');
  const s1 = await find(); const s2 = await find();
  const m1 = await s1.wait('matched'), m2 = await s2.wait('matched');
  ok(m1.room === m2.room && m1.room.length === 5, 'two strangers matched into one room');
  const r1 = await join(m1.room, { name: 'S1', cid: 'cid-one' }), r2 = await join(m2.room, { name: 'S2', cid: 'cid-two' });
  const rj = await r1.wait('joined'); await r2.wait('joined');
  ok(rj.mode === 'random', 'room mode is random');
  r1.send({ t: 'msg', text: 'my number is 9876543210' }); ok((await r1.wait('toast')).text.includes('Phone'), 'phone numbers blocked in random chat');
  await sleep(300); r1.send({ t: 'msg', text: 'hey, how is your day?' }); ok((await r2.wait('msg', x => !x.m.sys)).m.text.startsWith('hey'), 'chat works');
  r2.send({ t: 'spark' }); ok((await r1.wait('msg', x => x.m.spark)).m.text.length > 5, 'spark icebreaker delivered');
  r1.send({ t: 'game_start', kind: 'spicy_or_sweet' }); ok((await r1.wait('toast', x => x.text.includes('private'))).text.length > 0, 'spicy game blocked with strangers');
  r1.msgs.length = 0; r1.send({ t: 'game_start', kind: 'same_brain' });
  const inv = await r2.wait('invite'); ok(inv.kind === 'same_brain', 'stranger gets a game invite');
  r2.send({ t: 'invite_reply', ok: true });
  const sg = await r1.wait('game', x => x.game); ok(sg.game.kind === 'same_brain', 'game starts after accept');
  r2.close(); ok(!!(await r1.wait('peer_left')), 'peer_left sent when stranger leaves'); r1.close();

  console.log('interests + patience');
  const t0 = Date.now();
  const i1 = await find({ interests: ['🎵 Music'] }), i2 = await find({ interests: ['🎵 Music', '🎮 Gaming'] });
  const im = await i1.wait('matched'); ok(im.shared.includes('🎵 Music') && Date.now() - t0 < 5000, 'shared interest matches immediately');
  await i2.wait('matched');
  const p1 = await find({ interests: ['🎬 Movies'] }), p2 = await find({ interests: ['🏏 Cricket'] });
  const pm = await p1.wait('matched', null, 15000); ok(Date.now() - t0 > 5000, 'no overlap: waits, then matches anyone (patience)'); await p2.wait('matched');
  const c1 = await find(); await sleep(300); ok((await (await fetch(BASE + '/api/stats')).json()).waiting === 1, 'stats show 1 waiting');
  c1.send({ t: 'cancel' }); await sleep(300); ok((await (await fetch(BASE + '/api/stats')).json()).waiting === 0, 'cancel leaves the queue');

  console.log('game matchmaking + safety');
  const g1 = await find({ pool: 'game:same_brain' }), g2 = await find({ pool: 'game:same_brain' });
  const gm = await g1.wait('matched'); await g2.wait('matched');
  const q1 = await join(gm.room, { name: 'G1' }), q2 = await join(gm.room, { name: 'G2' });
  const qg = await q1.wait('game', x => x.game); ok(qg.game.kind === 'same_brain', 'game-pool strangers drop straight into the game');
  q1.close(); q2.close();
  const bad = await find({ pool: 'game:spicy_or_sweet' }); ok((await bad.wait('error')).text.includes('private'), 'spicy pool refused');
  const na = await find({ adult: false }); ok((await na.wait('error')).text.includes('18+'), 'matchmaker enforces 18+');
  // three reports against the same cid => cooldown
  for (let k = 0; k < 3; k++) {
    const x = await find({ cid: 'reporter-' + k }), y = await find({ cid: 'badguy' });
    const mx = await x.wait('matched'); await y.wait('matched');
    const rx = await join(mx.room, { cid: 'reporter-' + k }), ry = await join(mx.room, { cid: 'badguy' });
    await rx.wait('joined'); await ry.wait('joined'); rx.send({ t: 'report' });
    await rx.wait('reported'); await ry.wait('closed'); await sleep(500);
  }
  const cool = await find({ cid: 'badguy' }); ok((await cool.wait('cooldown')).minutes > 0, '3 reports => 30 min cooldown');
} catch (e) { failed++; console.log('  ✗ ' + e.message); }

dev.kill(); if (process.platform === 'win32') spawn('taskkill', ['/pid', String(dev.pid), '/T', '/F']);
if (failed && logs.trim()) console.log('\n--- wrangler output ---\n' + logs.slice(-1500));
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED'); process.exit(failed ? 1 : 0);
