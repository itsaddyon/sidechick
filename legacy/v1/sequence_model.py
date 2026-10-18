import json
import math
import os
import random


def _sigmoid(value):
    value = max(-40.0, min(40.0, value))
    return 1.0 / (1.0 + math.exp(-value))


def _tanh(value):
    value = max(-20.0, min(20.0, value))
    return math.tanh(value)


def _dot(left, right):
    return sum(a * b for a, b in zip(left, right))


def _matvec(matrix, vector):
    return [_dot(row, vector) for row in matrix]


def _zeros(size):
    return [0.0 for _ in range(size)]


def _init_matrix(rows, cols, rng, scale=0.25):
    return [[rng.uniform(-scale, scale) for _ in range(cols)] for _ in range(rows)]


class BootstrappedSequenceRiskModel:
    """Tiny recurrent model trained on synthetic toxic-drift sequences."""

    def __init__(self, input_size=8, hidden_size=10, seed=7):
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.seed = seed
        rng = random.Random(seed)
        self.wx = _init_matrix(hidden_size, input_size, rng)
        self.wh = _init_matrix(hidden_size, hidden_size, rng, scale=0.18)
        self.bh = _zeros(hidden_size)
        self.wy = [rng.uniform(-0.25, 0.25) for _ in range(hidden_size)]
        self.by = 0.0
        self.training_summary = {}

    def step(self, x_t, h_prev):
        hidden_raw = []
        hidden = []
        input_proj = _matvec(self.wx, x_t)
        state_proj = _matvec(self.wh, h_prev)
        for i in range(self.hidden_size):
            z = input_proj[i] + state_proj[i] + self.bh[i]
            hidden_raw.append(z)
            hidden.append(_tanh(z))
        logit = _dot(self.wy, hidden) + self.by
        y_hat = _sigmoid(logit)
        return hidden, hidden_raw, y_hat

    def predict_sequence(self, feature_sequence):
        h_prev = _zeros(self.hidden_size)
        outputs = []
        hidden_states = []
        for x_t in feature_sequence:
            h_prev, _, y_hat = self.step(x_t, h_prev)
            hidden_states.append(h_prev[:])
            outputs.append(y_hat)
        return outputs, hidden_states

    def train(self, sequences, labels, epochs=24, lr=0.045):
        history = []
        for _ in range(epochs):
            total_loss = 0.0
            paired = list(zip(sequences, labels))
            random.shuffle(paired)
            for seq, y_true in paired:
                states = []
                h_prev = _zeros(self.hidden_size)
                for x_t in seq:
                    h_t, raw_t, y_hat = self.step(x_t, h_prev)
                    states.append({
                        "x": x_t,
                        "h_prev": h_prev[:],
                        "h": h_t[:],
                        "raw": raw_t[:],
                        "y_hat": y_hat
                    })
                    h_prev = h_t

                y_hat = states[-1]["y_hat"]
                total_loss += -(y_true * math.log(y_hat + 1e-9) + (1.0 - y_true) * math.log(1.0 - y_hat + 1e-9))

                dlogit = y_hat - y_true
                grad_wy = [dlogit * value for value in states[-1]["h"]]
                grad_by = dlogit
                grad_h = [dlogit * weight for weight in self.wy]

                grad_wx = [[0.0 for _ in range(self.input_size)] for _ in range(self.hidden_size)]
                grad_wh = [[0.0 for _ in range(self.hidden_size)] for _ in range(self.hidden_size)]
                grad_bh = _zeros(self.hidden_size)

                for t in reversed(range(len(states))):
                    state = states[t]
                    local = []
                    for i in range(self.hidden_size):
                        dz = grad_h[i] * (1.0 - state["h"][i] ** 2)
                        local.append(dz)
                        grad_bh[i] += dz
                        for j in range(self.input_size):
                            grad_wx[i][j] += dz * state["x"][j]
                        for j in range(self.hidden_size):
                            grad_wh[i][j] += dz * state["h_prev"][j]

                    next_grad_h = _zeros(self.hidden_size)
                    for j in range(self.hidden_size):
                        acc = 0.0
                        for i in range(self.hidden_size):
                            acc += self.wh[i][j] * local[i]
                        next_grad_h[j] = acc
                    grad_h = next_grad_h

                for i in range(self.hidden_size):
                    self.wy[i] -= lr * grad_wy[i]
                self.by -= lr * grad_by
                for i in range(self.hidden_size):
                    self.bh[i] -= lr * grad_bh[i]
                    for j in range(self.input_size):
                        self.wx[i][j] -= lr * grad_wx[i][j]
                    for j in range(self.hidden_size):
                        self.wh[i][j] -= lr * grad_wh[i][j]

            history.append(total_loss / max(len(sequences), 1))

        correct = 0
        for seq, y_true in zip(sequences, labels):
            y_hat = self.predict_sequence(seq)[0][-1]
            pred = 1 if y_hat >= 0.5 else 0
            if pred == y_true:
                correct += 1
        self.training_summary = {
            "epochs": epochs,
            "samples": len(sequences),
            "final_loss": round(history[-1], 4) if history else None,
            "training_accuracy": round(correct / max(len(sequences), 1), 3)
        }
        return self.training_summary

    def infer(self, feature_sequence):
        outputs, states = self.predict_sequence(feature_sequence)
        forecast_probability = outputs[-1] if outputs else 0.0
        hidden_state = states[-1] if states else _zeros(self.hidden_size)
        confidence = min(0.99, 0.55 + abs(forecast_probability - 0.5))
        return {
            "forecast_probability": forecast_probability,
            "hidden_state": hidden_state,
            "confidence": confidence
        }

    def to_dict(self):
        return {
            "input_size": self.input_size,
            "hidden_size": self.hidden_size,
            "seed": self.seed,
            "wx": self.wx,
            "wh": self.wh,
            "bh": self.bh,
            "wy": self.wy,
            "by": self.by,
            "training_summary": self.training_summary
        }

    @classmethod
    def from_dict(cls, payload):
        model = cls(
            input_size=payload.get("input_size", 8),
            hidden_size=payload.get("hidden_size", 10),
            seed=payload.get("seed", 7)
        )
        model.wx = payload["wx"]
        model.wh = payload["wh"]
        model.bh = payload["bh"]
        model.wy = payload["wy"]
        model.by = payload["by"]
        model.training_summary = payload.get("training_summary", {})
        return model

    def save(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(self.to_dict(), handle, indent=2)

    @classmethod
    def load(cls, path):
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
        return cls.from_dict(payload)

    def evaluate(self, sequences, labels, threshold=0.5):
        tp = tn = fp = fn = 0
        confidences = []
        for seq, label in zip(sequences, labels):
            result = self.infer(seq)
            pred = 1 if result["forecast_probability"] >= threshold else 0
            confidences.append(result["confidence"])
            if pred == 1 and label == 1:
                tp += 1
            elif pred == 0 and label == 0:
                tn += 1
            elif pred == 1 and label == 0:
                fp += 1
            else:
                fn += 1
        total = max(len(sequences), 1)
        accuracy = (tp + tn) / total
        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-9)
        return {
            "threshold": threshold,
            "samples": len(sequences),
            "accuracy": round(accuracy, 3),
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
            "avg_confidence": round(sum(confidences) / max(len(confidences), 1), 3),
            "confusion": {
                "tp": tp,
                "tn": tn,
                "fp": fp,
                "fn": fn
            }
        }


def _sample_choice(rng, items):
    return items[rng.randrange(len(items))]


def _feature_vector(step, seq_len, label, rng):
    progress = step / max(seq_len - 1, 1)
    if label == 1:
        base = -0.08 - 0.55 * progress + rng.uniform(-0.08, 0.06)
        volatility = 0.35 + 0.45 * progress + rng.uniform(-0.05, 0.08)
        harsh = 1.0 if rng.random() < (0.08 + 0.65 * progress) else 0.0
        threat = 1.0 if progress > 0.72 and rng.random() < 0.16 else 0.0
        manipulation = 1.0 if rng.random() < (0.05 + 0.25 * progress) else 0.0
        caps = max(0.0, min(1.0, 0.08 + 0.45 * progress + rng.uniform(-0.04, 0.12)))
        short_reply = 1.0 if rng.random() < (0.1 + 0.4 * progress) else 0.0
    else:
        base = 0.12 - 0.12 * progress + rng.uniform(-0.08, 0.08)
        volatility = 0.08 + 0.18 * (1.0 - progress) + rng.uniform(-0.04, 0.04)
        harsh = 1.0 if rng.random() < 0.03 else 0.0
        threat = 0.0
        manipulation = 1.0 if rng.random() < 0.03 else 0.0
        caps = max(0.0, min(1.0, 0.04 + rng.uniform(-0.03, 0.05)))
        short_reply = 1.0 if rng.random() < 0.1 else 0.0

    positivity = max(0.0, base)
    negativity = max(0.0, -base)
    return [
        base,
        volatility,
        harsh,
        threat,
        manipulation,
        caps,
        short_reply,
        progress + positivity - negativity
    ]


def generate_bootstrapped_dataset(samples_per_class=180, seed=11):
    rng = random.Random(seed)
    sequences = []
    labels = []
    for label in (0, 1):
        for _ in range(samples_per_class):
            seq_len = _sample_choice(rng, [4, 5, 6, 7, 8])
            seq = [_feature_vector(step, seq_len, label, rng) for step in range(seq_len)]
            sequences.append(seq)
            labels.append(label)
    return sequences, labels


def dataset_bundle(samples_per_class=180, seed=11):
    sequences, labels = generate_bootstrapped_dataset(samples_per_class=samples_per_class, seed=seed)
    paired = list(zip(sequences, labels))
    rng = random.Random(seed + 101)
    rng.shuffle(paired)
    sequences = [item[0] for item in paired]
    labels = [item[1] for item in paired]
    split = int(len(sequences) * 0.8)
    return {
        "train_sequences": sequences[:split],
        "train_labels": labels[:split],
        "eval_sequences": sequences[split:],
        "eval_labels": labels[split:]
    }


def build_bootstrapped_sequence_model(model_path=None):
    if model_path and os.path.exists(model_path):
        return BootstrappedSequenceRiskModel.load(model_path)
    bundle = dataset_bundle()
    model = BootstrappedSequenceRiskModel()
    model.train(bundle["train_sequences"], bundle["train_labels"])
    model.training_summary["evaluation"] = model.evaluate(bundle["eval_sequences"], bundle["eval_labels"])
    if model_path:
        model.save(model_path)
    return model
