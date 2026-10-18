import re

with open("static/js/app.js", "r", encoding="utf-8") as f:
    js = f.read()

# 1. Add Toast Logic and Auto-Join URL logic at the very beginning
toast_logic = """
// --- PREMIUM TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'premium-toast';
  toast.textContent = message;
  
  // Custom colors based on type
  if(type === 'error') toast.style.borderLeft = '4px solid var(--red)';
  if(type === 'success') toast.style.borderLeft = '4px solid var(--green)';
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Override default alert
window.alert = function(msg) {
  showToast(msg, 'error');
};

// --- ONE-CLICK INVITE LINKS ---
function copyInviteLink() {
  if (!currentGameCode) return;
  const inviteUrl = window.location.origin + window.location.pathname + '?game=' + currentGameCode;
  navigator.clipboard.writeText(inviteUrl).then(() => {
    showToast('✨ Invite Link Copied! Send it to your partner.', 'success');
  }).catch(() => {
    showToast('Failed to copy link.', 'error');
  });
}

// Check URL for Auto-Join
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameToJoin = urlParams.get('game');
  if (gameToJoin && gameToJoin.length === 8) {
     // Automatically show join modal
     document.getElementById('room-input').value = gameToJoin;
     showToast('Invite code applied! Enter your name to join.', 'success');
     
     // Remove parameter from URL so it doesn't trigger again on refresh
     window.history.replaceState({}, document.title, window.location.pathname);
  }
});
"""

# Insert at the beginning of the file, after any initial constants
js = re.sub(r'(const socket = .*?;)', r'\1\n' + toast_logic, js, count=1)


# 2. Add suspense animation class to waiting text
js = js.replace(
    "document.getElementById('game-status-text').textContent = 'Waiting for your friend to join...';",
    "const st = document.getElementById('game-status-text'); st.textContent = 'Waiting for your friend to join...'; st.classList.add('pulse-suspense');"
)
js = js.replace(
    "document.getElementById('waiting-partner').style.display = 'block';",
    "const wp = document.getElementById('waiting-partner'); wp.style.display = 'block'; wp.classList.add('pulse-suspense');"
)

# 3. Add mobile scrolling fix to .game-section (we do this in CSS, but let's make sure it's applied)
# Actually I already updated css earlier, but let me verify game-section has overflow-y: auto. 
# I will append to style.css just to be safe.

with open("static/js/app.js", "w", encoding="utf-8") as f:
    f.write(js)

with open("static/css/style.css", "a", encoding="utf-8") as f:
    f.write("\\n.game-section { overflow-y: auto; padding-bottom: 80px; }\\n")

print("JS Overhauled!")
