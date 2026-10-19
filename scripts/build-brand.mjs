// Generates the Sidechick brand assets (logo, favicon, app icons, social preview) with outlined text,
// so they look identical everywhere with no font loading. Run: node scripts/build-brand.mjs
import fs from 'node:fs';
import opentype from 'opentype.js';
import sharp from 'sharp';

const INK = '#0E0D12', CREAM = '#F6F1E7', CORAL = '#FF5B3A', MUTE = '#A9A39A';
const font = opentype.parse(fs.readFileSync('node_modules/@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff').buffer.slice(0));
// per-glyph layout (avoids opentype.js GSUB shaping, which chokes on this font)
const layout = (s, size) => {
  const sc = size / font.unitsPerEm; let x = 0, prev = null; const out = [];
  for (const ch of s) {
    const g = font.charToGlyph(ch);
    if (prev) { const k = font.getKerningValue(prev, g); if (Number.isFinite(k)) x += k * sc; }
    out.push([g, x]); x += g.advanceWidth * sc; prev = g;
  }
  return { out, width: x };
};
const text = (s, x, y, size, fill, anchor = 'start') => {
  const L = layout(s, size);
  const ox = anchor === 'middle' ? x - L.width / 2 : anchor === 'end' ? x - L.width : x;
  const parts = L.out.map(([g, gx]) => `<path transform="translate(${(ox + gx).toFixed(2)} ${y})" d="${g.getPath(0, 0, size).toPathData(2)}"/>`).join('');
  return { svg: `<g fill="${fill}">${parts}</g>`, width: L.width };
};

// The mark: two chat bubbles. One is mid-sentence (typing dots), one is the reply.
const mark = (bg = true) => `
${bg ? `<rect width="64" height="64" rx="18" fill="${CORAL}"/>` : ''}
<rect x="8" y="10" width="32" height="24" rx="10" fill="${CREAM}"/><polygon points="14,31 14,43 26,33" fill="${CREAM}"/>
<rect x="22" y="24" width="36" height="28" rx="12" fill="${CORAL}"/><polygon points="48,48 50,59 38,50" fill="${CORAL}"/>
<rect x="25" y="27" width="30" height="22" rx="9" fill="${INK}"/><polygon points="47,46 48,56 39,48" fill="${INK}"/>
<circle cx="34" cy="38" r="2.4" fill="${CREAM}"/><circle cx="40" cy="38" r="2.4" fill="${CREAM}"/><circle cx="46" cy="38" r="2.4" fill="${CREAM}"/>`;

fs.mkdirSync('public/brand', { recursive: true });

// favicon (mark only)
fs.writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark()}</svg>`);

// horizontal logo (mark + wordmark)
const wm = text('sidechick', 76, 46, 40, CREAM), dot = text('.', 76 + wm.width, 46, 40, CORAL);
const logoW = Math.ceil(76 + wm.width + dot.width + 6);
fs.writeFileSync('public/logo.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${logoW} 64" width="${logoW}" height="64" role="img" aria-label="Sidechick">${mark()}${wm.svg}${dot.svg}</svg>`);

// app icons
const svgMark = (pad = 0) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${64 + pad * 2} ${64 + pad * 2}"><rect x="${-pad}" y="${-pad}" width="${64 + pad * 2}" height="${64 + pad * 2}" fill="${CORAL}"/>${mark(false)}</svg>`);
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark()}</svg>`)).resize(32, 32).png().toFile('public/brand/favicon-32.png');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark()}</svg>`)).resize(192, 192).png().toFile('public/brand/icon-192.png');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${mark()}</svg>`)).resize(512, 512).png().toFile('public/brand/icon-512.png');
await sharp(svgMark(10)).resize(512, 512).png().toFile('public/brand/icon-maskable-512.png');
await sharp(svgMark(6)).resize(180, 180).png().toFile('public/brand/apple-touch-icon.png');

// social preview 1200x630
const t1 = text('sidechick', 330, 330, 150, CREAM), t1d = text('.', 330 + t1.width, 330, 150, CORAL);
const t2 = text('Chat. Play. Poof.', 334, 420, 66, CORAL);
const t3 = text('Random chats, quick games, private rooms.', 334, 485, 34, MUTE);
const t4 = text('Nothing is saved. 18+', 334, 530, 34, MUTE);
const by = text('A\u00B2  itsaddyon', 1140, 585, 28, MUTE, 'end');
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><radialGradient id="a" cx="85%" cy="10%" r="60%"><stop offset="0" stop-color="${CORAL}" stop-opacity=".55"/><stop offset="1" stop-color="${CORAL}" stop-opacity="0"/></radialGradient>
<radialGradient id="b" cx="5%" cy="100%" r="55%"><stop offset="0" stop-color="#7A5CFF" stop-opacity=".45"/><stop offset="1" stop-color="#7A5CFF" stop-opacity="0"/></radialGradient></defs>
<rect width="1200" height="630" fill="${INK}"/><rect width="1200" height="630" fill="url(#a)"/><rect width="1200" height="630" fill="url(#b)"/>
<g transform="translate(70 190) scale(3.9)">${mark()}</g>${t1.svg}${t1d.svg}${t2.svg}${t3.svg}${t4.svg}${by.svg}</svg>`;
fs.writeFileSync('public/brand/og.svg', og);
await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile('public/og.png');

fs.writeFileSync('public/manifest.webmanifest', JSON.stringify({
  name: 'Sidechick', short_name: 'Sidechick', description: 'Random chats, quick games and private rooms. Nothing is saved. 18+.',
  start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait', background_color: INK, theme_color: INK, categories: ['social', 'games'],
  icons: [{ src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }, { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
}, null, 2));
console.log('brand assets written');
