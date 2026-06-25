# Grocery Freshness Classifier

ML model to classify common grocery items as fresh or spoiled, intended for
on-device inference in a mobile app with a feedback-driven retraining loop.

## Expected data layout

Place images under `data/raw/<food>_<fresh|rotten>/*.jpg`, e.g.:

```
data/raw/
  apple_fresh/
  apple_rotten/
  banana_fresh/
  banana_rotten/
  tomato_fresh/
  tomato_rotten/
  bread_fresh/
  bread_rotten/
```

Each subfolder name becomes a class label. `notebooks/01_data_exploration.ipynb`
checks class balance and image quality; `notebooks/02_train_model.ipynb` trains
a MobileNetV3-based classifier; `notebooks/03_export_tflite.ipynb` exports a
quantized TFLite model for mobile deployment.

## Setup

```
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Getting starter data

`scripts/download_data.sh` pulls the [Fruits Fresh and Rotten for
Classification](https://www.kaggle.com/datasets/sriramr/fruits-fresh-and-rotten-for-classification)
Kaggle dataset (apple/banana/orange, fresh vs rotten) and reorganizes it into
the `data/raw/<food>_<fresh|rotten>/` layout above.

1. Get a Kaggle API token: https://www.kaggle.com/settings -> "Create New Token",
   save the downloaded `kaggle.json` to `~/.kaggle/kaggle.json`.
2. Run:
   ```
   pip install kaggle
   ./scripts/download_data.sh
   ```

This covers apple/banana/orange. For tomato, potato, and other vegetables,
the [Fresh and Stale Images of Fruits and Vegetables](https://www.kaggle.com/datasets/raghavrpotdar/fresh-and-stale-images-of-fruits-and-vegetables)
dataset is a good follow-up — download it similarly and map its class folders
into `data/raw/<food>_<fresh|rotten>/` by hand (folder naming differs from the
apple/banana/orange dataset). Bread and leafy greens currently need
self-collected photos since there isn't a clean public dataset for them.
