#!/usr/bin/env bash
# Downloads the "Fruits Fresh and Rotten for Classification" Kaggle dataset
# and reorganizes it into data/raw/<food>_<fresh|rotten>/ for the notebooks.
#
# Requires the Kaggle API: pip install kaggle, plus a kaggle.json API token
# at ~/.kaggle/kaggle.json (https://www.kaggle.com/settings -> Create New Token).

set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v kaggle >/dev/null 2>&1; then
  echo "kaggle CLI not found. Install with: pip install kaggle" >&2
  exit 1
fi

if [ ! -f "$HOME/.kaggle/kaggle.json" ]; then
  echo "Missing ~/.kaggle/kaggle.json API token. Get one from https://www.kaggle.com/settings" >&2
  exit 1
fi

RAW_DIR="data/raw"
DOWNLOAD_DIR="data/_kaggle_download"

mkdir -p "$DOWNLOAD_DIR"
kaggle datasets download -d sriramr/fruits-fresh-and-rotten-for-classification -p "$DOWNLOAD_DIR" --unzip

python3 scripts/reorganize_kaggle_dataset.py "$DOWNLOAD_DIR" "$RAW_DIR"

echo "Done. Images are now under $RAW_DIR/<food>_<fresh|rotten>/"
echo "You can remove $DOWNLOAD_DIR if you want to free up space."
