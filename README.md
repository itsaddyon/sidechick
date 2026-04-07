# Sidechick

Sidechick is a private-room chat experience with optional safety insights. It focuses on the actual problem statement:

- Online platforms struggle to detect gradual behavioral shifts that lead to toxic interactions.
- The system should identify behavioral drift and forecast escalation toward harmful content.

## Objective

Design a predictive framework that enables early intervention through sequential modeling of user behavior patterns.

## What This Version Does

- Monitors live conversations in shared rooms
- Tracks recent message sequences instead of isolated turns
- Computes behavioral drift, escalation risk, and next-turn forecast signals
- Highlights dominant drivers such as rapid tone deterioration, volatility, or harmful lexical cues
- Surfaces intervention windows and response playbooks
- Lets users enter Detective Mode to reveal advanced analytics
- Includes an optional neon dark theme toggle
- Exports monitored sessions to JSON or CSV for dataset creation
- Includes a retraining script and saved model artifact pipeline

## Core Outputs

- `drift_score`: how far the sequence is moving from stable behavior
- `risk_score`: current escalation severity
- `forecast_score`: short-horizon likelihood of harmful continuation
- `stage`: current sequence state such as baseline, emerging escalation, or toxic drift
- `primary_driver`: strongest contributing signal behind the forecast
- `intervention`: suggested early action

## Tech Stack

- Backend: Python, Flask, Flask-SocketIO
- NLP: TextBlob plus a bootstrapped recurrent sequence model
- Frontend: HTML, CSS, Vanilla JavaScript
- Optional AI assist: OpenRouter

## Quick Start

```bash
pip install -r requirements.txt
python -c "import nltk; nltk.download('punkt'); nltk.download('averaged_perceptron_tagger')"
python app.py
```

Open `http://127.0.0.1:5000`.

## Retraining

Run:

```bash
python train_sequence_model.py
```

This writes:

- `artifacts/sequence_model.json`
- `artifacts/sequence_model_report.json`

The app automatically loads the saved artifact on startup if it exists.

## Export

During a live session you can export the monitored conversation as:

- JSON
- CSV

## Optional AI Setup

Create `.env` with:

```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openrouter/auto
```

## Notes

This project now presents itself as a predictive behavioral-risk dashboard rather than a casual chat assistant. It now includes a small bootstrapped recurrent model trained locally on synthetic toxic-drift sequences, so the forecasting layer is learned and sequential, but still not production-grade or trained on real platform data.
