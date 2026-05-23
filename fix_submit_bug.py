with open('static/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

old_submit = """async function submitGameName() {
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
}"""

new_submit = """async function submitGameName() {
  const nameInput = document.getElementById('modal-game-username');
  const username = nameInput ? nameInput.value.trim() : '';
  
  if(!username) {
    showToast('Please enter your name first', 'error');
    nameInput?.focus();
    return;
  }
  
  const gameType = pendingGameType;
  const gameCode = pendingGameCode;
  
  closeGameModal();
  
  if (gameType === 'join') {
    // JOIN GAME FLOW
    try {
      const response = await fetch(BACKEND_URL + `/api/game/${gameCode}/join`, {
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
        body: JSON.stringify({ game_type: gameType, username })
      });
      
      const data = await response.json();
      if(data.success) {
        currentGameCode = data.game_code;
        currentGameType = gameType;
        showGameScreen(gameType, data.game_code, username);
        
        socket.emit('game_join', { game_code: data.game_code, username });
      } else {
        showToast(data.error || 'Error creating game', 'error');
      }
    } catch(e) {
      showToast(e.message, 'error');
      console.error('createGame error:', e);
    }
  }
}"""

if old_submit in js:
    js = js.replace(old_submit, new_submit)
    print("Found and replaced old submitGameName!")
else:
    # Try replacing a slightly normalized version if formatting differed
    # (should match exactly since it was created by python script)
    print("Exact old_submit not found. Trying flexible match.")
    # Let's write the file back after doing direct replace of the specific lines
    # If not found we will raise an error
    raise Exception("Old submitGameName not found in file!")

with open('static/js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("FILE SAVED SUCCESSFULLY!")
