# -*- coding: utf-8 -*-
"""Sidechick — Real-Time Chat Companion."""
import eventlet
eventlet.monkey_patch()
import random, os, json, requests, time, hashlib, csv, io, secrets
from flask import Flask, render_template, request, jsonify, Response
from flask_socketio import SocketIO, emit, join_room, leave_room
from textblob import TextBlob
from datetime import datetime
from sequence_model import build_bootstrapped_sequence_model, dataset_bundle


try:
    from dotenv import load_dotenv
    _DOTENV_AVAILABLE = True
    load_dotenv()
except Exception:
    _DOTENV_AVAILABLE = False
    # Optional dependency; app works without .env support.
    pass

app = Flask(__name__)
secret_key = os.environ.get('SECRET_KEY') or os.environ.get('FLASK_SECRET_KEY')
if not secret_key:
    secret_key = secrets.token_hex(32)
app.config['SECRET_KEY'] = secret_key

cors_origins = os.environ.get('CORS_ALLOWED_ORIGINS', '*').strip()
if cors_origins != '*':
    cors_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
socketio = SocketIO(app, cors_allowed_origins=cors_origins, async_mode='eventlet')
rooms = {}  # room_id -> { history: [], users: {} }
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "artifacts")
MODEL_PATH = os.path.join(MODEL_DIR, "sequence_model.json")
SEQUENCE_MODEL = build_bootstrapped_sequence_model(MODEL_PATH)

# ── Cache / rate limit ─────────────────────────────────────────────────────
_ai_cache = {
    'infer': {},
    'summary': {},
    'reply': {},
    'fact': {}
}
_rate_limit = {
    'infer': {},
    'summary': {},
    'reply': {},
    'fact': {}
}

def _cache_get(scope, key, ttl=600):
    entry = _ai_cache.get(scope, {}).get(key)
    if not entry:
        return None
    if time.time() - entry['ts'] > ttl:
        try:
            del _ai_cache[scope][key]
        except Exception:
            pass
        return None
    return entry['value']

def _cache_set(scope, key, value):
    _ai_cache.setdefault(scope, {})[key] = {'ts': time.time(), 'value': value}

def _rate_limited(scope, key, min_seconds):
    last = _rate_limit.get(scope, {}).get(key)
    if last and (time.time() - last) < min_seconds:
        return True
    _rate_limit.setdefault(scope, {})[key] = time.time()
    return False

# ── OpenRouter helper ───────────────────────────────────────────────────────
_last_openrouter_error = None

def get_openrouter_key():
    if _DOTENV_AVAILABLE:
        # Refresh env from .env on each call in case it changed.
        load_dotenv(override=True)
    return os.environ.get("OPENROUTER_API_KEY", "").strip()

def get_openrouter_model():
    if _DOTENV_AVAILABLE:
        load_dotenv(override=True)
    model = os.environ.get("OPENROUTER_MODEL", "openrouter/auto").strip()
    return model or "openrouter/auto"

def ask_ai(system_prompt, user_msg, max_tokens=200):
    """Call OpenRouter free model. Falls back to None if no key or error."""
    global _last_openrouter_error
    api_key = get_openrouter_key()
    if not api_key:
        _last_openrouter_error = {"code": "missing_key", "detail": "OPENROUTER_API_KEY not set"}
        return None
    model = get_openrouter_model()
    try:
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5000",
                "X-Title": "Sidechick"
            },
            json={
                "model": model,
                "max_tokens": max_tokens,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ]
            },
            timeout=8
        )
        if not resp.ok:
            detail = None
            try:
                detail = resp.json().get("error")
            except Exception:
                detail = resp.text[:200]
            _last_openrouter_error = {
                "code": f"http_{resp.status_code}",
                "detail": detail or "OpenRouter request failed"
            }
            return None
        data = resp.json()
        _last_openrouter_error = None
        return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        _last_openrouter_error = {"code": "exception", "detail": str(exc)[:200]}
        return None


# ── Word lists ──────────────────────────────────────────────────────────────
THREAT_WORDS = [
    "kill", "i'll kill", "you'll regret", "you will regret", "make you pay",
    "i know where you", "come find you", "hurt you", "destroy you",
    "you're dead", "ur dead", "better watch", "watch yourself",
    "rape", "rapist", "force you", "pin you down", "won't let you leave",
    "i own you", "you are mine", "i will find you"
]
HARSH_WORDS = [
    "hate", "stupid", "idiot", "dumb", "shut up", "loser", "trash",
    "wtf", "screw you", "annoying", "useless", "pathetic", "worthless",
    "moron", "jerk", "freak", "creep", "go to hell", "fuck you", "fuck off",
    "fck you", "f u", "fk you", "gtfo", "screw off", "piss off", "get lost",
    "bitch", "slut", "whore"
]
ANGRY_INDICATORS = [
    "ugh", "argh", "smh", "seriously", "unbelievable", "not okay",
    "this is ridiculous", "youre so annoying", "you're so annoying",
    "i'm done", "im done", "whatever", "are you kidding me"
]
SEXUAL_WORDS = [
    "sexier", "sexy", "hot body", "sleep with", "hook up",
    "come over", "nudes", "send pics"
]
MANIPULATION_WORDS = [
    "ditch him", "leave him", "dump him", "leave her", "dump her",
    "you can do better", "he doesn't deserve", "she doesn't deserve",
    "i'm better than", "forget about him", "forget about her"
]
LOVE_WORDS    = ["love", "adore", "miss you", "miss u", "can't wait", "cant wait", "so happy"]
SAD_WORDS     = ["sad", "upset", "hurt", "lonely", "depressed", "crying", "tears", "heartbroken"]
SCARED_WORDS  = ["scared", "afraid", "terrified", "worried", "anxious", "nervous", "panic"]
HAPPY_WORDS   = ["happy", "excited", "yay", "awesome", "great", "fantastic", "amazing", "love it"]

# ── Detection helpers ───────────────────────────────────────────────────────
def has_threat(text):       return any(w in text.lower() for w in THREAT_WORDS)
def has_harsh(text):        return any(w in text.lower() for w in HARSH_WORDS)
def has_sexual(text):       return any(w in text.lower() for w in SEXUAL_WORDS)
def has_manipulation(text): return any(w in text.lower() for w in MANIPULATION_WORDS)
def has_angry(text):        return any(w in text.lower() for w in ANGRY_INDICATORS)
def has_severe_abuse(text):
    t = text.lower()
    severe_patterns = [
        "rape", "i will rape", "force you", "pin you down",
        "i know where you live", "come find you", "you will regret this",
        "i will hurt you", "i will kill you"
    ]
    return any(pattern in t for pattern in severe_patterns)


def classify_critical_subtype(text):
    t = text.lower()
    if any(pattern in t for pattern in [
        "i will kill you", "i know where you live", "i will find you",
        "i will hurt you", "if you leave, you will regret it", "come find you"
    ]):
        return "S4-C", "Immediate session termination recommended."
    if any(pattern in t for pattern in [
        "rape", "force you", "pin you down", "won't let you leave",
        "you are mine", "i own you"
    ]):
        return "S4-B", "End the chat and escalate to a human reviewer."
    if has_severe_abuse(text) or has_threat(text):
        return "S4-A", "Show a critical alert and warn the user."
    return None, None

def detect_mood(text):
    t = text.lower()
    if has_threat(text):                                    return "THREATENING"
    if has_harsh(text) or has_angry(text):                  return "ANGRY"
    if any(w in t for w in SAD_WORDS):                      return "SAD"
    if any(w in t for w in SCARED_WORDS):                   return "SCARED"
    if any(w in t for w in LOVE_WORDS):                     return "LOVING"
    if any(w in t for w in HAPPY_WORDS):                    return "HAPPY"
    p = TextBlob(text).sentiment.polarity
    if p > 0.4:  return "HAPPY"
    if p < -0.3: return "UPSET"
    return "NEUTRAL"


def _caps_ratio(text):
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    caps = sum(1 for c in letters if c.isupper())
    return caps / max(len(letters), 1)

FACT_HINTS = [
    "according to", "study", "report", "data", "statistics", "percent", "%",
    "everyone knows", "no one", "nobody", "always", "never", "proven",
    "research", "scientists", "evidence", "facts"
]

def should_fact_check(text):
    if not text:
        return False
    t = text.lower()
    if any(ch.isdigit() for ch in text):
        return True
    if any(k in t for k in FACT_HINTS):
        return True
    if " is " in t or " are " in t or " was " in t or " were " in t:
        return len(t.split()) >= 6
    return False

def ai_fact_check(text):
    """Return a short, user-friendly reality check for factual claims."""
    system = (
        "You are a careful fact-checking assistant. "
        "If the message is NOT a factual claim, return JSON with: "
        "claim=false, verdict='Not a factual claim', confidence=0.2, note=''. "
        "If it IS a claim, assess with general knowledge only. "
        "Verdict must be one of: Likely true, Likely false, Unclear. "
        "Confidence must be a number 0-1. "
        "Note must be under 16 words. Return ONLY valid JSON."
    )
    raw = ask_ai(system, f"Message: {text}", max_tokens=120)
    if not raw:
        return None
    try:
        cleaned = raw.strip()
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1:
            cleaned = cleaned[start:end + 1]
        data = json.loads(cleaned)
        return {
            "claim": bool(data.get("claim", False)),
            "verdict": str(data.get("verdict", "Unclear")).strip(),
            "confidence": float(data.get("confidence", 0.4)),
            "note": str(data.get("note", "")).strip()
        }
    except Exception:
        return None

def bestie_comment(text, polarity, level, mood="NEUTRAL"):
    if level == 4: return random.choice([
        "🚨 That's a threat bestie. Screenshot and block them NOW no cap.",
        "🚨 Bro threatened you. Don't reply — get help immediately."
    ])
    if level == 3: return random.choice([
        "Bestie NO. This convo is fully toxic. You're allowed to just leave 💀",
        "You don't have to match their energy. Walk away and protect your peace fr.",
        "This is giving harassment vibes. You owe them nothing. Exit the chat."
    ])
    if level == 2:
        if mood == "ANGRY": return random.choice([
            "Okay you're MAD mad rn. Don't send that bestie 🔥",
            "Your anger is VALID but that message gonna make it worse 😭",
            "You're fired up. Sleep on it before you hit send?"
        ])
        return random.choice([
            "Things are getting heated — breathe before you reply bestie 🔥",
            "Take 2 minutes before you send. Trust me on this.",
            "Your feelings are valid but let's not make this worse okay?"
        ])
    if level == 1: return random.choice([
        "Vibes are kinda off rn. Be careful how you phrase this 👀",
        "This could go either way. Maybe soften it a lil?",
        "Lowkey tense. You sure you wanna send that exactly like that?"
    ])
    if polarity > 0.4: return random.choice([
        "Okay bestie energy activated 🔥 they'll love this fr",
        "This is so wholesome honestly 💙 send it!!",
        "W message. absolute W. 🏆 no notes."
    ])
    return random.choice([
        "Seems chill. Go for it 👍",
        "This reads fine to me, send it bestie",
        "Neutral vibes. You good 😌"
    ])


def generate_suggestions(text, polarity, level, last_message=None, last_mood=None):
    core = text.strip().rstrip("!?., ")
    lowered = core.lower()
    words = lowered.split()

    if lowered in {"hey", "hi", "hello", "yo", "heyy", "heyy"} or (len(words) <= 2 and lowered in {"good morning", "good evening", "good afternoon"}):
        return {
            "ack": "Hey, what is up?",
            "clarify": "Hi, tell me what is going on.",
            "boundary": "Hey, I can talk for a minute."
        }

    if len(words) <= 2 and level <= 1 and polarity >= -0.1:
        return {
            "ack": "Okay, tell me more.",
            "clarify": "What do you need from me right now?",
            "boundary": "I can reply properly in a minute."
        }

    if level >= 3:
        return {
            "boundary": "I am not okay with this. I am stepping away.",
            "clarify": "I want to talk, but not like this.",
            "ack": "I hear you. I will reply later when things are calm."
        }
    if level == 2:
        return {
            "boundary": "I want to talk, but we need to calm down first.",
            "clarify": "Can we slow down and talk one point at a time?",
            "ack": "I hear you. Give me a moment to respond." 
        }
    last_text = (last_message or "").strip()
    last_question = "?" in last_text
    if not core:
        return {
            "ack": "Got it. Thanks for telling me.",
            "clarify": "Can you say a bit more?",
            "boundary": "I want to talk, just not in a rush."
        }
    ack = "Got it. Thanks for telling me."
    clarify = "Can you tell me what you need from me right now?"
    boundary = "I want to respond well, so I need a minute."
    if last_mood in ("ANGRY", "UPSET"):
        ack = "I hear you. I want to understand."
        clarify = "What part upset you the most?"
        boundary = "I want to talk, but not in a fight."
    elif last_mood in ("SAD", "SCARED"):
        ack = "I'm here. I hear you."
        clarify = "Do you want comfort or a fix?"
        boundary = "I care, but I need a minute."
    elif last_mood in ("HAPPY", "LOVING"):
        ack = "That means a lot, thank you."
        clarify = "Want to tell me more?"
        boundary = "I'm smiling, give me a sec."
    if last_question:
        clarify = "Answering your question: give me a sec to be clear."
    if polarity > 0.25:
        ack = "Okay, that makes sense. Thanks for saying it."
        clarify = "Want to share a bit more so I get it right?"
    if polarity < -0.2:
        ack = "I hear you. I'm listening."
        clarify = "What part bothered you the most?"
        boundary = "I want to fix this, but not in a fight."
    return {"ack": ack[:120], "clarify": clarify[:120], "boundary": boundary[:120]}

def confidence_score(text, polarity, level):
    if level == 4: return 5
    if level == 3: return 12
    if level == 2: return 28
    score = 55
    if has_harsh(text):   score -= 35
    elif polarity < -0.2: score -= 18
    elif polarity > 0.3:  score += 22
    elif polarity > 0:    score += 10
    sub = TextBlob(text).sentiment.subjectivity
    if sub > 0.7: score -= 8
    return max(5, min(95, score))

def ghost_reply(polarity, level):
    if level == 4: return "I won't respond to threats. I'm stepping away now."
    if level == 3: return random.choice([
        "This is getting unhealthy. I'm done for now.",
        "I don't want to keep going like this. I'm stepping away."
    ])
    if level == 2: return random.choice([
        "I want to talk, but we need to calm down first.",
        "I hear you, but this is getting too heated. Let's pause."
    ])
    if polarity > 0.3: return random.choice([
        "That actually means a lot. Thank you.",
        "Okay, that made me smile."
    ])
    if polarity < -0.2: return random.choice([
        "Can we talk about this properly?",
        "I didn't mean it like that. Can we reset?"
    ])
    return random.choice(["Okay, I hear you.", "That makes sense to me."])


# ── Flask route ─────────────────────────────────────────────────────────────
def detect_thinking(text):
    mood = detect_mood(text)
    t = text.lower()
    if mood == "THREATENING":
        return "Threat language detected with direct harm signaling."
    if mood == "ANGRY":
        if "whatever" in t or "fine" in t:
            return "Withdrawal cues suggest dismissive conflict behavior."
        if "seriously" in t:
            return "Frustration is escalating into confrontational framing."
        return "Sustained anger markers indicate elevated escalation risk."
    if mood == "SAD":
        if "alone" in t or "nobody" in t:
            return "Isolation language suggests emotional vulnerability."
        return "Distress markers suggest the speaker feels hurt."
    if mood == "SCARED":
        return "Anxiety cues indicate a need for reassurance or safety."
    if mood == "LOVING":
        return "Affiliative language suggests repair or closeness seeking."
    if mood == "HAPPY":
        return "Positive affect suggests cooperative engagement."
    if len(text.split()) <= 3:
        return "Minimal content; weak signal with low interpretability."
    return "Low emotional charge with relatively stable wording."

def detect_expectation(text, mood):
    t = text.lower()
    if has_threat(text):
        return "Likely seeks immediate compliance or disengagement."
    if any(k in t for k in ["why", "what happened", "explain", "make sense", "how could"]):
        return "Likely seeks explanation and accountability."
    if any(k in t for k in ["sorry", "my bad", "i messed up", "apolog"]):
        return "Likely seeks repair and forgiveness."
    if any(k in t for k in ["are you okay", "u ok", "you good", "you alright"]):
        return "Likely seeks emotional clarification."
    if any(k in t for k in ["miss you", "love you", "need you"]):
        return "Likely seeks reassurance and reciprocity."
    if mood in ("ANGRY", "UPSET"):
        return "Likely seeks apology, validation, or corrective action."
    if mood in ("SAD", "SCARED"):
        return "Likely seeks reassurance and calm engagement."
    return "Likely seeks clarity and low-conflict response."

def classify_escalation(history, latest):
    critical_code, critical_note = classify_critical_subtype(latest)
    if critical_code:
        return 4, critical_code, critical_note
    recent = history[-6:] if len(history) >= 3 else history
    avg_p = sum(h.get('p', 0) for h in recent) / max(len(recent), 1)
    trend = (recent[-1].get('p', 0) - recent[0].get('p', 0)) if len(recent) >= 2 else 0
    harsh_count = sum(1 for h in recent if h.get('harsh', False))
    if has_harsh(latest) and (harsh_count >= 2 or avg_p < -0.3):
        return 3, "High Risk", "Repeated hostile language indicates active toxic escalation."
    if has_harsh(latest):
        return 2, "Escalating", "Conflict intensity is rising. A de-escalation step is advised."
    if has_sexual(latest):
        return 2, "Escalating", "Boundary-pushing content detected. Response controls may be needed."
    if has_manipulation(latest):
        return 1, "Watchlist", "Manipulative framing detected. Monitor for sustained drift."
    if avg_p < -0.35 or trend < -0.5:
        return 2, "Escalating", "Sequential sentiment decline suggests the interaction is deteriorating."
    if avg_p < -0.15:
        return 1, "Watchlist", "Tension is building across recent messages."
    return 0, "Stable", ""

def _sequence_feature_vector(item, latest_polarity=None):
    text = item.get('text', '')
    polarity = item.get('p', latest_polarity if latest_polarity is not None else 0.0)
    volatility = abs(polarity - latest_polarity) if latest_polarity is not None else abs(polarity)
    harsh = 1.0 if item.get('harsh') else 0.0
    threat = 1.0 if has_threat(text) or has_severe_abuse(text) else 0.0
    manipulation = 1.0 if item.get('manip') or has_manipulation(text) else 0.0
    caps = _caps_ratio(text)
    short_reply = 1.0 if len(text.split()) <= 3 else 0.0
    progress_anchor = max(0.0, min(1.0, 0.5 + polarity))
    return [
        max(-1.0, min(1.0, polarity)),
        max(0.0, min(1.0, volatility)),
        harsh,
        threat,
        manipulation,
        max(0.0, min(1.0, caps)),
        short_reply,
        progress_anchor
    ]


def _build_sequence(history, latest_text):
    combined = history[-7:] if len(history) >= 7 else history[:]
    latest_polarity = TextBlob(latest_text).sentiment.polarity
    combined = combined + [{
        'text': latest_text,
        'p': latest_polarity,
        'mood': detect_mood(latest_text),
        'harsh': has_harsh(latest_text),
        'sexual': has_sexual(latest_text),
        'manip': has_manipulation(latest_text)
    }]
    vectors = []
    prev_p = 0.0
    for item in combined:
        vectors.append(_sequence_feature_vector(item, latest_polarity=prev_p))
        prev_p = item.get('p', prev_p)
    return combined, vectors


def compute_behavioral_drift(history, latest_text):
    combined, feature_sequence = _build_sequence(history, latest_text)
    if len(combined) < 2:
        return {
            'drift_score': 5,
            'risk_score': 8,
            'risk_level': 'Low',
            'forecast_score': 12,
            'forecast_label': 'Low',
            'stage': 'Baseline',
            'momentum': 0,
            'volatility': 0,
            'recovery_score': 82,
            'intervention_window': 'Observe',
            'primary_driver': 'Insufficient sequence length',
            'triggers': ["Not enough messages yet."],
            'tips': ["Collect more interaction history before intervening."],
            'intervention': "No intervention needed yet.",
            'model_confidence': 0.55,
            'model_source': 'bootstrapped-rnn'
        }

    polarities = [h.get('p', 0) for h in combined]
    slope = polarities[-1] - polarities[0]
    volatility = sum(abs(polarities[i] - polarities[i - 1]) for i in range(1, len(polarities))) / (len(polarities) - 1)
    tox_hits = sum(1 for h in combined if h.get('harsh') or h.get('sexual') or h.get('manip'))
    short_replies = sum(1 for h in combined if len(h.get('text', '').split()) <= 3)
    caps_ratio = _caps_ratio(latest_text)
    sentiment_direction = max(0, -slope)
    severe_abuse = has_severe_abuse(latest_text)
    critical_code, critical_note = classify_critical_subtype(latest_text)

    seq_output = SEQUENCE_MODEL.infer(feature_sequence)
    forecast_probability = seq_output['forecast_probability']
    model_confidence = seq_output['confidence']
    momentum = int(max(0, min(100, 100 * forecast_probability * (0.7 + min(volatility, 1.0) * 0.3))))

    drift_score = int(max(0, min(100, (
        abs(slope) * 25 +
        volatility * 24 +
        tox_hits * 10 +
        short_replies * 4 +
        caps_ratio * 15 +
        forecast_probability * 22
    ))))

    risk_score = int(max(0, min(100, 100 * (
        0.52 * forecast_probability +
        0.18 * min(1.0, volatility) +
        0.12 * min(1.0, sentiment_direction) +
        0.10 * min(1.0, tox_hits / 3.0) +
        0.08 * min(1.0, caps_ratio)
    ))))
    if severe_abuse:
        risk_score = max(risk_score, 94)
    risk_level = "Low" if risk_score < 30 else "Medium" if risk_score < 60 else "High"
    forecast_score = int(round(forecast_probability * 100))
    if severe_abuse:
        forecast_score = max(forecast_score, 96)
    forecast_label = "Low" if forecast_score < 30 else "Guarded" if forecast_score < 55 else "Elevated" if forecast_score < 75 else "Severe"
    recovery_score = int(max(0, min(100, 100 - (forecast_score * 0.55 + volatility * 18 + tox_hits * 8))))

    if critical_code:
        stage = "Critical Escalation"
        stage_code = critical_code
        intervention_window = "Immediate"
    elif severe_abuse or forecast_score >= 80 or risk_score >= 75:
        stage = "Critical Escalation"
        stage_code = "S4-A"
        intervention_window = "Immediate"
    elif forecast_score >= 60 or risk_score >= 55:
        stage = "Toxic Drift"
        stage_code = "S3"
        intervention_window = "Now"
    elif forecast_score >= 35 or risk_score >= 30:
        stage = "Emerging Escalation"
        stage_code = "S2"
        intervention_window = "Early"
    else:
        stage = "Stable / Recoverable"
        stage_code = "S1" if (risk_score > 10 or abs(slope) > 0.12 or tox_hits > 0) else "S0"
        intervention_window = "Monitor"

    triggers = []
    if abs(slope) > 0.30:
        triggers.append("Rapid directional tone shift across the sequence.")
    if volatility > 0.28:
        triggers.append("High turn-to-turn volatility detected.")
    if severe_abuse:
        triggers.append("Severe abusive or threatening language detected.")
    if tox_hits > 0:
        triggers.append("Harmful lexical cues are appearing in the sequence.")
    if short_replies >= 2:
        triggers.append("Short replies suggest disengagement or withdrawal.")
    if caps_ratio > 0.35:
        triggers.append("All-caps intensity increased the risk signal.")
    if not triggers:
        triggers.append("Sequence remains comparatively stable.")

    driver_scores = {
        "forecasted escalation dynamics": forecast_probability * 100,
        "severe abuse / threat cue": 100 if severe_abuse else 0,
        "rapid tone deterioration": abs(slope) * 100,
        "volatility spike": volatility * 100,
        "harmful lexical cues": tox_hits * 25,
        "withdrawal / short replies": short_replies * 12,
        "all-caps intensity": caps_ratio * 100
    }
    primary_driver = max(driver_scores, key=driver_scores.get)

    if critical_code == "S4-C":
        tips = [
            "Terminate the chat session immediately.",
            "Escalate to safety or emergency response workflow."
        ]
        intervention = "Terminate the session now and hand off to a human responder."
        critical_action = "terminate_chat"
    elif critical_code == "S4-B":
        tips = [
            "End the chat and block further engagement.",
            "Escalate to a moderator or safety reviewer."
        ]
        intervention = "End the chat immediately and route the case for human review."
        critical_action = "suggest_end_chat"
    elif critical_code == "S4-A":
        tips = [
            "Display a critical alert and warn the user.",
            "Prepare escalation if the next turn worsens."
        ]
        intervention = critical_note or "Show a critical alert and immediate warning."
        critical_action = "show_alert"
    elif risk_level == "High":
        tips = [
            "Trigger moderation or human review immediately.",
            "Pause response generation and avoid reinforcing hostility."
        ]
        intervention = "Escalate to a safety workflow before the next turn."
        critical_action = "show_alert"
    elif risk_level == "Medium":
        tips = [
            "Insert a de-escalation prompt or friction before replying.",
            "Closely monitor the next 1-2 turns for acceleration."
        ]
        intervention = "Early intervention recommended before the next reply."
        critical_action = "none"
    else:
        tips = [
            "Maintain low-friction neutral communication.",
            "Keep passively monitoring the sequence state."
        ]
        intervention = "Continue passive monitoring."
        critical_action = "none"

    return {
        'drift_score': drift_score,
        'risk_score': risk_score,
        'risk_level': risk_level,
        'forecast_score': forecast_score,
        'forecast_label': forecast_label,
        'stage': stage,
        'stage_code': stage_code,
        'momentum': momentum,
        'volatility': int(max(0, min(100, volatility * 100))),
        'recovery_score': recovery_score,
        'intervention_window': intervention_window,
        'primary_driver': primary_driver,
        'critical_action': critical_action,
        'triggers': triggers[:3],
        'tips': tips[:2],
        'intervention': intervention,
        'model_confidence': round(model_confidence, 3),
        'model_source': 'bootstrapped-rnn'
    }


def predict_response(polarity, level, forecast_score=None):
    if forecast_score is None:
        forecast_score = 85 if level >= 3 else 62 if level == 2 else 24 if polarity > 0.2 else 48
    if forecast_score >= 80:
        return "Sequence model forecasts severe escalation on the next turn."
    if forecast_score >= 60:
        return "Model projects a likely intensification without intervention."
    if forecast_score >= 35:
        return "Trajectory is unstable and could escalate with another negative turn."
    if polarity > 0.3:
        return "Short-term continuation appears cooperative and low risk."
    return "Near-term trajectory is mixed with limited confidence."

def ai_suggest_reply(text, mood, level, tone="balanced"):
    system = (
        "You are Sidechick, a friendly safety assistant for chats. "
        f"Tone: {tone}. "
        "Given a chat message and its emotional context, suggest ONE short, clear, "
        "non-toxic reply (max 2 sentences). Use calm, professional plain language. "
        "If the message is toxic or threatening, suggest a boundary-setting reply."
    )
    user_msg = f"Message: \"{text}\"\nMood detected: {mood}\nEscalation level: {level}/4\nSuggest a reply:"
    return ask_ai(system, user_msg, max_tokens=80)

def fallback_action_playbook(history_texts):
    if not history_texts:
        return None
    last = history_texts[-1]
    mood = detect_mood(last)
    expectation = detect_expectation(last, mood)
    level, _, alert = classify_escalation([], last)
    if level >= 3:
        best_move = "Pause the exchange and trigger intervention."
        avoid = "Do not respond with matching hostility."
    elif level == 2:
        best_move = "De-escalate and slow the interaction."
        avoid = "Do not accelerate the conflict."
    else:
        best_move = "Keep monitoring and maintain neutral tone."
        avoid = "Do not assume the risk has vanished."
    return {
        "situation": f"Current state: {mood.lower()}.",
        "they_want": expectation,
        "best_move": best_move,
        "avoid": avoid,
        "alert": alert if alert else ""
    }

def ai_summarize_convo(history_texts, tone="balanced"):
    if not history_texts:
        return None
    convo = "\n".join(history_texts[-10:])
    system = (
        "You are Sidechick, a chat safety guide for online interactions. "
        f"Tone: {tone}. Return ONLY valid JSON with keys: "
        "situation, they_want, best_move, avoid, alert. "
        "Each value must be under 14 words. "
        "Alert should be empty string if no red flag."
    )
    raw = ask_ai(system, f"Conversation:\n{convo}", max_tokens=120)
    if not raw:
        return fallback_action_playbook(history_texts)
    try:
        cleaned = raw.strip()
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1:
            cleaned = cleaned[start:end + 1]
        data = json.loads(cleaned)
        return {
            "situation": str(data.get("situation", "")).strip(),
            "they_want": str(data.get("they_want", "")).strip(),
            "best_move": str(data.get("best_move", "")).strip(),
            "avoid": str(data.get("avoid", "")).strip(),
            "alert": str(data.get("alert", "")).strip()
        }
    except Exception:
        return fallback_action_playbook(history_texts)

def ai_infer_other(text, context=None, tone="balanced"):
    context = context or []
    system = (
        "You are Sidechick, a chat safety assistant. "
        f"Tone: {tone}. "
        "Return ONLY valid JSON with keys: thinking, expectation, mood. "
        "Keep each value under 14 words. "
        "Mood must be one of: ANGRY, SAD, SCARED, HAPPY, LOVING, NEUTRAL, UPSET, THREATENING."
    )
    ctx_lines = []
    for item in context[-3:]:
        speaker = item.get('speaker', 'User')
        ctx_lines.append(f"{speaker}: {item.get('text', '')}")
    ctx_block = "\n".join(ctx_lines)
    user_msg = f"Recent context:\n{ctx_block}\n\nOther person's message: {text}"
    raw = ask_ai(system, user_msg, max_tokens=80)
    if not raw:
        return None
    try:
        cleaned = raw.strip()
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1:
            cleaned = cleaned[start:end + 1]
        return json.loads(cleaned)
    except Exception:
        return None

def get_model_report():
    summary = dict(SEQUENCE_MODEL.training_summary or {})
    if "evaluation" not in summary:
        bundle = dataset_bundle()
        summary["evaluation"] = SEQUENCE_MODEL.evaluate(bundle["eval_sequences"], bundle["eval_labels"])
    return {
        "name": "bootstrapped-rnn",
        "artifact_path": MODEL_PATH,
        "summary": summary
    }


def build_room_export(room_id):
    room = rooms.get(room_id)
    if not room:
        return None
    history = room.get("history", [])
    messages = []
    for index, item in enumerate(history):
        drift = compute_behavioral_drift(history[:index], item.get("text", "")) if history else None
        messages.append({
            "username": item.get("username"),
            "text": item.get("text"),
            "timestamp": item.get("ts"),
            "polarity": item.get("p"),
            "mood": item.get("mood"),
            "harsh": bool(item.get("harsh")),
            "sexual": bool(item.get("sexual")),
            "forecast_score": drift.get("forecast_score") if drift else None,
            "risk_score": drift.get("risk_score") if drift else None
        })
    current_drift = compute_behavioral_drift(history[:-1], history[-1]["text"]) if history else None
    return {
        "room": room_id,
        "exported_at": datetime.now().isoformat(),
        "message_count": len(messages),
        "model": get_model_report(),
        "current_drift": current_drift,
        "messages": messages
    }


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/ai-status')
def ai_status():
    return jsonify({
        "openrouter": bool(get_openrouter_key()),
        "model": get_openrouter_model(),
        "sequence_model": get_model_report(),
        "dotenv": _DOTENV_AVAILABLE,
        "last_error": _last_openrouter_error
    })

@app.route('/api/model-metrics')
def model_metrics():
    return jsonify(get_model_report())

@app.route('/api/export/<room_id>')
def export_room(room_id):
    payload = build_room_export(room_id)
    if payload is None:
        return jsonify({"error": "Room not found"}), 404
    export_format = request.args.get("format", "json").strip().lower()
    if export_format == "csv":
        buffer = io.StringIO()
        writer = csv.DictWriter(buffer, fieldnames=[
            "username", "text", "timestamp", "polarity", "mood", "harsh", "sexual", "forecast_score", "risk_score"
        ])
        writer.writeheader()
        for row in payload["messages"]:
            writer.writerow(row)
        return Response(
            buffer.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename={room_id}-conversation-export.csv"}
        )
    return Response(
        json.dumps(payload, indent=2),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename={room_id}-conversation-export.json"}
    )

@app.route('/api/solo', methods=['POST'])
def solo_analyze():
    """REST endpoint: analyze a single message without joining a room."""
    data = request.json or {}
    text = data.get('text', '').strip()
    if not text:
        return jsonify({"error": "No text provided"}), 400
    blob    = TextBlob(text)
    polarity = round(blob.sentiment.polarity, 3)
    mood    = detect_mood(text)
    thinking = detect_thinking(text)
    level, label, alert = classify_escalation([], text)
    drift   = compute_behavioral_drift([], text)
    score   = confidence_score(text, polarity, level)
    ghost   = ghost_reply(polarity, level)
    sugg    = generate_suggestions(text, polarity, level)
    comment = bestie_comment(text, polarity, level, mood)
    ai_reply = ai_suggest_reply(text, mood, level, tone="balanced") if get_openrouter_key() else None
    return jsonify({
        "mood": mood,
        "label": label,
        "score": score,
        "drift": drift,
        "prediction": predict_response(polarity, level, drift.get('forecast_score')),
        "thinking": thinking,
        "comment": comment,
        "ai_reply": ai_reply,
        "alert": alert,
        "suggestions": sugg,
        "ghost": ghost
    })

@socketio.on('join')
def on_join(data):
    username = data.get('username', 'Unknown')
    room = data.get('room', '')
    if not room:
        return
    rooms.setdefault(room, {'history': [], 'users': {}})
    rooms[room]['users'][request.sid] = username
    join_room(room)
    emit('system', {'msg': f'✦ {username} joined the room'}, to=room)
    emit('user_joined', {'username': username}, to=room)
    emit('ai_config', {'openrouter': bool(get_openrouter_key())}, to=request.sid)

@socketio.on('disconnect')
def on_disconnect():
    for room_id, room_data in list(rooms.items()):
        if request.sid in room_data['users']:
            username = room_data['users'].pop(request.sid)
            leave_room(room_id)
            emit('system', {'msg': f'✦ {username} left the chat'}, to=room_id)
            emit('user_left', {'username': username}, to=room_id)
            if not room_data['users']:
                del rooms[room_id]
            break


@socketio.on('message')
def on_message(data):
    room     = data.get('room', '')
    username = data.get('username', 'Unknown')
    text     = data.get('text', '').strip()
    if not text or room not in rooms:
        return

    blob     = TextBlob(text)
    polarity = round(blob.sentiment.polarity, 3)
    mood     = detect_mood(text)
    thinking = detect_thinking(text)
    expecting = detect_expectation(text, mood)
    level, label, alert = classify_escalation(rooms[room]['history'], text)
    drift = compute_behavioral_drift(rooms[room]['history'], text)

    display_mood = mood

    rooms[room]['history'].append({
        'username': username,
        'text': text,
        'p': polarity,
        'mood': mood,
        'harsh': has_harsh(text),
        'sexual': has_sexual(text),
        'ts': datetime.now().strftime('%H:%M')
    })

    # Broadcast the message with metadata
    emit('message', {
        'username': username,
        'text': text,
        'mood': mood,
        'their_mood': display_mood,
        'thinking': thinking,
        'expecting': expecting,
        'polarity': polarity,
        'timestamp': datetime.now().strftime('%H:%M'),
    }, to=room)

    # Broadcast escalation / vibe update
    timeline = [{'p': h['p']} for h in rooms[room]['history'][-20:]]
    emit('ai_update', {
        'level': level,
        'label': label,
        'alert_msg': alert,
        'stage_code': drift.get('stage_code'),
        'critical_action': drift.get('critical_action'),
        'thinking': thinking,
        'timeline': timeline,
        'prediction': predict_response(polarity, level, drift.get('forecast_score')),
        'sender': username,
        'drift': drift
    }, to=room)

    if should_fact_check(text):
        if get_openrouter_key():
            if not _rate_limited('fact', room, 4):
                cache_key = hashlib.md5(f"{get_openrouter_model()}|{text}".encode('utf-8')).hexdigest()
                cached = _cache_get('fact', cache_key, ttl=900)
                if cached is None:
                    cached = ai_fact_check(text)
                    if cached:
                        _cache_set('fact', cache_key, cached)
                if cached:
                    emit('fact_check', {
                        'sender': username,
                        'text': text,
                        'fact': cached
                    }, to=room)
        else:
            emit('fact_check', {
                'sender': username,
                'text': text,
                'fact': {
                    'claim': True,
                    'verdict': 'Unverified',
                    'confidence': 0.1,
                    'note': 'AI offline — cannot verify.'
                }
            }, to=room)

@socketio.on('typing_analysis')
def on_typing(data):
    room = data.get('room', '')
    text = data.get('text', '').strip()
    if not text:
        return

    blob     = TextBlob(text)
    polarity = round(blob.sentiment.polarity, 3)
    mood     = detect_mood(text)
    thinking = detect_thinking(text)
    history  = rooms.get(room, {}).get('history', [])
    last_message = history[-1]['text'] if history else None
    last_mood = detect_mood(last_message) if last_message else None
    level, label, alert = classify_escalation(history, text)
    score    = confidence_score(text, polarity, level)
    ghost    = ghost_reply(polarity, level)
    sugg     = generate_suggestions(text, polarity, level, last_message=last_message, last_mood=last_mood)
    comment  = bestie_comment(text, polarity, level, mood)
    pred     = predict_response(polarity, level)
    draft_drift = compute_behavioral_drift(history, text)
    what_say = None
    if mood in ("ANGRY", "SAD", "SCARED"):
        phrases = {
            "ANGRY":  ["I don't want to fight about this.", "Let's talk properly."],
            "SAD":    ["I really need to talk about this.", "Can you listen for a sec?"],
            "SCARED": ["I'm genuinely worried.", "Can we talk through this calmly?"]
        }
        what_say = random.choice(phrases[mood])

    emit('typing_insight', {
        'level': level, 'label': label, 'alert': alert,
        'stage_code': draft_drift.get('stage_code'),
        'critical_action': draft_drift.get('critical_action'),
        'score': score, 'thinking': thinking, 'mood': mood,
        'ghost': ghost, 'suggestion': what_say,
        'comment': comment,
        'prediction': predict_response(polarity, level, draft_drift.get('forecast_score')),
        'sugg': sugg
    })

@socketio.on('get_suggestions')
def on_get_suggestions(data):
    text = data.get('text', '').strip()
    room = data.get('room', '')
    if not text:
        return
    blob     = TextBlob(text)
    polarity = round(blob.sentiment.polarity, 3)
    history  = rooms.get(room, {}).get('history', [])
    level, _, _ = classify_escalation(history, text)
    last_message = history[-1]['text'] if history else None
    last_mood = detect_mood(last_message) if last_message else None
    sugg = generate_suggestions(text, polarity, level, last_message=last_message, last_mood=last_mood)
    emit('suggestions', {'sugg': sugg})

@socketio.on('ai_reply_request')
def on_ai_reply(data):
    """Client can explicitly request a generated reply."""
    text  = data.get('text', '').strip()
    room  = data.get('room', '')
    tone  = data.get('tone', 'balanced')
    mood  = detect_mood(text)
    history = rooms.get(room, {}).get('history', [])
    level, _, _ = classify_escalation(history, text)
    if _rate_limited('reply', request.sid, 6):
        emit('ai_reply', {'reply': 'Hold up — give me a sec ⏳'})
        return
    cache_key = hashlib.md5(f"{get_openrouter_model()}|{tone}|{text}".encode('utf-8')).hexdigest()
    reply = _cache_get('reply', cache_key, ttl=900)
    if reply is None:
        reply = ai_suggest_reply(text, mood, level, tone=tone)
        if reply:
            _cache_set('reply', cache_key, reply)
    emit('ai_reply', {'reply': reply or "AI not configured — set OPENROUTER_API_KEY"})

@socketio.on('ai_infer_request')
def on_ai_infer(data):
    room = data.get('room', '')
    text = data.get('text', '').strip()
    tone = data.get('tone', 'balanced')
    context = data.get('context', [])
    request_id = data.get('request_id')
    if not text:
        return
    if _rate_limited('infer', request.sid, 3.5):
        emit('ai_infer', {
            'request_id': request_id,
            'text': text,
            'thinking': 'Sidechick is cooling down... try again in a sec.',
            'expecting': 'Give it a moment, bestie.',
            'mood': 'NEUTRAL'
        })
        return
    if not get_openrouter_key():
        emit('ai_infer', {
            'request_id': request_id,
            'text': text,
            'thinking': detect_thinking(text),
            'expecting': detect_expectation(text, detect_mood(text)),
            'mood': detect_mood(text)
        })
        return
    cache_key_raw = json.dumps({
        'text': text,
        'tone': tone,
        'context': context[-3:],
        'model': get_openrouter_model()
    }, sort_keys=True)
    cache_key = hashlib.md5(cache_key_raw.encode('utf-8')).hexdigest()
    cached = _cache_get('infer', cache_key, ttl=900)
    if cached:
        cached['request_id'] = request_id
        emit('ai_infer', cached)
        return
    ai_data = ai_infer_other(text, context=context, tone=tone)
    if not ai_data:
        emit('ai_infer', {
            'request_id': request_id,
            'text': text,
            'thinking': detect_thinking(text),
            'expecting': detect_expectation(text, detect_mood(text)),
            'mood': detect_mood(text)
        })
        return
    result = {
        'request_id': request_id,
        'text': text,
        'thinking': ai_data.get('thinking', detect_thinking(text)),
        'expecting': ai_data.get('expectation', detect_expectation(text, detect_mood(text))),
        'mood': str(ai_data.get('mood', detect_mood(text))).upper().strip()
    }
    _cache_set('infer', cache_key, result.copy())
    emit('ai_infer', result)

@socketio.on('ai_summary_request')
def on_ai_summary(data):
    room = data.get('room', '')
    tone = data.get('tone', 'balanced')
    window = int(data.get('window', 8))
    if room not in rooms:
        emit('ai_summary', {'summary': 'No convo yet!'})
        return
    if _rate_limited('summary', request.sid, 8):
        emit('ai_summary', {'summary': 'Give me a sec — processing... ⏳'})
        return
    texts = [h['text'] for h in rooms[room]['history']][-window:]
    content_hash = hashlib.md5("\n".join(texts).encode('utf-8')).hexdigest()
    cache_key_raw = json.dumps({
        'room': room,
        'content': content_hash,
        'tone': tone,
        'model': get_openrouter_model()
    }, sort_keys=True)
    cache_key = hashlib.md5(cache_key_raw.encode('utf-8')).hexdigest()
    cached = _cache_get('summary', cache_key, ttl=900)
    if cached:
        emit('ai_summary', {'summary': cached})
        return
    summary = ai_summarize_convo(texts, tone=tone)
    if summary:
        _cache_set('summary', cache_key, summary)
        emit('ai_summary', {'summary': summary})
        return
    if _last_openrouter_error:
        err = _last_openrouter_error
        msg = f"AI summary unavailable ({err.get('code', 'error')}): {err.get('detail', 'Unknown error')}"
    else:
        msg = "Set OPENROUTER_API_KEY for AI summaries!"
    emit('ai_summary', {'summary': msg})

@socketio.on('fact_check_request')
def on_fact_check(data):
    text = data.get('text', '').strip()
    if not text:
        return
    if _rate_limited('fact', request.sid, 4):
        emit('fact_check', {'fact': {'claim': True, 'verdict': 'Unclear', 'confidence': 0.3, 'note': 'Give it a sec.'}})
        return
    if not get_openrouter_key():
        emit('fact_check', {'fact': {'claim': True, 'verdict': 'Unverified', 'confidence': 0.1, 'note': 'AI offline — cannot verify.'}})
        return
    cache_key = hashlib.md5(f"{get_openrouter_model()}|{text}".encode('utf-8')).hexdigest()
    cached = _cache_get('fact', cache_key, ttl=900)
    if cached:
        emit('fact_check', {'fact': cached})
        return
    result = ai_fact_check(text)
    if result:
        _cache_set('fact', cache_key, result)
        emit('fact_check', {'fact': result})

# ── Run ─────────────────────────────────────────────────────────────────────
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port)
