# FreshScan — Grocery Freshness Classifier

A mobile-ready image classifier that distinguishes fresh from spoiled grocery items. Built with TensorFlow/Keras (MobileNetV3 backbone), exportable to TFLite for on-device inference, and designed for a feedback-driven retraining loop so the model improves as users correct its predictions.

---

## How it works

1. A user photographs a grocery item in the mobile app.
2. The app runs the quantized TFLite model on-device — no server round-trip required.
3. The app shows the prediction (e.g. *apple — rotten, 94% confidence*) and asks the user to confirm or correct it.
4. Confirmed/corrected labels are uploaded to a backend queue.
5. Periodically, new labeled samples are reviewed and used to fine-tune the model; the updated TFLite file is pushed to the app without a store release.

---

## Repository layout

```
.
├── data/
│   ├── raw/            # Training images: <food>_<fresh|rotten>/*.jpg
│   └── processed/      # Reserved for any derived features
├── models/             # Trained SavedModel and exported .tflite file
├── notebooks/
│   ├── 01_data_exploration.ipynb   # Class balance, sample previews
│   ├── 02_train_model.ipynb        # Transfer learning + fine-tuning
│   └── 03_export_tflite.ipynb      # Quantized TFLite export + sanity check
├── scripts/
│   ├── download_data.sh            # Pulls starter dataset via Kaggle API
│   └── reorganize_kaggle_dataset.py # Reshapes Kaggle folders into expected layout
├── src/
│   └── data_utils.py               # Shared dataset loading and augmentation helpers
└── requirements.txt
```

---

## Quickstart

### 1. Clone and set up the environment

```bash
git clone https://github.com/<your-username>/freshscan.git
cd freshscan

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Get training data

The starter dataset covers **apple, banana, and orange** (fresh vs. rotten, ~13 k images).

**Get a Kaggle API token**
Go to [kaggle.com/settings](https://www.kaggle.com/settings) → *Create New Token* and save the downloaded `kaggle.json` to `~/.kaggle/kaggle.json`.

**Download and reorganize**
```bash
./scripts/download_data.sh
```

This downloads the dataset and reshapes it into the layout below, merging the upstream train/test split since the notebooks handle their own:

```
data/raw/
  apple_fresh/
  apple_rotten/
  banana_fresh/
  banana_rotten/
  orange_fresh/
  orange_rotten/
```

**Adding more food categories**
To extend coverage, download [Fresh and Stale Images of Fruits and Vegetables](https://www.kaggle.com/datasets/raghavrpotdar/fresh-and-stale-images-of-fruits-and-vegetables) (covers tomato, potato, capsicum, and more) and manually map its class folders into the same `<food>_<fresh|rotten>/` naming. Bread and leafy greens currently have no clean public dataset — a few hundred self-photographed images per class under varied lighting is sufficient.

### 3. Run the notebooks in order

| Notebook | What it does |
|---|---|
| `01_data_exploration.ipynb` | Plots class balance, previews samples, catches bad images early |
| `02_train_model.ipynb` | Fine-tunes MobileNetV3-Small on the freshness dataset (two-phase: head only, then top layers) |
| `03_export_tflite.ipynb` | Converts the SavedModel to a quantized TFLite file and runs a quick sanity check |

Launch Jupyter:
```bash
jupyter notebook
```

---

## Model details

| | |
|---|---|
| **Backbone** | MobileNetV3-Small (ImageNet pretrained) |
| **Input** | 224 × 224 RGB |
| **Output** | Softmax over N classes (`<food>_fresh` / `<food>_rotten` per category) |
| **Training** | Phase 1 — classification head only, `lr=1e-3`. Phase 2 — top 30 backbone layers unfrozen, `lr=1e-5` |
| **Augmentation** | Random horizontal flip, ±10% rotation, ±10% zoom, ±15% brightness |
| **Export** | Dynamic-range quantization via `tf.lite.Optimize.DEFAULT` |

Target: <10 MB model file, <100 ms inference on a mid-range phone.

---

## Retraining loop (planned)

The app is built to improve over time through user feedback:

1. Each prediction is shown with a **confirm / correct** affordance.
2. Images with confirmed or corrected labels are stored in a review queue (S3 or similar).
3. A human spot-check filters low-quality or malicious submissions.
4. The existing model is **fine-tuned** (not retrained from scratch) on the accumulated new data.
5. The updated TFLite file is delivered to the app as an OTA model update — no app store release required.
6. The model is only promoted if it matches or beats the current model's accuracy on a held-out test set.

---

## Requirements

```
tensorflow==2.16.1
numpy
matplotlib
scikit-learn
pillow
jupyter
kaggle
```

Python 3.10+ recommended.

---

## Roadmap

- [ ] Mobile app shell (React Native) with camera capture and on-device inference
- [ ] Backend API for label collection and model versioning
- [ ] OTA model update endpoint
- [ ] Automated retraining pipeline (trigger on N new confirmed labels)
- [ ] Expand food categories: tomato, potato, bread, leafy greens
- [ ] Per-class precision/recall dashboard

---

## License

MIT
