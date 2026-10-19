// Little illustrated faces used instead of emoji avatars. Pure SVG, 12 of them, ids a0..a11.
const INK = '#14110F';
const COLORS = ['#FF8A5B', '#FFC53D', '#C9E265', '#5ED6A0', '#59C7F0', '#7C9CFF', '#A18BFF', '#E58BFF', '#FF86B3', '#F2A38F', '#BFC9D8', '#F5E9C8'];
const SPEC = [
  ['dots', 'smile', 'blush'], ['happy', 'grin', ''], ['wide', 'open', ''], ['wink', 'smirk', 'blush'],
  ['shades', 'smile', ''], ['sleepy', 'flat', ''], ['dots', 'tongue', ''], ['happy', 'smile', 'blush'],
  ['wink', 'grin', 'freckles'], ['wide', 'smile', 'freckles'], ['shades', 'smirk', ''], ['dots', 'open', 'blush'],
];
const EYES = {
  dots: `<circle cx="23" cy="27" r="3.2" fill="${INK}"/><circle cx="41" cy="27" r="3.2" fill="${INK}"/>`,
  happy: `<path d="M18 29q5-7 10 0M36 29q5-7 10 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  wide: `<circle cx="23" cy="27" r="5.5" fill="#fff"/><circle cx="41" cy="27" r="5.5" fill="#fff"/><circle cx="24" cy="28" r="2.6" fill="${INK}"/><circle cx="40" cy="28" r="2.6" fill="${INK}"/>`,
  wink: `<circle cx="23" cy="27" r="3.2" fill="${INK}"/><path d="M36 28q5-6 10 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  sleepy: `<path d="M18 28h10M36 28h10" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  shades: `<rect x="15" y="22" width="15" height="10" rx="4" fill="${INK}"/><rect x="34" y="22" width="15" height="10" rx="4" fill="${INK}"/><path d="M30 26h4" stroke="${INK}" stroke-width="2.5"/>`,
};
const MOUTHS = {
  smile: `<path d="M23 38q9 9 18 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  grin: `<path d="M21 37h22q-2 12-11 12t-11-12z" fill="${INK}"/><path d="M24 40h16" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  open: `<ellipse cx="32" cy="43" rx="5" ry="6" fill="${INK}"/>`,
  flat: `<path d="M25 42h14" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  smirk: `<path d="M24 41q8 5 16-3" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  tongue: `<path d="M23 38q9 9 18 0z" fill="${INK}"/><path d="M29 42q3 8 7 1z" fill="#FF6B8B"/>`,
};
const EXTRA = {
  blush: `<ellipse cx="15" cy="37" rx="4" ry="2.6" fill="#FF5B7F" opacity=".45"/><ellipse cx="49" cy="37" rx="4" ry="2.6" fill="#FF5B7F" opacity=".45"/>`,
  freckles: `<g fill="${INK}" opacity=".35"><circle cx="19" cy="35" r="1"/><circle cx="23" cy="37" r="1"/><circle cx="45" cy="37" r="1"/><circle cx="41" cy="35" r="1"/></g>`,
};

export const AVATAR_IDS = SPEC.map((_, i) => 'a' + i);

export function avatarSvg(id, size = 40) {
  const i = Math.max(0, Math.min(11, parseInt(String(id).slice(1), 10) || 0));
  const [e, m, x] = SPEC[i];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Avatar"><circle cx="32" cy="32" r="32" fill="${COLORS[i]}"/>${EXTRA[x] || ''}${EYES[e]}${MOUTHS[m]}</svg>`;
}

export function avatar(id, size = 40, cls = '') {
  const s = document.createElement('span');
  s.className = 'avatar' + (cls ? ' ' + cls : '');
  s.style.width = s.style.height = size + 'px';
  s.innerHTML = avatarSvg(id, size);
  return s;
}
