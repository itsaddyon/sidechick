// UI smoke test: runs the real frontend modules inside jsdom against a local `wrangler dev`.
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import WebSocket from 'ws';
import fs from 'node:fs';

const PORT = 8798, BASE = `http://127.0.0.1:${PORT}`, WSB = `ws://127.0.0.1:${PORT}`;
let failed = 0;
const ok = (c, msg) => { console.log((c ? '  ✓ ' : '  ✗ ') + msg); if (!c) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// a scripted "other person"
function bot(path) {
  const ws = new WebSocket(WSB + path), b = { ws, msgs: [], waiters: [] };
  ws.on('message', d => { const m = JSON.parse(d.toString()); b.msgs.push(m); b.waiters = b.waiters.filter(w => (w.t === m.t && (!w.p || w.p(m))) ? (w.r(m), false) : true); });
  b.open = new Promise(r => ws.on('open', r));
  b.send = o => ws.send(JSON.stringify(o));
  b.wait = (t, p, ms = 8000) => { const hit = b.msgs.find(m => m.t === t && (!p || p(m))); if (hit) return Promise.resolve(hit); return new Promise((r, j) => { b.waiters.push({ t, p, r }); setTimeout(() => j(new Error('bot timeout ' + t)), ms); }); };
  return b;
}

const dev = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--local', '--log-level', 'warn'], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await sleep(1000); }

// ── browser globals ──
const html = fs.readFileSync('public/index.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
const dom = new JSDOM(html, { url: BASE + '/', pretendToBeVisual: true });
const w = dom.window;
w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false });
Object.assign(globalThis, { window: w, document: w.document, location: w.location, history: w.history, localStorage: w.localStorage,
  requestAnimationFrame: w.requestAnimationFrame.bind(w), matchMedia: w.matchMedia, confirm: () => true, WebSocket });
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const waitFor = async (fn, ms = 8000, label = 'condition') => { const t0 = Date.now(); for (;;) { const v = typeof fn === 'string' ? $(fn) : fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timeout: ' + label + (typeof fn === 'string' ? ' ' + fn : '')); await sleep(40); } };
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const submit = form => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
const errors = []; process.on('unhandledRejection', e => errors.push(String(e))); w.addEventListener('error', e => errors.push(String(e.error || e.message)));

try {
  console.log('boot + onboarding');
  await import('../public/js/app.js');
  await waitFor('.onboard', 3000, 'onboarding');
  ok(!!$('.onboard h1') && $$('.emoji-grid button').length === 12, 'onboarding renders with 12 avatars');
  click($$('.emoji-grid button')[4]); $('.onboard input').value = 'Tester';
  click($('.onboard .btn.big'));
  await waitFor('.tile', 2000, 'home');
  ok($$('.tile').length === 3 && $('.hello').textContent.includes('Tester'), 'home shows 3 tiles + greeting');
  ok(JSON.parse(localStorage.getItem('sidechick.v2')).adult === true, 'profile saved locally');
  ok(!!$('.qotd b'), 'question of the day shown');

  console.log('private room (UI <-> bot)');
  click($$('.tile')[2]);
  const code = (await waitFor('.code-chip b', 6000, 'room code')).textContent;
  ok(/^[A-Z]{4}$/.test(code), 'room created: ' + code);
  await waitFor('.empty h3', 3000, 'waiting card'); ok($('.empty').textContent.includes('Your room is live'), 'empty state invites friends');
  const f = bot('/ws/room/' + code); await f.open; f.send({ t: 'join', name: 'Bot', emoji: '🤖', adult: true, cid: 'bot1' }); await f.wait('joined');
  await waitFor(() => $$('.sys').some(n => n.textContent.includes('Bot joined')), 4000, 'join notice');
  f.send({ t: 'msg', text: 'hi from bot' });
  await waitFor(() => $$('.bubble').some(b => b.textContent === 'hi from bot'), 4000, 'bot message');
  ok(true, 'incoming message rendered');
  $('.composer input').value = 'hello bot'; submit($('.composer'));
  ok((await f.wait('msg', m => m.m.text === 'hello bot')).m.name === 'Tester', 'outgoing message reaches bot');
  await sleep(300); click($$('.bubble')[0]); click($('.picker button')); // react
  await waitFor(() => $('.reacts button'), 3000, 'reaction'); ok(true, 'reaction rendered');

  console.log('game in room');
  click($('.composer .play'));
  await waitFor('.sheet .gcard', 2000, 'picker'); ok($$('.sheet .gcard').length === 7, 'picker lists all 7 games for friends');
  click($$('.sheet .gcard')[0]);
  let done = false;
  for (let n = 0; n < 40 && !done; n++) {
    await waitFor(() => $('.pct') || $('.opt:not([disabled])') || $('.headline'), 5000, 'game step');
    if ($('.pct')) { done = true; break; }
    const opt = $('.opt:not([disabled])');
    if (opt) {
      const idx = $$('.opt').indexOf(opt); click(opt);
      f.send({ t: 'game_answer', i: f.msgs.filter(m => m.t === 'game').pop().game.i, choice: idx });
      await waitFor(() => $('.headline'), 5000, 'reveal');
    }
    if ($('.headline')) click($('.game .btn.big'));
    await sleep(60);
  }
  await waitFor('.pct', 5000, 'results'); ok($('.verdict').textContent.length > 3, 'game finished: ' + $('.verdict').textContent);
  ok(JSON.parse(localStorage.getItem('sidechick.v2')).games >= 1, 'games counter + badge saved locally');
  click($('.game .btn.ghost'));                         // Back to chat
  await waitFor(() => !$('.game'), 3000, 'back to chat'); ok(true, 'back to chat works');
  f.ws.close();

  console.log('same phone');
  click($('.top .icon')); await waitFor('.tile', 3000, 'home again');
  click($$('.tile')[1]); await waitFor('.gcard', 2000, 'games hub');
  ok($$('.gcard').length === 7 && $$('.tag18').length >= 1, 'games hub lists 7 games, 18+ tag shown');
  click($$('.gcard')[3]);                               // compatibility quiz
  await waitFor('.sheet .mode', 2000, 'mode sheet'); ok($$('.sheet .gcard').length === 3 && !!$('.toggle'), 'mode sheet: friend / stranger / same phone + full-set toggle');
  click($$('.sheet .gcard')[2]); await waitFor('.sheet input', 2000, 'names'); click($('.sheet .btn.big'));
  let steps = 0;
  while (!$('.pct') && steps++ < 400) {
    const cover = $('.cover .btn.big'), opt = $('.opt:not([disabled])'), next = $('.headline') && $('.game .btn.big');
    if (cover) click(cover); else if (opt) click(opt); else if (next) click(next); else await sleep(20);
  }
  ok(!!$('.pct'), `pass-and-play finished in ${steps} steps: ${$('.verdict')?.textContent}`);
  click($('.game .btn.ghost')); await waitFor('.tile', 2000, 'home after pass-and-play');

  console.log('stranger chat');
  click($$('.tile')[0]); await waitFor('.chips-wrap .chip', 2000, 'interest picker'); ok($$('.chips-wrap .chip').length === 12, 'interest picker shown');
  click($('.btn.big.pink')); await waitFor('.radar', 3000, 'searching'); ok(!!$('.tip'), 'searching screen with radar + tips');
  const s = bot('/ws/match'); await s.open; s.send({ t: 'find', pool: 'chat', interests: [], adult: true, cid: 'bot-stranger' });
  const mm = await s.wait('matched', null, 15000);
  await waitFor('.splash', 4000, 'match splash'); ok($('.splash h2').textContent.includes('connected'), 'match splash shown');
  const sr = bot('/ws/room/' + mm.room); await sr.open; sr.send({ t: 'join', name: 'Stranger', emoji: '🦊', adult: true, cid: 'bot-stranger' }); await sr.wait('joined');
  await waitFor('.peer b', 5000, 'random room'); ok($('.peer b').textContent === 'Stranger' && !!$('.top .btn.small'), 'random chat shows peer + Next button');
  sr.send({ t: 'msg', text: 'yo' }); await waitFor(() => $$('.bubble').some(b => b.textContent === 'yo'), 4000, 'stranger msg'); ok(true, 'stranger message rendered');
  click($('.composer .spark')); await waitFor('.spark-card', 3000, 'spark'); ok(true, 'icebreaker spark appears');
  sr.ws.close(); await waitFor('.end-card', 4000, 'end card'); ok($('.end-card').textContent.includes('left'), 'stranger leaving shows end card');
  click($('.end-card .btn.ghost')); await waitFor('.tile', 2000, 'home');

  ok(errors.length === 0, 'no uncaught errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
} catch (e) { failed++; console.log('  ✗ ' + e.message); if (errors.length) console.log('  errors:', errors.slice(0, 3)); console.log('  screen:', document.body.textContent.replace(/\s+/g, ' ').slice(0, 200)); }

dev.kill(); if (process.platform === 'win32') spawn('taskkill', ['/pid', String(dev.pid), '/T', '/F']);
console.log(failed ? `\n${failed} FAILED` : '\nUI SMOKE PASSED'); process.exit(failed ? 1 : 0);
