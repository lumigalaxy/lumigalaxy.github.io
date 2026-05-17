const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  showContextMenu: () => ipcRenderer.send("show-context-menu"),
  moveWindowBy: (dx, dy) => ipcRenderer.send("move-window-by", dx, dy),
  onStateChange: (callback) => ipcRenderer.on("state-change", (_, state, svg) => callback(state, svg)),
  onEyeMove: (callback) => ipcRenderer.on("eye-move", (_, dx, dy) => callback(dx, dy)),
  onWakeFromDoze: (callback) => ipcRenderer.on("wake-from-doze", () => callback()),
  pauseCursorPolling: () => ipcRenderer.send("pause-cursor-polling"),
  resumeFromReaction: () => ipcRenderer.send("resume-from-reaction"),
  onDndChange: (callback) => ipcRenderer.on("dnd-change", (_, enabled) => callback(enabled)),
  dragLock: (locked) => ipcRenderer.send("drag-lock", locked),
  onMiniModeChange: (cb) => ipcRenderer.on("mini-mode-change", (_, enabled) => cb(enabled)),
  exitMiniMode: () => ipcRenderer.send("exit-mini-mode"),
  dragEnd: () => ipcRenderer.send("drag-end"),
  focusTerminal: () => ipcRenderer.send("focus-terminal"),
  requestDance: () => ipcRenderer.send("request-dance"),
  showSessionMenu: () => ipcRenderer.send("show-session-menu"),
  // Growth system
  pokeClawd: () => ipcRenderer.send("poke-clawd"),
  getGrowthSummary: () => ipcRenderer.invoke("get-growth-summary"),
  getDialogueLine: () => ipcRenderer.invoke("get-dialogue-line"),
  getDialogueContext: () => ipcRenderer.invoke("get-dialogue-context"),
  onGrowthLevelUp: (cb) => ipcRenderer.on("growth-levelup", (_, data) => cb(data)),
  onGrowthAchievement: (cb) => ipcRenderer.on("growth-achievement", (_, data) => cb(data)),
  onGrowthXp: (cb) => ipcRenderer.on("growth-xp", (_, data) => cb(data)),
  onEasterEggSpeech: (cb) => ipcRenderer.on("easter-egg-speech", (_, text, mode) => cb(text, mode)),
  // Intro animation
  onPlayIntro: (cb) => ipcRenderer.on("play-intro", () => cb()),
  introComplete: () => ipcRenderer.send("intro-complete"),
  // Inline games
  onStartGame: (cb) => ipcRenderer.on("start-game", (_, gameType) => cb(gameType)),
  gameResult: (gameType, result) => ipcRenderer.send("game-result", gameType, result),
  // Wardrobe
  getWardrobe: () => ipcRenderer.invoke("get-wardrobe"),
  equipItem: (id) => ipcRenderer.send("equip-item", id),
  unequipItem: (cat) => ipcRenderer.send("unequip-item", cat),
  onWardrobeUpdate: (cb) => ipcRenderer.on("wardrobe-update", (_, equipped) => cb(equipped)),
});
