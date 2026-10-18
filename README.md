# sidechick.

**Chat. Play. Poof. 💨**
Private rooms that disappear when everyone leaves. Chat with your people and play quick games. No sign-up, nothing saved.

## How it works

1. Tap **Start a room**, pick an emoji and a nickname.
2. Hit **Invite** and send the link to friends (WhatsApp, Insta, anywhere).
3. Chat, react to messages, or tap 🎮 to play:
   - 🧠 **Same Brain?** pick one, see if you think alike
   - 🔥 **Hot Takes** agree or nope
   - 🫵 **Know Me** one person answers, everyone else guesses
4. Everyone leaves, the room is gone. Poof.

## Run it

```bash
pip install -r requirements.txt
python app.py        # http://localhost:5000
```

Optional `.env`: `PORT`, `SECRET_KEY`, `CORS_ALLOWED_ORIGINS`.

## Deploy

- **Backend (Render):** `python app.py`. Use a single instance, rooms live in memory.
- **Frontend (Vercel):** run `python build_frontend.py`, then deploy `sidechick-frontend/`. The backend URL is set at the top of `static/js/app.js`.

## Project layout

```
app.py          rooms, chat, game engine (Flask-SocketIO)
games.py        question banks, add your own here
static/         the whole frontend (HTML, CSS, one JS file)
legacy/v1/      the original version, kept for reference (tag: v1-final)
```

## Privacy, honestly

Messages are held in server memory only while a room has people in it. When the last person leaves, the room and its messages are deleted. There is no database and no accounts. Messages are not end-to-end encrypted.

Built by Team Grey Hats.
