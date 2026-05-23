with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's locate the messages-empty class and patch it to be absolute centered
old_empty = ".messages-empty{position:static;display:grid;place-items:center;pointer-events:none;padding:10px 24px 20px}"
new_empty = """.messages-empty {
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -55%) !important;
  width: calc(100% - 32px) !important;
  max-width: 520px !important;
  z-index: 10 !important;
  margin: 0 !important;
  pointer-events: none !important;
  display: grid !important;
  place-items: center !important;
  padding: 0 !important;
}"""

if old_empty in css:
    css = css.replace(old_empty, new_empty)
    print("SUCCESS: Patched messages-empty class to be absolute centered!")
else:
    # Try alternative matching
    css = css.replace(".messages-empty{position:static;", ".messages-empty{position:absolute !important;top:50% !important;left:50% !important;transform:translate(-50%,-55%) !important;width:calc(100% - 32px) !important;max-width:520px !important;z-index:10 !important;")
    print("SUCCESS: Broader messages-empty replacement made!")

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)
