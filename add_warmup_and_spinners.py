# 1. Update style.css to add .loading-spinner
with open('static/css/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

spinner_css = """
/* Premium Loading Spinner */
.loading-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
"""

if '.loading-spinner' not in css:
    css += spinner_css
    with open('static/css/style.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("CSS updated with spinner styles!")

# 2. Update app.js to add pings and spinners
with open('static/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Add Pre-warm ping at the top after BACKEND_URL definition
prewarm_code = """
// --- PRE-WARM RENDER BACKEND ON LAND ---
// Instantly wakes up the Render free tier container while the user is typing/deciding
if (BACKEND_URL) {
  console.log("⚡ Sending silent pre-warm ping to Render backend...");
  fetch(BACKEND_URL + '/api/ai-status').then(res => {
     console.log("✨ Render backend is fully awake and responsive!");
  }).catch(err => {
     console.warn("⚠️ Render backend wake-up ping failed:", err);
  });
}
"""

if 'PRE-WARM RENDER BACKEND' not in js:
    # Insert after BACKEND_URL definition
    parts = js.split("const BACKEND_URL = window.location.hostname.includes('vercel.app')\n  ? 'https://sidechick-syej.onrender.com' : '';")
    if len(parts) >= 2:
        js = parts[0] + "const BACKEND_URL = window.location.hostname.includes('vercel.app')\n  ? 'https://sidechick-syej.onrender.com' : '';" + prewarm_code + parts[1]
        print("Pre-warm ping injected!")

# Update submitGameName to include spinners and disabled button state
old_submit_start = """async function submitGameName() {
  const nameInput = document.getElementById('modal-game-username');
  const username = nameInput ? nameInput.value.trim() : '';
  
  if(!username) {
    showToast('Please enter your name first', 'error');
    nameInput?.focus();
    return;
  }
  
  const gameType = pendingGameType;
  const gameCode = pendingGameCode;
  
  closeGameModal();"""

new_submit_start = """async function submitGameName() {
  const nameInput = document.getElementById('modal-game-username');
  const username = nameInput ? nameInput.value.trim() : '';
  
  if(!username) {
    showToast('Please enter your name first', 'error');
    nameInput?.focus();
    return;
  }
  
  const gameType = pendingGameType;
  const gameCode = pendingGameCode;
  
  // Show premium loading spinner on the submit button
  const submitBtn = document.querySelector('#game-name-modal .primary-btn');
  const originalBtnText = submitBtn ? submitBtn.textContent : "Let's Go";
  if(submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="loading-spinner"></span> Connecting...`;
  }
  
  // Clean up global states
  const modalEl = document.getElementById('game-name-modal');
  if(modalEl) modalEl.style.display = 'none';
  pendingGameType = '';
  pendingGameCode = '';
  
  // Helper to restore button state
  const restoreButton = () => {
    if(submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  };"""

# Replace in js
js = js.replace(old_submit_start, new_submit_start)

# Add restoreButton() inside catches/errors of join and create flows
js = js.replace("showToast(data.error || 'Invalid code', 'error');", "showToast(data.error || 'Invalid code', 'error'); restoreButton();")
js = js.replace("showToast(e.message, 'error');\n      console.error('joinGame error:', e);", "showToast(e.message, 'error'); restoreButton();\n      console.error('joinGame error:', e);")
js = js.replace("showToast(data.error || 'Error creating game', 'error');", "showToast(data.error || 'Error creating game', 'error'); restoreButton();")
js = js.replace("showToast(e.message, 'error');\n      console.error('createGame error:', e);", "showToast(e.message, 'error'); restoreButton();\n      console.error('createGame error:', e);")

with open('static/js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS spinners and pre-warm injected successfully!")
