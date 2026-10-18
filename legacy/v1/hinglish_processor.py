"""
Hinglish Text Processing and Feature Extraction
Handles Roman Urdu/Hinglish (Hindi written in English script)
"""

import re
import string
from difflib import SequenceMatcher


# Common Hinglish toxic/aggressive words and patterns
HINGLISH_TOXIC_WORDS = {
    # Abuse
    'bc', 'bhen', 'maa', 'chutiya', 'saala', 'besharam', 'nalayak',
    'badmash', 'jhootha', 'gaandu', 'ullu', 'teri', 'teri maa',
    'teri bhen', 'behanchod', 'madarchod', 'lavde',
    
    # Dismissive/Rude
    'chal', 'hat', 'jaa', 'nikal', 'saale', 'randi',
    'tum kya jano', 'teri samajh', 'tu samta hi nahi',
    
    # Aggressive intensity
    'maar', 'maarunga', 'pitaai', 'maar khayega', 'chakka',
    'kamina', 'harami', 'kutaa', 'gadha',
}

# Hinglish friendly/affectionate words
HINGLISH_FRIENDLY_WORDS = {
    'yaar', 'haan', 'bilkul', 'theek', 'badhiya', 'bhai',
    'dost', 'beta', 'beta mera', 'acha', 'bilkul sahi',
    'samjha', 'haha', 'lol', 'hehe', 'shukriya', 'thanks yaar',
    'tu hi bata', 'samjhda', 'meri jaan', 'sweetheart', 'jaan',
}

# ❤️ Romantic/Love words in Hinglish
HINGLISH_ROMANTIC_WORDS = {
    # Love expressions
    'pyaar', 'pyar', 'mohabbat', 'ishq', 'love', 'chaah', 'pasand',
    'tumhe pyaar hai', 'main tumhe pyaar karta', 'i love you',
    
    # Affectionate pet names
    'jaan', 'janu', 'janeman', 'dil', 'dil mera', 'mere dil',
    'sweetie', 'honey', 'baby', 'babydoll', 'cutie', 'sweetheart',
    'ladki', 'ladka', 'meri jaan', 'tum mere liye',
    
    # Sweet/intimate
    'miss karta', 'miss karti', 'miss you', 'yaad aata', 'tumhari yaad',
    'tere bina adha hun', 'tere bina nahi reh sakta', 'nahi bhul sakta',
    'dhundla rahe ho', 'sochta hoon', 'hamesha tum',
    
    # Flirting indicators
    'cute lagi', 'cute lg raha', 'beautiful', 'gorgeous', 'handsome',
    'perfect ho', 'amazing ho', 'aaa haan', 'hehe', 'haha tum',
    'wink', 'blush', 'haha suit karti ho', 'lol tum',
}

# 😡 Possessive/Controlling words (unhealthy for couples)
HINGLISH_POSSESSIVE_WORDS = {
    # Controlling behavior
    'tum bas mere ho', 'tu sirf mere ke liye', 'kisi se baat mat kar',
    'kahan ho', 'phone do', 'screen dikhao', 'kya kar rahe ho',
    'tera phone kaunsa', 'tera password', 'tere sath koi dusra',
    
    # Jealousy/insecurity
    'kaunsa ladka', 'kaunsa ladki', 'tum uske sath kyun',
    'mujhe jealous kar rahe', 'mujhe insecure kar rahe',
    'usko toh zyada message deti ho', 'mujhe ignore kar rahi',
    
    # Manipulation
    'agar tum sach pyaar karte', 'agar sach ho toh proof do',
    'tum mujhe pyaar nahi karte', 'mere liye kuch nahi kiya',
}

# 💔 Toxic couple dynamics in Hinglish
HINGLISH_TOXIC_COUPLE_WORDS = {
    # Disrespectful
    'teri koi value nahi', 'tu kuch nahi ho', 'teri family bakwas',
    'tere parents bewakuf', 'tu cheat kar rahi', 'tu jhooth bol raha',
    
    # Abusive/aggressive
    'tujhe maar dunga', 'jhappad maarunga', 'tujhe thappad deta',
    'teri izzat uda dunga', 'tujhe badnaam kar dunga',
    
    # Threatening
    'agar cheat kari toh samjhna', 'agar kisi aur ko dekha',
    'mujhe chhod degi toh dekhunga', 'tere saath bura hoga',
}

# Hinglish question indicators (engagement)
HINGLISH_QUESTIONS = {
    'kya', 'kyun', 'kaun', 'kab', 'kahan', 'kaise', 'kon',
    'teri', 'tera', 'tere', 'tumhara', 'tumhare',
    'mera', 'mere', 'hamara', 'hamare',
}

# Hinglish affirmative/negative
HINGLISH_AFFIRMATIVE = {
    'haan', 'bilkul', 'ekdum', 'theek', 'sahi', 'ji', 'ji haan',
    'maan gaya', 'samjha',
}

HINGLISH_NEGATIVE = {
    'nahi', 'na', 'mat', 'bilkul nahi', 'kabhi nahi', 'na yaar',
    'galat', 'galti', 'bewakuf',
}


def is_hinglish_text(text):
    """Detect if text contains Hinglish (mix of Hindi-style words in English script)"""
    text_lower = text.lower()
    
    # Direct Hindi word patterns
    hinglish_words = {
        'pyaar', 'mohabbat', 'jaan', 'tum', 'main', 'mera', 'tera', 'kya', 'hai',
        'haan', 'nahi', 'theek', 'bilkul', 'yaar', 'bhai', 'maa', 'baap', 'bhen',
        'kahan', 'kyun', 'kaun', 'kaise', 'kab', 'aap', 'mujhe', 'tumhe', 'uske',
        'ladka', 'ladki', 'cute', 'janu', 'janeman', 'dil', 'hamesha', 'kabhi',
        'miss', 'shukriya', 'sorry', 'samjho', 'batao', 'suno', 'dekho', 'kar',
        'rha', 'rahi', 'ho', 'hun', 'hain', 'teri', 'tere', 'tumhara', 'mere',
        'bc', 'chutiya', 'saala', 'teri maa', 'behanchod', 'salaam', 'adab',
        'cute', 'beautiful', 'handsome', 'gorgeous', 'amazing', 'perfect',
        'chal', 'hat', 'jaa', 'nikal', 'mar', 'maar', 'jhappad', 'izzat',
        'besharam', 'kamina', 'harami', 'ullo', 'gadha', 'besharam',
    }
    
    words_in_text = set(text_lower.split())
    matches = words_in_text & hinglish_words
    
    # Also check for patterns
    patterns = [
        r'\b(aap|tum|main|mujhe|teri|tera|kya|kyun)\b',
        r'\b(pyaar|jaan|yaar|bhai|theek|haan)\b',
        r'\b(cute|beautiful|mara|maar|chal|jaa)\b',
        r'\baapka\b|\bapka\b|\bapki\b',  # possessive
        r'[aeiou]e\s+(hai|hain|rha|rahi|ho|hun)',  # verb endings
    ]
    
    pattern_matches = sum(1 for pattern in patterns if re.search(pattern, text_lower))
    
    # Consider it Hinglish if we have direct word matches OR pattern matches
    return len(matches) >= 1 or pattern_matches >= 1


def normalize_hinglish(text):
    """Normalize Hinglish text for processing"""
    text_lower = text.lower()
    
    # Common abbreviations/contractions
    replacements = {
        r'\btum\s+kya\b': 'kya tum',
        r'\bteri\s+maa\b': 'teriMaa',
        r'\bteri\s+bhen\b': 'teriBhen',
        r'\bhaan\s+yaar\b': 'haan',
        r'\bnahi\s+yaar\b': 'nahi',
        r'\btu\b': 'tum',
        r'\btu\s+hi\b': 'tum hi',
        r'\btume\b': 'tumhe',
        r'\br u\b': 'are you',  # texting abbrev
        r'\bu r\b': 'you are',
        r'\bcya\b': 'bye',
        r'\bsorry\b|\bsorri\b|\bsry\b': 'sorry',
    }
    
    for pattern, replacement in replacements.items():
        text_lower = re.sub(pattern, replacement, text_lower)
    
    return text_lower


# Synonym dictionaries - handle word variations and paraphrases
ROMANTIC_SYNONYMS = {
    'pyaar': ['prem', 'love', 'mohabbat', 'ishq', 'chaah', 'pasand'],
    'cute': ['beautiful', 'handsome', 'gorgeous', 'sexy', 'hot', 'adorable', 'sweet'],
    'miss': ['miss you', 'think of', 'want', 'yaad aata', 'remember', 'miss karta'],
    'jaan': ['baby', 'honey', 'sweetie', 'dear', 'darling', 'sweetheart'],
}

POSSESSIVE_SYNONYMS = {
    'kahan': ['where', 'kaha', 'kahan ho'],
    'mere': ['my', 'mera', 'sirf', 'bas'],
    'phone': ['call', 'msg', 'message', 'text', 'contact'],
}

TOXIC_SYNONYMS = {
    'maar': ['kill', 'murder', 'harass', 'hit', 'beat', 'pitai'],
    'izzat': ['shame', 'honor', 'reputation', 'badnaam'],
}


def fuzzy_match_word(text, target_words, threshold=0.7):
    """
    Find words in text that match target words with fuzzy matching
    threshold: similarity score 0-1 (1.0 = exact match)
    """
    text_words = text.lower().split()
    matches = []
    
    for word in text_words:
        for target in target_words:
            # SequenceMatcher ratio returns 0-1, where 1.0 is exact match
            ratio = SequenceMatcher(None, word, target).ratio()
            if ratio >= threshold:
                matches.append((word, target, ratio))
    
    return matches


def expand_with_synonyms(word, synonym_dict):
    """Get all synonyms for a word including the word itself"""
    for key, synonyms in synonym_dict.items():
        if word == key or word in synonyms:
            return [key] + synonyms
    return [word]


def find_similar_words(text, dictionary, threshold=0.75):
    """
    Find words in text that are similar to words in the dictionary
    Uses both exact matching and fuzzy matching
    Returns count of matched/similar words
    """
    text_lower = text.lower()
    count = 0
    
    # First: exact substring matches (faster)
    for target_word in dictionary:
        if target_word in text_lower:
            count += 1
            continue
        
        # Second: fuzzy match on individual words
        matches = fuzzy_match_word(text_lower, [target_word], threshold)
        if matches:
            count += len(matches)
    
    return count


def extract_hinglish_features(text, label=None):
    """
    Extract features from Hinglish text for toxicity detection
    Returns a feature vector [8 dimensions]
    
    Detects:
    - Toxic/abusive language
    - Friendly/affectionate language
    - Romantic/flirting indicators
    - Possessive/controlling behavior
    - Relationship dynamics
    """
    text_lower = normalize_hinglish(text)
    words = text_lower.split()
    
    # Count various features
    toxic_count = sum(1 for word in words if word in HINGLISH_TOXIC_WORDS)
    friendly_count = sum(1 for word in words if word in HINGLISH_FRIENDLY_WORDS)
    romantic_count = sum(1 for word in words if word in HINGLISH_ROMANTIC_WORDS)
    possessive_count = sum(1 for word in words if word in HINGLISH_POSSESSIVE_WORDS)
    toxic_couple_count = sum(1 for word in words if word in HINGLISH_TOXIC_COUPLE_WORDS)
    question_count = sum(1 for word in words if word in HINGLISH_QUESTIONS)
    aggressive_caps = sum(1 for char in text if char in string.ascii_uppercase)
    
    # Punctuation intensity
    exclamation_count = text.count('!')
    question_mark_count = text.count('?')
    period_count = text.count('.')
    heart_emojis = text.count('❤️') + text.count('💕') + text.count('💖') + text.count('💗')
    
    # Calculate normalized features (0-1 range)
    text_length = max(len(words), 1)
    
    features = [
        # Toxicity indicator (negative) - ENHANCED with couple toxicity
        min((toxic_count + toxic_couple_count * 1.5) / max(text_length, 1) * 2, 1.0) if label == 1 else -min((toxic_count + toxic_couple_count) / max(text_length, 1) * 2, 1.0),
        
        # Volatility (punctuation intensity)
        (exclamation_count * 0.5 + question_mark_count * 0.3) / max(text_length, 5),
        
        # Harsh language (weighted toxic words)
        min((toxic_count + possessive_count * 0.7) / max(text_length, 1), 1.0),
        
        # Threat indicators (specific words) - ENHANCED with couple threats
        1.0 if any(word in text_lower for word in ['maar', 'maarunga', 'pitaai', 'jhappad', 'badnaam']) else 0.0,
        
        # Manipulation/dismissiveness/possessiveness
        1.0 if any(word in text_lower for word in ['chal', 'hat', 'jaa', 'nikal', 'kahan ho', 'phone do']) else 0.0,
        
        # Caps lock aggression
        min(aggressive_caps / max(text_length * 3, 1), 1.0),
        
        # Short/curt replies
        1.0 if text_length <= 2 and toxic_count > 0 else 0.0,
        
        # Engagement vs hostility score - ENHANCED with romantic indicators
        (friendly_count + romantic_count * 1.2 + heart_emojis * 0.5 - toxic_count - possessive_count * 0.8 + question_count) / max(text_length, 1),
    ]
    
    return features


def detect_couple_vibe(text):
    """
    Detect relationship vibe in Hinglish text with fuzzy matching
    Returns: vibe_type (romantic, possessive, toxic_couple, friendly, toxic, neutral)
    
    Uses:
    - Exact word matching for dictionary words
    - Fuzzy matching (75% similarity) for paraphrased/misspelled words
    - Pattern matching for complex phrases
    """
    text_lower = normalize_hinglish(text)
    orig_lower = text.lower()
    
    # IMPROVED: Use fuzzy matching for word detection (handles typos, variations)
    # Exact word-based scoring
    romantic_count = find_similar_words(text_lower, HINGLISH_ROMANTIC_WORDS, threshold=0.75)
    possessive_count = find_similar_words(text_lower, HINGLISH_POSSESSIVE_WORDS, threshold=0.75)
    toxic_couple_count = find_similar_words(text_lower, HINGLISH_TOXIC_COUPLE_WORDS, threshold=0.75)
    friendly_count = find_similar_words(text_lower, HINGLISH_FRIENDLY_WORDS, threshold=0.75)
    toxic_count = find_similar_words(text_lower, HINGLISH_TOXIC_WORDS, threshold=0.75)
    
    # Pattern-based boosting (handles phrase patterns)
    if re.search(r'\b(pyaar|prem|love|jaan|janeman|cute|beautiful|handsom|gorgeous|sexy)\b', orig_lower):
        romantic_count += 2
    if re.search(r'\b(miss|yaad|aata|want|think of|remember|cant stop thinking)\b', orig_lower):
        romantic_count += 1
    if re.search(r'\b(i love you|main.*pyaar|tumhe.*pyaar|you mean|world to me|my everything)\b', orig_lower):
        romantic_count += 3
    # Pure English romantic expressions
    if re.search(r'\b(you are my|my world|my everything|my life|cant live without|need you|my heart)\b', orig_lower):
        romantic_count += 2
    if re.search(r'\b(thinking of you|always think|heart beats|means the world|obsessed|adore you)\b', orig_lower):
        romantic_count += 1
    # Hinglish romantic expressions
    if re.search(r'\b(tere bina|mere bina|adha|incomplete|without you)\b', orig_lower):
        romantic_count += 2
    
    # Possessive patterns - controlling behavior
    if re.search(r'\b(kahan|where|kaha|tu kaha)\b', orig_lower):
        possessive_count += 1
    if re.search(r'\b(mere sath|sirf mera|bas mere|dont.*talk|mat.*kar|dont.*see)\b', orig_lower):
        possessive_count += 2
    if re.search(r'\b(kaunse|which boy|which girl|ladder|ladki|kal dekha|ke sath)\b', orig_lower):
        possessive_count += 1
    
    # ENHANCED: Possessive patterns - pure English paraphrases
    if re.search(r'\b(where are you|where.*you|who.*talking|who.*with|who.*see)\b', orig_lower):
        possessive_count += 2
    if re.search(r'\b(which.*guy|which.*girl|talking to|seeing|meeting)\b', orig_lower):
        possessive_count += 1
    if re.search(r'\b(dont.*other|only me|just me|only for me|for me alone|only mine)\b', orig_lower):
        possessive_count += 2
    if re.search(r'\b(call me|msg me|answer me|respond|reply now|where were you|what.*doing)\b', orig_lower):
        possessive_count += 1
    if re.search(r'\b(need to know|tell me|i need to|must know|have to tell|why|why didnt|explain)\b', orig_lower):
        possessive_count += 1    # More possessive indicators
    if re.search(r'\b(dont go|dont talk|shouldnt see|cant see|forbidden|not allowed|stay home|dont leave)\b', orig_lower):
        possessive_count += 2
    if re.search(r'\b(my permission|ask me first|get approval|check with me|let me know before)\b', orig_lower):
        possessive_count += 1    
    # Toxic couple patterns - threats, abuse
    if re.search(r'\b(mar|kill|morte|hit|beat|jhappad|pitai|harass)\b', orig_lower):
        toxic_couple_count += 2
    if re.search(r'\b(tujhe.*mar|maarunga|tera.*harm|teri.*izzat|badnaam|tujhe maar|hara dunga)\b', orig_lower):
        toxic_couple_count += 3
    if re.search(r'\b(suicide|harm|hurt|drown|death|end it|end me)\b', orig_lower):
        toxic_couple_count += 2
    # More threat patterns - English variations
    if re.search(r'\b(will hurt|will kill|will destroy|will ruin|wont hesitate|i swear|mark my words)\b', orig_lower):
        toxic_couple_count += 2
    if re.search(r'\b(ruin your life|destroy you|break you|crush you)\b', orig_lower):
        toxic_couple_count += 2
    
    # Friendly patterns
    if re.search(r'\b(yaar|bhai|thanks|shukriya|theek|badhiya|bilkul|haha|lol|hehe)\b', orig_lower):
        friendly_count += 1
    # Strong friendly indicators
    if re.search(r'(bilkul theek|theek hai|yaar tum|all good|ok sure|no problem)', orig_lower):
        friendly_count += 3
    
    # General toxicity patterns
    if re.search(r'\b(bc|bhen|maa|chutiya|saala|behanchod|madarchod|lavde)\b', orig_lower):
        toxic_count += 2
    if re.search(r'\b(stupid|idiot|dumb|fool|ass|jerk|bastard|asshole)\b', orig_lower):
        toxic_count += 1
    
    # Priority scoring: toxic_couple > possessive > toxic > romantic > friendly > neutral
    # Special case: strong romantic (>=3) overrides weak toxic (<=2)
    if romantic_count >= 3 and toxic_count <= 2:
        return 'romantic'
    
    if toxic_couple_count >= 1:  # Strong single toxic couple indicator
        return 'toxic_couple'
    elif possessive_count >= 2 or (possessive_count > 0 and toxic_count >= 1):
        return 'possessive'
    elif possessive_count >= 1 and romantic_count <= 2:  # Possessive priority
        return 'possessive'
    elif toxic_count >= 2:
        return 'toxic'
    elif friendly_count >= 3 and toxic_count <= 1:  # Strong friendly indicators override single toxic word
        return 'friendly'
    elif romantic_count >= 2 and possessive_count == 0 and toxic_count == 0:
        return 'romantic'
    elif romantic_count >= 1 and possessive_count == 0 and toxic_count == 0:
        return 'romantic'
    elif friendly_count >= 1 and toxic_count == 0 and romantic_count == 0 and possessive_count == 0:
        return 'friendly'
    
    return 'neutral'


def hinglish_toxicity_score(text):
    """
    Quick toxicity score for Hinglish text (0-1)
    0 = friendly, 1 = toxic
    """
    if not is_hinglish_text(text):
        return None  # Not Hinglish
    
    text_lower = normalize_hinglish(text)
    words = text_lower.split()
    
    toxic_score = 0.0
    friendly_score = 0.0
    
    # Count toxic markers
    for word in words:
        if word in HINGLISH_TOXIC_WORDS:
            toxic_score += 0.3
        if word in HINGLISH_FRIENDLY_WORDS:
            friendly_score += 0.2
    
    # Punctuation factors
    if '!' in text:
        toxic_score += 0.1
    if '?' in text:
        friendly_score += 0.1
    
    # Caps aggression
    if sum(1 for c in text if c in string.ascii_uppercase) > len(text) * 0.3:
        toxic_score += 0.2
    
    # Normalize
    total = toxic_score + friendly_score
    if total == 0:
        return 0.5  # Neutral
    
    normalized = toxic_score / (toxic_score + friendly_score)
    return min(normalized, 1.0)


def blend_english_hinglish_features(text, english_features):
    """
    Blend English and Hinglish features for mixed-language text
    """
    if is_hinglish_text(text):
        hinglish_features = extract_hinglish_features(text)
        # Weighted blend: 60% English, 40% Hinglish for accurate detection
        blended = [
            0.6 * eng + 0.4 * hin 
            for eng, hin in zip(english_features, hinglish_features)
        ]
        return blended
    
    return english_features


def process_message(text):
    """Main entry point for message processing"""
    language = 'hinglish' if is_hinglish_text(text) else 'english'
    
    return {
        'language': language,
        'normalized': normalize_hinglish(text) if language == 'hinglish' else text,
        'is_hinglish': language == 'hinglish',
        'features': extract_hinglish_features(text) if language == 'hinglish' else None,
        'toxicity_score': hinglish_toxicity_score(text) if language == 'hinglish' else None,
    }
