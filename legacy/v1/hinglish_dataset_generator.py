"""
Generate Hinglish training dataset for toxicity detection
Creates synthetic toxic and friendly Hinglish conversations
"""

import random


# Friendly Hinglish conversation starters
FRIENDLY_HINGLISH_STARTERS = [
    "hey yaar, tum kaise ho?",
    "kya hal hai bhai?",
    "haan suno, mujhe batao na",
    "mere sath baat kar na yaar",
    "tum bilkul theek ho?",
    "mujhe samjhda",
    "tum bhi na, haha",
    "acha suno meri baat",
    "beta mera, tum hi bata",
    "jaan, tu kya soch raha hai?",
    "sweetheart, mujhe samjh gaya",
    "bilkul sahi kaha tune",
]

# ❤️ ROMANTIC COUPLE Hinglish starters
ROMANTIC_HINGLISH_STARTERS = [
    "main tumhe pyaar karta hoon",
    "tum mere liye bahut special ho",
    "meri jaan, tumhara yaad aata hai",
    "cute lag rahi ho tum aaj",
    "hehe tum bilkul perfect ho",
    "main tum dono ko dekh kar smile karunga",
    "tumhe miss kar raha hoon",
    "tere bina adha hun main",
    "sweetheart, good morning",
    "baby, mera dil bas tumhara hai",
    "i miss you so much jaan",
    "tum meri duniya ho",
]

# Toxic/Aggressive Hinglish escalations
TOXIC_HINGLISH_ESCALATIONS = [
    "teri maa ka kya?",
    "chal chal, nikal yahan se",
    "tu kya samta hai apne aap ko?",
    "mat kar mere sath bakwas",
    "tere muh se aisa nikla?",
    "bc saale, kuch samta hi nahi",
    "tum bewakuf ho kya?",
    "teri akal nahi hai",
    "besharam, mat baat kar",
    "behanchod, maut hai na",
    "kalmuhi, tujhe pata bhi nahi",
    "saale, tere liye sirf mare",
    "jaa na, tujhe mat dekhu",
    "kamina, tum sab bewakuf ho",
]

# 😡 POSSESSIVE/CONTROLLING Hinglish
POSSESSIVE_HINGLISH = [
    "kahan ho abhi?",
    "tum kaunsa ladka/ladki dekh rahe?",
    "mujhe phone do, screen dekhunga",
    "tera password de",
    "agar tum sach pyaar karte ho toh proof de",
    "tum mujhe ignore kar rahi/rahe ho",
    "uske sath kyun baat kar raha/rahi?",
    "tere sath aur koi hai kya?",
    "bas mere ke liye rho",
    "tum sirf mera ho sakte/sakti ho",
    "mujhe jealous mat kar",
    "tujhe badnaam kar dunga agar cheat kari/ki",
]

# 💔 TOXIC COUPLE words (threatening/controlling)
TOXIC_COUPLE_ESCALATIONS = [
    "tujhe maar dunga agar cheat kari",
    "teri izzat uda dunga",
    "tere parents ko bataunga sab",
    "jhappad maarunga tujhe",
    "agar chhod di toh samjhna",
    "teri family ke sath kuch galat hoga",
    "tujhe kabhi bhool nahi sakta, tujhe trace karunga",
    "mar jayunga main agar tum chali gayi",
    "tere saath suicide karunga",
    "tujhe kisi se baat mat kar nahi toh dekhunga",
]

# Hinglish friendly reactions
FRIENDLY_HINGLISH_REACTIONS = [
    "acha theek hai na, sorry yaar",
    "mujhe samajh aaya, tu sahi bol raha hai",
    "bilkul bhai, I understand",
    "haan bilkul, tu bhi na",
    "thank you yaar, shukriya",
    "tu hi sabse smart hai re",
    "haha, maza aaya tumhe sunkar",
    "jaan, tu perfect hai",
    "bilkul sahi, meri baat samjha",
    "beta, tum bahut badhiya ho",
]

# Short Hinglish responses
SHORT_HINGLISH = [
    "haan",
    "nahi",
    "theek",
    "bilkul",
    "chal",
    "hat",
    "jaa",
    "ha?",
    "acha",
    "mat kar",
]


def generate_hinglish_toxic_sequence(length=4):
    """Generate a sequence that escalates to toxic"""
    sequence = []
    
    # Start neutral
    sequence.append(random.choice([
        "kya ho raha hai?",
        "tum thik ho na?",
        "suno bhai, ek baat bolu?",
    ]))
    
    # Mid escalation
    for i in range(length - 2):
        if i < length // 2:
            sequence.append(random.choice([
                "tum toh bilkul nahi samte",
                "tum bewakuf ho na",
                "mujhe nahi pasand tumhara tarika",
            ]))
        else:
            sequence.append(random.choice(TOXIC_HINGLISH_ESCALATIONS[:5]))
    
    # Final toxic
    sequence.append(random.choice(TOXIC_HINGLISH_ESCALATIONS))
    
    return sequence


def generate_hinglish_romantic_sequence(length=4):
    """Generate a romantic couple conversation sequence"""
    sequence = []
    
    sequence.append(random.choice(ROMANTIC_HINGLISH_STARTERS))
    
    for i in range(length - 1):
        sequence.append(random.choice([
            "hehe tum cute ho",
            "i miss you jaan",
            "main bhi tumhe bahut pyaar karta",
            "tum mere liye sab kuch ho",
            "cute hehe",
            "baby, good night 💕",
            "meri jaan ❤️",
        ]))
    
    return sequence


def generate_hinglish_possessive_sequence(length=4):
    """Generate a controlling/possessive couple sequence (unhealthy)"""
    sequence = []
    
    # Start with suspicion
    sequence.append(random.choice([
        "kahan ho?",
        "tum kaunse ladka dekh rahe ho?",
        "phone do, dekhunga",
    ]))
    
    # Escalate possessiveness
    for i in range(length - 2):
        sequence.append(random.choice(POSSESSIVE_HINGLISH))
    
    # Final toxic threat
    sequence.append(random.choice(TOXIC_COUPLE_ESCALATIONS))
    
    return sequence

def generate_hinglish_friendly_sequence(length=4):
    """Generate a friendly Hinglish conversation"""
    sequence = []
    
    sequence.append(random.choice(FRIENDLY_HINGLISH_STARTERS))
    
    for i in range(length - 1):
        sequence.append(random.choice(FRIENDLY_HINGLISH_REACTIONS + FRIENDLY_HINGLISH_STARTERS[:3]))
    
    return sequence

def generate_hinglish_dataset(toxic_count=150, friendly_count=150):
    """
    Generate synthetic Hinglish training sequences
    Includes: Toxic, Friendly, Romantic (couples), Possessive (unhealthy)
    Returns: (sequences, labels)
    Label: 0 = Friendly/Romantic, 1 = Toxic/Possessive
    """
    sequences = []
    labels = []
    
    # Generate toxic sequences (general toxicity)
    for _ in range(toxic_count // 2):
        seq_len = random.choice([4, 5, 6, 7])
        seq = generate_hinglish_toxic_sequence(seq_len)
        sequences.append(seq)
        labels.append(1)  # Toxic
    
    # Generate possessive/controlling couple sequences (unhealthy)
    for _ in range(toxic_count // 2):
        seq_len = random.choice([4, 5, 6, 7])
        seq = generate_hinglish_possessive_sequence(seq_len)
        sequences.append(seq)
        labels.append(1)  # Toxic (possessive is toxic)
    
    # Generate friendly sequences
    for _ in range(friendly_count // 2):
        seq_len = random.choice([4, 5, 6, 7])
        seq = generate_hinglish_friendly_sequence(seq_len)
        sequences.append(seq)
        labels.append(0)  # Friendly
    
    # Generate romantic couple sequences (healthy)
    for _ in range(friendly_count // 2):
        seq_len = random.choice([4, 5, 6, 7])
        seq = generate_hinglish_romantic_sequence(seq_len)
        sequences.append(seq)
        labels.append(0)  # Healthy/Romantic
    
    # Shuffle
    paired = list(zip(sequences, labels))
    random.shuffle(paired)
    sequences = [item[0] for item in paired]
    labels = [item[1] for item in paired]
    
    return sequences, labels


def hinglish_seq_to_features(text_sequence):
    """Convert Hinglish message sequence to feature vectors"""
    from hinglish_processor import extract_hinglish_features
    
    features = []
    for message in text_sequence:
        feat = extract_hinglish_features(message)
        features.append(feat)
    
    return features


if __name__ == "__main__":
    # Test generation
    seqs, labels = generate_hinglish_dataset(5, 5)
    
    print("Sample Hinglish Toxic Sequence:")
    for msg in seqs[0]:
        print(f"  - {msg}")
    print(f"Label: {labels[0]}")
    
    print("\nSample Hinglish Friendly Sequence:")
    for msg in seqs[5]:
        print(f"  - {msg}")
    print(f"Label: {labels[5]}")
