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
