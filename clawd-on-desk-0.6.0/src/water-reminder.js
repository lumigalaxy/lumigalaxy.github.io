// src/water-reminder.js — Pomodoro-style hydration reminder for the alien theme.
//
// Schedules a single rolling timeout (no setInterval drift). When fired:
//   • check the active theme — only proceed if `alien` is selected
//   • check quiet hours — if now is inside [quietStart, quietEnd], skip and
//     reschedule for the END of quiet hours
//   • else: ensure pet is visible/awake, switch pet to `notification` state,
//     and pop a small green "💧 HYDRATE!" bubble above the alien with
//     ✓ DONE and ⏱ +N min buttons. Auto-dismiss after 60s.
//
// Buttons:
//   ✓ DONE  → close bubble, reschedule for the full interval
//   ⏱ +N    → close bubble, reschedule for snoozeMinutes
//   (auto)  → if user ignores it, reschedule for snoozeMinutes
"use strict";

const { BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";
const isWin = process.platform === "win32";

const BUBBLE_W = 280;
const BUBBLE_H = 130;
const TAIL_RESERVE = 14;
const PET_GAP = 6;
const AUTO_DISMISS_MS = 60_000;

let ctxRef = null;
let bubbleWin = null;
let scheduledTimer = null;
let autoDismissTimer = null;
let cfg = null;
let lastFiredAt = 0;
let ipcWired = false;

// ── Public API ──

function init(ctx) {
  ctxRef = ctx;
  if (!ipcWired) {
    _wireIpc();
    ipcWired = true;
  }
  cfg = _readConfig();
  _scheduleNext(_msFromMinutes(cfg.intervalMinutes));
}

function updateConfig() {
  const prev = cfg || {};
  cfg = _readConfig();
  // If disabled, stop everything
  if (!cfg.enabled) {
    _clearTimer();
    _closeBubble();
    return;
  }
  // If just-enabled or interval changed, reschedule from now
  if (!prev.enabled || prev.intervalMinutes !== cfg.intervalMinutes) {
    _scheduleNext(_msFromMinutes(cfg.intervalMinutes));
  }
}

// Manual trigger (used by tray menu or settings "Test now").
function triggerNow() {
  if (!_isAlienTheme()) return;
  _showBubble();
}

function reposition() {
  if (!bubbleWin || bubbleWin.isDestroyed()) return;
  const pet = _getPetBounds();
  if (!pet) return;
  const pos = _calcPosition(pet);
  bubbleWin.setBounds({ x: pos.x, y: pos.y, width: BUBBLE_W, height: BUBBLE_H });
  bubbleWin.webContents.send("water-bubble-tail-anchor", _calcTailAnchor(pet, pos));
}

function isBubbleOpen() {
  return bubbleWin && !bubbleWin.isDestroyed();
}

function shutdown() {
  _clearTimer();
  _closeBubble();
}

// ── Scheduling ──

function _scheduleNext(delayMs) {
  _clearTimer();
  if (!cfg || !cfg.enabled) return;
  scheduledTimer = setTimeout(() => {
    scheduledTimer = null;
    _onTick();
  }, Math.max(1000, delayMs));
}

function _clearTimer() {
  if (scheduledTimer) { clearTimeout(scheduledTimer); scheduledTimer = null; }
}

function _onTick() {
  // Re-read config on every tick so settings changes apply.
  cfg = _readConfig();
  if (!cfg.enabled) return;

  // Only nag under the alien theme.
  if (!_isAlienTheme()) {
    _scheduleNext(_msFromMinutes(cfg.intervalMinutes));
    return;
  }

  // If pet is hidden or in DnD/sleep, defer until the user is back.
  if (_isPetUnreachable()) {
    _scheduleNext(_msFromMinutes(5));
    return;
  }

  // Quiet hours: skip and resume right after quietEnd.
  const quietRemainingMs = _quietHoursRemainingMs(new Date(), cfg.quietStart, cfg.quietEnd);
  if (quietRemainingMs > 0) {
    _scheduleNext(quietRemainingMs + 1000);
    return;
  }

  _showBubble();
}

// Returns >0 if `now` is inside the quiet window, value = ms until window ends.
// Handles wrap-around (e.g. 22:00 → 08:00 spans midnight).
function _quietHoursRemainingMs(now, startStr, endStr) {
  if (!_isHHMM(startStr) || !_isHHMM(endStr)) return 0;
  if (startStr === endStr) return 0; // zero-length window = always allow

  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today.getTime() + sh * 3600_000 + sm * 60_000);
  let end   = new Date(today.getTime() + eh * 3600_000 + em * 60_000);

  if (end > start) {
    // Same-day window (e.g. 12:00 → 14:00)
    if (now >= start && now < end) return end.getTime() - now.getTime();
    return 0;
  } else {
    // Wraps midnight (e.g. 22:00 → 08:00). Inside if now ≥ start OR now < end.
    if (now >= start) {
      // After the start point — quiet ends at end the *next* calendar day.
      const endTomorrow = new Date(end.getTime() + 24 * 3600_000);
      return endTomorrow.getTime() - now.getTime();
    }
    if (now < end) {
      return end.getTime() - now.getTime();
    }
    return 0;
  }
}

// ── Window ──

function _showBubble() {
  if (bubbleWin && !bubbleWin.isDestroyed()) {
    bubbleWin.show();
    bubbleWin.focus();
    _resetAutoDismiss();
    return;
  }
  const pet = _getPetBounds();
  if (!pet) {
    // Pet not ready — try again in a minute.
    _scheduleNext(60_000);
    return;
  }

  lastFiredAt = Date.now();

  // Switch pet to notification state to draw attention (best effort).
  try {
    if (ctxRef && typeof ctxRef.win !== "undefined" && ctxRef.win && !ctxRef.win.isDestroyed()) {
      ctxRef.win.webContents.send("clawd-state", "notification");
    }
  } catch {}

  const pos = _calcPosition(pet);
  bubbleWin = new BrowserWindow({
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    alwaysOnTop: !isMac,
    width: BUBBLE_W,
    height: BUBBLE_H,
    x: pos.x,
    y: pos.y,
    ...(isMac ? { type: "panel" } : {}),
    ...(isLinux ? { type: "splash" } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload-water-bubble.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isWin) bubbleWin.setAlwaysOnTop(true, "pop-up-menu");
  if (isMac) bubbleWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  bubbleWin.loadFile(path.join(__dirname, "water-bubble.html"));

  bubbleWin.once("ready-to-show", () => {
    if (!bubbleWin || bubbleWin.isDestroyed()) return;
    bubbleWin.show();
    bubbleWin.webContents.send("water-bubble-bootstrap", {
      lang: ctxRef && ctxRef.lang ? ctxRef.lang : "en",
      snoozeMinutes: cfg.snoozeMinutes,
    });
    bubbleWin.webContents.send("water-bubble-tail-anchor", _calcTailAnchor(pet, pos));
    _resetAutoDismiss();
  });

  bubbleWin.on("closed", () => { bubbleWin = null; });
}

function _closeBubble() {
  _clearAutoDismiss();
  if (bubbleWin && !bubbleWin.isDestroyed()) {
    try { bubbleWin.close(); } catch {}
  }
  bubbleWin = null;
}

function _resetAutoDismiss() {
  _clearAutoDismiss();
  autoDismissTimer = setTimeout(() => {
    autoDismissTimer = null;
    if (!bubbleWin || bubbleWin.isDestroyed()) return;
    // Treat ignore-on-timeout as a snooze: defer for snoozeMinutes.
    _closeBubble();
    _scheduleNext(_msFromMinutes(cfg.snoozeMinutes));
  }, AUTO_DISMISS_MS);
}

function _clearAutoDismiss() {
  if (autoDismissTimer) { clearTimeout(autoDismissTimer); autoDismissTimer = null; }
}

// ── Positioning ──

function _getPetBounds() {
  if (!ctxRef || typeof ctxRef.getPetWindowBounds !== "function") return null;
  try {
    const b = ctxRef.getPetWindowBounds();
    if (!b || !Number.isFinite(b.x)) return null;
    return b;
  } catch { return null; }
}

function _calcPosition(pet) {
  const cx = Math.round(pet.x + pet.width / 2 - BUBBLE_W / 2);
  const y = pet.y - BUBBLE_H + TAIL_RESERVE - PET_GAP;
  return _clampToWorkArea(cx, y, pet);
}

function _calcTailAnchor(pet, winPos) {
  const petCenterX = pet.x + pet.width / 2;
  const relX = petCenterX - winPos.x;
  return { tailX: Math.max(24, Math.min(BUBBLE_W - 24, relX)) };
}

function _clampToWorkArea(x, y, pet) {
  try {
    const display = screen.getDisplayNearestPoint({
      x: pet.x + Math.round(pet.width / 2),
      y: pet.y + Math.round(pet.height / 2),
    });
    const wa = display.workArea;
    return {
      x: Math.max(wa.x + 4, Math.min(wa.x + wa.width - BUBBLE_W - 4, x)),
      y: Math.max(wa.y + 4, Math.min(wa.y + wa.height - BUBBLE_H - 4, y)),
    };
  } catch {
    return { x, y };
  }
}

// ── Helpers ──

function _isAlienTheme() {
  try {
    if (ctxRef && typeof ctxRef.getActiveThemeId === "function") {
      const id = ctxRef.getActiveThemeId();
      return id === "alien" || (typeof id === "string" && id.startsWith("alien-"));
    }
  } catch {}
  return false;
}

function _isPetUnreachable() {
  if (!ctxRef) return true;
  if (ctxRef.petHidden) return true;
  if (ctxRef.doNotDisturb) return true;
  return false;
}

function _readConfig() {
  const defaults = {
    enabled: true,
    intervalMinutes: 30,
    quietStart: "22:00",
    quietEnd: "08:00",
    snoozeMinutes: 5,
  };
  try {
    const snap = ctxRef && ctxRef.settings && ctxRef.settings.getSnapshot
      ? ctxRef.settings.getSnapshot() : null;
    if (snap && snap.waterReminder) return { ...defaults, ...snap.waterReminder };
  } catch {}
  return defaults;
}

function _msFromMinutes(m) {
  return Math.max(1, Number(m) || 0) * 60_000;
}

function _isHHMM(s) {
  return typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

// ── IPC ──

function _wireIpc() {
  ipcMain.on("water-bubble-action", (_e, action) => {
    if (action === "done") {
      _closeBubble();
      _scheduleNext(_msFromMinutes(cfg.intervalMinutes));
    } else if (action === "snooze") {
      _closeBubble();
      _scheduleNext(_msFromMinutes(cfg.snoozeMinutes));
    } else if (action === "close") {
      _closeBubble();
      _scheduleNext(_msFromMinutes(cfg.snoozeMinutes));
    }
  });
}

module.exports = {
  init,
  updateConfig,
  triggerNow,
  reposition,
  isBubbleOpen,
  shutdown,
};
