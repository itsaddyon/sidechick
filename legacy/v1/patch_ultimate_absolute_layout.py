with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# 1. Let's find and completely redefine the mobile layout selectors within media query max-width:720px
# We will target structural layout classes and redefine them with absolute coordinate locks.

# Target structural app screen lock:
old_app_screen = """  #app.app-screen{
    position: fixed !important;
    inset: 0 !important;
    height: 100% !important;
    width: 100% !important;
    display: flex;
    flex-direction: column !important;
    overflow: hidden !important;
    background: var(--bg-grad-4) !important;
    padding-bottom: 0 !important;
    padding-top: calc(54px + env(safe-area-inset-top) + 8px) !important;
    z-index: 500 !important;
  }"""

new_app_screen = """  #app.app-screen{
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

css = css.replace(old_app_screen, new_app_screen)

# Target structural app shell lock:
old_app_shell = """  /* Shell: flex column */
  .app-shell{display:flex !important;flex-direction:column !important;flex:1 !important;min-height:0 !important;overflow:hidden !important;padding:0 !important;grid-template-columns:none !important}"""

new_app_shell = """  /* Shell: absolute layout */
  .app-shell{
    position: absolute !important;
    inset: 0 !important;
    height: 100% !important;
    width: 100% !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 !important;
  }"""

css = css.replace(old_app_shell, new_app_shell)

# Target chat panel lock:
old_chat_panel = """  /* Chat panel */
  #chat-panel,.workspace-column{display:flex !important;flex-direction:column !important;flex:1 !important;width:100% !important;min-height:0 !important;overflow:hidden !important;height:100% !important;border-radius:0 !important;border-left:none !important;border-right:none !important;box-shadow:none !important}"""

new_chat_panel = """  /* Chat panel: absolute layout */
  #chat-panel,.workspace-column{
    position: absolute !important;
    inset: 0 !important;
    height: 100% !important;
    width: 100% !important;
    overflow: hidden !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }"""

css = css.replace(old_chat_panel, new_chat_panel)

# Target workspace header (completely hide on mobile to save huge vertical space and avoid double header layout bloat)
old_workspace_header = """  /* Workspace header: Compact & Sleek to save vertical space */
  .workspace-header{padding:8px 12px !important;flex-shrink:0 !important;gap:4px;border-bottom:1px solid rgba(255,255,255,0.05) !important}
  .workspace-header .eyebrow{display:none}
  .workspace-header h2{font-size:0.95rem;font-weight:700;margin:0;line-height:1.1}
  .workspace-header .header-sub{font-size:.78rem;margin:2px 0 0;color:var(--muted);line-height:1.2}
  .participant-strip{margin-top:4px;gap:4px;display:flex;align-items:center}
  .participant-pill{font-size:.7rem;padding:4px 8px;min-height:22px}
  #participant-count{font-size:.8rem;font-weight:600}
  .participant-pill{font-size:.78rem;padding:6px 10px;min-height:28px;display:inline-flex;align-items:center}
  #participant-count{font-size:.9rem;font-weight:600}"""

new_workspace_header = """  /* Hide redundant workspace header completely on mobile to maximize chat room height */
  .workspace-header{
    display: none !important;
  }"""

css = css.replace(old_workspace_header, new_workspace_header)

# Target messages container to occupy the absolute exact center bounds:
old_messages = """  /* Messages */
  .messages{flex:1 !important;min-height:0 !important;overflow-y:auto !important;overflow-x:hidden !important;padding:12px 14px 16px !important;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;gap:12px}"""

new_messages = """  /* Messages: Absolute layout lock between header and composer */
  .messages{
    position: absolute !important;
    top: calc(54px + env(safe-area-inset-top)) !important;
    bottom: calc(68px + env(safe-area-inset-bottom)) !important;
    left: 0 !important;
    right: 0 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    padding: 12px 14px 16px !important;
    -webkit-overflow-scrolling: touch !important;
    overscroll-behavior-y: contain !important;
    z-index: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
  }"""

css = css.replace(old_messages, new_messages)

# Target mobile detective bar to be absolute, hidden by default:
old_detective_bar = """  /* Mobile Vibe Check bar */
  .mobile-detective-bar{
    display:flex !important;
    flex-shrink:0;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    padding:12px 16px;
    background:var(--panel-strong);
    border-top:1px solid var(--border);
    min-height:60px
  }
  body.theme-dark .mobile-detective-bar{background:rgba(10,16,28,.97)}
  .mob-det-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
  .mob-det-info strong{font-size:.95rem;color:var(--ink);display:block;font-weight:700}
  body.theme-dark .mob-det-info strong{color:var(--text)}
  .mob-det-info span{font-size:.82rem;color:var(--muted);display:block;line-height:1.4}
  .toggle-det-btn{flex-shrink:0;white-space:nowrap;padding:12px 16px !important;font-size:.85rem !important;min-height:44px !important;min-width:44px !important;-webkit-tap-highlight-color:transparent}
  
  /* Show mobile detective bar when detective mode is ON */
  .app-screen[data-detective-mode="on"] .mobile-detective-bar{display:flex !important}"""

new_detective_bar = """  /* Mobile Vibe Check bar: absolute layout, hidden by default, shown ONLY in detective mode */
  .mobile-detective-bar{
    display: none !important;
    position: absolute !important;
    bottom: calc(68px + env(safe-area-inset-bottom)) !important;
    left: 0 !important;
    right: 0 !important;
    height: 54px !important;
    z-index: 100 !important;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 14px;
    background: var(--panel-strong);
    border-top: 1px solid var(--border);
  }
  body.theme-dark .mobile-detective-bar{background:rgba(10,16,28,.97)}
  .mob-det-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
  .mob-det-info strong{font-size:.88rem;color:var(--ink);display:block;font-weight:700}
  body.theme-dark .mob-det-info strong{color:var(--text)}
  .mob-det-info span{font-size:.78rem;color:var(--muted);display:block;line-height:1.2}
  .toggle-det-btn{flex-shrink:0;white-space:nowrap;padding:8px 12px !important;font-size:.78rem !important;min-height:36px !important;-webkit-tap-highlight-color:transparent}
  
  /* Show mobile detective bar and shift messages up ONLY when detective mode is ON */
  .app-screen[data-detective-mode="on"] .mobile-detective-bar{
    display: flex !important;
  }
  .app-screen[data-detective-mode="on"] .messages {
    bottom: calc(122px + env(safe-area-inset-bottom)) !important;
  }"""

css = css.replace(old_detective_bar, new_detective_bar)

# Target composer to be locked at the absolute bottom of the screen:
old_composer = """  /* Composer */
  .composer{flex-shrink:0 !important;padding:12px 14px !important;padding-bottom:max(12px,env(safe-area-inset-bottom)) !important;max-height:none !important;overflow:visible !important;gap:8px !important}"""

new_composer = """  /* Composer: absolute bottom lock, never shifts */
  .composer{
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: auto !important;
    z-index: 1000 !important;
    background: rgba(8,12,22,0.96) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border-top: 1px solid var(--border) !important;
    padding: 10px 12px !important;
    padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
    margin: 0 !important;
  }"""

css = css.replace(old_composer, new_composer)

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("SUCCESS: authoritative absolute coordinates applied to style.css mobile query!")
