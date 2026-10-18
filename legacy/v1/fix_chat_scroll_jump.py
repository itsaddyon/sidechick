with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's completely lock body.app-active in style.css just like body.game-active
app_lock_style = """
/* Prevent the body from scrolling or shifting when the chat screen is active on mobile */
body.app-active {
  overflow: hidden !important;
  position: fixed !important;
  width: 100vw !important;
  height: 100dvh !important;
  top: 0 !important;
  left: 0 !important;
}
"""

if 'body.app-active {' not in css or 'position: fixed !important;' not in css:
    css += app_lock_style
    with open('static/css/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("SUCCESS: body.app-active lock style added to style.css!")

# Now let's add window.scrollTo(0,0) inside enterRoom() in app.js
with open('static/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_enter_room = """  function enterRoom(username,room,subText){
    myName=username;myRoom=room;ghostText='';"""

new_enter_room = """  function enterRoom(username,room,subText){
    // Programmatically reset browser scroll offset to prevent mobile layout shifts
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    
    myName=username;myRoom=room;ghostText='';"""

if old_enter_room in js:
    js = js.replace(old_enter_room, new_enter_room)
    with open('static/js/app.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("SUCCESS: window.scrollTo(0,0) added to enterRoom in app.js!")
else:
    # try with alternative signature
    print("WARNING: Exact match failed, trying alternative replacement...")
    js = js.replace("function enterRoom(username,room,subText){", "function enterRoom(username,room,subText){\n    window.scrollTo(0, 0);\n    document.body.scrollTop = 0;")
    with open('static/js/app.js', 'w', encoding='utf-8') as f:
        f.write(js)
    print("SUCCESS: enterRoom patched!")
