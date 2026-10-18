from hinglish_processor import detect_couple_vibe

failing_tests = [
    ("tere bina adha hun", "ROMANTIC"),
    ("kaunse ladka ke sath ho?", "POSSESSIVE"),
]

for msg, expected in failing_tests:
    detected = detect_couple_vibe(msg)
    status = "PASS" if detected.upper() == expected.upper() else "FAIL"
    print(f"[{status}] '{msg}'")
    print(f"      Expected: {expected} | Got: {detected}\n")
