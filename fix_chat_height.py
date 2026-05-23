with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's inspect and replace the chat panel height:auto !important in mobile media query
old_chat_panel_mobile = "height:auto !important;border-radius:0 !important;border-left:none !important;border-right:none !important;box-shadow:none !important}"
new_chat_panel_mobile = "height:100% !important;border-radius:0 !important;border-left:none !important;border-right:none !important;box-shadow:none !important}"

if old_chat_panel_mobile in css:
    css = css.replace(old_chat_panel_mobile, new_chat_panel_mobile)
    print("SUCCESS: Changed height:auto to height:100% in mobile media query!")
else:
    # Try alternative matching
    print("WARNING: Exact match failed, trying broader replacement...")
    css = css.replace("height:auto !important;border-radius:0", "height:100% !important;border-radius:0")
    print("SUCCESS: height:auto replaced!")

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)
