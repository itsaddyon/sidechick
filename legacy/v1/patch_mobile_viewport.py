with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Let's fix body.app-active definition in style.css to lock body to exactly 100% height
old_body_active = """body.app-active{overflow:hidden}"""
new_body_active = """body.app-active {
  overflow: hidden !important;
  position: fixed !important;
  width: 100vw !important;
  height: 100% !important;
  inset: 0 !important;
}"""

if old_body_active in css:
    css = css.replace(old_body_active, new_body_active)
else:
    # Alternative spacer or spacing
    css = css.replace("body.app-active {", new_body_active + " /* replaced */ \n /*")

# 2. Let's optimize #app.app-screen on mobile to be position: fixed, inset: 0, height: 100%
old_app_screen_mobile = """  /* App screen: full height, flex column, NOT fixed */
  #app.app-screen{
    height:100dvh;
    max-height:100dvh;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    position:relative;
    background:var(--bg-grad-4);
    padding-bottom:env(safe-area-inset-bottom);
    padding-top:calc(54px + env(safe-area-inset-top) + 24px);
  }"""

new_app_screen_mobile = """  /* App screen: Anchor perfectly to viewport, no overflow, no bottom padding */
  #app.app-screen{
    position: fixed !important;
    inset: 0 !important;
    height: 100% !important;
    width: 100% !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    background: var(--bg-grad-4) !important;
    padding-bottom: 0 !important;
    padding-top: calc(54px + env(safe-area-inset-top) + 8px) !important;
    z-index: 500 !important;
  }"""

if old_app_screen_mobile in css:
    css = css.replace(old_app_screen_mobile, new_app_screen_mobile)
else:
    # Try generic clean replace
    css = css.replace("height:100dvh;\n    max-height:100dvh;\n    display:flex;\n    flex-direction:column;\n    overflow:hidden;\n    position:relative;\n    background:var(--bg-grad-4);\n    padding-bottom:env(safe-area-inset-bottom);\n    padding-top:calc(54px + env(safe-area-inset-top) + 24px);",
                      "position: fixed !important; inset: 0 !important; height: 100% !important; width: 100% !important; display: flex !important; flex-direction: column !important; overflow: hidden !important; background: var(--bg-grad-4) !important; padding-bottom: 0 !important; padding-top: calc(54px + env(safe-area-inset-top) + 8px) !important; z-index: 500 !important;")

# 3. Compact workspace header on mobile to save valuable vertical space
old_workspace_header_mobile = """  /* Workspace header */
  .workspace-header{padding:12px 16px !important;flex-shrink:0 !important;gap:8px}
  .workspace-header .eyebrow{display:none}
  .workspace-header h2{font-size:1.1rem;font-weight:700;margin:0;line-height:1.2}
  .workspace-header .header-sub{font-size:.82rem;margin:4px 0 0;color:var(--muted);line-height:1.4}
  .participant-strip{margin-top:8px;gap:6px}"""

new_workspace_header_mobile = """  /* Workspace header: Compact & Sleek to save vertical space */
  .workspace-header{padding:8px 12px !important;flex-shrink:0 !important;gap:4px;border-bottom:1px solid rgba(255,255,255,0.05) !important}
  .workspace-header .eyebrow{display:none}
  .workspace-header h2{font-size:0.95rem;font-weight:700;margin:0;line-height:1.1}
  .workspace-header .header-sub{font-size:.78rem;margin:2px 0 0;color:var(--muted);line-height:1.2}
  .participant-strip{margin-top:4px;gap:4px;display:flex;align-items:center}
  .participant-pill{font-size:.7rem;padding:4px 8px;min-height:22px}
  #participant-count{font-size:.8rem;font-weight:600}"""

if old_workspace_header_mobile in css:
    css = css.replace(old_workspace_header_mobile, new_workspace_header_mobile)
else:
    print("WARNING: Exact match for workspace-header failed.")

# 4. Make sure html, body are 100% height
if "html{height:100%}" in css:
    css = css.replace("html{height:100%}", "html,body{height:100%;margin:0;padding:0}")

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("SUCCESS: Style overrides written to static/css/style.css!")
