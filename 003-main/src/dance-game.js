// ── Clawd Dance Game ──
const electronAPI = window.electronAPI || {
  danceHit: () => {},
  danceGameState: () => {},
  closeDanceGame: () => {},
};

const KEYS = ["left", "up", "down", "right"];
const KEY_MAP = { ArrowLeft: "left", ArrowUp: "up", ArrowDown: "down", ArrowRight: "right" };
const ARROW_CHARS = { left: "←", up: "↑", down: "↓", right: "→" };

// Timing windows (ms)
const PERFECT_WINDOW = 80;
const GOOD_WINDOW = 160;

// Game settings
const BPM = 120;
const BEAT_MS = 60000 / BPM;          // 500ms per beat
const FALL_DURATION = 1500;            // time for arrow to fall from top to target
const GAME_DURATION = 30000;           // 30 second game
const TARGET_Y_RATIO = 0.88;          // target zone position (from top)

// DOM elements
const overlay = document.getElementById("overlay");
const resultsEl = document.getElementById("results");
const feedbackEl = document.getElementById("feedback");
const comboCountEl = document.getElementById("combo-count");
const scoreCountEl = document.getElementById("score-count");
const resultsScoreEl = document.getElementById("results-score");
const resultsStatsEl = document.getElementById("results-stats");
const resultsGradeEl = document.getElementById("results-grade");
const closeBtn = document.getElementById("close-btn");

const lanes = {};
const targetZones = {};
KEYS.forEach(key => {
  const el = document.querySelector(`.lane[data-key="${key}"]`);
  lanes[key] = el;
  targetZones[key] = el.querySelector(".target-zone");
});

// Game state
let gameRunning = false;
let gameStartTime = 0;
let score = 0;
let combo = 0;
let maxCombo = 0;
let perfectCount = 0;
let goodCount = 0;
let missCount = 0;
let arrows = [];       // { key, spawnTime, targetTime, el, hit }
let beatPattern = [];   // pre-generated arrow schedule
let nextBeatIdx = 0;
let rafId = null;
let feedbackTimer = null;

// ── Beat Pattern Generator ──
function generateBeatPattern() {
  const pattern = [];
  let t = FALL_DURATION; // first arrow arrives after fall duration
  const endTime = GAME_DURATION;

  // Difficulty ramps up over time
  while (t < endTime) {
    const progress = t / endTime; // 0→1
    const numArrows = progress < 0.3 ? 1 : (progress < 0.7 ? (Math.random() < 0.4 ? 2 : 1) : (Math.random() < 0.3 ? 3 : 2));

    // Pick random non-duplicate keys
    const available = [...KEYS];
    const chosen = [];
    for (let i = 0; i < numArrows; i++) {
      const idx = Math.floor(Math.random() * available.length);
      chosen.push(available.splice(idx, 1)[0]);
    }

    chosen.forEach(key => pattern.push({ key, targetTime: t }));

    // Interval gets shorter as game progresses
    const interval = progress < 0.3 ? BEAT_MS : (progress < 0.7 ? BEAT_MS * 0.75 : BEAT_MS * 0.5);
    // Add slight randomness
    t += interval + (Math.random() - 0.5) * interval * 0.3;
  }

  return pattern;
}

// ── Arrow Creation ──
function spawnArrow(key, targetTime) {
  const el = document.createElement("div");
  el.className = "arrow";
  el.textContent = ARROW_CHARS[key];
  el.style.top = "-36px";
  lanes[key].appendChild(el);

  const arrow = {
    key,
    spawnTime: targetTime - FALL_DURATION,
    targetTime,
    el,
    hit: false,
    removed: false,
  };
  arrows.push(arrow);
  return arrow;
}

// ── Game Loop ──
function gameLoop() {
  if (!gameRunning) return;

  const now = Date.now() - gameStartTime;
  const laneHeight = lanes.left.offsetHeight;
  const targetY = laneHeight * TARGET_Y_RATIO;

  // Spawn arrows that need to appear
  while (nextBeatIdx < beatPattern.length) {
    const beat = beatPattern[nextBeatIdx];
    if (beat.targetTime - FALL_DURATION <= now) {
      spawnArrow(beat.key, beat.targetTime);
      nextBeatIdx++;
    } else {
      break;
    }
  }

  // Update arrow positions
  for (const arrow of arrows) {
    if (arrow.removed) continue;

    const elapsed = now - arrow.spawnTime;
    const progress = elapsed / FALL_DURATION;
    const y = -36 + progress * (targetY + 36);
    arrow.el.style.top = `${y}px`;

    // Auto-miss if arrow passes target zone
    if (!arrow.hit && now > arrow.targetTime + GOOD_WINDOW) {
      arrow.hit = true;
      arrow.el.classList.add("missed");
      onMiss();
      setTimeout(() => {
        if (arrow.el.parentNode) arrow.el.remove();
        arrow.removed = true;
      }, 300);
    }

    // Cleanup arrows that have fallen off screen
    if (y > laneHeight + 50) {
      if (arrow.el.parentNode) arrow.el.remove();
      arrow.removed = true;
    }
  }

  // Clean up removed arrows
  arrows = arrows.filter(a => !a.removed);

  // Check game end
  if (now >= GAME_DURATION + FALL_DURATION && arrows.length === 0) {
    endGame();
    return;
  }

  rafId = requestAnimationFrame(gameLoop);
}

// ── Input Handling ──
function handleKeyPress(key) {
  if (!gameRunning) return;

  const now = Date.now() - gameStartTime;

  // Flash target zone
  targetZones[key].classList.add("flash");
  setTimeout(() => targetZones[key].classList.remove("flash"), 120);

  // Find closest unhit arrow in this lane
  let bestArrow = null;
  let bestDiff = Infinity;

  for (const arrow of arrows) {
    if (arrow.key !== key || arrow.hit) continue;
    const diff = Math.abs(now - arrow.targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestArrow = arrow;
    }
  }

  if (!bestArrow || bestDiff > GOOD_WINDOW) {
    // No arrow to hit — ignore (don't penalize random presses)
    return;
  }

  bestArrow.hit = true;

  if (bestDiff <= PERFECT_WINDOW) {
    onPerfect(bestArrow);
  } else {
    onGood(bestArrow);
  }
}

function onPerfect(arrow) {
  perfectCount++;
  combo++;
  if (combo > maxCombo) maxCombo = combo;
  const comboBonus = Math.min(combo, 20);
  score += 100 + comboBonus * 5;
  showFeedback("PERFECT!", "perfect");
  hitArrow(arrow);
  electronAPI.danceHit("perfect", combo);
}

function onGood(arrow) {
  goodCount++;
  combo++;
  if (combo > maxCombo) maxCombo = combo;
  const comboBonus = Math.min(combo, 20);
  score += 50 + comboBonus * 3;
  showFeedback("GOOD", "good");
  hitArrow(arrow);
  electronAPI.danceHit("good", combo);
}

function onMiss() {
  missCount++;
  combo = 0;
  showFeedback("MISS", "miss");
  electronAPI.danceHit("miss", 0);
}

function hitArrow(arrow) {
  arrow.el.classList.add("hit");
  setTimeout(() => {
    if (arrow.el.parentNode) arrow.el.remove();
    arrow.removed = true;
  }, 200);
  updateScore();
}

function updateScore() {
  scoreCountEl.textContent = score;
  comboCountEl.textContent = combo;
  comboCountEl.classList.add("pop");
  setTimeout(() => comboCountEl.classList.remove("pop"), 100);
}

function showFeedback(text, cls) {
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackEl.textContent = text;
  feedbackEl.className = cls;
  feedbackTimer = setTimeout(() => {
    feedbackEl.className = "hidden";
  }, 400);
}

// ── Game Flow ──
function startGame() {
  overlay.classList.add("hidden");
  resultsEl.classList.add("hidden");

  // Reset state
  score = 0;
  combo = 0;
  maxCombo = 0;
  perfectCount = 0;
  goodCount = 0;
  missCount = 0;
  arrows = [];
  nextBeatIdx = 0;

  scoreCountEl.textContent = "0";
  comboCountEl.textContent = "0";

  // Clear any leftover arrows
  document.querySelectorAll(".arrow").forEach(el => el.remove());

  beatPattern = generateBeatPattern();
  gameStartTime = Date.now();
  gameRunning = true;

  electronAPI.danceGameState("start");
  rafId = requestAnimationFrame(gameLoop);
}

function endGame() {
  gameRunning = false;
  if (rafId) cancelAnimationFrame(rafId);

  const total = perfectCount + goodCount + missCount;
  const accuracy = total > 0 ? Math.round((perfectCount + goodCount) / total * 100) : 0;

  // Grade
  let grade, gradeColor;
  if (accuracy >= 95 && missCount <= 2) { grade = "S"; gradeColor = "#FFD700"; }
  else if (accuracy >= 85) { grade = "A"; gradeColor = "#78C8A0"; }
  else if (accuracy >= 70) { grade = "B"; gradeColor = "#4DA8A0"; }
  else if (accuracy >= 50) { grade = "C"; gradeColor = "#FFA000"; }
  else { grade = "D"; gradeColor = "#FF5252"; }

  resultsScoreEl.textContent = score;
  resultsStatsEl.innerHTML =
    `PERFECT: ${perfectCount}　GOOD: ${goodCount}　MISS: ${missCount}<br>` +
    `MAX COMBO: ${maxCombo}　ACCURACY: ${accuracy}%`;
  resultsGradeEl.textContent = grade;
  resultsGradeEl.style.color = gradeColor;
  resultsGradeEl.style.textShadow = `0 0 12px ${gradeColor}88`;
  resultsEl.classList.remove("hidden");

  electronAPI.danceGameState("end", { grade, score, accuracy });
}

// ── Keyboard Events ──
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { electronAPI.closeDanceGame(); return; }
  const key = KEY_MAP[e.key];
  if (!key) {
    if (!gameRunning && !resultsEl.classList.contains("hidden")) startGame();
    return;
  }
  e.preventDefault();

  if (!gameRunning) {
    startGame();
    return;
  }

  handleKeyPress(key);
});

// Results screen: any key restarts
document.addEventListener("keydown", (e) => {
  if (!gameRunning && !resultsEl.classList.contains("hidden")) {
    startGame();
  }
});

// Close button
closeBtn.addEventListener("click", () => {
  electronAPI.closeDanceGame();
});

// Window close cleanup
window.addEventListener("beforeunload", () => {
  if (gameRunning) {
    gameRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    electronAPI.danceGameState("end");
  }
});
