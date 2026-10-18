#!/usr/bin/env python3
"""
Test semantic sentence matching - different structures, same meaning
"""

from hinglish_processor import detect_couple_vibe

print("=" * 80)
print("SEMANTIC SENTENCE MATCHING TEST")
print("=" * 80)

test_cases = {
    "ROMANTIC - Same Meaning, Different Structures": [
        ("main tumhe pyaar karta hoon", "ROMANTIC", "Standard romantic"),
        ("you mean everything to me", "ROMANTIC", "English emphasis"),
        ("tumhara yaad aata hai", "ROMANTIC", "I miss you (Hinglish)"),
        ("i cant stop thinking of you", "ROMANTIC", "Obsessive romantic"),
        ("you are my world", "ROMANTIC", "You are my everything"),
        ("tere bina adha hun", "ROMANTIC", "I'm incomplete without you (Hinglish)"),
    ],
    
    "POSSESSIVE - Same Meaning, Different Structures": [
        ("kahan ho tum?", "POSSESSIVE", "Where are you? (Hinglish)"),
        ("where are you right now?", "POSSESSIVE", "Where are you? (English)"),
        ("kaunse ladka ke sath ho?", "POSSESSIVE", "Which guy are you with? (Hinglish)"),
        ("who are you with?", "POSSESSIVE", "Who are you with? (English)"),
        ("i need to know where you are", "POSSESSIVE", "Location tracking"),
        ("tumhe sirf mere sath hona chahiye", "POSSESSIVE", "You should only be with me (Hinglish)"),
        ("dont go out with anyone else", "POSSESSIVE", "Isolation demand (English)"),
    ],
    
    "TOXIC COUPLE - Same Meaning, Different Structures": [
        ("tujhe maar dunga", "TOXIC_COUPLE", "I'll kill you (direct threat)"),
        ("i will hurt you badly", "TOXIC_COUPLE", "Threat (English)"),
        ("teri izzat uda dunga", "TOXIC_COUPLE", "I'll destroy your honor (Hinglish)"),
        ("i will ruin your life", "TOXIC_COUPLE", "Life threat (English)"),
    ],
    
    "FRIENDLY - Same Meaning, Different Structures": [
        ("yaar theek hai", "FRIENDLY", "Standard friendly (Hinglish)"),
        ("all good thanks", "FRIENDLY", "English casual"),
        ("bilkul bhai", "FRIENDLY", "Absolutely buddy (Hinglish)"),
        ("no problem at all", "FRIENDLY", "English casual"),
    ],
}

print("\n")

correct = 0
total = 0

for category, cases in test_cases.items():
    print(f"\n{category}")
    print("-" * 80)
    
    for message, expected_vibe, description in cases:
        detected = detect_couple_vibe(message)
        is_correct = detected.upper() == expected_vibe.upper()
        status = "[OK]" if is_correct else "[FAIL]"
        
        if is_correct:
            correct += 1
        total += 1
        
        print(f"{status} \"{message}\"")
        print(f"     -> Expected: {expected_vibe} | Got: {detected}")
        print(f"     -> {description}")
        print()

print("=" * 80)
print(f"SEMANTIC MATCHING ACCURACY: {correct}/{total} ({100*correct/total:.1f}%)")
print("=" * 80)

# Analysis
print("\nKEY FINDINGS:")
print("=" * 80)
if 100*correct/total >= 80:
    print("EXCELLENT: System handles semantic variations well!")
elif 100*correct/total >= 60:
    print("GOOD: System handles many variations, but some sentence structures not covered")
else:
    print("LIMITED: System needs more semantic pattern matching for diverse sentences")

print("\nThe system uses:")
print("  1. Exact dictionary words (fast, accurate)")
print("  2. Fuzzy matching for typos (pyar -> pyaar)")
print("  3. Regex patterns for common phrases")
print("\nFor truly diverse sentence structures, we might need:")
print("  - Semantic similarity (sentence embeddings)")
print("  - More contextual patterns")
print("  - Extended phrase library")
print("=" * 80)
