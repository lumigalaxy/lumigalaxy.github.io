// ── Bug Crusher — Typing Game ──
// Type bug words to crush them. 30-second timed challenge.

const { electronAPI } = window;

// ── Bug words pool (coding-themed) ──
const BUG_WORDS = [
  // Short (3-4)
  "bug", "fix", "git", "npm", "css", "api", "dom", "tcp", "sql", "ssh",
  "log", "err", "var", "int", "pub", "nil", "ref", "ptr", "asm", "hex",
  // Medium (5-7)
  "error", "debug", "crash", "patch", "stack", "queue", "async", "await",
  "merge", "fetch", "parse", "throw", "catch", "yield", "class", "super",
  "proxy", "mutex", "flask", "react", "regex", "token", "cache", "index",
  // Long (7+)
  "runtime", "compile", "overflow", "segfault", "pointer", "boolean",
  "typedef", "require", "package", "promise", "callback", "iterator",
  "debugger", "compiler", "terminal", "function", "variable",
  "exception", "undefined", "prototype", "algorithm", "recursive",
];

// ── DOM ──
const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");
const wpmEl = document.getElementById("wpm");
const targetEl = document.getElementById("target-word");
const inputEl = document.getElementById("input-field");
const feedbackEl = document.getElementById("feedback");
const startOverlay = document.getElementById("start-overlay");
const resultsOverlay = document.getElementById("results-overlay");
const resultsScoreEl = document.getElementById("results-score");
const resultsStatsEl = document.getElementById("results-stats");
const resultsGradeEl = document.getElementById("results-grade");
const closeBtn = document.getElementById("close-btn");

// ── State ──
let gameRunning = false;
let score = 0;
let wordsTyped = 0;
let charsTyped = 0;
let currentWord = "";
let timeLeft = 30;
let timerInterval = null;
let startTime = 0;

// ── Close button ──
closeBtn.addEventListener("click", () => {
  electronAPI.closeBugGame();
});

// ── Word selection ──
function pickWord() {
  // Difficulty ramps: start easy, get harder
  const elapsed = 30 - timeLeft;
  let pool;
  if (elapsed < 10) {
    pool = BUG_WORDS.filter(w => w.length <= 5);
  } else if (elapsed < 20) {
    pool = BUG_WORDS.filter(w => w.length <= 7);
  } else {
    pool = BUG_WORDS;
  }
  let word;
  do {
    word = pool[Math.floor(Math.random() * pool.length)];
  } while (word === currentWord);
  return word;
}

function displayWord(word) {
  currentWord = word;
  targetEl.innerHTML = word.split("").map(c => `<span class="unmatched">${c}</span>`).join("");
  targetEl.classList.remove("correct");
}

function updateHighlight() {
  const typed = inputEl.value;
  const chars = currentWord.split("");
  targetEl.innerHTML = chars.map((c, i) => {
    if (i < typed.length) {
      return typed[i] === c
        ? `<span class="matched">${c}</span>`
        : `<span class="unmatched" style="color:#FF4444;text-decoration:underline">${c}</span>`;
    }
    return `<span class="unmatched">${c}</span>`;
  }).join("");
}

// ── Game flow ──
function startGame() {
  gameRunning = true;
  score = 0;
  wordsTyped = 0;
  charsTyped = 0;
  timeLeft = 30;
  startTime = Date.now();

  scoreEl.textContent = "0";
  timerEl.textContent = "30";
  wpmEl.textContent = "0";
  inputEl.value = "";
  feedbackEl.textContent = "";
  feedbackEl.className = "";

  startOverlay.classList.add("hidden");
  resultsOverlay.classList.add("hidden");

  displayWord(pickWord());
  inputEl.focus();

  electronAPI.bugGameState("start");

  timerInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    // Update WPM live
    const elapsedMin = (Date.now() - startTime) / 60000;
    if (elapsedMin > 0) {
      wpmEl.textContent = Math.round(charsTyped / 5 / elapsedMin);
    }

    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  gameRunning = false;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

  const elapsedMin = (Date.now() - startTime) / 60000;
  const finalWpm = elapsedMin > 0 ? Math.round(charsTyped / 5 / elapsedMin) : 0;

  // Scoring
  const totalScore = score;

  // Grade
  let grade, gradeColor;
  if (finalWpm >= 60) { grade = "S"; gradeColor = "#FFD700"; }
  else if (finalWpm >= 45) { grade = "A"; gradeColor = "#78C8A0"; }
  else if (finalWpm >= 30) { grade = "B"; gradeColor = "#4FC3F7"; }
  else if (finalWpm >= 15) { grade = "C"; gradeColor = "#FF9800"; }
  else { grade = "D"; gradeColor = "#FF6B6B"; }

  resultsScoreEl.textContent = totalScore;
  resultsStatsEl.innerHTML =
    `Words: ${wordsTyped}　WPM: ${finalWpm}<br>` +
    `Characters: ${charsTyped}`;
  resultsGradeEl.textContent = grade;
  resultsGradeEl.style.color = gradeColor;
  resultsGradeEl.style.textShadow = `0 0 12px ${gradeColor}88`;
  resultsOverlay.classList.remove("hidden");

  electronAPI.bugGameState("end", { grade, score: totalScore, wpm: finalWpm });
}

function crushWord() {
  wordsTyped++;
  charsTyped += currentWord.length;

  // Score: base + length bonus
  const wordScore = 10 + currentWord.length * 2;
  score += wordScore;
  scoreEl.textContent = score;

  // Visual feedback
  targetEl.classList.add("correct");
  feedbackEl.textContent = currentWord.length >= 7 ? "💥 CRUSHED!" : "🐛 Squish!";
  feedbackEl.className = currentWord.length >= 7 ? "fb-crush" : "fb-perfect";

  // Notify main process
  electronAPI.bugHit(currentWord);

  // Next word
  setTimeout(() => {
    inputEl.value = "";
    displayWord(pickWord());
    feedbackEl.textContent = "";
  }, 150);
}

// ── Input handling ──
inputEl.addEventListener("input", () => {
  if (!gameRunning) return;
  updateHighlight();

  if (inputEl.value.toLowerCase() === currentWord.toLowerCase()) {
    crushWord();
  }
});

// ── Start/Restart via keydown ──
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { electronAPI.closeBugGame(); return; }
  if (!gameRunning && startOverlay.classList.contains("hidden") === false) {
    startGame();
    return;
  }
  if (!gameRunning && resultsOverlay.classList.contains("hidden") === false) {
    startGame();
    return;
  }
  // Keep focus on input during game
  if (gameRunning && document.activeElement !== inputEl) {
    inputEl.focus();
  }
});

// ── Prevent losing focus ──
inputEl.addEventListener("blur", () => {
  if (gameRunning) {
    setTimeout(() => inputEl.focus(), 10);
  }
});
