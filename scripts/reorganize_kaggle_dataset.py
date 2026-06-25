"""Reorganizes the sriramr/fruits-fresh-and-rotten-for-classification Kaggle
dataset (train/test split, folders like freshapples/rottenbanana) into the
flat data/raw/<food>_<fresh|rotten>/ layout the notebooks expect, merging the
dataset's own train+test splits since the notebooks do their own split.

Usage: python reorganize_kaggle_dataset.py <download_dir> <raw_dir>
"""

import re
import shutil
import sys
from pathlib import Path

FOOD_ALIASES = {
    "apples": "apple",
    "apple": "apple",
    "banana": "banana",
    "bananas": "banana",
    "oranges": "orange",
    "orange": "orange",
}

DIR_PATTERN = re.compile(r"^(fresh|rotten)([a-zA-Z]+)$")


def find_class_dirs(download_dir: Path):
    for path in download_dir.rglob("*"):
        if path.is_dir() and DIR_PATTERN.match(path.name):
            yield path


def main(download_dir: str, raw_dir: str):
    download_dir = Path(download_dir)
    raw_dir = Path(raw_dir)

    if not download_dir.exists():
        print(f"Download dir {download_dir} not found", file=sys.stderr)
        sys.exit(1)

    copied = 0
    for class_dir in find_class_dirs(download_dir):
        match = DIR_PATTERN.match(class_dir.name)
        state, food_raw = match.group(1), match.group(2).lower()
        food = FOOD_ALIASES.get(food_raw, food_raw)
        state_label = "fresh" if state == "fresh" else "rotten"

        target_dir = raw_dir / f"{food}_{state_label}"
        target_dir.mkdir(parents=True, exist_ok=True)

        for img_path in class_dir.iterdir():
            if not img_path.is_file():
                continue
            # prefix with parent dir name to avoid collisions between
            # the dataset's train/ and test/ splits
            dest_name = f"{class_dir.parent.name}_{img_path.name}"
            shutil.copy2(img_path, target_dir / dest_name)
            copied += 1

    print(f"Copied {copied} images into {raw_dir}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <download_dir> <raw_dir>", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
