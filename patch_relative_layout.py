with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's locate the mobile app-screen rule and change it from position: fixed to position: relative and height: 100dvh
old_app_screen_rule = """  #app.app-screen{
    position: fixed !important;
    inset: 0 !important;
    height: 100% !important;
    width: 100% !important;
    overflow: hidden !important;
    background: var(--bg-grad-4) !important;
    z-index: 500 !important;
    padding: 0 !important;
    margin: 0 !important;
  }"""

new_app_screen_rule = """  #app.app-screen{
    position: relative !important;
    height: 100dvh !important;
    width: 100vw !important;
    overflow: hidden !important;
    background: var(--bg-grad-4) !important;
    z-index: 500 !important;
    padding: 0 !important;
    margin: 0 !important;
  }"""

if old_app_screen_rule in css:
    css = css.replace(old_app_screen_rule, new_app_screen_rule)
    print("SUCCESS: Changed mobile app-screen lock to position: relative and 100dvh!")
else:
    print("WARNING: Exact mobile app-screen rule not found, doing broad replacement...")
    css = css.replace("position: fixed !important;\n    inset: 0 !important;\n    height: 100% !important;",
                      "position: relative !important;\n    height: 100dvh !important;\n    width: 100vw !important;")
    print("SUCCESS: Broad replacement done!")

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)
