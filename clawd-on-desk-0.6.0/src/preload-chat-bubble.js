// Preload for the chat-bubble window.
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("chatBubbleAPI", {
  // → main
  send: (text, model) => ipcRenderer.send("chat-bubble-send", { text, model }),
  close: () => ipcRenderer.send("chat-bubble-close"),
  clearHistory: () => ipcRenderer.send("chat-bubble-clear-history"),
  setModel: (model) => ipcRenderer.send("chat-bubble-set-model", model),
  listModels: () => ipcRenderer.invoke("chat-bubble-list-models"),
  scheduleReminder: (payload) => ipcRenderer.invoke("chat-bubble-schedule-reminder", payload),

  // ← main
  onBootstrap:     (cb) => ipcRenderer.on("chat-bubble-bootstrap", (_, d) => cb(d)),
  onFocus:         (cb) => ipcRenderer.on("chat-bubble-focus", () => cb()),
  onTailAnchor:    (cb) => ipcRenderer.on("chat-bubble-tail-anchor", (_, d) => cb(d)),
  onReplyStart:    (cb) => ipcRenderer.on("chat-bubble-reply-start", (_, d) => cb(d)),
  onReplyChunk:    (cb) => ipcRenderer.on("chat-bubble-reply-chunk", (_, d) => cb(d)),
  onReplyEnd:      (cb) => ipcRenderer.on("chat-bubble-reply-end", () => cb()),
  onReplyError:    (cb) => ipcRenderer.on("chat-bubble-reply-error", (_, msg) => cb(msg)),
  onHistoryCleared:(cb) => ipcRenderer.on("chat-bubble-history-cleared", () => cb()),
  onReminderFired: (cb) => ipcRenderer.on("chat-bubble-reminder-fired", (_, d) => cb(d)),
});
