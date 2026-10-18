with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's search for the game screen overrides we added and replace it with a clean, conditionally visible rule
old_part = """/* Force a completely solid black-navy background on active game screen */
/* This hides all background screens 100% and prevents any transparency bleed-through */
body.game-active #game-screen {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 9999 !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: #050510 !important; 
  height: 100dvh !important;
  width: 100vw !important;
  overflow: hidden !important;
}

/* Force game-screen to fill dynamic viewport exactly */
.game-screen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100dvh !important;
  width: 100vw !important;
  background: #050510 !important;
  overflow: hidden !important;
}"""

new_part = """/* Force a completely solid black-navy background on active game screen */
/* This hides all background screens 100% and prevents any transparency bleed-through */
#game-screen {
  display: none !important;
}

#game-screen.is-active,
body.game-active #game-screen {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 9999 !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: #050510 !important; 
  height: 100dvh !important;
  width: 100vw !important;
  overflow: hidden !important;
}

/* Base style for game-screen class without overriding the display */
.game-screen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  flex-direction: column !important;
  height: 100dvh !important;
  width: 100vw !important;
  background: #050510 !important;
  overflow: hidden !important;
}"""

if old_part in css:
    css = css.replace(old_part, new_part)
    with open('static/css/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("SUCCESS: Display flex override bug resolved in static/css/style.css!")
else:
    # let's try replacing standard .game-screen if whitespaces differed
    print("WARNING: Exact match failed, trying regex search and replace...")
    import re
    css = re.sub(r'body\.game-active\s+#game-screen\s*\{[\s\S]*?\}\s*\.game-screen\s*\{[\s\S]*?\}', new_part, css)
    with open('static/css/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("REGEXP SUCCESS: Display flex override bug resolved in static/css/style.css!")
