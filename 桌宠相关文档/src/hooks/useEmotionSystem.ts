import type { PADValues, EmotionLabel } from '../types';

interface EmotionRegion {
  label: EmotionLabel;
  emoji: string;
  pRange: [number, number];
  aRange: [number, number];
  dRange: [number, number];
}

const EMOTION_MAP: EmotionRegion[] = [
  { label: 'happy', emoji: '😊', pRange: [0.3, 1], aRange: [-0.3, 0.3], dRange: [-0.5, 0.5] },
  { label: 'excited', emoji: '😆', pRange: [0.2, 1], aRange: [0.3, 1], dRange: [-0.5, 0.5] },
  { label: 'shy', emoji: '😳', pRange: [0.1, 0.6], aRange: [-0.2, 0.4], dRange: [-1, -0.2] },
  { label: 'sad', emoji: '😢', pRange: [-1, -0.3], aRange: [-0.5, 0.2], dRange: [-1, 0.2] },
  { label: 'worried', emoji: '😟', pRange: [-0.5, 0.1], aRange: [0, 0.5], dRange: [-1, -0.1] },
  { label: 'sleepy', emoji: '😴', pRange: [-0.3, 0.3], aRange: [-1, -0.4], dRange: [-1, 0.3] },
  { label: 'angry', emoji: '😠', pRange: [-1, -0.2], aRange: [0.2, 1], dRange: [-0.5, 1] },
  { label: 'surprised', emoji: '😲', pRange: [-0.2, 0.5], aRange: [0.4, 1], dRange: [-1, 0.3] },
  { label: 'calm', emoji: '😌', pRange: [0.1, 0.5], aRange: [-0.4, -0.1], dRange: [0.1, 0.8] },
  { label: 'bored', emoji: '😐', pRange: [-0.3, 0.1], aRange: [-0.5, 0], dRange: [-0.3, 0.3] },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inRange(value: number, range: [number, number]): boolean {
  return value >= range[0] && value <= range[1];
}

export function updateEmotion(
  currentPad: PADValues,
  delta: PADValues,
  weight: number = 0.3,
  smoothing: number = 0.7
): PADValues {
  return {
    P: clamp(
      smoothing * currentPad.P + weight * delta.P,
      -1,
      1
    ),
    A: clamp(
      smoothing * currentPad.A + weight * delta.A,
      -1,
      1
    ),
    D: clamp(
      smoothing * currentPad.D + weight * delta.D,
      -1,
      1
    ),
  };
}

export function classifyEmotion(pad: PADValues): EmotionLabel {
  let bestMatch: EmotionLabel = 'calm';
  let bestScore = -Infinity;

  for (const region of EMOTION_MAP) {
    if (
      inRange(pad.P, region.pRange) &&
      inRange(pad.A, region.aRange) &&
      inRange(pad.D, region.dRange)
    ) {
      // Calculate how well the PAD values fit within the region
      const pScore = 1 - Math.abs(pad.P - (region.pRange[0] + region.pRange[1]) / 2) / ((region.pRange[1] - region.pRange[0]) / 2 + 0.001);
      const aScore = 1 - Math.abs(pad.A - (region.aRange[0] + region.aRange[1]) / 2) / ((region.aRange[1] - region.aRange[0]) / 2 + 0.001);
      const dScore = 1 - Math.abs(pad.D - (region.dRange[0] + region.dRange[1]) / 2) / ((region.dRange[1] - region.dRange[0]) / 2 + 0.001);
      const score = pScore + aScore + dScore;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = region.label;
      }
    }
  }

  return bestMatch;
}

export function applyDecay(pad: PADValues): PADValues {
  // Decay towards neutral (0, 0, 0) by 5% per hour
  const decayRate = 0.05;
  return {
    P: pad.P * (1 - decayRate),
    A: pad.A * (1 - decayRate),
    D: pad.D * (1 - decayRate),
  };
}

export function getEmotionEmoji(label: EmotionLabel): string {
  const region = EMOTION_MAP.find((r) => r.label === label);
  return region?.emoji ?? '😐';
}

export function useEmotionSystem() {
  return {
    updateEmotion,
    classifyEmotion,
    applyDecay,
    getEmotionEmoji,
  };
}
