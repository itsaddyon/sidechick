with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

# Let's completely redefine the mobile layout structural rules within the media query max-width:720px
# We will replace the previous absolute layout code with our highly stable standard flex flow code.

# 1. Redefine mobile app-screen to be standard flex:
old_app_screen = """  #app.app-screen{
    position: relative !important;
    height: 100dvh !important;
    width: 100vw !important;
    overflow: hidden !important;
    background: var(--bg-grad-4) !important;
    z-index: 500 !important;
    padding: 0 !important;
    margin: 0 !important;
  }"""

new_app_screen = """  #app.app-screen{
    display: flex !important;
    flex-direction: column !important;
    height: 100dvh !important;
    width: 100vw !important;
    overflow: hidden !important;
    background: var(--bg-grad-4) !important;
    z-index: 500 !important;
    padding: 0 !important;
    margin: 0 !important;
    position: relative !important;
  }"""

css = css.replace(old_app_screen, new_app_screen)

# 2. Redefine mobile app-shell to be standard flex child:
old_app_shell = """  /* Shell: absolute layout */
  .app-shell{
    position: absolute !important;
    inset: 0 !important;
    height: 100% !important;
    width: 100% !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 !important;
  }"""

new_app_shell = """  /* Shell: flex child */
  .app-shell{
    display: flex !important;
    flex-direction: column !important;
    flex: 1 !important;
    min-height: 0 !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 !important;
    position: relative !important;
  }"""

css = css.replace(old_app_shell, new_app_shell)

# 3. Redefine mobile chat-panel to be standard flex:
old_chat_panel = """  /* Chat panel: absolute layout */
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

new_chat_panel = """  /* Chat panel: flex layout */
  #chat-panel,.workspace-column{
    display: flex !important;
    flex-direction: column !important;
    flex: 1 !important;
    min-height: 0 !important;
    overflow: hidden !important;
    height: 100% !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    position: relative !important;
  }"""

css = css.replace(old_chat_panel, new_chat_panel)

# 4. Redefine messages to be flex-grow child:
old_messages = """  /* Messages: Absolute layout lock between header and composer */
  .messages{
    position: absolute !important;
    top: calc(54px + env(safe-area-inset-top)) !important;
    bottom: calc(88px + env(safe-area-inset-bottom)) !important;
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

new_messages = """  /* Messages: Clean flex-grow middle container */
  .messages{
    flex: 1 !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    padding: 12px 14px 16px !important;
    padding-top: calc(70px + env(safe-area-inset-top)) !important; /* Buffer for the fixed topbar */
    -webkit-overflow-scrolling: touch !important;
    overscroll-behavior-y: contain !important;
    z-index: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    position: relative !important;
  }"""

css = css.replace(old_messages, new_messages)

# 5. Redefine mobile detective bar shifting (no longer needed because messages is in normal flow):
old_det_shift = """  /* Show mobile detective bar and shift messages up ONLY when detective mode is ON */
  .app-screen[data-detective-mode="on"] .mobile-detective-bar{
    display: flex !important;
  }
  .app-screen[data-detective-mode="on"] .messages {
    bottom: calc(142px + env(safe-area-inset-bottom)) !important;
  }"""

new_det_shift = """  /* Show mobile detective bar ONLY when detective mode is ON */
  .app-screen[data-detective-mode="on"] .mobile-detective-bar{
    display: flex !important;
    position: relative !important;
    bottom: auto !important;
    left: auto !important;
    right: auto !important;
  }"""

css = css.replace(old_det_shift, new_det_shift)

# 6. Redefine composer to be relative bottom element in the flex flow:
old_composer = """  /* Composer: absolute bottom lock, never shifts */
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
    padding: 8px 12px !important;
    padding-bottom: calc(28px + env(safe-area-inset-bottom)) !important; /* Raised to protect against browser border occlusion */
    margin: 0 !important;
  }"""

new_composer = """  /* Composer: Pinned to bottom of the flex layout flow */
  .composer{
    position: relative !important;
    flex-shrink: 0 !important;
    height: auto !important;
    z-index: 1000 !important;
    background: rgba(8,12,22,0.96) !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
    border-top: 1px solid var(--border) !important;
    padding: 10px 12px !important;
    padding-bottom: calc(14px + env(safe-area-inset-bottom)) !important;
    margin: 0 !important;
  }"""

css = css.replace(old_composer, new_composer)

with open('static/css/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("SUCCESS: Standard flexible layout applied successfully to style.css mobile query!")
