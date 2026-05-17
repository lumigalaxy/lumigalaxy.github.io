// ── Clawd Wardrobe System ──
// Manages accessories, backgrounds, and themes.
// Accessories are CSS/HTML overlays positioned on the pet container.

// ── Accessory catalog ──
// position: { top, left } as percentage of container
// unlockCondition: checked against growth data
const ACCESSORIES = {
  // ── Hats ──
  hat_crown: {
    name_en: "Code Crown",
    name_zh: "代码皇冠",
    category: "hat",
    emoji: "👑",
    css: "wardrobe-hat-crown",
    unlock: (g) => g.growth.level >= 2,
    unlockHint_en: "Reach Lv.2",
    unlockHint_zh: "达到 Lv.2",
  },
  hat_helmet: {
    name_en: "Star Helmet",
    name_zh: "星球头盔",
    category: "hat",
    emoji: "🪖",
    css: "wardrobe-hat-helmet",
    unlock: (g) => g.growth.level >= 5,
    unlockHint_en: "Reach Lv.5",
    unlockHint_zh: "达到 Lv.5",
  },
  hat_sleep: {
    name_en: "Sleep Cap",
    name_zh: "睡帽",
    category: "hat",
    emoji: "🧢",
    css: "wardrobe-hat-sleep",
    unlock: (g) => g.stats.nightMinutes >= 60,
    unlockHint_en: "Code 1h at night",
    unlockHint_zh: "夜间编程1小时",
  },
  hat_santa: {
    name_en: "Santa Hat",
    name_zh: "圣诞帽",
    category: "hat",
    emoji: "🎅",
    css: "wardrobe-hat-santa",
    unlock: () => { const m = new Date().getMonth(); return m === 11; }, // December
    unlockHint_en: "Available in December",
    unlockHint_zh: "12月限定",
  },

  // ── Scarves ──
  scarf_rainbow: {
    name_en: "Rainbow Scarf",
    name_zh: "彩虹围巾",
    category: "scarf",
    emoji: "🌈",
    css: "wardrobe-scarf-rainbow",
    unlock: (g) => g.streak.longest >= 7,
    unlockHint_en: "7-day streak",
    unlockHint_zh: "连续打卡7天",
  },
  scarf_data: {
    name_en: "Data Stream Scarf",
    name_zh: "数据流围巾",
    category: "scarf",
    emoji: "〰️",
    css: "wardrobe-scarf-data",
    unlock: (g) => g.stats.totalToolCalls >= 500,
    unlockHint_en: "500 tool calls",
    unlockHint_zh: "500次工具调用",
  },

  // ── Effects ──
  effect_sparkle: {
    name_en: "Sparkle Aura",
    name_zh: "闪光光环",
    category: "effect",
    emoji: "✨",
    css: "wardrobe-effect-sparkle",
    unlock: (g) => g.achievements.length >= 3,
    unlockHint_en: "Earn 3 achievements",
    unlockHint_zh: "获得3个成就",
  },
  effect_particles: {
    name_en: "Star Dust",
    name_zh: "星尘粒子",
    category: "effect",
    emoji: "⭐",
    css: "wardrobe-effect-particles",
    unlock: (g) => g.growth.level >= 8,
    unlockHint_en: "Reach Lv.8",
    unlockHint_zh: "达到 Lv.8",
  },
};

// Get all unlocked accessories for current growth data
function getUnlocked(growthData) {
  const result = [];
  for (const [id, acc] of Object.entries(ACCESSORIES)) {
    try {
      if (acc.unlock(growthData)) {
        result.push({ id, ...acc });
      }
    } catch {}
  }
  return result;
}

// Get all accessories with lock status
function getCatalog(growthData, lang) {
  const result = [];
  for (const [id, acc] of Object.entries(ACCESSORIES)) {
    let unlocked = false;
    try { unlocked = acc.unlock(growthData); } catch {}
    result.push({
      id,
      name: lang === "zh" ? acc.name_zh : acc.name_en,
      category: acc.category,
      emoji: acc.emoji,
      css: acc.css,
      unlocked,
      unlockHint: unlocked ? "" : (lang === "zh" ? acc.unlockHint_zh : acc.unlockHint_en),
    });
  }
  return result;
}

module.exports = { ACCESSORIES, getUnlocked, getCatalog };
