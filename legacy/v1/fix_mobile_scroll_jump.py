with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

body_lock_style = """
/* Prevent the body from scrolling or shifting when the game screen is active on mobile */
body.game-active {
  overflow: hidden !important;
  position: fixed !important;
  width: 100vw !important;
  height: 100dvh !important;
  top: 0 !important;
  left: 0 !important;
}
"""

if 'body.game-active {' not in css or 'position: fixed !important;' not in css:
    css += body_lock_style
    with open('static/css/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("SUCCESS: body.game-active lock style added to style.css!")

# Now let's add window.scrollTo(0,0) in app.js inside showGameScreen()
with open('static/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_show_screen = """function showGameScreen(gameType, gameCode, username) {
  console.log('=== showGameScreen START ===');
  console.log('gameType: ', gameType, 'gameCode:', gameCode, 'username:', username);"""

new_show_screen = """function showGameScreen(gameType, gameCode, username) {
  console.log('=== showGameScreen START ===');
  console.log('gameType: ', gameType, 'gameCode:', gameCode, 'username:', username);
  
  // Programmatically reset browser scroll offset to prevent mobile layout shifts
  window.scrollTo(0, 0);
  document.body.scrollTop = 0;"""

if old_show_screen in js:
    js = js.replace(old_show_screen, new_show_screen)
    with open('static/js/app.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("SUCCESS: window.scrollTo(0,0) added to app.js!")
else:
    # try with direct replace
    print("WARNING: Exact match failed, trying alternative signature...")
    js = js.replace("function showGameScreen(gameType, gameCode, username) {", "function showGameScreen(gameType, gameCode, username) {\n  window.scrollTo(0, 0);\n  document.body.scrollTop = 0;")
    with open('static/js/app.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("SUCCESS: showGameScreen patched!")
