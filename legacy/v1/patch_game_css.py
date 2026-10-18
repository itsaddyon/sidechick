with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

bulletproof_styles = """
/* ───────────────────────────────────────────────────────────── */
/* ─── BULLETPROOF MOBILE GAME VIEWPORT & SCROLLING OVERRIDES ── */
/* ───────────────────────────────────────────────────────────── */

/* Force a completely solid black-navy background on active game screen */
/* This hides all background screens 100% and prevents any transparency bleed-through */
body.game-active #game-screen {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 9999 !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: #050510 !important; 
  height: 100dvh !important;
  width: 100vw !important;
  overflow: hidden !important;
}

/* Force game-screen to fill dynamic viewport exactly */
.game-screen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
  display: flex !important;
  flex-direction: column !important;
  height: 100dvh !important;
  width: 100vw !important;
  background: #050510 !important;
  overflow: hidden !important;
}

/* Topbar is always pinned and cannot shrink */
.game-topbar {
  flex-shrink: 0 !important;
  z-index: 10000 !important;
  position: relative !important;
  width: 100% !important;
  background: #101025 !important;
  border-bottom: 1px solid rgba(76, 232, 255, 0.25) !important;
}

/* The parent shell is the primary vertical scrolling container */
/* We turn off all vertical flex-centering to prevent top-bottom cutoffs! */
.game-shell {
  flex: 1 !important;
  width: 100% !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important; /* Always start at the top so questions are never cut off */
  align-items: center !important;
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
}

/* The active section fills the width and gets safe margins & paddings */
.game-section {
  width: 100% !important;
  max-width: 540px !important;
  display: none !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  align-items: center !important;
  gap: 20px !important;
  /* Safe padding: 24px top, 16px sides, 120px bottom to prevent cutting off options on mobile */
  padding: 24px 16px 120px !important; 
  margin: 0 auto !important;
  min-height: 100% !important;
  box-sizing: border-box !important;
}

/* Ensure active display is flex */
.game-section[style*="display: flex"] {
  display: flex !important;
}
#game-lobby[style*="display: flex"],
#game-play[style*="display: flex"],
#game-results[style*="display: flex"] {
  display: flex !important;
}

/* Make sure choice cards are responsive and have a comfortable height */
.choices-grid {
  width: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  margin-top: 10px !important;
}

.choice-card {
  width: 100% !important;
  min-height: 54px !important;
  padding: 14px 16px !important;
  font-size: 0.95rem !important;
  line-height: 1.4 !important;
  border-radius: 14px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
}
"""

if 'BULLETPROOF MOBILE GAME VIEWPORT' not in css:
    css += bulletproof_styles
    with open('static/css/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("SUCCESS: Bulletproof mobile styling patched successfully!")
else:
    print("Already patched or present.")
