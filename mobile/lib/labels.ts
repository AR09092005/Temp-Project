// Class names must match the order in models/class_names.txt produced by
// notebooks/02_train_model.ipynb. Update this list whenever a new model is
// trained with additional food categories.
export const CLASS_NAMES: string[] = [
  'apple_fresh',
  'apple_rotten',
  'banana_fresh',
  'banana_rotten',
  'orange_fresh',
  'orange_rotten',
];

export type FoodLabel = (typeof CLASS_NAMES)[number];

export interface Prediction {
  label: FoodLabel;
  food: string;
  state: 'fresh' | 'rotten';
  confidence: number;
}

export function parsePrediction(classIndex: number, confidence: number): Prediction {
  const label = CLASS_NAMES[classIndex] ?? 'unknown';
  const [food, state] = label.split('_') as [string, 'fresh' | 'rotten'];
  return { label, food, state, confidence };
}
