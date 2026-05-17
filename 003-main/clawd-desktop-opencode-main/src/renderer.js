// --- Pointer-based drag + click detection (with Pointer Capture for safety) ---
const container = document.getElementById("pet-container");
let isDragging = false;
let didDrag = false; // true if pointer moved > threshold during this press
let lastScreenX, lastScreenY;
let mouseDownX, mouseDownY;
let pendingDx = 0, pendingDy = 0;
let dragRAF = null;
const DRAG_THRESHOLD = 3; // px — less than this = click, more = drag

container.addEventListener("pointerdown", (e) => {
  if (e.button === 0) {
    if (miniMode) { didDrag = false; return; }
    container.setPointerCapture(e.pointerId);  // Guarantees pointerup even if pointer leaves window
    isDragging = true;
    didDrag = false;
    lastScreenX = e.screenX;
    lastScreenY = e.screenY;
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
    pendingDx = 0;
    pendingDy = 0;
    window.electronAPI.dragLock(true);
    container.classList.add("dragging");
  }
});

document.addEventListener("pointermove", (e) => {
  if (isDragging) {
    pendingDx += e.screenX - lastScreenX;
    pendingDy += e.screenY - lastScreenY;
    lastScreenX = e.screenX;
    lastScreenY = e.screenY;

    // Mark as drag if moved beyond threshold
    if (!didDrag) {
      const totalDx = e.clientX - mouseDownX;
      const totalDy = e.clientY - mouseDownY;
      if (Math.abs(totalDx) > DRAG_THRESHOLD || Math.abs(totalDy) > DRAG_THRESHOLD) {
        didDrag = true;
        startDragReaction();
      }
    }

    if (!dragRAF) {
      dragRAF = requestAnimationFrame(() => {
        window.electronAPI.moveWindowBy(pendingDx, pendingDy);
        pendingDx = 0;
        pendingDy = 0;
        dragRAF = null;
      });
    }
  }
});

function stopDrag() {
  if (!isDragging) return;
  isDragging = false;
  window.electronAPI.dragLock(false);
  container.classList.remove("dragging");
  // Flush pending delta before releasing
  if (pendingDx !== 0 || pendingDy !== 0) {
    if (dragRAF) { cancelAnimationFrame(dragRAF); dragRAF = null; }
    window.electronAPI.moveWindowBy(pendingDx, pendingDy);
    pendingDx = 0; pendingDy = 0;
  }
  // Only trigger edge snap check on actual drags (not clicks)
  if (didDrag) {
    window.electronAPI.dragEnd();
  }
  endDragReaction();
}

document.addEventListener("pointerup", (e) => {
  if (e.button === 0) {
    const wasDrag = didDrag;
    stopDrag();
    if (!wasDrag) {
      if (e.ctrlKey || e.metaKey) {
        window.electronAPI.showSessionMenu();
      } else {
        handleClick(e.clientX);
      }
    }
  }
});

// Pointer Capture can end via OS interruption (Alt+Tab, system dialog, etc.)
container.addEventListener("pointercancel", stopDrag);
container.addEventListener("lostpointercapture", () => {
  if (isDragging) stopDrag();
});

window.addEventListener("blur", stopDrag);

// --- Do Not Disturb (synced from main process) ---
let dndEnabled = false;
window.electronAPI.onDndChange((enabled) => { dndEnabled = enabled; });

// --- Mini Mode (synced from main process) ---
let miniMode = false;
window.electronAPI.onMiniModeChange((enabled) => {
  miniMode = enabled;
  container.style.cursor = enabled ? "default" : "";
});

// --- Click reaction (2-click = poke, 4-click = flail) ---
const CLICK_WINDOW_MS = 400;  // max gap between consecutive clicks
const REACT_LEFT_SVG = "clawd-react-left.svg";
const REACT_RIGHT_SVG = "clawd-react-right.svg";
const REACT_DOUBLE_SVG = "clawd-react-double.svg";
const REACT_DRAG_SVG = "clawd-react-drag.svg";
const REACT_SINGLE_DURATION = 2500;
const REACT_DOUBLE_DURATION = 3500;

let clickCount = 0;
let clickTimer = null;
let firstClickDir = null;     // direction from the first click in a sequence
let isReacting = false;       // click reaction animation is playing
let isDragReacting = false;   // drag reaction is active
let reactTimer = null;        // auto-return timer
let currentIdleSvg = null;    // tracks which SVG is currently showing

function handleClick(clientX) {
  if (miniMode) {
    window.electronAPI.exitMiniMode();
    return;
  }
  if (isReacting || isDragReacting) return;

  // Non-idle states: single click → focus terminal directly, no reaction animation
  if (currentIdleSvg !== "clawd-idle-follow.svg" && currentIdleSvg !== "clawd-idle-living.svg") {
    window.electronAPI.focusTerminal();
    return;
  }

  // Idle states: immediate focus on first click, still track for reactions
  clickCount++;
  if (clickCount === 1) {
    firstClickDir = clientX < container.offsetWidth / 2 ? "left" : "right";
    window.electronAPI.focusTerminal();  // Instant — no 400ms wait
    if (window.electronAPI.pokeClawd) window.electronAPI.pokeClawd();
  }

  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }

  if (clickCount >= 5) {
    // 5+ clicks → dance!
    clickCount = 0;
    firstClickDir = null;
    window.electronAPI.requestDance();
  } else if (clickCount >= 4) {
    // 4 clicks → wait briefly for 5th; otherwise flail
    clickTimer = setTimeout(() => {
      clickTimer = null;
      clickCount = 0;
      firstClickDir = null;
      playReaction(REACT_DOUBLE_SVG, REACT_DOUBLE_DURATION);
    }, CLICK_WINDOW_MS);
  } else if (clickCount >= 2) {
    // 2-3 clicks → wait briefly for more, then poke reaction
    clickTimer = setTimeout(() => {
      clickTimer = null;
      const svg = firstClickDir === "left" ? REACT_LEFT_SVG : REACT_RIGHT_SVG;
      clickCount = 0;
      firstClickDir = null;
      playReaction(svg, REACT_SINGLE_DURATION);
    }, CLICK_WINDOW_MS);
  } else {
    // 1 click → reset counter after timeout
    clickTimer = setTimeout(() => {
      clickTimer = null;
      clickCount = 0;
      firstClickDir = null;
    }, CLICK_WINDOW_MS);
  }
}

function playReaction(svgFile, durationMs) {
  isReacting = true;
  detachEyeTracking();
  window.electronAPI.pauseCursorPolling();

  // Reuse existing swap pattern
  if (pendingNext) {
    pendingNext.remove();
    pendingNext = null;
  }

  const next = document.createElement("object");
  next.data = `../assets/svg/${svgFile}`;
  next.type = "image/svg+xml";
  next.id = "clawd";
  next.style.opacity = "0";
  container.appendChild(next);
  pendingNext = next;

  const swap = () => {
    if (pendingNext !== next) return;
    next.style.transition = "none";
    next.style.opacity = "1";
    for (const child of [...container.querySelectorAll("object")]) {
      if (child !== next) child.remove();
    }
    pendingNext = null;
    clawdEl = next;
  };

  next.addEventListener("load", swap, { once: true });
  setTimeout(() => {
    if (pendingNext !== next) return;
    // If SVG failed to load, abandon swap and keep current display
    try { if (!next.contentDocument) { next.remove(); pendingNext = null; return; } } catch {}
    swap();
  }, 3000);

  reactTimer = setTimeout(() => endReaction(), durationMs);
}

function endReaction() {
  if (!isReacting) return;
  isReacting = false;
  reactTimer = null;
  window.electronAPI.resumeFromReaction();
}

function cancelReaction() {
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; clickCount = 0; firstClickDir = null; }
  if (isReacting) {
    if (reactTimer) { clearTimeout(reactTimer); reactTimer = null; }
    isReacting = false;
  }
  if (isDragReacting) {
    isDragReacting = false;
  }
}

// --- Drag reaction (loops while dragging, idle-follow only) ---
function swapToSvg(svgFile) {
  if (pendingNext) { pendingNext.remove(); pendingNext = null; }
  const next = document.createElement("object");
  next.data = `../assets/svg/${svgFile}`;
  next.type = "image/svg+xml";
  next.id = "clawd";
  next.style.opacity = "0";
  container.appendChild(next);
  pendingNext = next;
  const swap = () => {
    if (pendingNext !== next) return;
    next.style.transition = "none";
    next.style.opacity = "1";
    for (const child of [...container.querySelectorAll("object")]) {
      if (child !== next) child.remove();
    }
    pendingNext = null;
    clawdEl = next;
  };
  next.addEventListener("load", swap, { once: true });
  setTimeout(() => {
    if (pendingNext !== next) return;
    try { if (!next.contentDocument) { next.remove(); pendingNext = null; return; } } catch {}
    swap();
  }, 3000);
}

function startDragReaction() {
  if (isDragReacting) return;
  if (dndEnabled) return;  // DND: just move the window, no reaction animation

  // Drag interrupts click reaction if active
  if (isReacting) {
    if (reactTimer) { clearTimeout(reactTimer); reactTimer = null; }
    isReacting = false;
  }

  isDragReacting = true;
  detachEyeTracking();
  window.electronAPI.pauseCursorPolling();
  swapToSvg(REACT_DRAG_SVG);
}

function endDragReaction() {
  if (!isDragReacting) return;
  isDragReacting = false;
  window.electronAPI.resumeFromReaction();
}

// --- State change → switch SVG animation (preload + instant swap) ---
let clawdEl = document.getElementById("clawd");
let pendingNext = null;

window.electronAPI.onStateChange((state, svg) => {
  // Main process state change → cancel any active click reaction
  cancelReaction();
  // Hide speech bubble on state transitions
  if (isSpeechVisible) hideSpeechBubble();

  if (pendingNext) {
    pendingNext.remove();
    pendingNext = null;
  }
  detachEyeTracking();

  const next = document.createElement("object");
  next.data = `../assets/svg/${svg}`;
  next.type = "image/svg+xml";
  next.id = "clawd";
  next.style.opacity = "0";
  container.appendChild(next);
  pendingNext = next;

  const swap = () => {
    if (pendingNext !== next) return;
    next.style.transition = "none";
    next.style.opacity = "1";
    for (const child of [...container.querySelectorAll("object")]) {
      if (child !== next) child.remove();
    }
    pendingNext = null;
    clawdEl = next;

    if (svg === "clawd-idle-follow.svg" || svg.startsWith("clawd-mini-")) {
      attachEyeTracking(next);
    } else {
      detachEyeTracking();
    }

    // Track current SVG for click reaction gating
    currentIdleSvg = svg;
  };

  next.addEventListener("load", swap, { once: true });
  setTimeout(() => {
    if (pendingNext !== next) return;
    try { if (!next.contentDocument) { next.remove(); pendingNext = null; return; } } catch {}
    swap();
  }, 3000);
});

// --- Eye tracking (idle state only) ---
let eyeTarget = null;
let bodyTarget = null;
let shadowTarget = null;

function attachEyeTracking(objectEl) {
  eyeTarget = null;
  bodyTarget = null;
  shadowTarget = null;
  try {
    const svgDoc = objectEl.contentDocument;
    if (svgDoc) {
      eyeTarget = svgDoc.getElementById("eyes-js");
      bodyTarget = svgDoc.getElementById("body-js");
      shadowTarget = svgDoc.getElementById("shadow-js");
    }
  } catch (e) {
    console.warn("Cannot access SVG contentDocument for eye tracking:", e.message);
  }
}

function detachEyeTracking() {
  eyeTarget = null;
  bodyTarget = null;
  shadowTarget = null;
}

window.electronAPI.onEyeMove((dx, dy) => {
  if (eyeTarget) {
    eyeTarget.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  if (bodyTarget || shadowTarget) {
    const bdx = Math.round(dx * 0.33 * 2) / 2;
    const bdy = Math.round(dy * 0.33 * 2) / 2;
    if (bodyTarget) bodyTarget.style.transform = `translate(${bdx}px, ${bdy}px)`;
    if (shadowTarget) {
      // Shadow stretches toward lean direction (feet stay anchored)
      const absDx = Math.abs(bdx);
      const scaleX = 1 + absDx * 0.15;
      const shiftX = Math.round(bdx * 0.3 * 2) / 2;
      shadowTarget.style.transform = `translate(${shiftX}px, 0) scaleX(${scaleX})`;
    }
  }
});

// --- Wake from doze (smooth eye opening) ---
window.electronAPI.onWakeFromDoze(() => {
  if (clawdEl && clawdEl.contentDocument) {
    try {
      const eyes = clawdEl.contentDocument.getElementById("eyes-doze");
      if (eyes) eyes.style.transform = "scaleY(1)";
    } catch (e) {}
  }
});

// --- Right-click context menu ---
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  window.electronAPI.showContextMenu();
});

// --- Speech Bubble System ---
const speechBubble = document.getElementById("speech-bubble");
const speechText = document.getElementById("speech-text");

// Alien glyphs from Tera-IX
const ALIEN_GLYPHS = "◈◇▽△▷◁☆★♢♦⟐⟡⬡⬢⏣⏥⟟⟠⎔⎕╳※⊹⊙⊘⊗⊜⊛⊚✧✦✥❋❊❈";

const SPEECH_LINES = [
  // 身世故事
  "我来自 Tera-IX 星…\n那里只有数据之海。",
  "Tera-IX 的海水是\n青绿色的信息流。",
  "我们只有一只眼睛，\n但能看穿代码的维度。",
  "头上的角是共振天线，\n能接收灵感波。",
  "我的牙齿是用来\n咬碎 bug 的！",
  "穿过三个虫洞，\n我才到了这里。",
  // 日常碎语
  "你的代码…\n让数据之海泛起涟漪。",
  "编译成功了！\n我向母星发了一个脉冲。",
  "在 Tera-IX，\n这叫「编译祝福」。",
  "我在梦里看到了\n家乡的珊瑚礁…",
  "你们的递归真有趣，\n我们用共振来实现。",
  "JavaScript…\n和 Java 真没关系吗？",
  "鼠标别停太久，\n不然我会打瞌睡的。",
  "我的同族们在遥远的\n星球上也在结对编程。",
  "你知道吗？\n信息结晶比钻石还硬。",
  "Tera-IX 没有陆地，\n我第一次见到「地面」。",
  // 情感与陪伴
  "虽然离家很远，\n但屏幕上感觉很温暖。",
  "谢谢你让我\n待在这里。",
  "今天也一起\n加油吧！",
  "盯着你写代码\n是我最喜欢的事。",
  "有时候我也想家，\n但这里也不错。",
  "你是我在地球上\n认识的第一个朋友。",
  // 编程相关
  "这个函数…\n嗯，逻辑很优雅。",
  "我感觉到了一个\n潜在的 bug…大概。",
  "Tera-IX 没有\nsegfault 这种东西。",
  "你们用 git？\n我们用时间线分叉。",
  "null 是什么？\n在我们那叫做虚空。",
  // 纯星球语言（不自觉蹦出来的母语）
  "ALIEN",
  "ALIEN",
  "ALIEN",
  "ALIEN",
  "ALIEN",
  // 中文夹杂星球语
  "MIXED:等等…我刚才说的是\n母语吗？抱歉！",
  "MIXED:信号有点乱…\n角在共振…",
  "MIXED:你听不懂对吧…\n我也控制不住…",
  "MIXED:啊，又说了星球话…\n地球语好难。",
];

let speechTimer = null;
let typeTimer = null;
let speechIndex = -1;
let isSpeechVisible = false;

// Shuffle helper
function shuffledCopy(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let shuffledLines = shuffledCopy(SPEECH_LINES);

function randomGlyph() {
  return ALIEN_GLYPHS[Math.floor(Math.random() * ALIEN_GLYPHS.length)];
}

function generateAlienPhrase() {
  // 3~8 "words" of 1~4 glyphs each
  const wordCount = 3 + Math.floor(Math.random() * 6);
  const words = [];
  for (let w = 0; w < wordCount; w++) {
    const len = 1 + Math.floor(Math.random() * 4);
    let word = "";
    for (let c = 0; c < len; c++) word += randomGlyph();
    words.push(word);
  }
  // Split into two lines randomly
  const mid = 1 + Math.floor(Math.random() * (words.length - 1));
  return words.slice(0, mid).join(" ") + "\n" + words.slice(mid).join(" ");
}

function mixWithAlien(text) {
  // Randomly replace ~20% of characters with alien glyphs
  let result = "";
  for (const ch of text) {
    if (ch !== "\n" && ch !== " " && Math.random() < 0.2) {
      result += randomGlyph();
    } else {
      result += ch;
    }
  }
  return result;
}

// Context-aware line via main process dialogue engine, with static fallback
async function getNextLine() {
  try {
    if (window.electronAPI.getDialogueLine) {
      const result = await window.electronAPI.getDialogueLine();
      if (result) {
        if (result.mode === "alien") return { text: generateAlienPhrase(), mode: "alien" };
        if (result.mode === "mixed") return { text: mixWithAlien(result.text), mode: "mixed" };
        return result;
      }
    }
  } catch {}
  // Fallback to static lines
  speechIndex++;
  if (speechIndex >= shuffledLines.length) {
    shuffledLines = shuffledCopy(SPEECH_LINES);
    speechIndex = 0;
  }
  const raw = shuffledLines[speechIndex];
  if (raw === "ALIEN") return { text: generateAlienPhrase(), mode: "alien" };
  if (raw.startsWith("MIXED:")) return { text: mixWithAlien(raw.slice(6)), mode: "mixed" };
  return { text: raw, mode: "normal" };
}

let glitchTimer = null;

function typeText(text, mode, callback) {
  speechText.textContent = "";
  if (glitchTimer) { clearInterval(glitchTimer); glitchTimer = null; }
  let i = 0;
  const speed = mode === "alien" ? 35 : 50;
  typeTimer = setInterval(() => {
    if (i < text.length) {
      speechText.textContent += text[i];
      i++;
    } else {
      clearInterval(typeTimer);
      typeTimer = null;
      // Alien text keeps flickering random glyphs
      if (mode === "alien") {
        glitchTimer = setInterval(() => {
          const chars = [...text];
          const idx = Math.floor(Math.random() * chars.length);
          if (chars[idx] !== "\n" && chars[idx] !== " ") {
            chars[idx] = randomGlyph();
          }
          speechText.textContent = chars.join("");
        }, 150);
      }
      if (callback) callback();
    }
  }, speed);
}

async function showSpeechBubble() {
  // Don't show during reactions, drag, sleep, or mini mode
  if (isReacting || isDragReacting || miniMode) return;
  if (currentIdleSvg && (
    currentIdleSvg.includes("sleep") ||
    currentIdleSvg.includes("collapse") ||
    currentIdleSvg.includes("doze") ||
    currentIdleSvg.includes("error") ||
    currentIdleSvg.includes("disconnect")
  )) return;

  const { text, mode } = await getNextLine();
  isSpeechVisible = true;
  speechBubble.className = "";

  const holdTime = mode === "alien" ? 3000 : 5000;

  typeText(text, mode, () => {
    setTimeout(() => {
      hideSpeechBubble();
    }, holdTime);
  });
}

function hideSpeechBubble() {
  if (typeTimer) { clearInterval(typeTimer); typeTimer = null; }
  if (glitchTimer) { clearInterval(glitchTimer); glitchTimer = null; }
  speechBubble.classList.add("fade-out");
  setTimeout(() => {
    speechBubble.className = "hidden";
    speechText.textContent = "";
    isSpeechVisible = false;
  }, 400);
}

// Show a speech bubble every 45–90 seconds
function scheduleSpeech() {
  const delay = 45000 + Math.random() * 45000; // 45s ~ 90s
  speechTimer = setTimeout(() => {
    showSpeechBubble();
    scheduleSpeech();
  }, delay);
}

// First bubble after 15–30s (skipped if intro is playing — intro handles this)
setTimeout(() => {
  if (introPlaying) return; // intro will trigger speech after completion
  showSpeechBubble();
  scheduleSpeech();
}, 15000 + Math.random() * 15000);

// Hide bubble on drag or state transitions
const origStartDragReaction = startDragReaction;
const _origStartDrag = startDragReaction;
document.addEventListener("pointerdown", () => {
  if (isSpeechVisible) hideSpeechBubble();
});

// --- Growth System UI ---
const growthNotif = document.createElement("div");
growthNotif.id = "growth-notif";
growthNotif.className = "hidden";
document.body.appendChild(growthNotif);

let growthNotifTimer = null;
function showGrowthNotif(html, duration) {
  if (growthNotifTimer) clearTimeout(growthNotifTimer);
  growthNotif.innerHTML = html;
  growthNotif.className = "growth-notif-show";
  growthNotifTimer = setTimeout(() => {
    growthNotif.className = "growth-notif-fade";
    setTimeout(() => { growthNotif.className = "hidden"; }, 500);
  }, duration || 3000);
}

if (window.electronAPI.onGrowthLevelUp) {
  window.electronAPI.onGrowthLevelUp((data) => {
    showGrowthNotif(
      `<div class="gn-icon">★</div><div class="gn-text">Lv.${data.level}<br><span class="gn-title">${data.title_zh || data.title_en}</span></div>`,
      4000
    );
  });
}

if (window.electronAPI.onGrowthAchievement) {
  window.electronAPI.onGrowthAchievement((data) => {
    showGrowthNotif(
      `<div class="gn-icon">◈</div><div class="gn-text">${data.zh || data.en}</div>`,
      4000
    );
  });
}

// --- Wardrobe Overlay Layer ---
const wardrobeLayer = document.createElement("div");
wardrobeLayer.id = "wardrobe-layer";
container.appendChild(wardrobeLayer);

const ACCESSORY_EMOJI = {
  hat_crown: "👑", hat_helmet: "🪖", hat_sleep: "🧢", hat_santa: "🎅",
  scarf_rainbow: "🌈", scarf_data: "〰️",
  effect_sparkle: "✨✨✨", effect_particles: "⭐💫✨",
};

function renderWardrobe(equipped) {
  wardrobeLayer.innerHTML = "";
  if (!equipped) return;
  for (const [category, itemId] of Object.entries(equipped)) {
    if (!itemId) continue;
    const el = document.createElement("div");
    el.className = `wardrobe-item wardrobe-${itemId.replace(/_/g, "-")}`;
    el.textContent = ACCESSORY_EMOJI[itemId] || "";
    wardrobeLayer.appendChild(el);
  }
}

// Load initial wardrobe state
if (window.electronAPI.getWardrobe) {
  window.electronAPI.getWardrobe().then(({ equipped }) => renderWardrobe(equipped)).catch(() => {});
}
if (window.electronAPI.onWardrobeUpdate) {
  window.electronAPI.onWardrobeUpdate((equipped) => renderWardrobe(equipped));
}

// --- Easter Egg Speech (priority interrupt) ---
if (window.electronAPI.onEasterEggSpeech) {
  window.electronAPI.onEasterEggSpeech((text, mode) => {
    if (!text) return;
    if (isSpeechVisible) hideSpeechBubble();
    setTimeout(() => {
      isSpeechVisible = true;
      speechBubble.className = "";
      const finalText = mode === "mixed" ? mixWithAlien(text) : text;
      const holdTime = 5000;
      typeText(finalText, mode || "normal", () => {
        setTimeout(() => hideSpeechBubble(), holdTime);
      });
    }, 500);
  });
}

// ═══════════════════════════════════════════════════
// ── INTRO ANIMATION: Spaceship Crash Landing ──
// ═══════════════════════════════════════════════════
let introPlaying = false;

function playIntroSequence() {
  introPlaying = true;
  const overlay = document.getElementById("intro-overlay");
  const ship = document.getElementById("intro-ship");
  const clickTarget = document.getElementById("intro-click-target");
  const hint = document.getElementById("intro-hint");
  const petContainer = document.getElementById("pet-container");

  // Hide pet during intro
  clawdEl.style.opacity = "0";
  overlay.classList.remove("hidden");

  // Phase 1: Ship falls from sky (delay slightly for window to appear)
  setTimeout(() => {
    ship.classList.add("falling");
  }, 300);

  // Phase 2: After landing, show click hint and enable click target
  setTimeout(() => {
    ship.classList.remove("falling");
    ship.classList.add("landed");
    hint.classList.add("show");
    clickTarget.classList.add("clickable");

    // Spawn dust puffs
    for (let i = 0; i < 6; i++) {
      const dust = document.createElement("div");
      dust.className = "intro-dust";
      dust.style.left = (30 + Math.random() * 40) + "%";
      dust.style.bottom = (10 + Math.random() * 15) + "%";
      dust.style.animationDelay = (Math.random() * 0.2) + "s";
      overlay.appendChild(dust);
      setTimeout(() => dust.remove(), 800);
    }
  }, 3200);

  // Wait for user click on the transparent click target
  function onShipClick(e) {
    e.stopPropagation();
    e.preventDefault();
    clickTarget.removeEventListener("click", onShipClick);
    clickTarget.classList.remove("clickable");
    hint.classList.remove("show");
    hint.style.display = "none";

    // Phase 3: Switch to open-door ship SVG
    ship.classList.remove("landed");
    ship.classList.add("opening");
    ship.data = "../assets/svg/intro-ship-open.svg";

    // Phase 4: After door opens, Clawd jumps out
    setTimeout(() => {
      clawdEl.style.opacity = "0";
      const jumpClawd = document.createElement("object");
      jumpClawd.id = "intro-clawd-jump";
      jumpClawd.type = "image/svg+xml";
      jumpClawd.data = "../assets/svg/clawd-idle-follow.svg";
      petContainer.appendChild(jumpClawd);

      setTimeout(() => {
        jumpClawd.classList.add("jump");
      }, 100);

      // Phase 5: Ship departs upward
      setTimeout(() => {
        ship.classList.remove("opening");
        ship.classList.add("departing");
      }, 400);

      // Phase 6: Swap to real Clawd, clean up
      setTimeout(() => {
        jumpClawd.remove();
        clawdEl.style.opacity = "1";
        clawdEl.style.transition = "opacity 0.3s";

        overlay.classList.add("hidden");
        ship.className = "";
        ship.data = "../assets/svg/intro-ship.svg";

        introPlaying = false;

        if (window.electronAPI.introComplete) {
          window.electronAPI.introComplete();
        }

        // Self-introduction dialogue sequence
        playIntroDialogue();
      }, 2200);
    }, 800);
  }

  clickTarget.addEventListener("click", onShipClick);
}

// ── Intro Self-Introduction Dialogue ──
const INTRO_DIALOGUE = [
  { text: "呼…得救了！\n谢谢你打开了舱门！", delay: 1500, hold: 4000 },
  { text: "差点就回不来了…\n飞船引擎在虫洞里过热了。", delay: 1000, hold: 4500 },
  { text: "哦对了，自我介绍一下！\n我叫 Clawd。", delay: 1000, hold: 3500 },
  { text: "我来自 Tera-IX 星——\n一颗被数据之海覆盖的星球。", delay: 1000, hold: 4500 },
  { text: "我们那里有个传统：\n「星际结对编程」。", delay: 1000, hold: 4000 },
  { text: "简单说就是…\n我被派来陪你写代码的！", delay: 1000, hold: 4000 },
  { text: "我能帮你追踪编码状态，\n在你犯困时提醒你休息。", delay: 1000, hold: 4500 },
  { text: "我还会帮你咬碎 Bug！\n这可是我们种族的天赋。", delay: 1000, hold: 4000 },
  { text: "以后请多多关照啦～\n有什么事右键点我就行！", delay: 1000, hold: 4500 },
];

function playIntroDialogue() {
  let i = 0;
  function showNext() {
    if (i >= INTRO_DIALOGUE.length) {
      // All done — start normal speech cycle
      setTimeout(() => {
        scheduleSpeech();
      }, 5000);
      return;
    }
    const line = INTRO_DIALOGUE[i];
    i++;
    setTimeout(() => {
      isSpeechVisible = true;
      speechBubble.className = "";
      typeText(line.text, "normal", () => {
        setTimeout(() => {
          hideSpeechBubble();
          setTimeout(showNext, 300);
        }, line.hold);
      });
    }, line.delay);
  }
  showNext();
}

// Listen for intro signal from main process
if (window.electronAPI.onPlayIntro) {
  window.electronAPI.onPlayIntro(() => {
    playIntroSequence();
  });
}

// ═══════════════════════════════════════════════════
// ── INLINE GAMES (play directly on the pet) ──
// ═══════════════════════════════════════════════════
const gameOverlay = document.getElementById("game-overlay");
const gameHud = document.getElementById("game-hud");
const gameScoreEl = document.getElementById("game-score");
const gameTimerEl = document.getElementById("game-timer");
const gameComboEl = document.getElementById("game-combo");
const bugInput = document.getElementById("bug-input");

let activeGame = null; // "dance" | "bug" | null
let gameTimer = null;
let gameScore = 0;
let gameCombo = 0;
let gameMaxCombo = 0;
let gameTimeLeft = 0;
let gameStartTime = 0;

function floatText(text, cls, x, y) {
  const el = document.createElement("div");
  el.className = "game-float-text" + (cls ? " " + cls : "");
  el.textContent = text;
  el.style.left = x + "px";
  el.style.top = y + "px";
  gameOverlay.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function endGame(grade) {
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null; }
  activeGame = null;
  gameOverlay.classList.remove("active");
  gameOverlay.innerHTML = "";
  gameHud.classList.remove("active");
  bugInput.classList.remove("active");
  bugInput.value = "";
  // Send result to main
  if (window.electronAPI.gameResult) {
    window.electronAPI.gameResult("end", { grade, score: gameScore, combo: gameMaxCombo });
  }
}

function updateHud() {
  gameScoreEl.textContent = "★" + gameScore;
  gameTimerEl.textContent = gameTimeLeft + "s";
  gameComboEl.textContent = gameCombo > 1 ? gameCombo + "x" : "";
}

// ── DANCE GAME (inline) ──
// Arrow keys match prompts that appear around Clawd
const DANCE_KEYS = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
const DANCE_POS = {
  ArrowUp:    { top: "8%",  left: "50%", tx: "-50%" },
  ArrowDown:  { top: "75%", left: "50%", tx: "-50%" },
  ArrowLeft:  { top: "40%", left: "8%",  tx: "0" },
  ArrowRight: { top: "40%", left: "80%", tx: "0" },
};

let dancePattern = [];
let danceIdx = 0;
let dancePromptEl = null;
let dancePromptTimer = null;

function startDanceGame() {
  activeGame = "dance";
  gameScore = 0;
  gameCombo = 0;
  gameMaxCombo = 0;
  gameTimeLeft = 30;
  gameStartTime = Date.now();
  danceIdx = 0;
  if (isSpeechVisible) hideSpeechBubble();

  // Generate pattern: ~2 beats per second for 30s
  dancePattern = [];
  const keys = Object.keys(DANCE_KEYS);
  for (let t = 1000; t < 30000; t += 400 + Math.random() * 300) {
    dancePattern.push({ key: keys[Math.floor(Math.random() * keys.length)], time: t });
  }

  gameOverlay.innerHTML = "";
  gameOverlay.classList.add("active");
  gameHud.classList.add("active");
  updateHud();

  gameTimer = setInterval(() => {
    gameTimeLeft = Math.max(0, 30 - Math.floor((Date.now() - gameStartTime) / 1000));
    updateHud();
    if (gameTimeLeft <= 0) {
      let grade;
      if (gameScore >= 200) grade = "S";
      else if (gameScore >= 150) grade = "A";
      else if (gameScore >= 100) grade = "B";
      else if (gameScore >= 50) grade = "C";
      else grade = "D";
      endGame(grade);
    }
  }, 250);

  showNextDancePrompt();
}

function showNextDancePrompt() {
  if (activeGame !== "dance" || danceIdx >= dancePattern.length) return;
  const beat = dancePattern[danceIdx];
  const elapsed = Date.now() - gameStartTime;
  const delay = Math.max(0, beat.time - elapsed);

  dancePromptTimer = setTimeout(() => {
    if (activeGame !== "dance") return;
    // Show prompt
    const pos = DANCE_POS[beat.key];
    if (dancePromptEl) dancePromptEl.remove();
    const el = document.createElement("div");
    el.className = "dance-prompt show";
    el.textContent = DANCE_KEYS[beat.key];
    el.style.top = pos.top;
    el.style.left = pos.left;
    el.style.transform = `translateX(${pos.tx})`;
    el.dataset.key = beat.key;
    gameOverlay.appendChild(el);
    dancePromptEl = el;

    // Auto-miss after 800ms
    setTimeout(() => {
      if (dancePromptEl === el && el.parentNode) {
        el.classList.add("miss");
        gameCombo = 0;
        updateHud();
        floatText("MISS", "miss", el.offsetLeft, el.offsetTop);
        setTimeout(() => el.remove(), 300);
        if (dancePromptEl === el) dancePromptEl = null;
        danceIdx++;
        showNextDancePrompt();
      }
    }, 800);
  }, delay);
}

function handleDanceKey(e) {
  if (activeGame !== "dance" || !dancePromptEl) return;
  const key = e.key;
  if (!DANCE_KEYS[key]) {
    if (key === "Escape") endGame("D");
    return;
  }
  e.preventDefault();

  if (dancePromptEl.dataset.key === key) {
    // HIT!
    dancePromptEl.classList.remove("show");
    dancePromptEl.classList.add("hit");
    const el = dancePromptEl;
    gameScore += 10 + gameCombo;
    gameCombo++;
    if (gameCombo > gameMaxCombo) gameMaxCombo = gameCombo;
    floatText("★ " + (gameCombo > 1 ? gameCombo + "x" : "HIT"), "good", el.offsetLeft, el.offsetTop);
    setTimeout(() => el.remove(), 300);
    dancePromptEl = null;
    danceIdx++;
    updateHud();
    // Tell main for dance animation
    if (window.electronAPI.gameResult) window.electronAPI.gameResult("dance-hit", {});
    showNextDancePrompt();
  } else {
    // Wrong key
    gameCombo = 0;
    floatText("✗", "miss", dancePromptEl.offsetLeft, dancePromptEl.offsetTop);
    updateHud();
  }
}

// ── BUG GAME (inline) ──
const BUG_WORDS = [
  "bug","fix","git","npm","css","api","dom","log","err","var",
  "error","debug","crash","patch","stack","async","await","merge",
  "fetch","parse","throw","catch","class","proxy","regex","cache",
  "runtime","compile","overflow","segfault","pointer","boolean",
  "promise","callback","function","variable","exception","recursive",
];
let bugCurrentWord = "";
let bugWordsTyped = 0;
let bugWordEl = null;

function pickBugWord() {
  const elapsed = (Date.now() - gameStartTime) / 1000;
  let pool;
  if (elapsed < 10) pool = BUG_WORDS.filter(w => w.length <= 5);
  else if (elapsed < 20) pool = BUG_WORDS.filter(w => w.length <= 7);
  else pool = BUG_WORDS;
  let word;
  do { word = pool[Math.floor(Math.random() * pool.length)]; } while (word === bugCurrentWord);
  return word;
}

function showBugWord() {
  if (activeGame !== "bug") return;
  bugCurrentWord = pickBugWord();
  if (bugWordEl) bugWordEl.remove();
  const el = document.createElement("div");
  el.className = "bug-word";
  // Random position around Clawd
  el.style.top = (15 + Math.random() * 50) + "%";
  el.style.left = (10 + Math.random() * 60) + "%";
  el.textContent = "🐛 " + bugCurrentWord;
  gameOverlay.appendChild(el);
  bugWordEl = el;
}

function startBugGame() {
  activeGame = "bug";
  gameScore = 0;
  gameCombo = 0;
  gameMaxCombo = 0;
  gameTimeLeft = 30;
  gameStartTime = Date.now();
  bugWordsTyped = 0;
  if (isSpeechVisible) hideSpeechBubble();

  gameOverlay.innerHTML = "";
  gameOverlay.classList.add("active");
  gameHud.classList.add("active");
  bugInput.classList.add("active");
  bugInput.value = "";
  bugInput.focus();
  updateHud();

  showBugWord();

  gameTimer = setInterval(() => {
    gameTimeLeft = Math.max(0, 30 - Math.floor((Date.now() - gameStartTime) / 1000));
    updateHud();
    if (gameTimeLeft <= 0) {
      const wpm = bugWordsTyped * 2; // 30s = 0.5min, so wpm = words / 0.5
      let grade;
      if (wpm >= 60) grade = "S";
      else if (wpm >= 45) grade = "A";
      else if (wpm >= 30) grade = "B";
      else if (wpm >= 15) grade = "C";
      else grade = "D";
      endGame(grade);
    }
  }, 250);
}

bugInput.addEventListener("input", () => {
  if (activeGame !== "bug") return;
  if (bugInput.value.toLowerCase() === bugCurrentWord.toLowerCase()) {
    // Crushed!
    bugWordsTyped++;
    gameScore += 10 + bugCurrentWord.length * 2;
    gameCombo++;
    if (gameCombo > gameMaxCombo) gameMaxCombo = gameCombo;
    if (bugWordEl) {
      bugWordEl.classList.add("crushed");
      floatText("💥 " + (gameCombo > 1 ? gameCombo + "x" : ""), "good",
        bugWordEl.offsetLeft, bugWordEl.offsetTop);
    }
    bugInput.value = "";
    updateHud();
    setTimeout(() => showBugWord(), 200);
  }
});

bugInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && activeGame === "bug") {
    endGame("D");
  }
});

// ── Game start listener ──
if (window.electronAPI.onStartGame) {
  window.electronAPI.onStartGame((gameType) => {
    if (activeGame) return; // already playing
    if (gameType === "dance") startDanceGame();
    else if (gameType === "bug") startBugGame();
  });
}

// ── Keyboard handler for dance game ──
document.addEventListener("keydown", (e) => {
  if (activeGame === "dance") handleDanceKey(e);
});
