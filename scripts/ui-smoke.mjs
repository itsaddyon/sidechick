// UI smoke test: runs the real frontend modules inside jsdom against a local `wrangler dev`.
import { spawn } from 'node:child_process';
import { JSDOM } from 'jsdom';
import WebSocket from 'ws';
import fs from 'node:fs';
import http from 'node:http';

const PORT = 8798, BASE = `http://127.0.0.1:${PORT}`, WSB = `ws://127.0.0.1:${PORT}`;
let failed = 0;
const ok = (c, msg) => { console.log((c ? '  ✓ ' : '  ✗ ') + msg); if (!c) failed++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMOJI = /\p{Extended_Pictographic}/u;

function bot(path) {
  const ws = new WebSocket(WSB + path), b = { ws, msgs: [], waiters: [] };
  ws.on('message', d => { const m = JSON.parse(d.toString()); b.msgs.push(m); b.waiters = b.waiters.filter(w => (w.t === m.t && (!w.p || w.p(m))) ? (w.r(m), false) : true); });
  b.open = new Promise(r => ws.on('open', r));
  b.send = o => ws.send(JSON.stringify(o));
  b.wait = (t, p, ms = 8000) => { const hit = b.msgs.find(m => m.t === t && (!p || p(m))); if (hit) return Promise.resolve(hit); return new Promise((r, j) => { b.waiters.push({ t, p, r }); setTimeout(() => j(new Error('bot timeout ' + t)), ms); }); };
  return b;
}

const TG = []; const MOCK = 8796;
http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => { TG.push(JSON.parse(b || '{}')); res.setHeader('content-type', 'application/json'); res.end('{"ok":true}'); }); }).listen(MOCK);
const dev = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--local', '--log-level', 'warn', '--var', 'TELEGRAM_CHAT_ID:42', '--var', 'TELEGRAM_API_BASE:http://127.0.0.1:' + MOCK], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE + '/api/health')).ok) break; } catch {} await sleep(1000); }

const html = fs.readFileSync('public/index.html', 'utf8').replace(/<script type="module"[\s\S]*?<\/script>/g, '').replaceAll('__ORIGIN__', BASE);
const dom = new JSDOM(html, { url: BASE + '/', pretendToBeVisual: true });
const w = dom.window;
w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false });
Object.assign(globalThis, { window: w, document: w.document, location: w.location, history: w.history, localStorage: w.localStorage,
  requestAnimationFrame: w.requestAnimationFrame.bind(w), matchMedia: w.matchMedia, confirm: () => true, WebSocket });
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const waitFor = async (fn, ms = 8000, label = 'condition') => { const t0 = Date.now(); for (;;) { const v = typeof fn === 'string' ? $(fn) : fn(); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timeout: ' + label + (typeof fn === 'string' ? ' ' + fn : '')); await sleep(40); } };
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const submit = form => form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
const store = () => JSON.parse(localStorage.getItem('sidechick.v2') || '{}');
const noEmoji = (sel, label) => { const t = ($(sel)?.textContent || ''); ok(!EMOJI.test(t), `no emoji in ${label}`); };
const errors = []; process.on('unhandledRejection', e => errors.push(String(e))); w.addEventListener('error', e => errors.push(String(e.error || e.message)));

try {
  console.log('boot + onboarding');
  ok($('.fallback h1').textContent.includes('Chat. Play. Poof.'), 'crawler-visible fallback content present before the app starts');
  await import('../public/js/app.js');
  await waitFor('.onboard', 3000, 'onboarding');
  ok($$('.avatar-grid button').length === 12 && $$('.avatar-grid svg').length === 12, 'onboarding shows 12 illustrated avatars');
  ok(!!$('.onboard .logo-img') && !!$('.onboard .credit') && !!$('.onboard .credit .mono') && $('.credit').textContent.includes('itsaddyon'), 'logo + animated A2 credit on the first page');
  click($('.onboard .credit')); await waitFor('.sheet .madeby', 2000, 'made-by card');
  ok($('.sheet a[href="https://github.com/itsaddyon"]') && $('.sheet').textContent.includes('Send a suggestion'), 'tapping the credit opens a card with GitHub + suggestion button');
  click($('.sheet .btn.ghost'));
  ok($$('.floaters .fl').length === 16, 'animated background: 16 floating icons');
  noEmoji('.onboard', 'onboarding');
  click($$('.avatar-grid button')[4]); $('.onboard input').value = 'Tester';
  click($('.onboard .btn.big'));
  await waitFor('.tile', 2000, 'home');
  ok($$('.tile').length === 3 && $('.hello').textContent.includes('Tester'), 'home shows 3 tiles + greeting');
  ok(!!$('.home .logo-img') && !!$('.home .credit'), 'logo + credit on the home page');
  ok(store().adult === true && store().av === 'a4', 'profile saved locally (avatar id, not emoji)');
  ok(!!$('.qotd b') && !$('.chip.fire'), 'question of the day shown; no streak until you actually play');
  noEmoji('.home', 'home');

  console.log('privacy sheet');
  click($('.home .foot-row .link')); await waitFor('.sheet .pv', 2000, 'privacy');
  const pv = $('.sheet').textContent;
  ok(pv.includes('Two people per room') && pv.includes('Spicy games') && pv.includes('threats') && pv.includes('streak is just a counter') && pv.includes('View-once photos') && pv.includes('Suggestions'), 'privacy text covers 2-person rooms, spicy games, filters, streak, photos, suggestions');
  noEmoji('.sheet', 'privacy sheet'); click($('.sheet .btn.big'));

  console.log('suggestions (UI -> Worker -> Telegram mock)');
  click($$('.home .foot-row .link')[1]); await waitFor('.sheet textarea', 2000, 'feedback sheet');
  ok($$('.sheet .chips-wrap .chip').length === 4 && !!$('.sheet .hp'), 'feedback sheet: 4 types + hidden honeypot');
  click($$('.sheet .chips-wrap .chip')[1]); $('.sheet textarea').value = 'The compatibility quiz should have a timer';
  click($$('.sheet .btn.big').pop());
  await waitFor('.sheet .center', 5000, 'feedback sent'); ok($('.sheet').textContent.includes('Sent. Thank you.'), 'thank-you shown after sending');
  ok(TG.length === 1 && TG[0].text.includes('Type: Bug') && TG[0].text.includes('compatibility quiz') && TG[0].chat_id === '42', 'the Worker forwarded it to Telegram');
  click($('.sheet .btn.big'));
  console.log('your stuff: settings toggles');
  click($('.avatar-btn')); await waitFor('.sheet .switch', 2000, 'stuff sheet');
  const sw = $$('.sheet .switch input'); ok(sw.length === 2, 'two switches (animated background, vibration)');
  sw[0].checked = false; sw[0].dispatchEvent(new w.Event('change', { bubbles: true })); ok(document.body.classList.contains('calm') && store().prefs.bg === false, 'turning the background off applies instantly and is remembered');
  sw[0].checked = true; sw[0].dispatchEvent(new w.Event('change', { bubbles: true })); ok(!document.body.classList.contains('calm'), 'and back on');
  click($('.sheet .btn.big')); await waitFor('.tile', 2000, 'home after save');

  console.log('private room (UI <-> bot)');
  click($$('.tile')[2]);
  const code = (await waitFor('.code-chip b', 6000, 'room code')).textContent;
  ok(/^[A-Z]{4}$/.test(code), 'room created: ' + code);
  await waitFor('.empty h3', 3000, 'waiting card'); ok($('.empty').textContent.includes('holds two'), 'empty state says rooms hold two');
  const f = bot('/ws/room/' + code); await f.open; f.send({ t: 'join', name: 'Bot', av: 'a3', adult: true, cid: 'bot1' }); await f.wait('joined');
  await waitFor(() => $$('.sys').some(n => n.textContent.includes('Bot joined')), 4000, 'join notice');
  ok($$('.faces .avatar').length === 2, 'both avatars shown in header');
  const bot3 = bot('/ws/room/' + code); await bot3.open; bot3.send({ t: 'join', name: 'Third', av: 'a2', adult: true, cid: 'bot3' });
  ok((await bot3.wait('join_error')).code === 'full', 'third person is refused');
  f.send({ t: 'msg', text: 'hi from bot' });
  await waitFor(() => $$('.bubble').some(b => b.textContent === 'hi from bot'), 4000, 'bot message'); ok(true, 'incoming message rendered');
  $('.composer input').value = 'hello bot'; submit($('.composer'));
  ok((await f.wait('msg', m => m.m.text === 'hello bot')).m.name === 'Tester', 'outgoing message reaches bot');
  ok(store().streak === 1, 'streak starts at 1 after your first message (counter on this device)');
  await sleep(300); click($$('.bubble')[0]); click($('.picker button'));
  await waitFor(() => $('.reacts button'), 3000, 'reaction'); ok(true, 'reaction rendered');
  await waitFor(() => $('.vibe .ic'), 2000, 'vibe icon'); ok(true, 'room vibe shown as an icon');

  console.log('typing indicator stays on while someone keeps typing');
  f.msgs.length = 0;
  for (let i = 0; i < 10; i++) { $('.composer input').value = 'typing ' + i; $('.composer input').dispatchEvent(new w.Event('input', { bubbles: true })); await sleep(480); }
  ok(f.msgs.filter(m => m.t === 'typing' && m.on).length >= 2, 'while you type, the other person keeps getting "typing" heartbeats (' + f.msgs.filter(m => m.t === 'typing' && m.on).length + ' in 4.8s)');
  $('.composer input').value = '';
  for (let i = 0; i < 4; i++) { f.send({ t: 'typing', on: true }); await sleep(2000); }
  ok($('.typing').textContent.includes('Bot is typing'), 'the indicator is still showing after 8s of them typing');
  f.send({ t: 'typing', on: false }); await waitFor(() => $('.typing').textContent === '', 2000, 'typing off'); ok(true, 'and it clears as soon as they stop');

  console.log('view-once photos in the UI');
  ok(!!$('.composer button[aria-label="Send a view-once photo"]'), 'photo button is available in a private room');
  const JPG = 'data:image/jpeg;base64,' + 'QUJD'.repeat(400);
  f.send({ t: 'photo', data: JPG, secs: 3 });
  const pc = await waitFor(() => $$('.photo-card').find(b => !b.disabled), 4000, 'photo card'); ok(pc.textContent.includes('Tap to view once'), 'incoming photo shows as a tap-to-view card (no image in the chat)');
  click(pc); await waitFor('.viewer img', 3000, 'viewer');
  ok($('.viewer img').getAttribute('src') === JPG && $('.viewer .wm').getAttribute('style').includes('data:image/svg+xml') && $('.viewer').textContent.includes('Gone after this'), 'viewer shows the photo with a name watermark and a countdown');
  w.dispatchEvent(new w.Event('blur')); await waitFor(() => !$('.viewer'), 1000, 'viewer closed on blur');
  ok(true, 'leaving the screen closes the viewer immediately');
  await waitFor(() => $$('.photo-card').some(b => b.textContent.includes('You opened it')), 2000, 'opened state'); ok(true, 'the card now says "You opened it" and cannot be opened again');


  console.log('icebreaker bulb fills the box, send is manual');
  const before = f.msgs.filter(m => m.t === 'msg').length;
  $('.composer input').value = ''; click($('.composer .spark'));
  const spark = $('.composer input').value; ok(spark.length > 8, 'bulb puts a question in the message box: "' + spark + '"');
  await sleep(400); ok(f.msgs.filter(m => m.t === 'msg').length === before, 'nothing is sent until you press send');
  await sleep(300); submit($('.composer'));
  ok((await f.wait('msg', m => m.m.text === spark)).m.text === spark, 'sending delivers the question');

  console.log('game in room (with mismatches)');
  click($('.composer .icon-btn')); await waitFor('.sheet .gcard', 2000, 'picker');
  ok($$('.sheet .gcard').length === 8 && $$('.sheet .gcard .icon-box svg').length === 8, 'picker lists all 8 games with icons');
  click($$('.sheet .gcard')[0]);
  await f.wait('game');
  await waitFor('.game', 3000, 'game'); ok(document.body.dataset.theme === 'same_brain', 'screen theme switches to the game mood');
  let done = false, sawDifferent = false, bad = false;
  for (let n = 0; n < 40 && !done; n++) {
    await waitFor(() => $('.pct') || $('.opt:not([disabled])') || $('.bridge'), 5000, 'game step');
    if ($('.pct')) { done = true; break; }
    const opt = $('.opt:not([disabled])');
    if (opt) {
      const idx = $$('.opt').indexOf(opt);
      const gi = f.msgs.filter(m => m.t === 'game').pop()?.game || (await f.wait('game')).game;
      click(opt);
      f.send({ t: 'game_answer', i: gi.i, choice: gi.i % 2 === 0 ? idx : (idx + 1) % gi.o.length });
      await waitFor(() => $('.bridge'), 5000, 'reveal');
    }
    const bt = $('.bridge')?.textContent || '';
    if (bt.includes('Different picks')) sawDifferent = true;
    if (/Totally different|Not even close|wrong/i.test(bt)) bad = true;
    if ($('.bridge')) click($('.game .btn.big'));
    await sleep(60);
  }
  await waitFor('.pct', 5000, 'results');
  ok(sawDifferent && !bad, 'mismatches say "Different picks" and show both answers + a prompt, never "totally different"');
  ok($('.verdict').textContent.length > 3 && !EMOJI.test($('.game').textContent), 'results page: verdict "' + $('.verdict').textContent + '", no emoji');
  ok($$('.talk-q').length >= 1, '"Worth talking about" lists questions you differed on');
  ok(store().games >= 1 && store().streak === 1, 'games counter saved locally; streak unchanged (same day)');
  click($('.game .btn.ghost')); await waitFor(() => !$('.game'), 3000, 'back to chat'); ok(document.body.dataset.theme === 'brand', 'back to chat restores the brand theme');
  f.ws.close();

  console.log('same phone');
  click($('.top .icon-btn')); await waitFor('.tile', 3000, 'home again');
  ok(!!$('.chip.fire'), 'streak chip now shows on home');
  click($$('.tile')[1]); await waitFor('.gcard', 2000, 'games hub');
  ok($$('.gcard').length === 8 && $$('.tag18').length >= 1, 'games hub lists 8 games (incl. Flirt Mode), 18+ tag shown');
  noEmoji('.screen.sub', 'games hub');
  click($$('.gcard')[3]);
  await waitFor('.sheet .mode', 2000, 'mode sheet'); ok($$('.sheet .gcard').length === 3 && !!$('.toggle'), 'mode sheet: friend / stranger / same phone + full-set toggle');
  ok($('.toggle').textContent.includes('60'), 'compatibility quiz now has 60 questions');
  click($$('.sheet .gcard')[2]); await waitFor('.sheet input', 2000, 'names'); click($('.sheet .btn.big'));
  let steps = 0;
  while (!$('.pct') && steps++ < 400) {
    const cover = $('.cover .btn.big'), opt = $('.opt:not([disabled])'), next = $('.bridge') && $('.game .btn.big');
    if (cover) click(cover); else if (opt) click(opt); else if (next) click(next); else await sleep(20);
  }
  ok(!!$('.pct') && document.body.dataset.theme === 'compatibility_quiz', `pass-and-play finished in ${steps} steps with the Compatibility theme: ${$('.verdict')?.textContent}`);
  click($('.game .btn.ghost')); await waitFor('.tile', 2000, 'home after pass-and-play');

  console.log('stranger chat');
  click($$('.tile')[0]); await waitFor('.chips-wrap .chip', 2000, 'interest picker'); ok($$('.chips-wrap .chip').length === 12 && $$('.chips-wrap .chip svg').length === 12, 'interest picker with icons');
  click($('.screen.sub .btn.big')); await waitFor('.radar', 3000, 'searching'); ok(!!$('.tip') && !!$('.radar .avatar'), 'searching screen with radar + your avatar');
  const s = bot('/ws/match'); await s.open; s.send({ t: 'find', pool: 'chat', interests: [], adult: true, cid: 'bot-stranger' });
  const mm = await s.wait('matched', null, 15000);
  await waitFor('.splash', 4000, 'match splash'); ok($('.splash h2').textContent.includes('connected'), 'match splash shown');
  const sr = bot('/ws/room/' + mm.room); await sr.open; sr.send({ t: 'join', name: 'Stranger', av: 'a9', adult: true, cid: 'bot-stranger', token: mm.token }); await sr.wait('joined');
  await waitFor('.peer b', 5000, 'random room'); ok($('.peer b').textContent === 'Stranger' && !!$('.top .btn.small'), 'random chat shows peer + Next button');
  ok(!!$('.composer button[aria-label="Send a view-once photo"]'), 'photo button is available in random chats with permission flow');
  sr.send({ t: 'msg', text: 'yo' }); await waitFor(() => $$('.bubble').some(b => b.textContent === 'yo'), 4000, 'stranger msg'); ok(true, 'stranger message rendered');
  sr.send({ t: 'game_start', kind: 'spicy_or_sweet' });
  await waitFor('.sheet .mode.center', 3000, 'invite'); ok($('.sheet').textContent.includes('18+ and spicy'), 'spicy invite from a stranger is flagged 18+ and can be declined');
  click($('.sheet .btn.ghost'));
  sr.ws.close(); await waitFor('.end-card', 4000, 'end card'); ok($('.end-card').textContent.includes('left'), 'stranger leaving shows end card');
  click($('.end-card .btn.ghost')); await waitFor('.tile', 2000, 'home');

  ok(errors.length === 0, 'no uncaught errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
} catch (e) { failed++; console.log('  ✗ ' + e.message); if (errors.length) console.log('  errors:', errors.slice(0, 3)); console.log('  screen:', document.body.textContent.replace(/\s+/g, ' ').slice(0, 220)); }

dev.kill(); if (process.platform === 'win32') spawn('taskkill', ['/pid', String(dev.pid), '/T', '/F']);
console.log(failed ? `\n${failed} FAILED` : '\nUI SMOKE PASSED'); process.exit(failed ? 1 : 0);
