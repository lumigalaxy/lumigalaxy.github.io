// Preload for the water-reminder bubble.
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("waterBubbleAPI", {
  action: (name) => ipcRenderer.send("water-bubble-action", name),
  onBootstrap:  (cb) => ipcRenderer.on("water-bubble-bootstrap", (_, d) => cb(d)),
  onTailAnchor: (cb) => ipcRenderer.on("water-bubble-tail-anchor", (_, d) => cb(d)),
});
