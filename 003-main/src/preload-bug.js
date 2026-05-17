const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  bugHit: (word) => ipcRenderer.send("bug-hit", word),
  bugGameState: (state, extra) => ipcRenderer.send("bug-game-state", state, extra),
  closeBugGame: () => ipcRenderer.send("close-bug-game"),
});
