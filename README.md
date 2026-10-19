# sidechick.

**Chat. Play. Poof. 💨** Meet someone new, play quick games, or hang in a private room. Nothing is saved. 18+.

## What's inside

| | |
|---|---|
| 🎭 **Meet someone new** | Omegle-style random chat. Optional interests match you faster. Skip, report, or turn the chat into a game. |
| 🎮 **Play a game** | No chatting needed. Play with a friend (link), a random stranger, or on one phone (pass and play). |
| 🔒 **Private room** | Share a 4-letter code or link. Chat, react, play. |
| ✨ **Small hooks** | Daily streak, badges, question of the day, icebreaker button. All stored on the user's device only. |

**Games:** Same Brain?, Hot Takes, Know Me, Compatibility Quiz, Couple Trivia, Truth or Lie, Spicy or Sweet (18+).
The four couple packs are the original v1 questions, unchanged. Spicy packs only work in private rooms and same-phone, never with strangers.

## Run it

```bash
npm install
npm run dev          # http://localhost:8787
npm test             # backend end-to-end test (boots a local server)
node scripts/ui-smoke.mjs   # clicks through the real UI in jsdom
```

## Deploy (Cloudflare, free, no sleeping)

One project, one deploy. The Worker serves the frontend *and* the realtime backend, so there is no separate frontend folder.

```bash
npx wrangler login
npm run deploy       # gives you https://sidechick.<you>.workers.dev
```

Optional: set a secret salt for the anonymous IP hash with `npx wrangler secret put SALT`.

**Free-plan limits (Workers Free):** 100,000 requests/day and 13,000 GB-s of Durable Object time/day. Each open room costs duration while people are connected, so expect roughly 25 to 30 room-hours of live chat per day. That covers a campus launch. If you outgrow it, Workers Paid is $5/month. Rooms auto-close after 10 idle minutes (3 hours max) to stay inside the limits.

## Layout

```
src/worker.js        routes /ws/* and /api/*, serves the site
src/room.js          one Durable Object per live room (chat, games, safety)
src/matchmaker.js    pairs strangers (interests, patience, cooldowns)
public/              the whole frontend (HTML, CSS, ES modules)
public/shared/       game engine + question banks, used by server AND browser
scripts/             tests
legacy/v1/           the original Flask version (git tag: v1-final)
```

## Privacy, honestly

- Messages and answers live in memory only while a room is open. No database, no accounts, no ads, no analytics.
- Profile, streak and badges stay in the browser (`localStorage`), with an "erase everything" button.
- Random chats block links, phone numbers, emails and explicit solicitation. Reports end the chat. Repeat reports trigger a 30-minute cooldown, tracked by an anonymous ID and a hashed IP in memory, never with chat content.
- Not end-to-end encrypted: the server relays messages in memory.
- 18+ is self-declared. It can't be verified.

Built by Team Grey Hats.
