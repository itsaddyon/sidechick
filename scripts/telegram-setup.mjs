// Finds your Telegram chat id and stores it for local development.
//   1. Open your bot in Telegram and send it any message (for example /start).
//   2. Run: npm run telegram:setup
// Secrets live in .dev.vars (gitignored). For production use `npx wrangler secret put TELEGRAM_BOT_TOKEN` and `... TELEGRAM_CHAT_ID`.
import fs from 'node:fs';

const FILE = '.dev.vars';
const read = () => Object.fromEntries((fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8') : '').split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const write = o => fs.writeFileSync(FILE, Object.entries(o).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');

async function main() {
  const vars = read();
  const token = process.env.TELEGRAM_BOT_TOKEN || vars.TELEGRAM_BOT_TOKEN;
  if (!token) return console.log('Put TELEGRAM_BOT_TOKEN=... in .dev.vars first.');
  const api = (m, body) => fetch(`https://api.telegram.org/bot${token}/${m}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined).then(r => r.json());

  const me = await api('getMe');
  if (!me.ok) return console.log('Telegram rejected the token:', me.description);
  console.log(`Bot found: @${me.result.username}`);
  vars.TELEGRAM_BOT_TOKEN = token;

  if (!vars.TELEGRAM_CHAT_ID) {
    const up = await api('getUpdates');
    const chat = [...(up.result || [])].reverse().map(u => u.message?.chat || u.channel_post?.chat).find(c => c);
    if (!chat) { write(vars); return console.log(`No messages yet. Open https://t.me/${me.result.username}, press Start, send "hi", then run this again.`); }
    vars.TELEGRAM_CHAT_ID = String(chat.id);
    console.log(`Chat found: ${chat.type} ${chat.first_name || chat.title || ''} (${chat.id})`);
  }
  write(vars);
  const sent = await api('sendMessage', { chat_id: vars.TELEGRAM_CHAT_ID, text: 'Sidechick is connected. Suggestions from the app will show up here.' });
  console.log(sent.ok ? 'Test message sent. Check Telegram.' : 'Could not send: ' + sent.description);
  console.log('\nFor production, run these two (it will ask you to paste each value):\n  npx wrangler secret put TELEGRAM_BOT_TOKEN\n  npx wrangler secret put TELEGRAM_CHAT_ID');
}
main();
