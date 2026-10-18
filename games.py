# -*- coding: utf-8 -*-
"""Question banks for Sidechick games. Keep it light, funny, and safe for friends AND couples."""
import random

GAMES = {
    # kind: (engine, title, emoji, one-line pitch)
    "same_brain": ("match", "Same Brain?", "🧠", "Pick one. See if you think alike."),
    "hot_takes": ("match", "Hot Takes", "🔥", "Agree or nope. Defend your take."),
    "know_me": ("guess", "Know Me", "🫵", "One answers. Everyone else guesses."),
}

BANKS = {
    "same_brain": [
        ("Chai or coffee?", ["☕ Chai", "🧋 Coffee"]),
        ("Night owl or early bird?", ["🦉 Night owl", "🐦 Early bird"]),
        ("Call or text?", ["📞 Call", "💬 Text"]),
        ("Beach trip or mountain trip?", ["🏖️ Beach", "🏔️ Mountains"]),
        ("Biryani or pizza?", ["🍛 Biryani", "🍕 Pizza"]),
        ("Plan everything or go with the flow?", ["📋 Plan it", "🌊 Wing it"]),
        ("Reels or YouTube?", ["📱 Reels", "▶️ YouTube"]),
        ("Movie night or game night?", ["🎬 Movie", "🎮 Game"]),
        ("Reply instantly or reply when free?", ["⚡ Instantly", "🐢 Later"]),
        ("Rain or sunshine?", ["🌧️ Rain", "☀️ Sun"]),
        ("Sweet or spicy?", ["🍰 Sweet", "🌶️ Spicy"]),
        ("Big party or small hangout?", ["🎉 Big party", "🛋️ Small hangout"]),
        ("Save money or spend and enjoy?", ["🏦 Save", "🛍️ Spend"]),
        ("Voice note or typing?", ["🎙️ Voice note", "⌨️ Typing"]),
        ("Dogs or cats?", ["🐶 Dogs", "🐱 Cats"]),
        ("Road trip or flight?", ["🚗 Road trip", "✈️ Flight"]),
        ("Study at night or study in the morning?", ["🌙 Night", "🌅 Morning"]),
        ("Dark mode or light mode?", ["🌑 Dark", "🌕 Light"]),
        ("Selfie or candid?", ["🤳 Selfie", "📸 Candid"]),
        ("Street food or fancy dinner?", ["🥟 Street food", "🍽️ Fancy dinner"]),
    ],
    "hot_takes": [
        ("Pineapple on pizza is fine.", ["👍 Agree", "👎 Nope"]),
        ("Leaving someone on seen is rude.", ["👍 Agree", "👎 Nope"]),
        ("Group projects are always unfair.", ["👍 Agree", "👎 Nope"]),
        ("Mornings are overrated.", ["👍 Agree", "👎 Nope"]),
        ("Everyone should have a gap year.", ["👍 Agree", "👎 Nope"]),
        ("Texting back fast means you care.", ["👍 Agree", "👎 Nope"]),
        ("Cooking is more fun than eating out.", ["👍 Agree", "👎 Nope"]),
        ("Old songs beat new songs.", ["👍 Agree", "👎 Nope"]),
        ("Social media makes us lonelier.", ["👍 Agree", "👎 Nope"]),
        ("Being on time is a personality trait.", ["👍 Agree", "👎 Nope"]),
        ("Splitting the bill equally is the only fair way.", ["👍 Agree", "👎 Nope"]),
        ("You can stay friends with an ex.", ["👍 Agree", "👎 Nope"]),
        ("Attendance rules are pointless.", ["👍 Agree", "👎 Nope"]),
        ("Cricket is better than any other sport.", ["👍 Agree", "👎 Nope"]),
        ("Remote work beats going to an office.", ["👍 Agree", "👎 Nope"]),
        ("Sleeping in till noon is self-care.", ["👍 Agree", "👎 Nope"]),
        ("It's okay to rewatch the same show 10 times.", ["👍 Agree", "👎 Nope"]),
        ("Surprise parties are stressful, not sweet.", ["👍 Agree", "👎 Nope"]),
    ],
    "know_me": [
        ("My ideal weekend is…", ["Sleeping all day", "Out with friends", "Trying new food", "Netflix and snacks"]),
        ("When I'm stressed, I…", ["Go quiet", "Talk to everyone", "Eat something", "Sleep it off"]),
        ("My comfort food is…", ["Maggi", "Biryani", "Chocolate", "Chai and biscuits"]),
        ("My biggest red flag is…", ["Late replies", "Being messy", "Overthinking", "Zero plans"]),
        ("I'd pick this superpower…", ["Fly", "Read minds", "Time travel", "Be invisible"]),
        ("My phone battery is usually…", ["Above 60%", "Around 30%", "Under 10%", "Dead right now"]),
        ("My go-to excuse for being late is…", ["Traffic", "Phone died", "Still getting ready", "I'm never late"]),
        ("Dream trip: I'd go to…", ["Goa", "Japan", "Switzerland", "Ladakh"]),
        ("My screen time is mostly…", ["Reels", "Chats", "Games", "Music"]),
        ("If I won a lottery, first thing I'd buy…", ["A phone", "A trip", "A house", "Treat everyone"]),
        ("My texting style is…", ["Short and dry", "Essays", "All memes", "Voice notes only"]),
        ("My secret talent is…", ["Singing", "Cooking", "Acting", "Randomly knowing facts"]),
        ("On a free day I'd choose…", ["Gym", "Gaming", "Cafe hopping", "Sleeping"]),
        ("My love language is…", ["Quality time", "Gifts", "Words", "Help with stuff"]),
        ("I'm the friend who…", ["Plans everything", "Brings snacks", "Starts the drama", "Fixes the drama"]),
        ("My most used emoji is…", ["😂", "💀", "🥺", "🔥"]),
    ],
}

ROUNDS = 8  # questions per game, short on purpose


def new_game(kind, players):
    """players: list of sids. Returns a fresh game dict (server-side truth)."""
    engine, title, emoji, _ = GAMES[kind]
    pool = BANKS[kind][:]
    random.shuffle(pool)
    qs = [{"q": q, "o": o} for q, o in pool[:ROUNDS]]
    order = players[:]
    random.shuffle(order)
    return {
        "kind": kind, "engine": engine, "title": title, "emoji": emoji,
        "qs": qs, "i": 0, "phase": "answer", "order": order,
        "answers": {}, "scores": [], "players": set(players),
    }


def verdict(engine, pct):
    if engine == "guess":
        if pct >= 80: return "You two basically share a brain 🧠"
        if pct >= 55: return "You know each other pretty well 👀"
        if pct >= 30: return "Still getting to know each other 🌱"
        return "Strangers? Time to talk more 😅"
    if pct >= 85: return "Same brain. Kinda scary. 🧠"
    if pct >= 65: return "Pretty in sync ✨"
    if pct >= 40: return "Opposites attract? 🧲"
    return "Total chaos. Love it. 🎢"
