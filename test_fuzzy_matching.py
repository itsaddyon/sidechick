#!/usr/bin/env python3
"""
Test fuzzy matching for Hinglish couple vibe detection
Shows how the system handles typos, variations, and paraphrases
"""

from hinglish_processor import (
    detect_couple_vibe,
    fuzzy_match_word,
    find_similar_words,
    HINGLISH_ROMANTIC_WORDS,
    HINGLISH_POSSESSIVE_WORDS,
)

print("=" * 80)
print("FUZZY MATCHING TEST - Handling Paraphrases & Typos")
print("=" * 80)

# Test cases with typos, misspellings, and paraphrases
test_cases = {
    "Typos & Variations": [
        ("pyar karta hoon", "ROMANTIC", "typo: 'pyar' instead of 'pyaar'"),
        ("luv u baby", "ROMANTIC", "slang: 'luv' instead of 'love'"),
        ("u r cute", "ROMANTIC", "text speak: 'u r' instead of 'you are'"),
        ("i miss u sm", "ROMANTIC", "abbreviation: 'sm' = so much"),
    ],
    
    "Paraphrases & Alternatives": [
        ("where are you babe?", "POSSESSIVE", "English: 'where are you' instead of 'kahan ho'"),
        ("which boy u talking to?", "POSSESSIVE", "English: 'which boy' instead of 'kaunse ladka'"),
        ("dont see any other girl", "POSSESSIVE", "English paraphrase of possessive behavior"),
        ("tell me who u talking to", "POSSESSIVE", "questioning who they're with"),
    ],
    
    "Mixed Language & Abbreviations": [
        ("haha ok bye", "FRIENDLY", "casual friendly message"),
        ("cya later", "NEUTRAL", "abbreviation: 'cya' = see you"),
        ("lol ok thanks", "FRIENDLY", "casual friendly"),
    ],
    
    "Expected Exact Matches": [
        ("main tumhe bahut pyaar karta hoon", "ROMANTIC", "exact match: classic romantic"),
        ("tujhe maar dunga", "TOXIC_COUPLE", "exact match: threat"),
        ("yaar bilkul theek", "FRIENDLY", "exact match: friendly greeting"),
    ],
}

print("\nTESTING FUZZY MATCHING CAPABILITIES\n")

all_correct = 0
all_total = 0

for category, cases in test_cases.items():
    print(f"\n{category}:")
    print("-" * 80)
    
    for message, expected_vibe, description in cases:
        detected = detect_couple_vibe(message)
        is_correct = detected.upper() == expected_vibe.upper()
        status = "OK" if is_correct else "FAIL"
        
        if is_correct:
            all_correct += 1
        all_total += 1
        
        print(f"[{status}] Message: \"{message}\"")
        print(f"   Description: {description}")
        print(f"   Expected: {expected_vibe} | Detected: {detected}")
        print()


print("=" * 80)
print(f"FUZZY MATCHING ACCURACY: {all_correct}/{all_total} ({100*all_correct/all_total:.1f}%)")
print("="*80)

# Show what fuzzy matching finds
print("\nDETAILED FUZZY MATCH ANALYSIS\n")

test_messages = [
    "pyar karta hoon",  # typo: pyar vs pyaar
    "where u at",       # abbreviation + paraphrase
    "ur so hot",        # text speak + romantic
]

for msg in test_messages:
    print(f"Message: \"{msg}\"")
    
    # Show fuzzy matches for romantic words
    matches = fuzzy_match_word(msg, HINGLISH_ROMANTIC_WORDS, threshold=0.7)
    if matches:
        print(f"  [MATCH] Fuzzy matches to ROMANTIC words (70%+ similarity):")
        for word, target, ratio in matches:
            print(f"     '{word}' -> '{target}' ({ratio*100:.0f}% match)")
    
    # Show similar words detection
    count = find_similar_words(msg, HINGLISH_ROMANTIC_WORDS, threshold=0.75)
    print(f"  [SCORE] Similarity score to ROMANTIC dictionary: {count} matches")
    print()

print("=" * 80)
print("Fuzzy matching enables detection of:")
print("   - Typos (pyar -> pyaar, bc -> bc)")
print("   - Abbreviations (u -> you, ur -> your)")
print("   - Paraphrases (where u at -> kahan ho)")
print("   - Mixed languages (where are you babe)")
print("   - Slang (luv -> love, cya -> bye)")
print("=" * 80)
