<div align="center">
  <img src="static/favicon.svg" width="120" height="120" alt="Sidechick Logo">
  
  # Sidechick
  
  **Your Private Chat Space & Couple's Game Hub. No cap.** 💯
  
  <i>Built for trust, safety, and deep psychological insights. We literally can't see your convo — not even the dev who built us.</i>
</div>

---

## 🌟 The Vibe Check Zone

Welcome to **Sidechick**, an application designed from the ground up for our college community. We wanted a place to chat, vibe, and play games with friends or partners without worrying about data harvesting, creepy tracking, or boring, lifeless interfaces. 

Whether you want to dive deep into secure, ephemeral **Private Chat Rooms**, or find out how well you *really* know your partner in the synchronized **Couple Games** arena, Sidechick is your spot.

### 🎭 Two Paths, One Vibe

#### 💬 The Private Chat
A high-tech, end-to-end encrypted feel. Chat with your friends knowing that as soon as the room is empty, **everything auto-destructs**.
- **Dynamic Mood Backgrounds:** The interface is alive. The background shifts in real-time based on the AI-detected emotional tone of the conversation.
- **Detective Mode:** An immersive, high-tech "terminal" aesthetic for investigative sessions, tracking behavioral drift and keeping the vibe safe.
- **Identity Glows:** Every participant gets a unique, hashing-based color glow to their message bubbles.

#### 🎮 The Couple Games
A synchronized, real-time multiplayer experience designed to test your bond. Grab an invite code, send it to a friend, and play simultaneously!
- **Game Modes:** "Spicy or Sweet", "Truth or Lie", and "Couple Trivia".
- **Real-Time Sync:** When you choose an answer, the game locks in and waits for your partner. See the results instantly!
- **The Climax:** An animated heartbeat results screen with a beautifully animated compatibility ring. If you score over 80%, watch the screen explode in fireworks and confetti! 🎆

---

## 🚀 How to Run It (For Devs)

We split the deployment into two parts to keep things lightning fast:
- **Frontend (Vercel):** The beautiful HTML/CSS/JS interface.
- **Backend (Render):** The Python Flask server handling the WebSockets, real-time game states, and AI logic.

### Quick Start (Local Development)
Want to run the whole thing on your own machine? It's easy:

```bash
# 1. Install the requirements
pip install -r requirements.txt

# 2. Download the NLP datasets (only needed once!)
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"

# 3. Fire up the server
python app.py
```
Open `http://127.0.0.1:5000` in your browser and you're in!

### Compiling the Frontend
If you make changes to the UI and want to push them to Vercel, run our handy sync script:
```bash
python build_frontend.py
```
This prepares everything in the `sidechick-frontend/` directory, ready to be deployed.

---

## 🛠️ The Tech Stack

- **Backend:** Python 3.11, Flask, Flask-SocketIO (Eventlet) for blazing fast real-time sync.
- **NLP Engine:** TextBlob + Custom Recurrent Sequence Model for mood tracking.
- **Frontend:** Vanilla HTML/CSS/JS (Custom Modern Design System, absolutely no templates!).

---

## 🎓 The Team

Built with ❤️ by **Team Grey Hats**.

<div align="center">

| | Contributor | Role | Socials |
| :--- | :--- | :--- | :--- |
| <img src="https://github.com/itsaddyon.png" width="50" style="border-radius:50%"> | **Adarsh Arya** | Lead Developer & Architect | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/itsaddyon) [![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=flat&logo=instagram&logoColor=white)](https://instagram.com/itsaddyon) |

</div>

<p align="center">
  <i>Created for the community. Your vibes, your rules.</i>
</p>
