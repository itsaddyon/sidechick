from hinglish_processor import (
    detect_couple_vibe,
    find_similar_words,
    normalize_hinglish,
    HINGLISH_ROMANTIC_WORDS,
    HINGLISH_POSSESSIVE_WORDS,
    HINGLISH_TOXIC_COUPLE_WORDS,
    HINGLISH_FRIENDLY_WORDS,
    HINGLISH_TOXIC_WORDS,
)
import re

text = "yaar bilkul theek"
text_lower = normalize_hinglish(text)
orig_lower = text.lower()

romantic_count = find_similar_words(text_lower, HINGLISH_ROMANTIC_WORDS, threshold=0.75)
possessive_count = find_similar_words(text_lower, HINGLISH_POSSESSIVE_WORDS, threshold=0.75)
toxic_couple_count = find_similar_words(text_lower, HINGLISH_TOXIC_COUPLE_WORDS, threshold=0.75)
friendly_count = find_similar_words(text_lower, HINGLISH_FRIENDLY_WORDS, threshold=0.75)
toxic_count = find_similar_words(text_lower, HINGLISH_TOXIC_WORDS, threshold=0.75)

print(f"Text: {text}")
print(f"Normalized: {text_lower}")
print(f"\nInitial counts:")
print(f"  romantic_count: {romantic_count}")
print(f"  possessive_count: {possessive_count}")
print(f"  toxic_couple_count: {toxic_couple_count}")
print(f"  friendly_count: {friendly_count}")
print(f"  toxic_count: {toxic_count}")

# Check pattern matching
print(f"\nPattern checks:")
if re.search(r'\b(yaar|bhai|thanks|shukriya|theek|badhiya|bilkul|haha|lol|hehe)\b', orig_lower):
    print("  - Found friendly pattern 1")
    friendly_count += 1

if re.search(r'(bilkul theek|theek hai|yaar tum|all good|ok sure|no problem)', orig_lower):
    print("  - Found friendly pattern 2")
    friendly_count += 3

print(f"\nFinal counts:")
print(f"  friendly_count: {friendly_count}")
print(f"  toxic_count: {toxic_count}")
print(f"  romantic_count: {romantic_count}")
print(f"  possessive_count: {possessive_count}")

print(f"\nDetected vibe: {detect_couple_vibe(text)}")
