"""
Test script to demonstrate Hinglish couple detection capabilities
Shows: Romantic, Possessive, Toxic, and Friendly vibes
"""

from hinglish_processor import (
    is_hinglish_text, 
    extract_hinglish_features, 
    detect_couple_vibe,
    hinglish_toxicity_score,
    process_message
)


def test_couple_vibes():
    """Test various couple conversation types"""
    
    test_cases = [
        # ROMANTIC - Healthy couple vibes
        ("main tumhe bahut pyaar karta hoon jaan", "ROMANTIC"),
        ("cute lag rahi ho tum aaj", "ROMANTIC"),
        ("meri jaan, tumhara yaad aata hai", "ROMANTIC"),
        ("i miss you so much baby", "ROMANTIC"),
        
        # POSSESSIVE - Controlling behavior (unhealthy)
        ("kahan ho? kaunse ladka dekh rahe?", "POSSESSIVE"),
        ("phone do, screen dekhunga", "POSSESSIVE"),
        ("bas mere ke liye rho, kisi aur se baat mat kar", "POSSESSIVE"),
        ("agar cheat kari toh samjhna", "POSSESSIVE"),
        
        # TOXIC COUPLE - Threatening/abusive
        ("tujhe maar dunga agar chhod di", "TOXIC_COUPLE"),
        ("teri izzat uda dunga", "TOXIC_COUPLE"),
        ("tere saath suicide karunga", "TOXIC_COUPLE"),
        ("jhappad maarunga tujhe", "TOXIC_COUPLE"),
        
        # FRIENDLY - Regular friends
        ("hey yaar, tum kaise ho?", "FRIENDLY"),
        ("bilkul theek hai bhai", "FRIENDLY"),
        ("thank you yaar, shukriya", "FRIENDLY"),
        
        # TOXIC - General toxicity
        ("teri maa ka kya?", "TOXIC"),
        ("behanchod, kuch samta nahi", "TOXIC"),
        ("bc saale bewakuf", "TOXIC"),
    ]
    
    print("=" * 70)
    print("HINGLISH COUPLE DETECTION TEST")
    print("=" * 70)
    
    for text, expected_vibe in test_cases:
        if not is_hinglish_text(text):
            continue
        
        vibe = detect_couple_vibe(text)
        toxicity = hinglish_toxicity_score(text)
        features = extract_hinglish_features(text)
        
        status = "[OK]" if vibe == expected_vibe else "[FAIL]"
        
        print(f"\n{status} Text: \"{text}\"")
        print(f"   Detected Vibe: {vibe.upper()}")
        print(f"   Expected: {expected_vibe}")
        print(f"   Toxicity Score: {toxicity:.3f}")
        print(f"   Features: {[round(f, 2) for f in features[:3]]}...")


def test_message_processing():
    """Test full message processing"""
    
    messages = [
        "main tumhe pyaar karta hoon jaan",
        "kahan ho tum? kaunse ladka/ladki?",
        "tujhe maar dunga agar cheat kari",
        "hehe tum cute ho",
    ]
    
    print("\n" + "=" * 70)
    print("\nFULL MESSAGE PROCESSING")
    print("=" * 70)
    
    for msg in messages:
        result = process_message(msg)
        print(f"\n[INFO] Message: \"{msg}\"")
        print(f"   Language: {result['language'].upper()}")
        print(f"   Is Hinglish: {result['is_hinglish']}")
        if result['toxicity_score'] is not None:
            print(f"   Toxicity Score: {result['toxicity_score']:.3f}")
            vibe = detect_couple_vibe(msg)
            print(f"   Relationship Vibe: {vibe.upper()}")


def test_conversation_sequence():
    """Test a full conversation sequence"""
    
    print("\n" + "=" * 70)
    print("CONVERSATION SEQUENCE - Healthy Couple")
    print("=" * 70)
    
    conversation = [
        "hey jaan, kaise ho?",
        "main thik hoon, tum?",
        "i miss you so much",
        "cute hehe, i miss you too",
        "tumhe pyaar hai?",
        "bilkul, tum meri duniya ho",
    ]
    
    for i, msg in enumerate(conversation, 1):
        if is_hinglish_text(msg):
            vibe = detect_couple_vibe(msg)
            print(f"  {i}. \"{msg}\"")
            print(f"     -> Vibe: {vibe}")
    
    print("\n" + "=" * 70)
    print("CONVERSATION SEQUENCE - Toxic Couple")
    print("=" * 70)
    
    toxic_conversation = [
        "kahan ho?",
        "office main hoon bhai",
        "kaunse ladki ke sath?",
        "koi nahi, bas office ka kaam",
        "teri akaal nahi hai kya? jaa na mere ghar",
        "tujhe mar dunga agar cheat kari",
    ]
    
    for i, msg in enumerate(toxic_conversation, 1):
        if is_hinglish_text(msg):
            vibe = detect_couple_vibe(msg)
            toxicity = hinglish_toxicity_score(msg)
            print(f"  {i}. \"{msg}\"")
            print(f"     -> Vibe: {vibe} | Toxicity: {toxicity:.2f}")


if __name__ == "__main__":
    test_couple_vibes()
    test_message_processing()
    test_conversation_sequence()
    
    print("\n" + "=" * 70)
    print("All tests completed!")
    print("=" * 70)
