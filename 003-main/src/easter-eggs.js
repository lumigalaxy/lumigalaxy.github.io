// ── Clawd Easter Eggs System ──
// Detects special conditions and triggers surprise animations/behaviors.
// Called from main.js on each event. Returns an egg object if triggered, null otherwise.

// ── Easter Egg Definitions ──
const EGGS = [
  // ── Time-based ──
  {
    id: "deep_sea_crisis",
    description: "Coding at 3am — deep sea crisis mode",
    cooldownMs: 3600000, // 1 hour
    condition: (ctx) => {
      const h = new Date().getHours();
      return h === 3 && ctx.state === "working";
    },
    action: { type: "speech", text: "⚠ 深海危机模式启动…\n检测到凌晨3点异常活跃。", mode: "mixed" },
  },
  {
    id: "weekend_coder",
    description: "Coding on weekend",
    cooldownMs: 86400000, // 1 day
    condition: (ctx) => {
      const d = new Date().getDay();
      return (d === 0 || d === 6) && ctx.event === "SessionStart";
    },
    action: { type: "speech", text: "周末也来啦！\n你比 Tera-IX 的码工还卷！", mode: "normal" },
  },

  // ── Interaction-based ──
  {
    id: "rage_click",
    description: "10+ rapid clicks — Clawd gets mad",
    cooldownMs: 60000, // 1 min
    condition: (ctx) => ctx.event === "poke" && ctx.pokeCount >= 10 && ctx.pokeBurst,
    action: { type: "state", state: "error", speech: "别戳了别戳了！！\n我要生气了！！" },
  },
  {
    id: "drop_from_top",
    description: "Dragged to top and released — slide down",
    cooldownMs: 30000,
    condition: (ctx) => ctx.event === "drag-end-top",
    action: { type: "speech", text: "呜哇哇哇——\n好高！", mode: "normal" },
  },

  // ── Programming-based ──
  {
    id: "rm_rf_panic",
    description: "rm -rf detected — Clawd panics",
    cooldownMs: 300000, // 5 min
    condition: (ctx) => ctx.event === "error" && ctx.consecutiveErrors >= 1,
    // This is a simplified trigger; full implementation would need terminal hook
    action: { type: "speech", text: "！！！\n数据之海发生了地震！", mode: "mixed" },
  },
  {
    id: "fix_commit_eyeroll",
    description: "Too many errors then success",
    cooldownMs: 120000,
    condition: (ctx) => ctx.event === "Stop" && ctx.recentErrors >= 5,
    action: { type: "speech", text: "终于…终于编译通过了…\n我的角都快断了。", mode: "normal" },
  },
  {
    id: "compile_blessing_beam",
    description: "10 consecutive successes — beam to Tera-IX",
    cooldownMs: 600000,
    condition: (ctx) => ctx.event === "Stop" && ctx.sessionCompleted > 0 && ctx.sessionCompleted % 10 === 0,
    action: { type: "speech", text: "★ 第 " + "N" + " 次编译祝福！\n向 Tera-IX 发射光束！★", mode: "normal",
      dynamicText: (ctx) => `★ 第 ${ctx.sessionCompleted} 次编译祝福！\n向 Tera-IX 发射光束！★` },
  },
  {
    id: "console_log_sweep",
    description: "Many tool calls — cleaning time",
    cooldownMs: 1800000,
    condition: (ctx) => ctx.event === "sweeping",
    action: { type: "speech", text: "让我来清理一下…\n数据之海需要保持整洁。", mode: "normal" },
  },

  // ── Streak-based ──
  {
    id: "streak_3",
    description: "3-day streak celebration",
    cooldownMs: 86400000,
    condition: (ctx) => ctx.event === "daily_first" && ctx.streak === 3,
    action: { type: "speech", text: "连续 3 天了！\n在 Tera-IX 这叫「三日共振」。", mode: "normal" },
  },
  {
    id: "streak_7",
    description: "7-day streak — special",
    cooldownMs: 86400000,
    condition: (ctx) => ctx.event === "daily_first" && ctx.streak === 7,
    action: { type: "speech", text: "整整一周！\n你的毅力连数据之海都震动了！★", mode: "normal" },
  },
  {
    id: "streak_30",
    description: "30-day streak — legendary",
    cooldownMs: 86400000,
    condition: (ctx) => ctx.event === "daily_first" && ctx.streak === 30,
    action: { type: "speech", text: "30 天…传说级的坚持！\n母星为你亮起了信号灯 ◈★◈", mode: "normal" },
  },

  // ── Level-based ──
  {
    id: "level_5_explorer",
    description: "Reached level 5",
    cooldownMs: Infinity, // once ever
    condition: (ctx) => ctx.event === "levelup" && ctx.level === 5,
    action: { type: "speech", text: "Lv.5 深海探索者！\n我能感受到更深的数据洋流了…", mode: "normal" },
  },
  {
    id: "level_10_partner",
    description: "Reached max level",
    cooldownMs: Infinity,
    condition: (ctx) => ctx.event === "levelup" && ctx.level === 10,
    action: { type: "speech", text: "Lv.10 星际结对伙伴！\n你是我在这个星球上\n最好的搭档 ◈★", mode: "normal" },
  },
];

class EasterEggEngine {
  constructor() {
    this._lastTriggered = {}; // { eggId: timestamp }
    this._pokeBurstCount = 0;
    this._pokeBurstTimer = null;
    this._listeners = [];
  }

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

  // Call on each poke to track burst clicking
  trackPoke() {
    this._pokeBurstCount++;
    if (this._pokeBurstTimer) clearTimeout(this._pokeBurstTimer);
    this._pokeBurstTimer = setTimeout(() => {
      this._pokeBurstCount = 0;
    }, 2000); // burst window: 2 seconds
  }

  // Check all eggs against current context
  // Returns the first triggered egg action, or null
  check(ctx) {
    const now = Date.now();

    // Inject poke burst info
    ctx.pokeBurst = this._pokeBurstCount >= 10;
    ctx.pokeCount = this._pokeBurstCount;

    for (const egg of EGGS) {
      // Cooldown check
      const last = this._lastTriggered[egg.id] || 0;
      if (now - last < egg.cooldownMs) continue;

      try {
        if (egg.condition(ctx)) {
          this._lastTriggered[egg.id] = now;

          // Build action
          const action = { ...egg.action, eggId: egg.id };
          if (action.dynamicText) {
            action.text = action.dynamicText(ctx);
            delete action.dynamicText;
          }

          this._emit("triggered", { id: egg.id, action });

          // Reset poke burst after rage click triggers
          if (egg.id === "rage_click") {
            this._pokeBurstCount = 0;
          }

          return action;
        }
      } catch {}
    }

    return null;
  }
}

module.exports = { EasterEggEngine, EGGS };
