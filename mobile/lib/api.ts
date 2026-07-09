import * as FileSystem from 'expo-file-system';

// Set this to your backend URL. During development you can point to a local
// FastAPI server; in production replace with your deployed endpoint.
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface FeedbackPayload {
  imageUri: string;
  predictedLabel: string;
  confirmedLabel: string;  // same as predictedLabel when user confirms
  confidence: number;
  capturedAt: string;       // ISO timestamp
}

// Uploads the image and label feedback to the backend review queue.
// Non-blocking — failures are logged but never surfaced to the user.
export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  try {
    const form = new FormData();
    form.append('image', {
      uri: payload.imageUri,
      name: 'scan.jpg',
      type: 'image/jpeg',
    } as unknown as Blob);
    form.append('predicted_label', payload.predictedLabel);
    form.append('confirmed_label', payload.confirmedLabel);
    form.append('confidence', String(payload.confidence));
    form.append('captured_at', payload.capturedAt);

    await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      body: form,
    });
  } catch (err) {
    console.warn('[FreshScan] Feedback upload failed (non-fatal):', err);
  }
}

// Checks for a newer TFLite model and downloads it to the local cache.
// Returns the local file URI of the model to use (cached or newly downloaded).
export async function resolveModelUri(): Promise<string | null> {
  const localPath = `${FileSystem.cacheDirectory}freshness_model.tflite`;

  try {
    const versionRes = await fetch(`${API_BASE}/model/version`);
    const { version, url } = (await versionRes.json()) as { version: string; url: string };

    const metaPath = `${FileSystem.cacheDirectory}model_version.txt`;
    const cachedVersion = await FileSystem.readAsStringAsync(metaPath).catch(() => null);

    if (cachedVersion === version) {
      return localPath;
    }

    await FileSystem.downloadAsync(url, localPath);
    await FileSystem.writeAsStringAsync(metaPath, version);
    return localPath;
  } catch {
    // Fall back to the bundled model asset
    return null;
  }
}
