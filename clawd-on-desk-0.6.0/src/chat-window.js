// src/chat-window.js — Alien chat window (main process lifecycle).
// Creates a lightweight BrowserWindow that renders src/chat.html.
// Talks to local Ollama directly from the renderer via fetch.
"use strict";

const { BrowserWindow } = require("electron");
const path = require("path");

let chatWindow = null;

function openChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    if (chatWindow.isMinimized()) chatWindow.restore();
    chatWindow.show();
    chatWindow.focus();
    return chatWindow;
  }

  chatWindow = new BrowserWindow({
    width: 480,
    height: 620,
    minWidth: 360,
    minHeight: 420,
    title: "Alien Chat",
    backgroundColor: "#0d130b",
    show: false,
    frame: true,
    resizable: true,
    skipTaskbar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  chatWindow.setMenuBarVisibility(false);
  chatWindow.loadFile(path.join(__dirname, "chat.html"));

  chatWindow.once("ready-to-show", () => {
    chatWindow.show();
    chatWindow.focus();
  });

  chatWindow.on("closed", () => {
    chatWindow = null;
  });

  return chatWindow;
}

function closeChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.close();
  }
}

function isChatWindowOpen() {
  return !!(chatWindow && !chatWindow.isDestroyed());
}

module.exports = {
  openChatWindow,
  closeChatWindow,
  isChatWindowOpen,
};
