"""Shared helpers for loading and splitting the freshness dataset."""

import pathlib

import tensorflow as tf

IMG_SIZE = (224, 224)
SEED = 42


def load_datasets(data_dir: str, batch_size: int = 32, val_split: float = 0.2):
    """Builds train/val datasets from a directory of class subfolders."""
    data_dir = pathlib.Path(data_dir)

    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=val_split,
        subset="training",
        seed=SEED,
        image_size=IMG_SIZE,
        batch_size=batch_size,
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=val_split,
        subset="validation",
        seed=SEED,
        image_size=IMG_SIZE,
        batch_size=batch_size,
    )
    return train_ds, val_ds, train_ds.class_names


def build_augmentation():
    return tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal"),
            tf.keras.layers.RandomRotation(0.1),
            tf.keras.layers.RandomZoom(0.1),
            tf.keras.layers.RandomBrightness(0.15),
        ],
        name="augmentation",
    )
