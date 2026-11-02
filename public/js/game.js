// Game screens (online and same-phone). Pure rendering: all state comes from Game.view().
import { Game } from '../shared/engine.js';
import { GAMES } from '../shared/questions.js';
import { h, icon, avatar, countUp, confetti, buzz, share, setTheme } from './ui.js';

let lastFx = '';
const fireOnce = (key, fn) => { if (lastFx !== key) { lastFx = key; fn(); } };
const PROMPTS = ['Ask each other why.', 'Tell the story behind your pick.', 'Defend your choice in one sentence.', 'Now argue for the other side.', 'Whose pick would win a debate?'];

/** The next game worth suggesting: same group first, never the one just played. */
export function suggest(kind, allow = () => true) {
  const pool = Object.keys(GAMES).filter(k => k !== kind && allow(k));
  return pool.find(k => GAMES[k].group === GAMES[kind].group) || pool[0] || null;
}

/** ctx: { me, users:{uid:{name,av}}, pick(i,c), next(i), end(), again(), play(kind), allow(kind), chat(), picks, exitLabel } */
export function renderGame(g, ctx) {
  setTheme(g.theme);
  const done = g.phase === 'done';
  const filled = done ? g.total : g.i + (g.phase === 'reveal' ? 1 : 0);
  const head = h('div', { class: 'g-head' },
    h('button', { class: 'icon-btn', 'aria-label': 'Leave game', onclick: () => ctx.end() }, icon('x', 20)),
    h('div', { class: 'g-title' }, icon(g.icon, 20), h('span', {}, g.title), g.nsfw ? h('span', { class: 'tag18' }, '18+') : null),
    ctx.chat && !done ? h('button', { class: 'icon-btn', 'aria-label': 'Open chat', onclick: ctx.chat }, icon('message-circle', 20)) : null,
    done ? null : h('div', { class: 'g-count' }, `${g.i + 1}/${g.total}`));
  const bar = h('div', { class: 'bar' }, h('i', { style: `width:${Math.round((filled / g.total) * 100)}%` }));
  return h('div', { class: `game tier-${g.tier}` }, head, bar, done ? doneView(g, ctx) : questionView(g, ctx));
}

function questionView(g, ctx) {
  const body = h('div', { class: 'g-body' });
  const isTarget = g.engine === 'guess' && g.target && g.target.uid === ctx.me;
  if (g.engine === 'guess' && g.target)
    body.append(h('div', { class: 'g-tag' }, isTarget ? 'Your turn: pick your real answer' : `Guess what ${g.target.name} picked`));
  body.append(h('div', { class: 'g-q' }, g.q));

  const reveal = g.phase === 'reveal';
  const mine = reveal ? g.reveal?.[ctx.me] : ctx.picks?.[g.i];
  const answered = !reveal && (g.answered.includes(ctx.me) || mine !== undefined);
  const counts = {};
  if (reveal) Object.values(g.reveal).forEach(c => counts[c] = (counts[c] || 0) + 1);
  const everyone = reveal && Object.keys(g.reveal).length > 1 && Object.keys(counts).length === 1;

  g.o.forEach((text, idx) => {
    const who = reveal ? Object.entries(g.reveal).filter(([, c]) => c === idx).map(([uid]) => avatar(ctx.users[uid]?.av, 28)) : [];
    const star = reveal && g.engine === 'guess' && g.target && g.reveal[g.target.uid] === idx;
    const cls = 'opt' + (mine === idx ? ' picked' : '') + (star ? ' star' : '') + (everyone && counts[idx] ? ' all' : '');
    body.append(h('button', { class: cls, disabled: answered || reveal, style: `animation-delay:${idx * 55}ms`,
      onclick: () => { buzz(8); ctx.pick(g.i, idx); } }, h('span', {}, text), who.length ? h('span', { class: 'dots' }, who) : null));
  });

  if (!reveal && answered) body.append(h('div', { class: 'wait' }, h('span', { class: 'pulse' }), `Locked in. Waiting for the other (${g.answered.length}/${Object.keys(ctx.users).length})`));
  if (reveal) {
    fireOnce(`${g.kind}:${g.i}:r`, () => { if (g.hit === 1) { buzz([18, 40, 18]); confetti(10); } else buzz(12); });
    body.append(bridge(g, ctx),
      h('button', { class: 'btn big', onclick: () => ctx.next(g.i) }, g.i + 1 >= g.total ? 'See results' : 'Next', icon('arrow-right', 20)));
  }
  return body;
}

/** What to say after a reveal. Never "wrong", never "totally different": a miss is a conversation. */
function bridge(g, ctx) {
  const picks = Object.entries(g.reveal).map(([uid, c]) => ({ name: ctx.users[uid]?.name || 'Someone', pick: g.o[c], uid }));
  const prompt = PROMPTS[g.i % PROMPTS.length];
  let title, detail;
  if (g.engine === 'guess') {
    const t = g.target && picks.find(p => p.uid === g.target.uid);
    const guessers = picks.filter(p => !t || p.uid !== t.uid);
    if (g.hit === 1) { title = 'Nailed it'; detail = t ? `${t.name} picked "${t.pick}".` : ''; }
    else { title = 'Plot twist'; detail = t ? `${t.name} actually picked "${t.pick}". ${guessers.map(p => `${p.name} guessed "${p.pick}"`).join('. ')}.` : ''; }
  } else if (g.hit === 1) { title = 'Same answer'; detail = `You both went with "${picks[0]?.pick}".`; }
  else { title = g.hit > 0 ? 'Mostly aligned' : 'Different picks'; detail = picks.map(p => `${p.name}: "${p.pick}"`).join('  ·  '); }
  return h('div', { class: 'bridge' + (g.hit === 1 ? ' good' : '') }, h('b', {}, title), h('span', {}, detail), g.hit === 1 ? null : h('em', {}, prompt));
}

function doneView(g, ctx) {
  const r = g.result;
  const pct = h('span', {}, '0');
  const nextKind = suggest(g.kind, ctx.allow);
  const talk = r.recap.filter(x => x.hit < 0.5).slice(0, 3);
  fireOnce(`${g.kind}:done:${r.pct}`, () => { if (r.pct >= 80) { confetti(46); buzz([30, 50, 30, 50, 60]); } else buzz(20); });
  setTimeout(() => countUp(pct, r.pct), 60);
  return h('div', { class: 'g-body done' },
    h('div', { class: 'pct' }, pct, h('sup', {}, '%')),
    h('div', { class: 'verdict' }, r.verdict),
    r.best ? h('div', { class: 'verdict small' }, `${r.best} knows them best`) : null,
    h('div', { class: 'talk' }, h('b', {}, talk.length ? 'Worth talking about' : 'No clashes at all'),
      talk.length ? talk.map(x => h('div', { class: 'talk-q' }, icon('message-circle', 16), h('span', {}, x.q)))
        : h('span', { class: 'muted' }, 'You matched on everything. Suspiciously good.')),
    h('div', { class: 'stack' },
      h('button', { class: 'btn big', onclick: () => shareResult(g) }, icon('share-2', 20), 'Share result'),
      ctx.again ? h('button', { class: 'btn line', onclick: ctx.again }, icon('refresh-cw', 18), 'Play again') : null,
      nextKind && ctx.play ? h('button', { class: 'btn line', onclick: () => ctx.play(nextKind) }, icon(GAMES[nextKind].icon, 18), `Next up: ${GAMES[nextKind].name}`) : null,
      h('button', { class: 'btn ghost', onclick: () => ctx.end() }, ctx.exitLabel || 'Done')));
}

/** A shareable picture of the result, drawn in the current game's colours and font. */
async function resultCard(g) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
  const x = c.getContext?.('2d'); if (!x) return null;
  const cs = getComputedStyle(document.body), v = n => cs.getPropertyValue(n).trim();
  const bg = v('--bg') || '#0E0D12', ac = v('--accent') || '#FF5B3A';
  x.fillStyle = bg; x.fillRect(0, 0, 1080, 1350);
  for (const [px, py, col, a] of [[0, 0, v('--b1') || ac, 0.5], [1080, 640, v('--b2') || ac, 0.35], [200, 1350, v('--b3') || ac, 0.3]]) {
    const gr = x.createRadialGradient(px, py, 0, px, py, 900); gr.addColorStop(0, col); gr.addColorStop(1, 'transparent');
    x.globalAlpha = a; x.fillStyle = gr; x.fillRect(0, 0, 1080, 1350); x.globalAlpha = 1;
  }
  const pctEl = document.querySelector('.pct'), ps = pctEl ? getComputedStyle(pctEl) : null;
  const display = ps ? `${ps.fontStyle} ${ps.fontWeight} ${'%SIZE%'} ${ps.fontFamily}` : '800 %SIZE% sans-serif';
  x.textAlign = 'center'; x.fillStyle = '#F6F1E7'; x.font = '700 48px sans-serif'; x.fillText(g.title.toUpperCase(), 540, 150);
  x.fillStyle = ac; x.font = display.replace('%SIZE%', '560px'); x.fillText(`${g.result.pct}%`, 540, 760);
  x.fillStyle = '#F6F1E7'; x.font = display.replace('%SIZE%', '68px');
  let line = '', y = 900;
  for (const wd of g.result.verdict.split(' ')) { const t = line ? line + ' ' + wd : wd; if (x.measureText(t).width > 880 && line) { x.fillText(line, 540, y); y += 80; line = wd; } else line = t; }
  x.fillText(line, 540, y);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = '/logo.svg'; });
    const w = 440, hgt = w * img.height / img.width; x.drawImage(img, 540 - w / 2, 1180, w, hgt);
  } catch {}
  x.fillStyle = 'rgba(246,241,231,.6)'; x.font = '500 34px sans-serif'; x.fillText(location.host, 540, 1290);
  return new Promise(r => c.toBlob(r, 'image/png'));
}

export async function shareResult(g) {
  const text = `We got ${g.result.pct}% on ${g.title}: ${g.result.verdict}.\nPlay with me on Sidechick:`;
  try {
    const blob = await resultCard(g);
    if (blob && navigator.canShare) {
      const file = new File([blob], 'sidechick-result.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: `${text} ${location.origin}` }); return; }
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  await share({ text, url: location.origin });
}

// ── same phone ───────────────────────────────────────────────────────────────
export function passAndPlay(host, kind, names, rounds, { exit, onDone }) {
  const ids = ['p1', 'p2'];
  const users = { p1: { name: names[0], av: 'a1' }, p2: { name: names[1], av: 'a8' } };
  let g = new Game(kind, ids, { rounds }), ready = null, doneFired = false;

  const restart = k => { kind = k || kind; g = new Game(kind, ids, { rounds }); ready = null; doneFired = false; lastFx = ''; draw(); };
  const draw = () => {
    const v = g.view(users, ids);
    setTheme(v.theme);
    if (v.phase === 'answer') {
      const pending = g.active(ids).filter(p => !(p in g.answers)).sort((a, b) => (b === g.target) - (a === g.target));
      const cur = pending[0];
      if (ready !== cur) {
        host.replaceChildren(h('div', { class: 'game tier-' + v.tier },
          h('div', { class: 'g-head' }, h('button', { class: 'icon-btn', 'aria-label': 'Leave game', onclick: exit }, icon('x', 20)),
            h('div', { class: 'g-title' }, icon(v.icon, 20), h('span', {}, v.title)), h('div', { class: 'g-count' }, `${v.i + 1}/${v.total}`)),
          h('div', { class: 'g-body cover' }, avatar(users[cur].av, 96, 'big'), h('h2', {}, `Pass to ${users[cur].name}`),
            h('p', { class: 'muted' }, 'No peeking at the other answer.'),
            h('button', { class: 'btn big', onclick: () => { ready = cur; draw(); } }, `I'm ${users[cur].name}`))));
        return;
      }
      host.replaceChildren(renderGame(v, { me: cur, users, picks: {}, end: exit, pick: (i, c) => { g.submit(cur, i, c, ids); ready = null; draw(); } }));
      return;
    }
    host.replaceChildren(renderGame(v, { me: null, users, end: exit, exitLabel: 'Back to home', allow: () => true,
      next: i => { g.next(i, ids); draw(); }, again: () => restart(), play: k => restart(k) }));
    if (v.phase === 'done' && !doneFired) { doneFired = true; onDone?.(v); }
  };
  draw();
}
