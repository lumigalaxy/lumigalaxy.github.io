const AFFINITY_THRESHOLDS = [0, 100, 500, 1500, 3500, 7000];
const AFFINITY_LEVEL_NAMES = ['陌生人', '点头之交', '朋友', '好友', '挚友', '灵魂伴侣'];
const DAILY_CAP = 50;

export function calculateAffinityLevel(score: number): number {
  let level = 0;
  for (let i = AFFINITY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= AFFINITY_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  return level;
}

export function getAffinityLevelName(level: number): string {
  return AFFINITY_LEVEL_NAMES[Math.min(level, AFFINITY_LEVEL_NAMES.length - 1)] ?? '陌生人';
}

export function addAffinity(current: number, amount: number): number {
  const capped = Math.min(amount, DAILY_CAP);
  return Math.min(current + capped, 10000);
}

export function useAffinity() {
  return {
    calculateAffinityLevel,
    getAffinityLevelName,
    addAffinity,
  };
}
