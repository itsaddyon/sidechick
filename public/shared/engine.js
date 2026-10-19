// Shared game engine: runs on the server (rooms) and in the browser (same-phone mode).
import { BANK, GAMES } from './questions.js';

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function verdict(engine, pct) {
  if (engine === 'guess') {
    if (pct >= 80) return 'You two share one brain 🧠';
    if (pct >= 55) return 'You know each other well 👀';
    if (pct >= 30) return 'Still getting to know each other 🌱';
    return 'Strangers? Time to talk more 😅';
  }
  if (pct >= 85) return 'Same brain. Kinda scary. 🧠';
  if (pct >= 65) return 'Pretty in sync ✨';
  if (pct >= 40) return 'Opposites attract? 🧲';
  return 'Total chaos. Love it. 🎢';
}

export class Game {
  /** players: array of ids. opts.rounds: number or 'full' */
  constructor(kind, players, opts = {}) {
    const meta = GAMES[kind];
    this.kind = kind; this.engine = meta.engine; this.title = meta.name; this.emoji = meta.emoji;
    const pool = shuffle(BANK[kind].map(x => ({ q: x.q, o: x.o })));
    const n = opts.rounds === 'full' ? pool.length : Math.min(pool.length, Number(opts.rounds) || 10);
    this.qs = pool.slice(0, n);
    this.order = shuffle(players.slice());
    this.i = 0; this.phase = 'answer'; this.answers = {}; this.scores = []; this.tally = {};
    this.lastHit = 0; this.result = null; this.target = null;
    this.setTarget(players);
  }

  active(present) { return this.order.filter(p => present.includes(p)); }

  setTarget(present) {
    if (this.engine !== 'guess') return;
    const a = this.active(present);
    this.target = a.length ? a[this.i % a.length] : null;
  }

  /** returns 'ok' | 'abort' (fewer than 2 players left) | 'noop' */
  submit(uid, i, choice, present) {
    if (this.phase !== 'answer' || i !== this.i || uid in this.answers || !present.includes(uid)) return 'noop';
    if (!Number.isInteger(choice) || choice < 0 || choice >= this.qs[this.i].o.length) return 'noop';
    this.answers[uid] = choice;
    return this.check(present);
  }

  /** call whenever answers or the player list change */
  check(present) {
    if (this.phase !== 'answer') return 'ok';
    const act = this.active(present);
    if (act.length < 2) return 'abort';
    if (this.engine === 'guess' && !present.includes(this.target)) return this.advance(present);
    if (act.every(p => p in this.answers)) this.reveal(present);
    return 'ok';
  }

  reveal(present) {
    const ans = {};
    for (const p of this.active(present)) if (p in this.answers) ans[p] = this.answers[p];
    let hit = 0;
    if (this.engine === 'match') {
      const v = Object.values(ans);
      let pairs = 0, agree = 0;
      for (let a = 0; a < v.length; a++) for (let b = a + 1; b < v.length; b++) { pairs++; if (v[a] === v[b]) agree++; }
      hit = pairs ? agree / pairs : 0;
    } else {
      const guessers = Object.keys(ans).filter(p => p !== this.target);
      let ok = 0;
      for (const p of guessers) {
        const right = ans[p] === ans[this.target];
        const t = (this.tally[p] ||= [0, 0]); t[0] += right ? 1 : 0; t[1] += 1;
        if (right) ok++;
      }
      hit = guessers.length ? ok / guessers.length : 0;
    }
    this.scores.push(hit);
    this.lastHit = Math.round(hit * 100) / 100;
    this.phase = 'reveal';
  }

  next(i, present) {
    if (this.phase === 'reveal' && i === this.i) return this.advance(present);
    return 'noop';
  }

  advance(present) {
    this.i += 1; this.answers = {};
    if (this.i >= this.qs.length) { this.finish(); return 'ok'; }
    this.phase = 'answer';
    this.setTarget(present);
    return this.check(present);
  }

  finish() {
    const pct = this.scores.length ? Math.round(100 * this.scores.reduce((a, b) => a + b, 0) / this.scores.length) : 0;
    const result = {
      pct, verdict: verdict(this.engine, pct),
      recap: this.qs.map((q, k) => ({ q: q.q, hit: Math.round((this.scores[k] ?? 0) * 100) / 100 })),
    };
    const t = Object.entries(this.tally);
    if (t.length) result.bestUid = t.sort((a, b) => b[1][0] / Math.max(b[1][1], 1) - a[1][0] / Math.max(a[1][1], 1))[0][0];
    this.phase = 'done'; this.result = result;
  }

  /** public snapshot; users: {id: {name, emoji}} */
  view(users, present) {
    const v = { kind: this.kind, title: this.title, emoji: this.emoji, engine: this.engine, nsfw: !!GAMES[this.kind].nsfw,
                total: this.qs.length, i: this.i, phase: this.phase };
    if (this.phase === 'done') {
      v.result = { ...this.result };
      if (v.result.bestUid) { v.result.best = users[v.result.bestUid]?.name; delete v.result.bestUid; }
      return v;
    }
    const q = this.qs[this.i];
    v.q = q.q; v.o = q.o; v.answered = Object.keys(this.answers).filter(p => present.includes(p));
    if (this.engine === 'guess' && this.target && users[this.target]) v.target = { uid: this.target, ...users[this.target] };
    if (this.phase === 'reveal') {
      v.reveal = {}; for (const p of present) if (p in this.answers) v.reveal[p] = this.answers[p];
      v.hit = this.lastHit;
    }
    return v;
  }
}
