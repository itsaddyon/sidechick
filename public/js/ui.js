// Small helpers shared by every screen.
import { icon } from './icons.js';
import { avatar, AVATAR_IDS } from './avatars.js';
import { renderSVG } from '../vendor/uqr.js';
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
export const prefs = { haptics: true };
export const buzz = p => { if (!prefs.haptics) return; try { navigator.vibrate?.(p); } catch {} };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── living background ────────────────────────────────────────────────────────
const THEME_ICONS = {
  brand: ['message-circle', 'dices', 'sparkles', 'gamepad-2', 'heart', 'zap'],
  same_brain: ['brain', 'sparkles', 'zap', 'waves'],
  hot_takes: ['megaphone', 'zap', 'flame', 'message-circle'],
  know_me: ['user-round-search', 'message-circle', 'sparkles', 'smile'],
  compatibility_quiz: ['heart-handshake', 'heart', 'sparkles'],
  couple_trivia: ['target', 'circle-help', 'sparkles', 'heart'],
  flirt_mode: ['heart', 'sparkles', 'cherry', 'laugh'],
  truth_or_lie: ['drama', 'eye-off', 'circle-help', 'ghost'],
  spicy_or_sweet: ['flame', 'cherry', 'heart', 'flame-kindling'],
};
function paintFloaters(name) {
  const box = document.querySelector('.floaters'); if (!box) return;
  const set = THEME_ICONS[name] || THEME_ICONS.brand, items = [];
  for (let i = 0; i < 16; i++) {
    const size = 20 + Math.round(Math.random() * 26), s = document.createElement('span');
    s.className = 'fl';
    s.style.cssText = `left:${Math.round(Math.random() * 96)}%;animation-duration:${22 + Math.round(Math.random() * 28)}s;animation-delay:-${Math.round(Math.random() * 40)}s;--s:${(0.6 + Math.random() * 0.9).toFixed(2)};--o:${(0.1 + Math.random() * 0.14).toFixed(2)};--x:${Math.round(-60 + Math.random() * 120)}px`;
    s.append(icon(set[i % set.length], size)); items.push(s);
  }
  box.replaceChildren(...items);
}
/** Switches colours, display font, background shapes and mood for the current screen (see css body[data-theme]). */
export function setTheme(name) {
  const n = name || 'brand';
  if (document.body.dataset.theme === n) return;
  document.body.dataset.theme = n; paintFloaters(n);
}
export function initBackdrop() {
  paintFloaters(document.body.dataset.theme || 'brand');
  let raf = 0;
  const move = e => {                                         // a soft glow follows your finger or cursor
    const p = e.touches ? e.touches[0] : e; if (!p) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { document.body.style.setProperty('--mx', p.clientX + 'px'); document.body.style.setProperty('--my', p.clientY + 'px'); });
  };
  window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('touchmove', move, { passive: true });
}

let toastT;
export function toast(text, ms = 2800) {
  const el = $('#toast'); if (!el) return;
  el.textContent = text; el.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), ms);
}

/** Confetti in the current screen's accent colour (never a rainbow). */
export function confetti(n = 36) {
  if (reduced() || document.body.classList.contains('calm')) return;
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

/** Share options that actually help: native share, WhatsApp, Telegram, copy, and a QR code for people sitting next to you. */
export function shareSheet({ title = 'Share', text, url }, onDone) {
  const full = encodeURIComponent(`${text} ${url}`), u = encodeURIComponent(url), t = encodeURIComponent(text);
  const done = () => onDone?.();
  const row = (ic, label, props) => h(props.href ? 'a' : 'button', { class: 'share-row', ...props }, iconBox(ic, 22), h('span', {}, label), icon('arrow-right', 18, 'go'));
  const qr = h('div', { class: 'qr', hidden: true });
  const s = sheet(h('div', { class: 'mode' }, h('h3', {}, title), h('p', { class: 'sub' }, 'Pick how to send it.'),
    navigator.share ? row('share-2', 'Share…', { type: 'button', onclick: async () => { if (await share({ text, url }) === 'shared') { done(); s.close(); } } }) : null,
    row('message-circle', 'WhatsApp', { href: `https://wa.me/?text=${full}`, target: '_blank', rel: 'noopener', onclick: done }),
    row('send', 'Telegram', { href: `https://t.me/share/url?url=${u}&text=${t}`, target: '_blank', rel: 'noopener', onclick: done }),
    row('copy', 'Copy link', { type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(url); toast('Link copied'); done(); } catch { toast(url); } } }),
    row('qr-code', 'Show QR code', { type: 'button', onclick: () => { if (!qr.innerHTML) qr.innerHTML = renderSVG(url, { border: 2, whiteColor: '#ffffff', blackColor: '#0E0D12' }); qr.hidden = !qr.hidden; } }),
    qr, h('button', { class: 'btn ghost', onclick: () => s.close() }, 'Close')));
  return s;
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
