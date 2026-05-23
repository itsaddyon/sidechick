import json

# 1. Load questions
with open('scratch_questions.json', 'r', encoding='utf-8') as f:
    questions_data = json.load(f)

# 2. Read app.js
with open('static/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 3. Replace GAME_DATA
parts_gd = js.split('const GAME_DATA = {')
if len(parts_gd) < 2:
    print("Error splitting GAME_DATA")
    exit(1)

sub_parts_gd = parts_gd[1].split('async function createGame(gameType) {')
if len(sub_parts_gd) < 2:
    print("Error splitting createGame")
    exit(1)

new_game_data_str = json.dumps(questions_data, indent=2) + ';\n\n'
js = parts_gd[0] + 'const GAME_DATA = ' + new_game_data_str + 'async function createGame(gameType) {' + sub_parts_gd[1]

# 4. Replace createGame and joinGameWithCode
parts_fns = js.split('async function createGame(gameType) {')
if len(parts_fns) < 2:
    print("Error splitting fns")
    exit(1)

sub_parts_fns = parts_fns[1].split('function showGameScreen(gameType, gameCode, username) {')
if len(sub_parts_fns) < 2:
    print("Error splitting showGameScreen")
    exit(1)

new_fns_str = """let pendingGameType = '';
let pendingGameCode = '';

function createGame(gameType) {
  pendingGameType = gameType;
  const titles = {
    'compatibility_quiz': 'Compatibility Quiz',
    'spicy_or_sweet': 'Spicy or Sweet',
    'couple_trivia': 'Couple Trivia',
    'truth_or_lie': 'Truth or Lie'
  };
  const titleEl = document.getElementById('game-modal-title');
  if(titleEl) titleEl.textContent = 'Starting ' + (titles[gameType] || 'Game');
  const modalEl = document.getElementById('game-name-modal');
  if(modalEl) modalEl.style.display = 'flex';
  const nameInput = document.getElementById('modal-game-username');
  if(nameInput) {
    nameInput.value = '';
    nameInput.focus();
  }
}

function joinGameWithCode() {
  const codeInput = document.getElementById('game-code-input');
  const gameCode = codeInput ? codeInput.value.trim().toUpperCase() : '';
  
  if(!gameCode) {
    showToast('Please enter a game code', 'error');
    codeInput?.focus();
    return;
  }
  
  pendingGameCode = gameCode;
  pendingGameType = 'join';
  const titleEl = document.getElementById('game-modal-title');
  if(titleEl) titleEl.textContent = 'Joining Game';
  const modalEl = document.getElementById('game-name-modal');
  if(modalEl) modalEl.style.display = 'flex';
  const nameInput = document.getElementById('modal-game-username');
  if(nameInput) {
    nameInput.value = '';
    nameInput.focus();
  }
}

function closeGameModal() {
  const modalEl = document.getElementById('game-name-modal');
  if(modalEl) modalEl.style.display = 'none';
  pendingGameType = '';
  pendingGameCode = '';
}

async function submitGameName() {
  const nameInput = document.getElementById('modal-game-username');
  const username = nameInput ? nameInput.value.trim() : '';
  
  if(!username) {
    showToast('Please enter your name first', 'error');
    nameInput?.focus();
    return;
  }
  
  closeGameModal();
  
  if (pendingGameType === 'join') {
    // JOIN GAME FLOW
    try {
      const response = await fetch(BACKEND_URL + `/api/game/${pendingGameCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      const data = await response.json();
      if(data.success) {
        currentGameCode = data.game_code;
        currentGameType = data.game_type || 'compatibility_quiz';
        showGameScreen(currentGameType, data.game_code, username);
        
        socket.emit('game_join', { game_code: data.game_code, username });
      } else {
        showToast(data.error || 'Invalid code', 'error');
      }
    } catch(e) {
      showToast(e.message, 'error');
      console.error('joinGame error:', e);
    }
  } else {
    // CREATE GAME FLOW
    try {
      const response = await fetch(BACKEND_URL + '/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_type: pendingGameType, username })
      });
      
      const data = await response.json();
      if(data.success) {
        currentGameCode = data.game_code;
        currentGameType = pendingGameType;
        showGameScreen(pendingGameType, data.game_code, username);
        
        socket.emit('game_join', { game_code: data.game_code, username });
      } else {
        showToast(data.error || 'Error creating game', 'error');
      }
    } catch(e) {
      showToast(e.message, 'error');
      console.error('createGame error:', e);
    }
  }
}

"""

js = parts_fns[0] + new_fns_str + 'function showGameScreen(gameType, gameCode, username) {' + sub_parts_fns[1]

# 5. Add Toast & Invite Code copying logic at the beginning after socket definition
toast_logic = """
// --- PREMIUM TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'premium-toast';
  toast.textContent = message;
  
  if(type === 'error') toast.style.borderLeft = '4px solid var(--red)';
  if(type === 'success') toast.style.borderLeft = '4px solid var(--green)';
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Override alert
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
  if (gameToJoin) {
     const codeInput = document.getElementById('game-code-input');
     if(codeInput) codeInput.value = gameToJoin;
     showToast('✨ Invite code applied! Enter your name to join.', 'success');
     
     pendingGameCode = gameToJoin;
     pendingGameType = 'join';
     
     // Delay slightly to let layout load
     setTimeout(() => {
       const titleEl = document.getElementById('game-modal-title');
       if(titleEl) titleEl.textContent = 'Joining Game';
       const modalEl = document.getElementById('game-name-modal');
       if(modalEl) modalEl.style.display = 'flex';
       const nameInput = document.getElementById('modal-game-username');
       if(nameInput) nameInput.focus();
     }, 500);
     
     window.history.replaceState({}, document.title, window.location.pathname);
  }
});
"""

# Insert toast logic
socket_match = js.split('const socket = io(BACKEND_URL);')
if len(socket_match) >= 2:
    js = socket_match[0] + 'const socket = io(BACKEND_URL);' + toast_logic + socket_match[1]

# 6. Session 10 Qs
js = js.replace('sessionQuestions = getSyncedQuestions(gameType, currentGameCode, 5);', 'sessionQuestions = getSyncedQuestions(gameType, currentGameCode, 10);')

# 7. Confetti and Score celebration to 85%
js = js.replace('data.compatibility >= 80', 'data.compatibility >= 85')

# 8. Suspense Heartbeat
js = js.replace(
    "document.getElementById('game-status-text').textContent = 'Waiting for your friend to join...';",
    "const st = document.getElementById('game-status-text'); st.textContent = 'Waiting for your friend to join...'; st.classList.add('pulse-suspense');"
)
js = js.replace(
    "document.getElementById('waiting-partner').style.display = 'block';",
    "const wp = document.getElementById('waiting-partner'); wp.style.display = 'block'; wp.classList.add('pulse-suspense');"
)

# 9. Fix username-input references for Chat lobby!
# Wait! In original code it might have been username-input, but since I fixed it in style.css let's make sure it checks both!
# Let's override how document.getElementById('username-input') works as a fallback!
# If username-input is null, return chat-username-input!
js = js.replace(
    "const u=(document.getElementById('username-input').value||'').trim();",
    "const u=((document.getElementById('username-input') || document.getElementById('chat-username-input')).value||'').trim();"
)
js = js.replace(
    "const username=(document.getElementById('username-input').value||'').trim();if(!username)return;",
    "const username=((document.getElementById('username-input') || document.getElementById('chat-username-input')).value||'').trim();if(!username)return;"
)

with open('static/js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS SUCCESS!")
