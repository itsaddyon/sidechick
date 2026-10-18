with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's replace the display: flex !important; with display: flex; in #app.app-screen rule
old_display = "display: flex !important;\n    flex-direction: column !important;"
new_display = "display: flex;\n    flex-direction: column !important;"

if old_display in css:
    css = css.replace(old_display, new_display)
    print("SUCCESS: Removed !important from display on #app.app-screen!")
else:
    # try other spacings
    css = css.replace("display: flex !important;", "display: flex;")
    print("SUCCESS: Generic display: flex !important; replacement made!")

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)
