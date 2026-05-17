// ── Clawd Mood System ──
// Manages mood value and its influence on behavior.
// Mood is stored in growth.js save data; this module provides behavioral rules.

// Mood thresholds and behavior modifiers
const MOOD_TIERS = [
  { min: 80, tier: "ecstatic",  speechRate: 0.6,  animSpeed: 1.2,  idleVariant: "happy" },
  { min: 60, tier: "happy",     speechRate: 0.8,  animSpeed: 1.0,  idleVariant: null },
  { min: 40, tier: "calm",      speechRate: 1.0,  animSpeed: 1.0,  idleVariant: null },
  { min: 20, tier: "down",      speechRate: 1.5,  animSpeed: 0.8,  idleVariant: "slow" },
  { min: 0,  tier: "sad",       speechRate: 2.5,  animSpeed: 0.6,  idleVariant: "slow" },
];

function getMoodTier(value) {
  for (const t of MOOD_TIERS) {
    if (value >= t.min) return t;
  }
  return MOOD_TIERS[MOOD_TIERS.length - 1];
}

// Returns behavior modifiers based on current mood value
function getMoodBehavior(moodValue) {
  const tier = getMoodTier(moodValue);
  return {
    tier: tier.tier,
    // Multiplier for speech bubble interval (higher = less frequent)
    speechRateMultiplier: tier.speechRate,
    // Multiplier for animation playback feel
    animSpeedMultiplier: tier.animSpeed,
    // If non-null, prefer this idle animation variant
    idleVariant: tier.idleVariant,
    // Whether Clawd should occasionally show sad/bored animations
    showSadIdle: moodValue < 30,
    // Whether Clawd is extra energetic
    isEnergetic: moodValue >= 75,
  };
}

// Context-aware speech lines based on mood
const MOOD_SPEECH = {
  ecstatic: {
    en: [
      "I feel amazing today!",
      "The data streams are singing!",
      "Everything compiles on the first try in my heart!",
    ],
    zh: [
      "今天感觉超棒！",
      "数据流在歌唱！",
      "心里的代码都是一次编译通过的！",
    ],
  },
  happy: {
    en: [
      "Good vibes today~",
      "The sea of data is calm and clear.",
    ],
    zh: [
      "今天心情不错~",
      "数据之海风平浪静。",
    ],
  },
  calm: {
    en: [
      "Just another day in the code...",
      "Monitoring the data currents...",
    ],
    zh: [
      "平平淡淡的一天…",
      "监控着数据洋流…",
    ],
  },
  down: {
    en: [
      "The data feels heavy today...",
      "I miss Tera-IX a little...",
    ],
    zh: [
      "今天数据有点沉重…",
      "有点想念 Tera-IX…",
    ],
  },
  sad: {
    en: [
      "...",
      "The signal is fading...",
    ],
    zh: [
      "……",
      "信号在减弱…",
    ],
  },
};

function getMoodSpeechLines(moodValue, lang) {
  const tier = getMoodTier(moodValue);
  const lines = MOOD_SPEECH[tier.tier];
  return lines ? (lines[lang] || lines.en) : [];
}

module.exports = { getMoodTier, getMoodBehavior, getMoodSpeechLines, MOOD_TIERS };
