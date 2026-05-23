with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's locate the mobile messages and composer CSS definitions and patch their padding/bottom positions
old_messages_bottom = "bottom: calc(68px + env(safe-area-inset-bottom)) !important;"
new_messages_bottom = "bottom: calc(88px + env(safe-area-inset-bottom)) !important;"

old_det_messages_bottom = "bottom: calc(122px + env(safe-area-inset-bottom)) !important;"
new_det_messages_bottom = "bottom: calc(142px + env(safe-area-inset-bottom)) !important;"

old_composer_padding = "padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;"
new_composer_padding = "padding-bottom: calc(28px + env(safe-area-inset-bottom)) !important; /* Raised to protect against browser border occlusion */"

css = css.replace(old_messages_bottom, new_messages_bottom)
css = css.replace(old_det_messages_bottom, new_det_messages_bottom)
css = css.replace(old_composer_padding, new_composer_padding)

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("SUCCESS: Elevated composer padding to protect against mobile browser cut-offs!")
