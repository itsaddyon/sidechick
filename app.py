# -*- coding: utf-8 -*-
"""Sidechick v2 — tiny private rooms for chatting and playing. Nothing is stored; rooms vanish when empty."""
import eventlet
eventlet.monkey_patch()

import os, random, re, secrets, time
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

import games

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=os.path.join(BASE_DIR, "static"), static_url_path="")
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY") or os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(16)
CORS(app)

origins = os.environ.get("CORS_ALLOWED_ORIGINS", "*").strip()
if origins != "*":
    origins = [o.strip() for o in origins.split(",") if o.strip()]
socketio = SocketIO(app, cors_allowed_origins=origins, async_mode="eventlet")

rooms = {}      # code -> {users:{sid:{name,emoji}}, history:[], game:None, next_id:int}
sid_room = {}   # sid -> code
last_msg_at = {}

CODE_CHARS = "BCDFGHJKLMNPQRSTVWXZ"
MAX_ROOMS, MAX_USERS, MAX_HISTORY = 2000, 8, 120
BLOCKED = re.compile(r"\b(i will kill you|i'll kill you|kill yourself|kys|i know where you live|i will find you|rape)\b", re.I)

VIBES = [
    ("😂", ("lol", "lmao", "haha", "hehe", "😂", "🤣", "💀", "rofl")),
    ("😍", ("love", "miss you", "miss u", "cute", "❤", "😍", "🥰", "babe")),
    ("😢", ("sad", "cry", "crying", "hurt", "lonely", "😢", "😭", "🥺")),
    ("😡", ("angry", "hate", "annoying", "pissed", "😡", "🤬", "ugh")),
    ("🔥", ("wow", "omg", "insane", "crazy", "lit", "fire", "🔥", "yaaas")),
]


def make_code():
    for _ in range(50):
        code = "".join(random.choice(CODE_CHARS) for _ in range(4))
        if code not in rooms:
            return code
    return None


def clean(s, n):
    return re.sub(r"\s+", " ", str(s or "")).strip()[:n]


def vibe_of(history):
    tally = {}
    for m in history[-8:]:
        if m.get("sys"):
            continue
        t = m["text"].lower()
        for emo, words in VIBES:
            if any(w in t for w in words):
                tally[emo] = tally.get(emo, 0) + 1
    return max(tally, key=tally.get) if tally else "✨"


def users_view(room):
    return [{"sid": s, **u} for s, u in room["users"].items()]


def sys_msg(code, text):
    room = rooms.get(code)
    if not room:
        return
    room["next_id"] += 1
    m = {"id": room["next_id"], "sys": True, "text": text, "ts": int(time.time())}
    room["history"].append(m)
    room["history"] = room["history"][-MAX_HISTORY:]
    socketio.emit("msg", m, to=code)


# ── Game engine ──────────────────────────────────────────────────────────────
def present(room, g):
    return [s for s in g["order"] if s in room["users"]]


def set_target(room, g):
    if g["engine"] == "guess":
        act = present(room, g)
        g["target"] = act[g["i"] % len(act)] if act else None


def game_view(room):
    g = room.get("game")
    if not g:
        return None
    users = room["users"]
    v = {"kind": g["kind"], "title": g["title"], "emoji": g["emoji"], "engine": g["engine"],
         "total": len(g["qs"]), "i": g["i"], "phase": g["phase"]}
    if g["phase"] == "done":
        v["result"] = g["result"]
        return v
    q = g["qs"][g["i"]]
    v.update(q=q["q"], o=q["o"], answered=[s for s in g["answers"] if s in users])
    if g["engine"] == "guess" and g.get("target") in users:
        t = users[g["target"]]
        v["target"] = {"sid": g["target"], "name": t["name"], "emoji": t["emoji"]}
    if g["phase"] == "reveal":
        v["reveal"] = {s: c for s, c in g["answers"].items() if s in users}
        v["hit"] = g["last_hit"]
    return v


def push_game(code):
    room = rooms.get(code)
    if room:
        socketio.emit("game", game_view(room), to=code)


def finish_game(room, code):
    g = room["game"]
    pct = round(100 * sum(g["scores"]) / len(g["scores"])) if g["scores"] else 0
    result = {"pct": pct, "verdict": games.verdict(g["engine"], pct),
              "recap": [{"q": q["q"], "hit": round(h, 2)} for q, h in zip(g["qs"], g["scores"])]}
    if g["engine"] == "guess" and g.get("tally"):
        best = max(g["tally"], key=lambda s: g["tally"][s][0] / max(g["tally"][s][1], 1))
        if best in room["users"]:
            result["best"] = room["users"][best]["name"]
    g["phase"], g["result"] = "done", result
    push_game(code)


def reveal(room, code):
    g = room["game"]
    ans = {s: c for s, c in g["answers"].items() if s in room["users"]}
    if g["engine"] == "match":
        vals = list(ans.values())
        pairs = [(a, b) for i, a in enumerate(vals) for b in vals[i + 1:]]
        hit = sum(1 for a, b in pairs if a == b) / len(pairs) if pairs else 0
    else:
        t = g.get("target")
        guessers = [s for s in ans if s != t]
        hits = {s: ans[s] == ans.get(t) for s in guessers}
        for s, ok in hits.items():
            c = g.setdefault("tally", {}).setdefault(s, [0, 0])
            c[0] += int(ok); c[1] += 1
        hit = sum(hits.values()) / len(hits) if hits else 0
    g["scores"].append(hit)
    g["last_hit"] = round(hit, 2)
    g["phase"] = "reveal"
    push_game(code)


def progress(room, code):
    """Call whenever answers or players change."""
    g = room.get("game")
    if not g or g["phase"] != "answer":
        return
    act = present(room, g)
    if len(act) < 2:
        room["game"] = None
        socketio.emit("game", None, to=code)
        socketio.emit("toast", {"text": "Game ended. You need at least 2 people."}, to=code)
        return
    if g["engine"] == "guess" and g.get("target") not in room["users"]:
        advance(room, code)
        return
    if all(s in g["answers"] for s in act):
        reveal(room, code)
    else:
        push_game(code)


def advance(room, code):
    g = room["game"]
    g["i"] += 1
    g["answers"] = {}
    if g["i"] >= len(g["qs"]):
        finish_game(room, code)
        return
    g["phase"] = "answer"
    set_target(room, g)
    progress(room, code)


# ── HTTP ─────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/health")
def health():
    return jsonify(ok=True, rooms=len(rooms))


# ── Sockets ──────────────────────────────────────────────────────────────────
@socketio.on("create")
def on_create():
    if len(rooms) >= MAX_ROOMS:
        emit("toast", {"text": "We're full right now. Try again in a minute."})
        return
    code = make_code()
    if not code:
        emit("toast", {"text": "Couldn't make a room. Try again."})
        return
    rooms[code] = {"users": {}, "history": [], "game": None, "next_id": 0}
    emit("created", {"room": code})


@socketio.on("join")
def on_join(d):
    from flask import request
    code = clean((d or {}).get("room"), 4).upper()
    room = rooms.get(code)
    if not room:
        emit("join_error", {"text": "No room with that code. Check it and try again."})
        return
    if len(room["users"]) >= MAX_USERS:
        emit("join_error", {"text": "That room is full."})
        return
    sid = request.sid
    name = clean(d.get("name"), 16) or "Guest"
    taken = {u["name"].lower() for u in room["users"].values()}
    base, n = name, 2
    while name.lower() in taken:
        name, n = f"{base} {n}", n + 1
    room["users"][sid] = {"name": name, "emoji": clean(d.get("emoji"), 4) or "😎"}
    sid_room[sid] = code
    join_room(code)
    emit("joined", {"room": code, "you": sid, "users": users_view(room),
                    "history": room["history"], "game": game_view(room), "vibe": vibe_of(room["history"])})
    socketio.emit("users", users_view(room), to=code)
    sys_msg(code, f"{name} joined")


def leave(sid):
    code = sid_room.pop(sid, None)
    room = rooms.get(code)
    if not room or sid not in room["users"]:
        return
    name = room["users"].pop(sid)["name"]
    leave_room(code, sid=sid)
    if not room["users"]:
        rooms.pop(code, None)  # poof
        return
    sys_msg(code, f"{name} left")
    socketio.emit("users", users_view(room), to=code)
    progress(room, code)


@socketio.on("disconnect")
def on_disconnect():
    from flask import request
    last_msg_at.pop(request.sid, None)
    leave(request.sid)


@socketio.on("leave")
def on_leave():
    from flask import request
    leave(request.sid)


@socketio.on("msg")
def on_msg(d):
    from flask import request
    sid = request.sid
    code = sid_room.get(sid)
    room = rooms.get(code)
    text = clean((d or {}).get("text"), 500)
    if not room or not text:
        return
    now = time.time()
    if now - last_msg_at.get(sid, 0) < 0.25:
        return
    last_msg_at[sid] = now
    if BLOCKED.search(text):
        emit("toast", {"text": "Not sent. Threats aren't okay here."})
        return
    u = room["users"][sid]
    room["next_id"] += 1
    m = {"id": room["next_id"], "sid": sid, "name": u["name"], "emoji": u["emoji"],
         "text": text, "ts": int(now), "reacts": {}}
    room["history"].append(m)
    room["history"] = room["history"][-MAX_HISTORY:]
    socketio.emit("msg", m, to=code)
    socketio.emit("vibe", {"vibe": vibe_of(room["history"])}, to=code)


@socketio.on("typing")
def on_typing(d):
    from flask import request
    code = sid_room.get(request.sid)
    room = rooms.get(code)
    if room and request.sid in room["users"]:
        emit("typing", {"name": room["users"][request.sid]["name"], "on": bool((d or {}).get("on"))},
             to=code, include_self=False)


@socketio.on("react")
def on_react(d):
    from flask import request
    sid = request.sid
    code = sid_room.get(sid)
    room = rooms.get(code)
    emoji = clean((d or {}).get("emoji"), 4)
    if not room or emoji not in ("❤️", "😂", "🔥", "👍", "😮"):
        return
    for m in room["history"]:
        if m.get("id") == d.get("id") and not m.get("sys"):
            who = m["reacts"].setdefault(emoji, [])
            if sid in who:
                who.remove(sid)
            else:
                who.append(sid)
            if not who:
                m["reacts"].pop(emoji, None)
            socketio.emit("reacts", {"id": m["id"], "reacts": m["reacts"]}, to=code)
            return


@socketio.on("game_start")
def on_game_start(d):
    from flask import request
    code = sid_room.get(request.sid)
    room = rooms.get(code)
    kind = (d or {}).get("kind")
    if not room or kind not in games.GAMES:
        return
    if room["game"] and room["game"]["phase"] != "done":
        emit("toast", {"text": "A game is already running."})
        return
    if len(room["users"]) < 2:
        emit("toast", {"text": "Invite one more person to play 👯"})
        return
    g = games.new_game(kind, list(room["users"]))
    room["game"] = g
    set_target(room, g)
    sys_msg(code, f"{room['users'][request.sid]['name']} started {g['title']} {g['emoji']}")
    push_game(code)


@socketio.on("game_answer")
def on_game_answer(d):
    from flask import request
    sid = request.sid
    code = sid_room.get(sid)
    room = rooms.get(code)
    g = room and room.get("game")
    if not g or g["phase"] != "answer" or (d or {}).get("i") != g["i"] or sid in g["answers"]:
        return
    c = d.get("choice")
    if not isinstance(c, int) or not 0 <= c < len(g["qs"][g["i"]]["o"]):
        return
    g["answers"][sid] = c
    progress(room, code)


@socketio.on("game_next")
def on_game_next(d):
    from flask import request
    code = sid_room.get(request.sid)
    room = rooms.get(code)
    g = room and room.get("game")
    if g and g["phase"] == "reveal" and (d or {}).get("i") == g["i"]:
        advance(room, code)


@socketio.on("game_end")
def on_game_end():
    from flask import request
    code = sid_room.get(request.sid)
    room = rooms.get(code)
    if room and room.get("game"):
        room["game"] = None
        socketio.emit("game", None, to=code)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
