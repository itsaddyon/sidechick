with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's target the #ai-panel selector within the mobile media query
old_ai_panel = """  #ai-panel {
    display: flex !important;
    position: fixed !important;
    top: 0 !important; right: 0 !important; bottom: 0 !important;
    width: min(88vw, 360px) !important;
    z-index: 801 !important;
    transform: translateX(100%) !important;
    transition: transform .3s cubic-bezier(.32,.72,0,1) !important;
    margin: 0 !important;
    padding: 14px 14px 24px !important;
    border-radius: 0 !important;
    border-left: 1px solid var(--border) !important;
    box-shadow: -8px 0 40px rgba(0,0,0,.35) !important;
    background: var(--panel-strong) !important;
    height: 100dvh !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
  }"""

new_ai_panel = """  #ai-panel {
    display: none !important; /* HIDE BY DEFAULT ON MOBILE TO PREVENT HORIZONTAL SCROLL OVERFLOW */
    position: fixed !important;
    top: 0 !important; right: 0 !important; bottom: 0 !important;
    width: min(88vw, 360px) !important;
    z-index: 801 !important;
    transform: translateX(100%) !important;
    transition: transform .3s cubic-bezier(.32,.72,0,1) !important;
    margin: 0 !important;
    padding: 14px 14px 24px !important;
    border-radius: 0 !important;
    border-left: 1px solid var(--border) !important;
    box-shadow: -8px 0 40px rgba(0,0,0,.35) !important;
    background: var(--panel-strong) !important;
    height: 100% !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
  }
  #ai-panel.mobile-visible {
    display: flex !important; /* ONLY DISPLAY WHEN ACTIVE */
    transform: translateX(0) !important;
  }"""

if old_ai_panel in css:
    css = css.replace(old_ai_panel, new_ai_panel)
    print("SUCCESS: Patched #ai-panel mobile layout definition!")
else:
    # try simpler search
    css = css.replace("display: flex !important;\n    position: fixed !important;\n    top: 0 !important; right: 0 !important; bottom: 0 !important;\n    width: min(88vw, 360px) !important;\n    z-index: 801 !important;\n    transform: translateX(100%) !important;",
                      "display: none !important;\n    position: fixed !important;\n    top: 0 !important; right: 0 !important; bottom: 0 !important;\n    width: min(88vw, 360px) !important;\n    z-index: 801 !important;\n    transform: translateX(100%) !important;")
    print("SUCCESS: Simpler #ai-panel patch applied!")

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)
