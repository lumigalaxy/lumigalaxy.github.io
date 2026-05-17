// ── Clawd Context-Aware Dialogue Engine ──
// Selects speech lines based on: coding state, time of day, mood, growth level, streak, events.
// Pure function module — no side effects, no dependencies.

const ALIEN_GLYPHS = "◈◇▽△▷◁☆★♢♦⟐⟡⬡⬢⏣⏥⟟⟠⎔⎕╳※⊹⊙⊘⊗⊜⊛⊚✧✦✥❋❊❈";

// ── Context-aware dialogue pools ──
// Each pool: { condition(ctx) → bool, lines: [...], weight: number }
// Higher weight = more likely to be picked when condition matches.

const DIALOGUE_POOLS = [
  // ── Time-based ──
  {
    id: "morning",
    condition: (ctx) => ctx.hour >= 6 && ctx.hour < 10,
    weight: 3,
    lines: [
      "早上好！\n今天的数据之海平静如镜…",
      "新的一天，新的代码！\n母星的朝阳也升起了。",
      "一杯☕配上代码，\n完美的早晨。",
    ],
  },
  {
    id: "late_night",
    condition: (ctx) => ctx.hour >= 0 && ctx.hour < 5,
    weight: 5,
    lines: [
      "地球人…\n你们真的不需要睡觉吗？",
      "凌晨了…\n连 Tera-IX 的数据流都休眠了。",
      "夜深了，\n注意休息啊…",
      "我的角检测到你的\n困意波动在上升…",
      "这个时间还在写代码？\n你比夜猫子还夜猫子。",
    ],
  },
  {
    id: "evening",
    condition: (ctx) => ctx.hour >= 18 && ctx.hour < 22,
    weight: 2,
    lines: [
      "晚上好~\n今天辛苦了。",
      "夕阳像Tera-IX的\n数据余晖一样美。",
    ],
  },
  {
    id: "weekend",
    condition: (ctx) => ctx.dayOfWeek === 0 || ctx.dayOfWeek === 6,
    weight: 2,
    lines: [
      "周末也在写代码？\n你真的很热爱编程呢。",
      "周末啦！\n要不要让我跳支舞？",
      "在 Tera-IX，\n周末是全民共振日。",
    ],
  },

  // ── Coding state-based ──
  {
    id: "working",
    condition: (ctx) => ctx.state === "working" || ctx.state === "thinking",
    weight: 4,
    lines: [
      "嗯…这段逻辑很精妙。",
      "我在旁边认真看着呢。",
      "你写代码的时候\n数据之海会泛起涟漪。",
      "专注的样子…\n真像 Tera-IX 的工匠。",
    ],
  },
  {
    id: "error_recovery",
    condition: (ctx) => ctx.recentErrors >= 3,
    weight: 6,
    lines: [
      "别气馁！\n即使在 Tera-IX，\n我们也会遇到数据风暴。",
      "Bug 只是代码在考验你，\n你一定能通过的！",
      "连续出错没关系…\n深呼吸，再来一次。",
      "我用角发送了一个\n「编译祝福」给你 ★",
      "在 Tera-IX 有句话：\n「每个 bug 都是宝藏」。",
    ],
  },
  {
    id: "after_success",
    condition: (ctx) => ctx.lastEvent === "attention" || ctx.lastEvent === "Stop",
    weight: 5,
    lines: [
      "编译成功了！★\n我向母星发了一个脉冲。",
      "又一个编译祝福\n发出去了！",
      "漂亮！一次通过！",
      "Tera-IX 收到了\n你的成功信号。",
    ],
  },
  {
    id: "juggling",
    condition: (ctx) => ctx.state === "juggling",
    weight: 4,
    lines: [
      "哇，多个分身在工作！",
      "子代理们好忙啊…\n就像 Tera-IX 的集群。",
      "同时处理这么多任务，\n你是指挥家！",
    ],
  },
  {
    id: "idle_long",
    condition: (ctx) => ctx.idleMinutes >= 10,
    weight: 3,
    lines: [
      "你去哪了？\n我有点无聊…",
      "鼠标别停太久，\n不然我会打瞌睡的。",
      "好安静…\n数据之海也平静了下来。",
      "……我开始想家了。",
    ],
  },

  // ── Mood-based ──
  {
    id: "mood_high",
    condition: (ctx) => ctx.mood >= 80,
    weight: 3,
    lines: [
      "今天超开心！\n数据流在歌唱！",
      "心情好的时候\n角的共振频率会变高~",
      "感觉什么都能编译通过！",
    ],
  },
  {
    id: "mood_low",
    condition: (ctx) => ctx.mood < 30,
    weight: 4,
    lines: [
      "……",
      "信号在减弱…",
      "有点想念 Tera-IX…",
      "今天的数据有点沉重…",
    ],
  },

  // ── Growth milestones ──
  {
    id: "streak_high",
    condition: (ctx) => ctx.streak >= 7,
    weight: 2,
    lines: [
      `连续这么多天了！\n你比 Tera-IX 的学徒还勤奋！`,
      "坚持就是力量！\n我的角都为你发光了。",
    ],
  },
  {
    id: "level_up_recent",
    condition: (ctx) => ctx.levelUpRecent,
    weight: 5,
    lines: [
      "我感觉自己变强了！\n是因为你吗？",
      "等级提升了…\n母星的光芒在变亮。",
      "成长的感觉真好！\n谢谢你陪我。",
    ],
  },

  // ── Generic / lore (always available, low weight) ──
  {
    id: "lore",
    condition: () => true,
    weight: 1,
    lines: [
      "我来自 Tera-IX 星…\n那里只有数据之海。",
      "Tera-IX 的海水是\n青绿色的信息流。",
      "我们只有一只眼睛，\n但能看穿代码的维度。",
      "头上的角是共振天线，\n能接收灵感波。",
      "我的牙齿是用来\n咬碎 bug 的！",
      "穿过三个虫洞，\n我才到了这里。",
      "你们的递归真有趣，\n我们用共振来实现。",
      "JavaScript…\n和 Java 真没关系吗？",
      "我的同族们在遥远的\n星球上也在结对编程。",
      "你知道吗？\n信息结晶比钻石还硬。",
      "Tera-IX 没有陆地，\n我第一次见到「地面」。",
      "虽然离家很远，\n但屏幕上感觉很温暖。",
      "谢谢你让我\n待在这里。",
      "今天也一起\n加油吧！",
      "盯着你写代码\n是我最喜欢的事。",
      "有时候我也想家，\n但这里也不错。",
      "你是我在地球上\n认识的第一个朋友。",
      "这个函数…\n嗯，逻辑很优雅。",
      "我感觉到了一个\n潜在的 bug…大概。",
      "Tera-IX 没有\nsegfault 这种东西。",
      "你们用 git？\n我们用时间线分叉。",
      "null 是什么？\n在我们那叫做虚空。",
    ],
  },

  // ── Alien language bursts (always available) ──
  {
    id: "alien",
    condition: () => true,
    weight: 1,
    lines: ["ALIEN", "ALIEN", "ALIEN"],
  },
  {
    id: "mixed",
    condition: () => true,
    weight: 1,
    lines: [
      "MIXED:等等…我刚才说的是\n母语吗？抱歉！",
      "MIXED:信号有点乱…\n角在共振…",
      "MIXED:你听不懂对吧…\n我也控制不住…",
      "MIXED:啊，又说了星球话…\n地球语好难。",
    ],
  },
];

// ── Dialogue selector ──
// ctx: { state, hour, dayOfWeek, mood, streak, level, recentErrors, lastEvent, idleMinutes, levelUpRecent }
function selectLine(ctx) {
  // Gather all matching pools
  const matching = [];
  for (const pool of DIALOGUE_POOLS) {
    try {
      if (pool.condition(ctx)) {
        matching.push(pool);
      }
    } catch {}
  }

  if (matching.length === 0) return { text: "…", mode: "normal" };

  // Weighted random selection of pool
  const totalWeight = matching.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * totalWeight;
  let selected = matching[0];
  for (const pool of matching) {
    r -= pool.weight;
    if (r <= 0) { selected = pool; break; }
  }

  // Random line from selected pool
  const raw = selected.lines[Math.floor(Math.random() * selected.lines.length)];

  if (raw === "ALIEN") return { text: null, mode: "alien" }; // caller generates alien phrase
  if (raw.startsWith("MIXED:")) return { text: raw.slice(6), mode: "mixed" };
  return { text: raw, mode: "normal" };
}

module.exports = { selectLine, DIALOGUE_POOLS };
