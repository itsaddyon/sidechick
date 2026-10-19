# sidechick.

**Chat. Play. Poof.** Meet someone new, play quick games, or hang in a private room. Nothing is saved. 18+.

Made by [itsaddyon](https://github.com/itsaddyon) (A²).

## What's inside

| | |
|---|---|
| **Meet someone new** | Omegle-style random chat. Optional interests match you faster. Skip, report, or turn the chat into a game. |
| **Play a game** | No chatting needed. Play with a friend (link), a random stranger, or on one phone (pass and play). |
| **Private room** | Share a 4-letter code or link. Chat, react, play. |
| **Small hooks** | Daily streak, badges, question of the day, icebreaker bulb. All stored on the user's device only. |

**Games (7, 40 to 60 questions each, 10 per round by default):** Same Brain?, Hot Takes, Know Me, Compatibility Quiz, Couple Trivia, Truth or Lie, Spicy or Sweet (18+).
The couple packs started as the v1 questions, unchanged, with new ones added. Add your own in `public/shared/banks.js`.

**Every room holds exactly two people.** Random chats block threats and links, nothing else. Spicy games work with strangers, but the other person has to accept the invite first.

Each game has its own mood: colours, background and display font change per game (see `body[data-theme]` in `public/css/style.css`).

## Run it

```bash
npm install
npm run dev                 # http://localhost:8787
npm test                    # backend end-to-end + UI click-through (boots a local server)
npm run build:brand         # regenerate logo, favicon, app icons and the social preview
npm run build:icons         # regenerate public/js/icons.js from lucide-static
```

## Deploy (Cloudflare, free, no sleeping)

One project, one deploy. The Worker serves the frontend and the realtime backend.

```bash
npx wrangler login
npm run deploy              # https://sidechick.<you>.workers.dev
```

Optional: `npx wrangler secret put SALT` for the anonymous IP hash.

**Free plan (Workers Free):** 100,000 requests/day and 13,000 GB-s of Durable Object time/day, roughly 25 to 30 live room-hours a day. Rooms auto-close after 10 idle minutes (3 hours max). Workers Paid is $5/month if you outgrow it.

## SEO

`public/index.html` has the title, description, canonical, Open Graph and Twitter tags, JSON-LD, and a crawler-visible fallback. The Worker fills in absolute URLs for whatever domain you deploy on and serves `/robots.txt` and `/sitemap.xml`. Social preview is `public/og.png`. The page carries an RTA adult-content label so parental-control filters can block it. Remove the `rating` meta tag if you don't want that.

## Layout

```
src/worker.js        routing, security headers, robots/sitemap, SEO URL fill
src/room.js          one Durable Object per live room (chat, games, safety)
src/matchmaker.js    pairs strangers (interests, patience, cooldowns)
public/              the whole frontend (HTML, CSS, ES modules)
public/shared/       game engine + question banks, used by server AND browser
scripts/             tests and asset builders
legacy/v1/           the original Flask version (git tag: v1-final)
```

## Privacy, honestly

- Messages and answers live in memory only while a room is open. No database, no accounts, no ads, no analytics.
- Nickname, avatar, streak and badges live in the browser (`localStorage`), with an erase button. The streak is a counter on the device: clearing browser data or switching phones resets it, and it can't be shared across devices.
- Random chats block threats and links. Reports end the chat. Three reports against the same anonymous ID in an hour cause a 30-minute cooldown. That uses a random device ID and a one-way IP hash, in memory, never chat content.
- Not end-to-end encrypted: the server relays messages in memory.
- 18+ is self-declared and can't be verified.

Icons are from [Lucide](https://lucide.dev) (ISC).
