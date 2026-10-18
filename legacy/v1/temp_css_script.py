import re

with open("static/css/style.css", "r", encoding="utf-8") as f:
    css = f.read()

# Replace fonts
css = css.replace("--font-sans:'Space Grotesk',sans-serif;", "--font-sans:'Inter',sans-serif;")
css = css.replace("--font-display:'Bricolage Grotesque',sans-serif;", "--font-display:'Outfit',sans-serif;")

# Overwrite Light mode background and panels for "Mesh Glass"
css = css.replace(
    "--bg-grad-4:linear-gradient(180deg,#fbf7ff 0%,#f1f6ff 100%);",
    "--bg-grad-4:radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%); background-size: 200% 200%; animation: gradientBG 15s ease infinite;"
)
css = css.replace("--panel:rgba(255,255,255,0.78);", "--panel:rgba(255,255,255,0.3); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.4);")
css = css.replace("--panel-strong:rgba(255,255,255,0.96);", "--panel-strong:rgba(255,255,255,0.5); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.6);")

# Overwrite Dark mode background and panels for "Mesh Glass"
css = css.replace(
    "--bg:#070a12; --panel:rgba(8,12,22,0.92); --panel-strong:rgba(10,16,28,0.97);",
    "--bg:#050510; --panel:rgba(15,15,30,0.4); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.1); --panel-strong:rgba(20,20,40,0.6); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.15);"
)

# Add Bouncy physics and Toast CSS
bouncy_css = """
@keyframes gradientBG {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
.btn, .choice-card, .game-card {
  transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55), box-shadow 0.4s ease, border-color 0.4s ease !important;
}
.btn:active, .choice-card:active, .game-card:active {
  transform: scale(0.92) !important;
}
/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.premium-toast {
  background: var(--panel-strong);
  color: var(--text);
  padding: 12px 24px;
  border-radius: 99px;
  font-family: var(--font-display);
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  animation: toastSlideDown 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
  opacity: 0;
  pointer-events: auto;
}
.premium-toast.fade-out {
  animation: toastFadeOut 0.3s ease forwards;
}
@keyframes toastSlideDown {
  0% { transform: translateY(-30px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes toastFadeOut {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-20px); opacity: 0; }
}
/* Suspense Animation */
.pulse-suspense {
  animation: suspensePulse 1.5s infinite ease-in-out;
  color: var(--blue);
  font-weight: bold;
}
@keyframes suspensePulse {
  0% { transform: scale(1); opacity: 0.7; text-shadow: 0 0 10px rgba(76,232,255,0.2); }
  50% { transform: scale(1.05); opacity: 1; text-shadow: 0 0 20px rgba(76,232,255,0.6); }
  100% { transform: scale(1); opacity: 0.7; text-shadow: 0 0 10px rgba(76,232,255,0.2); }
}

/* Staggered Mode Cards */
.games-grid .game-card {
  opacity: 0;
  animation: slideUpFade 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}
.games-grid .game-card:nth-child(1) { animation-delay: 0.1s; }
.games-grid .game-card:nth-child(2) { animation-delay: 0.2s; }
.games-grid .game-card:nth-child(3) { animation-delay: 0.3s; }
.games-grid .game-card:nth-child(4) { animation-delay: 0.4s; }

@keyframes slideUpFade {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0); }
}
"""
with open("static/css/style.css", "w", encoding="utf-8") as f:
    f.write(css + bouncy_css)

print("CSS Overhauled!")
