"""
Train sequence model with both English and Hinglish support
Combines English toxic drift data with Hinglish conversations
"""

import json
import os
from sequence_model import (
    BootstrappedSequenceRiskModel, 
    generate_bootstrapped_dataset, 
    dataset_bundle
)
from hinglish_processor import extract_hinglish_features
from hinglish_dataset_generator import generate_hinglish_dataset, hinglish_seq_to_features


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACT_DIR = os.path.join(BASE_DIR, "artifacts")
MODEL_PATH = os.path.join(ARTIFACT_DIR, "sequence_model_hinglish.json")
REPORT_PATH = os.path.join(ARTIFACT_DIR, "sequence_model_hinglish_report.json")


def combine_english_hinglish_data(english_sequences, english_labels, 
                                  hinglish_sequences_raw, hinglish_labels):
    """
    Combine English and Hinglish training data
    Convert Hinglish message sequences to feature vectors
    """
    all_sequences = english_sequences.copy()
    all_labels = english_labels.copy()
    
    # Convert each Hinglish sequence to features
    for seq_messages, label in zip(hinglish_sequences_raw, hinglish_labels):
        seq_features = hinglish_seq_to_features(seq_messages)
        all_sequences.append(seq_features)
        all_labels.append(label)
    
    # Shuffle combined data
    paired = list(zip(all_sequences, all_labels))
    import random
    random.shuffle(paired)
    all_sequences = [item[0] for item in paired]
    all_labels = [item[1] for item in paired]
    
    return all_sequences, all_labels


def main():
    print("=" * 60)
    print("🇮🇳 Training Bilingual Model (English + Hinglish)")
    print("=" * 60)
    
    # Generate English dataset
    print("\n1️⃣  Generating English dataset...")
    english_bundle = dataset_bundle(samples_per_class=180, seed=19)
    english_sequences = english_bundle["train_sequences"] + english_bundle["eval_sequences"]
    english_labels = english_bundle["train_labels"] + english_bundle["eval_labels"]
    print(f"   ✓ English samples: {len(english_sequences)}")
    
    # Generate Hinglish dataset
    print("\n2️⃣  Generating Hinglish dataset...")
    hinglish_sequences_raw, hinglish_labels = generate_hinglish_dataset(
        toxic_count=150, 
        friendly_count=150
    )
    print(f"   ✓ Hinglish samples: {len(hinglish_sequences_raw)}")
    
    # Combine datasets
    print("\n3️⃣  Combining datasets...")
    combined_sequences, combined_labels = combine_english_hinglish_data(
        english_sequences, english_labels,
        hinglish_sequences_raw, hinglish_labels
    )
    print(f"   ✓ Total combined samples: {len(combined_sequences)}")
    print(f"   ✓ Toxic: {sum(combined_labels)}, Friendly: {len(combined_labels) - sum(combined_labels)}")
    
    # Split into train/eval
    split = int(len(combined_sequences) * 0.8)
    train_seqs = combined_sequences[:split]
    train_labels = combined_labels[:split]
    eval_seqs = combined_sequences[split:]
    eval_labels = combined_labels[split:]
    
    print(f"\n4️⃣  Train/eval split:")
    print(f"   ✓ Train: {len(train_seqs)} samples")
    print(f"   ✓ Eval: {len(eval_seqs)} samples")
    
    # Train model
    print("\n5️⃣  Training bilingual sequence model...")
    model = BootstrappedSequenceRiskModel(input_size=8, hidden_size=12, seed=19)
    train_summary = model.train(train_seqs, train_labels, epochs=35, lr=0.04)
    print(f"   ✓ Training complete!")
    print(f"   ✓ Final loss: {train_summary['final_loss']}")
    print(f"   ✓ Training accuracy: {train_summary['training_accuracy']}")
    
    # Evaluate model
    print("\n6️⃣  Evaluating model...")
    evaluation = model.evaluate(eval_seqs, eval_labels)
    train_summary["evaluation"] = evaluation
    model.training_summary = train_summary
    
    print(f"   ✓ Accuracy: {evaluation['accuracy']}")
    print(f"   ✓ Precision: {evaluation['precision']}")
    print(f"   ✓ Recall: {evaluation['recall']}")
    print(f"   ✓ F1-Score: {evaluation['f1']}")
    
    # Save model
    print("\n7️⃣  Saving model...")
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    model.save(MODEL_PATH)
    print(f"   ✓ Model saved to: {MODEL_PATH}")
    
    # Save report
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump({
            "model_type": "bilingual_english_hinglish",
            "model_path": MODEL_PATH,
            "languages_supported": ["english", "hinglish"],
            "training_summary": train_summary
        }, handle, indent=2)
    print(f"   ✓ Report saved to: {REPORT_PATH}")
    
    print("\n" + "=" * 60)
    print("✅ Bilingual Model Training Complete!")
    print("=" * 60)
    print(f"\nModel now supports:")
    print("  🇺🇸 English toxicity detection")
    print("  🇮🇳 Hinglish (Hindi in English script) detection")
    print("  🔄 Mixed language conversations")
    print("\nModel Details:")
    print(f"  Input size: 8 dimensions")
    print(f"  Hidden size: 12 units")
    print(f"  Trained on: {len(combined_sequences)} sequences")
    print(f"  Final Accuracy: {evaluation['accuracy']}")
    
    return model


if __name__ == "__main__":
    model = main()
