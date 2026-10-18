from hinglish_processor import (
    find_similar_words,
    normalize_hinglish,
    HINGLISH_ROMANTIC_WORDS,
    HINGLISH_POSSESSIVE_WORDS,
    HINGLISH_TOXIC_COUPLE_WORDS,
    HINGLISH_FRIENDLY_WORDS,
    HINGLISH_TOXIC_WORDS,
)
import re

# Case 1: "tere bina adha hun"
text1 = "tere bina adha hun"
text_lower = normalize_hinglish(text1)
orig_lower = text1.lower()

romantic_count = find_similar_words(text_lower, HINGLISH_ROMANTIC_WORDS, threshold=0.75)
possessive_count = find_similar_words(text_lower, HINGLISH_POSSESSIVE_WORDS, threshold=0.75)
toxic_couple_count = find_similar_words(text_lower, HINGLISH_TOXIC_COUPLE_WORDS, threshold=0.75)
friendly_count = find_similar_words(text_lower, HINGLISH_FRIENDLY_WORDS, threshold=0.75)
toxic_count = find_similar_words(text_lower, HINGLISH_TOXIC_WORDS, threshold=0.75)

print("CASE 1: 'tere bina adha hun'")
print(f"Initial counts:")
print(f"  romantic: {romantic_count}, possessive: {possessive_count}, toxic_couple: {toxic_couple_count}")
print(f"  friendly: {friendly_count}, toxic: {toxic_count}\n")

# Add pattern boosters
if re.search(r'\b(tere bina|mere bina|adha|incomplete|without you)\b', orig_lower):
    romantic_count += 2
    print("Added romantic pattern boost: +2")

print(f"\nFinal counts after patterns:")
print(f"  romantic: {romantic_count}, possessive: {possessive_count}, toxic_couple: {toxic_couple_count}")
print(f"  friendly: {friendly_count}, toxic: {toxic_count}\n")

# Check priority logic
print("Priority check:")
if toxic_couple_count >= 1:
    print("  -> Would return: toxic_couple")
elif possessive_count >= 2 or (possessive_count > 0 and toxic_count >= 1):
    print("  -> Would return: possessive")
elif toxic_count >= 2:
    print(f"  -> Would return: toxic (toxic_count={toxic_count})")
elif friendly_count >= 3 and toxic_count <= 1:
    print("  -> Would return: friendly")
elif romantic_count >= 2 and possessive_count == 0 and toxic_count == 0:
    print("  -> Would return: romantic")
elif romantic_count >= 1 and possessive_count == 0 and toxic_count == 0:
    print("  -> Would return: romantic")
elif friendly_count >= 1 and toxic_count == 0 and romantic_count == 0 and possessive_count == 0:
    print("  -> Would return: friendly")
else:
    print("  -> Would return: neutral")

print("\n" + "="*60 + "\n")

# Case 2: "kaunse ladka ke sath ho?"
text2 = "kaunse ladka ke sath ho?"
text_lower = normalize_hinglish(text2)
orig_lower = text2.lower()

romantic_count = find_similar_words(text_lower, HINGLISH_ROMANTIC_WORDS, threshold=0.75)
possessive_count = find_similar_words(text_lower, HINGLISH_POSSESSIVE_WORDS, threshold=0.75)
toxic_couple_count = find_similar_words(text_lower, HINGLISH_TOXIC_COUPLE_WORDS, threshold=0.75)
friendly_count = find_similar_words(text_lower, HINGLISH_FRIENDLY_WORDS, threshold=0.75)
toxic_count = find_similar_words(text_lower, HINGLISH_TOXIC_WORDS, threshold=0.75)

print("CASE 2: 'kaunse ladka ke sath ho?'")
print(f"Initial counts:")
print(f"  romantic: {romantic_count}, possessive: {possessive_count}, toxic_couple: {toxic_couple_count}")
print(f"  friendly: {friendly_count}, toxic: {toxic_count}\n")

# Check what pattern matches
if re.search(r'\b(kaunse|which boy|which girl|ladder|ladki|kal dekha|ke sath)\b', orig_lower):
    possessive_count += 1
    print("Added possessive pattern boost: +1")

print(f"\nFinal counts after patterns:")
print(f"  romantic: {romantic_count}, possessive: {possessive_count}, toxic_couple: {toxic_couple_count}")
print(f"  friendly: {friendly_count}, toxic: {toxic_count}\n")

# Check priority logic
print("Priority check:")
if toxic_couple_count >= 1:
    print("  -> Would return: toxic_couple")
elif possessive_count >= 2 or (possessive_count > 0 and toxic_count >= 1):
    print(f"  -> Would return: possessive (possessive={possessive_count}, toxic={toxic_count})")
elif toxic_count >= 2:
    print("  -> Would return: toxic")
elif friendly_count >= 3 and toxic_count <= 1:
    print("  -> Would return: friendly")
elif romantic_count >= 2 and possessive_count == 0 and toxic_count == 0:
    print("  -> Would return: romantic")
elif romantic_count >= 1 and possessive_count == 0 and toxic_count == 0:
    print("  -> Would return: romantic")
elif friendly_count >= 1 and toxic_count == 0 and romantic_count == 0 and possessive_count == 0:
    print("  -> Would return: friendly")
else:
    print("  -> Would return: neutral")
