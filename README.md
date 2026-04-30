# Sidechick: AI-Powered Behavioral Risk Chat

Sidechick is a private-room chat experience designed with advanced safety analytics and behavioral drift forecasting. It is specifically built to address the challenge of detecting gradual shifts that lead to toxic or harmful online interactions.

## Core Features

- **Real-Time Sequential Monitoring**: Tracks recent message sequences instead of isolated turns to compute behavioral drift and escalation risk.
- **Pre-Termination Warnings**: When a user drafts a highly dangerous or threatening message, Sidechick intervenes immediately. It presents a warning to the user before they can send it. If sent, it safely terminates the chat session, notifies the other user, and permanently destroys the room to maintain platform safety.
- **Detective Mode**: A specialized UI mode that surfaces the underlying AI context. When activated, it transforms the user interface with a sleek investigation theme and selectively reveals AI "thinking" and tactical suggestions *only* when the system detects rising tension.
- **Response Playbooks**: Dynamically generates ghost replies and interventions tailored to the exact escalation stage.
- **Model Training Integration**: Includes a local retraining script and saved model pipeline for forecasting sequential behavioral drift.

## Architecture & Deployment

This project uses a split deployment architecture to maximize speed and cost efficiency:
- **Frontend (Vercel)**: A static, highly optimized HTML/CSS/JS interface.
- **Backend (Render)**: A Python Flask/Socket.IO backend handling the realtime connections, machine learning inference, and message routing.

### Compiling the Frontend
If you make changes to the frontend UI templates in the Flask backend, you must compile them into static files before deploying to Vercel.

```bash
python build_frontend.py
```
This script automatically strips Flask-specific template logic (like `url_for()`), injects environmental routing (e.g. `BACKEND_URL`), and outputs production-ready static assets into the `sidechick-frontend/` directory. You then push this directory to your Vercel-linked repository.

## Quick Start (Local Development)

```bash
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"
python app.py
```

Open `http://127.0.0.1:5000` in your browser.

## Tech Stack

- **Backend**: Python 3.11, Flask 3.0.3, Flask-SocketIO 5.3.6 (Eventlet async mode)
- **NLP**: TextBlob + Bootstrapped Recurrent Sequence Model
- **Frontend**: Vanilla HTML/CSS/JS with custom CSS architecture
- **Optional AI Assist**: OpenRouter Integration

## Model Retraining

To retrain the sequential drift forecasting model on new synthetic toxic-drift sequences:

```bash
python train_sequence_model.py
```

This updates the model artifacts (`sequence_model.json` and `sequence_model_report.json`), which the backend will automatically load upon its next boot.

## Optional Configuration

Create a `.env` file in the root directory:

```env
# Optional: External AI APIs for deeper fact-checking or inferences
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openrouter/auto

# Required for Render / Cross-Origin Deployments
CORS_ALLOWED_ORIGINS=*
SECRET_KEY=your_secure_secret_here
```

## Note on Architecture
This project is an experimental behavioral-risk dashboard. The forecasting layer utilizes a bootstrapped recurrent model trained locally on synthetic data, designed specifically to demonstrate early-intervention capabilities for online safety moderation.

## Contributors

Team Grey Hats
Lead - Adarsh Arya
Build for Scale, For People!🤝
