import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

import { parsePrediction, Prediction } from './labels';
import { resolveModelUri } from './api';

const BUNDLED_MODEL = require('../assets/model/freshness_model.tflite');
const INPUT_SIZE = 224;

let _model: TensorflowModel | null = null;
// Single in-flight promise prevents concurrent loadModel() calls from
// each spawning their own native model instance.
let _loadPromise: Promise<void> | null = null;

export async function loadModel(): Promise<void> {
  if (_model) return;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    const cachedUri = await resolveModelUri();
    _model = cachedUri
      ? await loadTensorflowModel({ url: cachedUri })
      : await loadTensorflowModel(BUNDLED_MODEL);
  })().finally(() => {
    _loadPromise = null;
  });

  return _loadPromise;
}

// MobileNetV3 expects pixels normalised to [-1, 1].
function toFloat32Tensor(rgbaPixels: Uint8Array, width: number, height: number): Float32Array {
  const tensor = new Float32Array(width * height * 3);
  let out = 0;
  for (let i = 0; i < rgbaPixels.length; i += 4) {
    tensor[out++] = rgbaPixels[i] / 127.5 - 1;     // R
    tensor[out++] = rgbaPixels[i + 1] / 127.5 - 1; // G
    tensor[out++] = rgbaPixels[i + 2] / 127.5 - 1; // B
    // skip A
  }
  return tensor;
}

async function imageUriToTensor(uri: string): Promise<Float32Array> {
  const resized = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
  );

  const base64 = await FileSystem.readAsStringAsync(resized.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const rawBuffer = Buffer.from(base64, 'base64');
  const { data, width, height } = jpeg.decode(rawBuffer, { useTArray: true });
  return toFloat32Tensor(data, width, height);
}

export async function classifyImage(uri: string): Promise<Prediction> {
  if (!_model) throw new Error('Model not loaded. Call loadModel() first.');

  const tensor = await imageUriToTensor(uri);
  const outputs = await _model.run([tensor]);
  const scores = outputs[0] as Float32Array;

  let bestIndex = 0;
  let bestScore = scores[0];
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > bestScore) {
      bestScore = scores[i];
      bestIndex = i;
    }
  }

  return parsePrediction(bestIndex, bestScore);
}
