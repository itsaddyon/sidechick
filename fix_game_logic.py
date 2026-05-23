import re

# 1. Update index.html
with open('templates/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace copyGameCode() in topbar
html = html.replace('onclick="copyGameCode()"', 'onclick="copyInviteLink()"')

with open('templates/index.html', 'w', encoding='utf-8') as f:
    f.write(html)


# 2. Update app.js
with open('static/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Replace auto-join logic to properly trigger Game Modal instead of filling chat room
js = re.sub(
    r"// Check URL for Auto-Join.*?(?=\n// \-+\n|\nlet pendingGameType)",
    """// Check URL for Auto-Join
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameToJoin = urlParams.get('game');
  if (gameToJoin) {
     const codeInput = document.getElementById('game-code-input');
     if(codeInput) codeInput.value = gameToJoin;
     showToast('✨ Invite code applied! Enter your name to join.', 'success');
     
     pendingGameCode = gameToJoin;
     pendingGameType = 'join';
     const titleEl = document.getElementById('game-modal-title');
     if(titleEl) titleEl.textContent = 'Joining Game';
     const modalEl = document.getElementById('game-name-modal');
     if(modalEl) modalEl.style.display = 'flex';
     const nameInput = document.getElementById('modal-game-username');
     if(nameInput) nameInput.focus();
     
     window.history.replaceState({}, document.title, window.location.pathname);
  }
});
""",
    js,
    flags=re.DOTALL
)

# Replace joinGameWithCode and submitGameName
js = re.sub(
    r"let pendingGameType = '';.*?async function joinGameWithCode\(\) \{.*?\n\}",
    """let pendingGameType = '';
let pendingGameCode = '';

function createGame(gameType) {
  pendingGameType = gameType;
  const titles = {
    'compatibility_quiz': 'Compatibility Quiz',
    'spicy_or_sweet': 'Spicy or Sweet',
    'couple_trivia': 'Couple Trivia',
    'truth_or_lie': 'Truth or Lie'
  };
  document.getElementById('game-modal-title').textContent = 'Starting ' + (titles[gameType] || 'Game');
  document.getElementById('game-name-modal').style.display = 'flex';
  document.getElementById('modal-game-username').focus();
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
  document.getElementById('game-modal-title').textContent = 'Joining Game';
  document.getElementById('game-name-modal').style.display = 'flex';
  document.getElementById('modal-game-username').focus();
}

function closeGameModal() {
  document.getElementById('game-name-modal').style.display = 'none';
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
""",
    js,
    flags=re.DOTALL
)

with open('static/js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("JS FIXED!")
