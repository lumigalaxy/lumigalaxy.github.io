// Preload for the translator popup window.
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("translatorAPI", {
  translate: (text) => ipcRenderer.send("translator-translate", text),
  close: () => ipcRenderer.send("translator-close"),

  onBootstrap: (cb) => ipcRenderer.on("translator-bootstrap", (_, d) => cb(d)),
  onSetText:   (cb) => ipcRenderer.on("translator-set-text", (_, d) => cb(d)),
  onFocus:     (cb) => ipcRenderer.on("translator-focus", () => cb()),
  onLoading:   (cb) => ipcRenderer.on("translator-loading", (_, d) => cb(d)),
  onResult:    (cb) => ipcRenderer.on("translator-result", (_, d) => cb(d)),
});
