from hinglish_processor import (
    detect_couple_vibe,
    find_similar_words,
    normalize_hinglish,
    HINGLISH_TOXIC_WORDS,
)
import re

# Debug case 1: "tere bina adha hun"
text1 = "tere bina adha hun"
text_lower = normalize_hinglish(text1)
orig_lower = text1.lower()

print("DEBUG: 'tere bina adha hun'")
print(f"  Normalized: {text_lower}")
print(f"  Original: {orig_lower}")

toxic_count = find_similar_words(text_lower, HINGLISH_TOXIC_WORDS, threshold=0.75)
print(f"  Toxic word count: {toxic_count}")

# Check for "adha" in toxic
if "adha" in HINGLISH_TOXIC_WORDS:
    print("  'adha' is in HINGLISH_TOXIC_WORDS")

# Check patterns
if re.search(r'\b(tere bina|mere bina|adha|incomplete|without you)\b', orig_lower):
    print("  Romantic pattern matched!")
    
print(f"  Detected: {detect_couple_vibe(text1)}\n")

# Debug case 2: "kaunse ladka ke sath ho?"
text2 = "kaunse ladka ke sath ho?"
print("DEBUG: 'kaunse ladka ke sath ho?'")
text_lower = normalize_hinglish(text2)
orig_lower = text2.lower()

print(f"  Normalized: {text_lower}")
print(f"  Original: {orig_lower}")

# Check if pattern matches
if re.search(r'\b(kaunse|which boy|which girl|ladder|ladki|kal dekha|ke sath)\b', orig_lower):
    print("  Possessive pattern matched!")
else:
    print("  Possessive pattern NOT matched")
    # Test individual words
    for word in ["kaunse", "which", "boy", "ke", "sath"]:
        if re.search(f'\\b{word}\\b', orig_lower):
            print(f"    Found word: {word}")

print(f"  Detected: {detect_couple_vibe(text2)}")
