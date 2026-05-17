const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  danceHit: (quality, combo) => ipcRenderer.send("dance-hit", quality, combo),
  danceGameState: (state, extra) => ipcRenderer.send("dance-game-state", state, extra),
  closeDanceGame: () => ipcRenderer.send("close-dance-game"),
});
