// Small helpers shared by every screen.
import { icon } from './icons.js';
import { avatar, AVATAR_IDS } from './avatars.js';
export { icon, avatar, AVATAR_IDS };
export const $ = (s, r = document) => r.querySelector(s);

export function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(k)); }
  return e;
}

export const rand = a => a[Math.floor(Math.random() * a.length)];
export const buzz = p => { try { navigator.vibrate?.(p); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Switches colours, display font and background for the current screen (see css [data-theme]). */
export const setTheme = name => { document.body.dataset.theme = name || 'brand'; };

let toastT;
export function toast(text, ms = 2800) {
  const el = $('#toast'); if (!el) return;
  el.textContent = text; el.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), ms);
}

/** Confetti in the current screen's accent colour (never a rainbow). */
export function confetti(n = 36) {
  if (reduced()) return;
  const shapes = ['c-dot', 'c-sq', 'c-bar'], tones = ['t1', 't2', 't1', 't3'];
  for (let i = 0; i < n; i++) {
    const c = h('i', { class: `confetti ${shapes[i % 3]} ${tones[i % 4]}`, style: `left:${Math.random() * 100}vw;animation-delay:${Math.random() * 0.5}s;animation-duration:${2 + Math.random() * 1.6}s` });
    document.body.append(c); setTimeout(() => c.remove(), 4000);
  }
}

/** Bottom sheet. Returns { close, el }. */
export function sheet(content, { onclose } = {}) {
  const layer = $('#layer');
  const close = () => { wrap.remove(); onclose?.(); };
  const wrap = h('div', { class: 'sheet', onclick: e => { if (e.target === wrap) close(); } },
    h('div', { class: 'sheet-card', role: 'dialog' }, h('div', { class: 'grab' }), content));
  layer.append(wrap);
  return { close, el: wrap };
}

export async function share({ title = 'Sidechick', text, url }) {
  try { if (navigator.share) { await navigator.share({ title, text, url }); return 'shared'; } }
  catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  try { await navigator.clipboard.writeText([text, url].filter(Boolean).join('\n')); toast('Copied. Paste it anywhere.'); return 'copied'; }
  catch { toast(url || text); return 'failed'; }
}

export function countUp(el, to, ms = 900) {
  if (reduced() || to === 0) { el.textContent = String(to); return; }
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / ms); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

export function avatarPicker(current, onPick) {
  const grid = h('div', { class: 'avatar-grid' });
  AVATAR_IDS.forEach(id => grid.append(h('button', { type: 'button', class: id === current ? 'on' : '', 'aria-label': 'Choose avatar ' + id,
    onclick: ev => { onPick(id); grid.querySelectorAll('button').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); buzz(6); } }, avatar(id, 46))));
  return grid;
}

/** Icon inside a coloured rounded square, used for tiles and cards. */
export const iconBox = (name, size = 24, cls = '') => h('span', { class: 'icon-box ' + cls }, icon(name, size));
