import json
import os

from sequence_model import BootstrappedSequenceRiskModel, dataset_bundle


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACT_DIR = os.path.join(BASE_DIR, "artifacts")
MODEL_PATH = os.path.join(ARTIFACT_DIR, "sequence_model.json")
REPORT_PATH = os.path.join(ARTIFACT_DIR, "sequence_model_report.json")


def main():
    bundle = dataset_bundle(samples_per_class=240, seed=19)
    model = BootstrappedSequenceRiskModel(seed=19)
    train_summary = model.train(bundle["train_sequences"], bundle["train_labels"], epochs=30, lr=0.04)
    evaluation = model.evaluate(bundle["eval_sequences"], bundle["eval_labels"])
    train_summary["evaluation"] = evaluation
    model.training_summary = train_summary
    model.save(MODEL_PATH)

    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump({
            "model_path": MODEL_PATH,
            "training_summary": train_summary
        }, handle, indent=2)

    print(json.dumps({
        "saved_model": MODEL_PATH,
        "saved_report": REPORT_PATH,
        "training_summary": train_summary
    }, indent=2))


if __name__ == "__main__":
    main()
