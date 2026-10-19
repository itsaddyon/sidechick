// Game screens (online and same-phone). Pure rendering: all state comes from Game.view().
import { Game } from '../shared/engine.js';
import { GAMES } from '../shared/questions.js';
import { h, countUp, confetti, buzz, share, toast } from './ui.js';

let lastFx = '';
const fireOnce = (key, fn) => { if (lastFx !== key) { lastFx = key; fn(); } };

/** The next game worth suggesting: same group first, never the one just played. */
export function suggest(kind, allow = () => true) {
  const keys = Object.keys(GAMES), me = GAMES[kind];
  const pool = keys.filter(k => k !== kind && allow(k));
  return pool.find(k => GAMES[k].group === me.group) || pool[0] || null;
}

/** ctx: { me, users, pick(i,c), next(i), end(), again(), play(kind), allow(kind), chat(), picks, exitLabel } */
export function renderGame(g, ctx) {
  const tier = GAMES[g.kind]?.tier || 'chill';
  const done = g.phase === 'done';
  const filled = done ? g.total : g.i + (g.phase === 'reveal' ? 1 : 0);
  const head = h('div', { class: 'g-head' },
    h('button', { class: 'icon', 'aria-label': 'Leave game', onclick: () => ctx.end() }, '✕'),
    h('div', { class: 'g-title' }, `${g.emoji} ${g.title}`, g.nsfw ? h('span', { class: 'tag18' }, '18+') : null),
    ctx.chat && !done ? h('button', { class: 'icon', 'aria-label': 'Open chat', onclick: ctx.chat }, '💬') : null,
    done ? null : h('div', { class: 'g-count' }, `${g.i + 1}/${g.total}`));
  const bar = h('div', { class: 'bar' }, h('i', { style: `width:${Math.round((filled / g.total) * 100)}%` }));
  return h('div', { class: `game tier-${tier}` }, head, bar, done ? doneView(g, ctx) : questionView(g, ctx));
}

function questionView(g, ctx) {
  const body = h('div', { class: 'g-body' });
  const isTarget = g.engine === 'guess' && g.target && g.target.uid === ctx.me;
  if (g.engine === 'guess' && g.target)
    body.append(h('div', { class: 'g-tag' }, isTarget ? 'Your turn · pick your real answer 🤫' : `Guess what ${g.target.name} ${g.target.emoji} picked`));
  body.append(h('div', { class: 'g-q', key: g.i }, g.q));

  const reveal = g.phase === 'reveal';
  const mine = reveal ? g.reveal?.[ctx.me] : ctx.picks?.[g.i];
  const answered = !reveal && (g.answered.includes(ctx.me) || mine !== undefined);
  const counts = {};
  if (reveal) Object.values(g.reveal).forEach(c => counts[c] = (counts[c] || 0) + 1);
  const everyone = reveal && Object.keys(g.reveal).length > 1 && Object.keys(counts).length === 1;

  g.o.forEach((text, idx) => {
    const dots = reveal ? h('div', { class: 'dots' }, Object.entries(g.reveal).filter(([, c]) => c === idx).map(([uid]) => h('span', {}, ctx.users[uid]?.emoji || '🙂'))) : null;
    const star = reveal && g.engine === 'guess' && g.target && g.reveal[g.target.uid] === idx;
    const cls = 'opt' + (mine === idx ? ' picked' : '') + (star ? ' star' : '') + (everyone && counts[idx] ? ' all' : '');
    body.append(h('button', { class: cls, disabled: answered || reveal, style: `animation-delay:${idx * 50}ms`,
      onclick: () => { buzz(8); ctx.pick(g.i, idx); } }, h('span', {}, text), dots));
  });

  if (!reveal && answered) body.append(h('div', { class: 'wait' }, h('span', { class: 'pulse' }), `Locked in. Waiting for the others (${g.answered.length}/${Object.keys(ctx.users).length})`));
  if (reveal) {
    const hit = g.hit;
    const msg = g.engine === 'guess'
      ? (hit === 1 ? 'Nailed it! 🎯' : hit > 0 ? 'Some got it 👀' : 'Nobody got it 😬')
      : (hit === 1 ? 'Matched! 🎯' : hit > 0 ? 'Almost there 👀' : 'Totally different 😬');
    fireOnce(`${g.kind}:${g.i}:r`, () => { if (hit === 1) { buzz([18, 40, 18]); confetti(10); } else buzz(12); });
    body.append(h('div', { class: 'headline' }, msg),
      h('div', { class: 'legend' }, Object.entries(ctx.users).map(([, u]) => h('span', {}, `${u.emoji} ${u.name}`))),
      h('button', { class: 'btn big', onclick: () => ctx.next(g.i) }, g.i + 1 >= g.total ? 'See results →' : 'Next →'));
  }
  return body;
}

function doneView(g, ctx) {
  const r = g.result;
  const pct = h('span', {}, '0');
  const nextKind = suggest(g.kind, ctx.allow);
  fireOnce(`${g.kind}:done:${r.pct}`, () => { if (r.pct >= 80) { confetti(44); buzz([30, 50, 30, 50, 60]); } else buzz(20); });
  setTimeout(() => countUp(pct, r.pct), 60);
  return h('div', { class: 'g-body done' },
    h('div', { class: 'pct' }, pct, h('sup', {}, '%')),
    h('div', { class: 'verdict' }, r.verdict),
    r.best ? h('div', { class: 'verdict small' }, `🏆 ${r.best} knows them best`) : null,
    h('div', { class: 'chips' }, r.recap.map(x => h('span', { class: x.hit >= 0.5 ? 'hit' : '' }, (x.hit >= 0.5 ? '✓ ' : '✗ ') + x.q.slice(0, 28) + (x.q.length > 28 ? '…' : '')))),
    h('div', { class: 'stack' },
      h('button', { class: 'btn big', onclick: () => shareResult(g) }, 'Share result'),
      ctx.again ? h('button', { class: 'btn alt', onclick: ctx.again }, 'Play again') : null,
      nextKind && ctx.play ? h('button', { class: 'btn blue', onclick: () => ctx.play(nextKind) }, `Next up: ${GAMES[nextKind].emoji} ${GAMES[nextKind].name}`) : null,
      h('button', { class: 'btn ghost', onclick: () => ctx.end() }, ctx.exitLabel || 'Done')));
}

export async function shareResult(g) {
  const text = `We got ${g.result.pct}% on ${g.title} ${g.emoji} — ${g.result.verdict}\nPlay with me on Sidechick:`;
  await share({ text, url: location.origin });
}

// ── same phone ───────────────────────────────────────────────────────────────
export function passAndPlay(host, kind, names, rounds, { exit, onDone, play }) {
  const ids = ['p1', 'p2'];
  const users = { p1: { name: names[0], emoji: '🟡' }, p2: { name: names[1], emoji: '🩷' } };
  let g = new Game(kind, ids, { rounds }), ready = null, doneFired = false;
  const allow = k => GAMES[k].tier !== 'x';

  const restart = k => { g = new Game(k || kind, ids, { rounds }); kind = k || kind; ready = null; doneFired = false; lastFx = ''; draw(); };
  const draw = () => {
    const v = g.view(users, ids);
    if (v.phase === 'answer') {
      const pending = g.active(ids).filter(p => !(p in g.answers)).sort((a, b) => (b === g.target) - (a === g.target));
      const cur = pending[0];
      if (ready !== cur) {
        host.replaceChildren(h('div', { class: 'game tier-' + GAMES[kind].tier },
          h('div', { class: 'g-head' }, h('button', { class: 'icon', 'aria-label': 'Leave game', onclick: exit }, '✕'),
            h('div', { class: 'g-title' }, `${v.emoji} ${v.title}`), h('div', { class: 'g-count' }, `${v.i + 1}/${v.total}`)),
          h('div', { class: 'g-body cover' }, h('div', { class: 'big-emoji' }, '📱'), h('h2', {}, `Pass to ${users[cur].name}`),
            h('p', {}, 'No peeking at the other answer 👀'),
            h('button', { class: 'btn big', onclick: () => { ready = cur; draw(); } }, `I'm ${users[cur].name}`))));
        return;
      }
      host.replaceChildren(renderGame(v, { me: cur, users, picks: {}, end: exit,
        pick: (i, c) => { g.submit(cur, i, c, ids); ready = null; draw(); } }));
      return;
    }
    host.replaceChildren(renderGame(v, { me: null, users, end: exit, exitLabel: 'Back to home', allow,
      next: i => { g.next(i, ids); draw(); }, again: () => restart(), play: k => { play ? play(k, restart) : restart(k); } }));
    if (v.phase === 'done' && !doneFired) { doneFired = true; onDone?.(v); }
  };
  draw();
}

export const passHint = () => toast('Hand the phone over after you pick 📱');
