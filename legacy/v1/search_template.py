with open('templates/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
matches = re.findall(r'<div[^>]*class="[^"]*detective[^"]*"[^>]*>', html, re.I)
print("Detective classes found:", matches)

matches2 = re.findall(r'<div[^>]*id="[^"]*detective[^"]*"[^>]*>', html, re.I)
print("Detective IDs found:", matches2)

# search for "Vibe" or "Check"
for line_no, line in enumerate(html.splitlines(), 1):
    if "vibe" in line.lower() or "detective" in line.lower():
        print(f"Line {line_no}: {line[:100]}")
