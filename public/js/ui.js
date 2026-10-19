// Small helpers shared by every screen.
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

let toastT;
export function toast(text, ms = 2800) {
  const el = $('#toast'); if (!el) return;
  el.textContent = text; el.classList.add('show'); clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), ms);
}

export function confetti(n = 36) {
  if (reduced()) return;
  const set = ['🎉', '✨', '💛', '🎊', '💖'];
  for (let i = 0; i < n; i++) {
    const c = h('div', { class: 'confetti', style: `left:${Math.random() * 100}vw;animation-delay:${Math.random() * 0.5}s;font-size:${18 + Math.random() * 14}px` }, set[i % set.length]);
    document.body.append(c); setTimeout(() => c.remove(), 3200);
  }
}

/** Bottom sheet. Returns { close, el }. content: element(s). */
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
  try { await navigator.clipboard.writeText([text, url].filter(Boolean).join('\n')); toast('Copied. Paste it anywhere 📋'); return 'copied'; }
  catch { toast(url || text); return 'failed'; }
}

export function countUp(el, to, ms = 900) {
  if (reduced() || to === 0) { el.textContent = String(to); return; }
  const t0 = performance.now();
  const step = t => { const k = Math.min(1, (t - t0) / ms); el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

export function emojiPicker(list, current, onPick) {
  const grid = h('div', { class: 'emoji-grid' });
  list.forEach(e => grid.append(h('button', { type: 'button', class: e === current ? 'on' : '', 'aria-label': 'Avatar ' + e,
    onclick: ev => { onPick(e); grid.querySelectorAll('button').forEach(b => b.classList.remove('on')); ev.currentTarget.classList.add('on'); buzz(6); } }, e)));
  return grid;
}
