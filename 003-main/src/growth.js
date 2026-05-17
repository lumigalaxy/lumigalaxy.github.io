// ── Clawd Growth System ──
// XP accumulation, leveling, achievements, streak tracking
// Zero external dependencies. Data stored in clawd-save.json.

const fs = require("fs");
const path = require("path");

// ── Level thresholds (Tera-IX civilization inspired) ──
const LEVELS = [
  { level: 1,  xpMin: 0,     title_en: "Data Sprout",           title_zh: "数据幻芽" },
  { level: 2,  xpMin: 100,   title_en: "Info Crystal",          title_zh: "信息结晶" },
  { level: 3,  xpMin: 300,   title_en: "Current Apprentice",    title_zh: "海流学徒" },
  { level: 4,  xpMin: 600,   title_en: "Wave Navigator",        title_zh: "波浪导航员" },
  { level: 5,  xpMin: 1000,  title_en: "Deep Sea Explorer",     title_zh: "深海探索者" },
  { level: 6,  xpMin: 1500,  title_en: "Reef Architect",        title_zh: "礁石建筑师" },
  { level: 7,  xpMin: 2500,  title_en: "Tide Conductor",        title_zh: "潮汐指挥官" },
  { level: 8,  xpMin: 4000,  title_en: "Data Sea Guardian",     title_zh: "数据之海守护者" },
  { level: 9,  xpMin: 7000,  title_en: "Stellar Voyager",       title_zh: "星际旅行者" },
  { level: 10, xpMin: 10000, title_en: "Stellar Pair Partner",  title_zh: "星际结对伙伴" },
];

// ── XP rewards by event ──
const XP_REWARDS = {
  tool_success:    5,   // PreToolUse → PostToolUse
  tool_failure:    1,   // error state
  session_done:    20,  // Stop event → attention
  subagent:        15,  // SubagentStart → SubagentStop
  compact:         10,  // PreCompact → PostCompact
  focus_30min:     50,  // continuous 30 min coding
  focus_2hr:       100, // continuous 2 hr coding
  dance_game_s:    30,  // dance game S rating
  daily_first:     10,  // first launch of day
  poke:            2,   // user clicks Clawd
};

// ── Achievement definitions ──
const ACHIEVEMENTS = {
  first_blessing:   { en: "First Compile Blessing",   zh: "初次编译祝福",   condition: (s) => s.stats.sessionCompleted >= 1 },
  bug_hunter:       { en: "Bug Hunter",               zh: "Bug 狠特",       condition: (s) => s.stats.totalErrors >= 50 },
  night_owl:        { en: "Night Owl",                zh: "夜猫子",          condition: (s) => s.stats.nightMinutes >= 60 },
  conductor:        { en: "Subagent Conductor",       zh: "子代理指挥家",    condition: (s) => s.stats.maxConcurrentAgents >= 3 },
  thousand_calls:   { en: "Thousand Calls",           zh: "千行代码",        condition: (s) => s.stats.totalToolCalls >= 1000 },
  dance_king:       { en: "Dance King",               zh: "舞王",           condition: (s) => s.stats.danceGameSCount >= 3 },
  streak_7:         { en: "7-Day Streak",             zh: "坚持七天",        condition: (s) => s.streak.longest >= 7 },
  compile_guardian: { en: "Compile Guardian",          zh: "编译守护者",      condition: (s) => s.stats.sessionCompleted >= 100 },
};

// ── Default save data ──
function defaultSave() {
  return {
    version: 2,
    profile: { name: "Clawd", personality: "cheerful" },
    growth: { level: 1, xp: 0, totalXp: 0 },
    mood: { value: 50, lastUpdate: Date.now() },
    achievements: [],
    inventory: [],
    equipped: { hat: null, theme: "default" },
    stats: {
      totalToolCalls: 0,
      totalErrors: 0,
      sessionCompleted: 0,
      subagentRuns: 0,
      maxConcurrentAgents: 0,
      compactCount: 0,
      danceGameSCount: 0,
      nightMinutes: 0,
      pokeCount: 0,
      totalMinutes: 0,
    },
    streak: { current: 0, longest: 0, lastDate: null },
    dailyLog: {},
  };
}

class GrowthEngine {
  constructor(userDataPath) {
    this.savePath = path.join(userDataPath, "clawd-save.json");
    this.data = null;
    this._dirty = false;
    this._saveTimer = null;
    this._sessionStartTime = Date.now();
    this._focusStart = null;         // when continuous coding started
    this._focus30Awarded = false;
    this._focus2hAwarded = false;
    this._listeners = [];            // { event, fn }
  }

  // ── Lifecycle ──

  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.savePath, "utf8"));
      this.data = { ...defaultSave(), ...raw };
      // Merge nested objects to handle schema upgrades
      this.data.stats = { ...defaultSave().stats, ...raw.stats };
      this.data.streak = { ...defaultSave().streak, ...raw.streak };
      this.data.growth = { ...defaultSave().growth, ...raw.growth };
      this.data.mood = { ...defaultSave().mood, ...raw.mood };
      this.data.profile = { ...defaultSave().profile, ...raw.profile };
    } catch {
      this.data = defaultSave();
    }

    // Daily first launch bonus
    const today = this._today();
    if (this.data.streak.lastDate !== today) {
      this._awardXp("daily_first");
      this._updateStreak(today);
    }

    // Update mood decay since last session
    this._decayMood();

    this._scheduleSave();
    return this;
  }

  save() {
    if (!this.data) return;
    try { fs.writeFileSync(this.savePath, JSON.stringify(this.data, null, 2)); } catch {}
    this._dirty = false;
  }

  destroy() {
    if (this._saveTimer) clearInterval(this._saveTimer);
    if (this._dirty) this.save();
  }

  // ── Event Hooks (called from main.js) ──

  onEvent(event, extra) {
    if (!this.data) return;

    switch (event) {
      case "PostToolUse":
        this.data.stats.totalToolCalls++;
        this._awardXp("tool_success");
        this._trackFocus();
        break;

      case "PreToolUse":
        this._trackFocus();
        break;

      case "error":
        this.data.stats.totalErrors++;
        this._awardXp("tool_failure");
        this._changeMood(-3);
        break;

      case "Stop":
      case "attention":
        this.data.stats.sessionCompleted++;
        this._awardXp("session_done");
        this._changeMood(15);
        break;

      case "SubagentStart":
        this.data.stats.subagentRuns++;
        if (extra && extra.concurrent > this.data.stats.maxConcurrentAgents) {
          this.data.stats.maxConcurrentAgents = extra.concurrent;
        }
        this._awardXp("subagent");
        break;

      case "SubagentStop":
        break;

      case "PreCompact":
      case "PostCompact":
        if (event === "PostCompact") {
          this.data.stats.compactCount++;
          this._awardXp("compact");
        }
        break;

      case "poke":
        this.data.stats.pokeCount++;
        this._awardXp("poke");
        this._changeMood(5);
        break;

      case "dance_game_result":
        if (extra && extra.grade === "S") {
          this.data.stats.danceGameSCount++;
          this._awardXp("dance_game_s");
          this._changeMood(20);
        } else {
          this._changeMood(10);
        }
        break;

      default:
        // Track coding focus for unknown working events
        this._trackFocus();
        break;
    }

    // Track night coding
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      this.data.stats.nightMinutes++;
    }

    // Update daily log
    this._updateDailyLog();

    // Check achievements
    this._checkAchievements();

    this._dirty = true;
  }

  // ── Public Getters ──

  getLevel() {
    if (!this.data) return LEVELS[0];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (this.data.growth.totalXp >= LEVELS[i].xpMin) return LEVELS[i];
    }
    return LEVELS[0];
  }

  getNextLevel() {
    const cur = this.getLevel();
    const idx = LEVELS.findIndex(l => l.level === cur.level);
    return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  }

  getLevelProgress() {
    const cur = this.getLevel();
    const next = this.getNextLevel();
    if (!next) return 1; // max level
    const range = next.xpMin - cur.xpMin;
    const progress = this.data.growth.totalXp - cur.xpMin;
    return Math.min(1, progress / range);
  }

  getMood() {
    if (!this.data) return 50;
    return this.data.mood.value;
  }

  getMoodLabel(lang) {
    const v = this.getMood();
    if (v >= 80) return lang === "zh" ? "超开心" : "Ecstatic";
    if (v >= 60) return lang === "zh" ? "开心" : "Happy";
    if (v >= 40) return lang === "zh" ? "平静" : "Calm";
    if (v >= 20) return lang === "zh" ? "低落" : "Down";
    return lang === "zh" ? "沮丧" : "Sad";
  }

  getStreak() {
    return this.data ? this.data.streak : { current: 0, longest: 0 };
  }

  getSummary(lang) {
    const lv = this.getLevel();
    const title = lang === "zh" ? lv.title_zh : lv.title_en;
    return {
      level: lv.level,
      title,
      xp: this.data.growth.totalXp,
      nextXp: this.getNextLevel()?.xpMin || null,
      progress: this.getLevelProgress(),
      mood: this.getMood(),
      moodLabel: this.getMoodLabel(lang),
      streak: this.data.streak.current,
      achievements: this.data.achievements.length,
    };
  }

  // ── Event system for UI notifications ──

  on(event, fn) {
    this._listeners.push({ event, fn });
  }

  _emit(event, data) {
    for (const l of this._listeners) {
      if (l.event === event) {
        try { l.fn(data); } catch {}
      }
    }
  }

  // ── Internal ──

  _awardXp(rewardKey) {
    const amount = XP_REWARDS[rewardKey] || 0;
    if (amount <= 0) return;

    const oldLevel = this.getLevel().level;
    this.data.growth.xp += amount;
    this.data.growth.totalXp += amount;
    const newLevel = this.getLevel().level;

    this._emit("xp", { amount, total: this.data.growth.totalXp, key: rewardKey });

    if (newLevel > oldLevel) {
      const levelInfo = this.getLevel();
      this.data.growth.level = newLevel;
      this._emit("levelup", { level: newLevel, title_en: levelInfo.title_en, title_zh: levelInfo.title_zh });
    }
  }

  _changeMood(delta) {
    this.data.mood.value = Math.max(0, Math.min(100, this.data.mood.value + delta));
    this.data.mood.lastUpdate = Date.now();
  }

  _decayMood() {
    const elapsed = Date.now() - (this.data.mood.lastUpdate || Date.now());
    const hours = elapsed / 3600000;
    if (hours > 1) {
      const decay = Math.floor(hours) * 1; // -1 per hour offline
      this._changeMood(-decay);
    }
  }

  _trackFocus() {
    const now = Date.now();
    if (!this._focusStart) {
      this._focusStart = now;
      this._focus30Awarded = false;
      this._focus2hAwarded = false;
    }

    const elapsed = now - this._focusStart;

    if (!this._focus30Awarded && elapsed >= 30 * 60 * 1000) {
      this._focus30Awarded = true;
      this._awardXp("focus_30min");
      this._changeMood(10);
    }

    if (!this._focus2hAwarded && elapsed >= 2 * 60 * 60 * 1000) {
      this._focus2hAwarded = true;
      this._awardXp("focus_2hr");
      this._changeMood(15);
    }
  }

  resetFocusTimer() {
    this._focusStart = null;
    this._focus30Awarded = false;
    this._focus2hAwarded = false;
  }

  _updateStreak(today) {
    const last = this.data.streak.lastDate;
    if (!last) {
      this.data.streak.current = 1;
    } else {
      const yesterday = this._dateStr(new Date(Date.now() - 86400000));
      if (last === yesterday) {
        this.data.streak.current++;
      } else if (last !== today) {
        this.data.streak.current = 1;
      }
    }
    this.data.streak.lastDate = today;
    if (this.data.streak.current > this.data.streak.longest) {
      this.data.streak.longest = this.data.streak.current;
    }
    this._dirty = true;
  }

  _updateDailyLog() {
    const today = this._today();
    if (!this.data.dailyLog[today]) {
      this.data.dailyLog[today] = { minutes: 0, toolCalls: 0, errors: 0 };
    }
    const log = this.data.dailyLog[today];
    log.toolCalls = this.data.stats.totalToolCalls; // snapshot
    log.errors = this.data.stats.totalErrors;

    // Prune old daily logs (keep 90 days)
    const keys = Object.keys(this.data.dailyLog).sort();
    while (keys.length > 90) {
      delete this.data.dailyLog[keys.shift()];
    }
  }

  _checkAchievements() {
    for (const [id, def] of Object.entries(ACHIEVEMENTS)) {
      if (this.data.achievements.includes(id)) continue;
      try {
        if (def.condition(this.data)) {
          this.data.achievements.push(id);
          this._emit("achievement", { id, en: def.en, zh: def.zh });
        }
      } catch {}
    }
  }

  _today() {
    return this._dateStr(new Date());
  }

  _dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  _scheduleSave() {
    // Auto-save every 30 seconds if dirty
    this._saveTimer = setInterval(() => {
      if (this._dirty) this.save();
    }, 30000);
  }
}

module.exports = { GrowthEngine, LEVELS, ACHIEVEMENTS, XP_REWARDS };
