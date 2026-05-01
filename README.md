# Sidechick: AI-Powered Behavioral Risk Chat

<div align="center">
  <img src="static/favicon.svg" width="100" height="100" alt="Sidechick Logo">
  <br>
  <h3>Private Rooms • Behavioral Analytics • Real-time Safety</h3>
  <p><i>A "Gen Z" premium chat experience built for trust, safety, and deep psychological insights.</i></p>
</div>

---

Sidechick is a private-room chat experience designed with advanced safety analytics and behavioral drift forecasting. It is specifically built to address the challenge of detecting gradual shifts that lead to toxic or harmful online interactions.

## ✨ New & Premium Features

- **🌑 Obsidian Detective Theme**: An immersive, high-tech "terminal" aesthetic for investigative sessions with dynamic scanline animations.
- **🌈 Dynamic Mood Backgrounds**: The interface is alive. The background gradients shift in real-time based on the AI-detected emotional tone of the conversation.
- **✨ Unique Identity Glows**: Every participant gets a unique, hashing-based color identity applied as a glow to their message bubbles for instant recognition.
- **📱 Mobile-First "Gen Z" Aesthetic**: Sleek glassmorphism, pill-shaped UI components, and premium typography tailored for a modern mobile experience.
- **🎭 Staggered AI Animations**: Fluid, high-quality entrance animations for intelligence cards that make AI insights feel organic.
- **🛠️ Smart Mobile Toolset**: A specialized mobile navigation menu that keeps investigative tools accessible without cluttering the chat space.

## 🛡️ Core Safety Intelligence

- **Real-Time Sequential Monitoring**: Tracks recent message sequences instead of isolated turns to compute behavioral drift and escalation risk.
- **Pre-Termination Warnings**: Intervenes when a user drafts dangerous messages, presenting a warning *before* they send it.
- **Session Auto-Destruct**: Safely terminates sessions and destroys rooms if critical safety thresholds are breached.
- **Response Playbooks**: Dynamically generates ghost replies and interventions tailored to the exact escalation stage.

## 🏗️ Architecture & Deployment

This project uses a split deployment architecture to maximize speed and cost efficiency:
- **Frontend (Vercel)**: A static, highly optimized HTML/CSS/JS interface.
- **Backend (Render)**: A Python Flask/Socket.IO backend handling realtime connections, machine learning inference, and message routing.

### Compiling the Frontend
If you make changes to the frontend UI templates, you must compile them into static files for Vercel:
```bash
python build_frontend.py
```
This script strips Flask tags, injects the `BACKEND_URL`, and outputs to the `sidechick-frontend/` directory.

## 🚀 Quick Start (Local Development)

```bash
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"
python app.py
```
Open `http://127.0.0.1:5000` in your browser.

## 🛠️ Tech Stack

- **Backend**: Python 3.11, Flask 3.0.3, Flask-SocketIO (Eventlet)
- **NLP**: TextBlob + Bootstrapped Recurrent Sequence Model
- **Frontend**: Vanilla HTML/CSS/JS (Custom Design System)
- **Optional AI**: OpenRouter Integration

## 📈 Model Retraining
To update the sequential drift forecasting model:
```bash
python train_sequence_model.py
```

## 👥 Contributors

<div align="center">

| | Contributor | Role | Socials |
| :--- | :--- | :--- | :--- |
| <img src="https://github.com/itsaddyon.png" width="50" style="border-radius:50%"> | **Adarsh Arya** | Lead Developer & Architect | [![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/itsaddyon) [![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=flat&logo=instagram&logoColor=white)](https://instagram.com/itsaddyon) |

**Team Grey Hats** • *Made with trust*

</div>

---
<p align="center">
  <i>Created for the community with safety and trust at its core.</i>
</p>
