// src/chat-bubble.js — Click-to-chat bubble for the alien pet.
// Single transparent borderless panel positioned ABOVE the pet:
//   • header (title + clear + close)
//   • scrollable conversation history (user vs alien turns)
//   • footer (model select + input + send)
// Streaming is done in the main process so the renderer stays a thin client.
// Backend: local Ollama at 127.0.0.1:11434.
"use strict";

const { BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const http = require("http");

const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";
const isWin = process.platform === "win32";

const OLLAMA_HOST = "127.0.0.1";
const OLLAMA_PORT = 11434;
const DEFAULT_CHAT_MODEL = "llama3.2";
const OFFLINE_CHAT_MODEL = "Alien offline";
const SYSTEM_PROMPT = [
  "You are Alien, a friendly pixel-art alien desktop pet companion.",
  "Replies must be SHORT (1-3 sentences) — they appear inside a small chat bubble next to the user's pet.",
  "Be warm, a little playful, and helpful. Reply in the user's language.",
].join(" ");

// Window geometry. Height includes the downward-pointing tail (~14px).
const CHAT_W = 380;
const CHAT_H = 360;
const TAIL_RESERVE = 14;
const GAP = 6;

let ctxRef = null;
let chatWin = null;
let isOpen = false;
let activeRequest = null;
let history = [];
const MAX_HISTORY = 24;
let availableModels = [];
let preferredModel = "";
let ipcWired = false;

// ── Public API ──

function init(ctx) {
  ctxRef = ctx;
  if (!ipcWired) {
    _wireIpc();
    ipcWired = true;
  }
}

function isBubbleOpen() {
  return isOpen && chatWin && !chatWin.isDestroyed();
}

function toggleChatBubble() {
  if (isBubbleOpen()) closeChatBubble();
  else openChatBubble();
}

function openChatBubble() {
  if (isBubbleOpen()) {
    chatWin.show();
    chatWin.focus();
    _focusInput();
    return;
  }
  const pet = _getPetBounds();
  if (!pet) return;
  isOpen = true;
  _ensureModelsLoaded().catch(() => {});
  _createWindow(pet);
}

function closeChatBubble() {
  isOpen = false;
  _abortActiveRequest();
  if (chatWin && !chatWin.isDestroyed()) chatWin.close();
  chatWin = null;
}

function repositionBubbles() {
  if (!isBubbleOpen()) return;
  const pet = _getPetBounds();
  if (!pet) return;
  const pos = _calcPosition(pet);
  chatWin.setBounds({ x: pos.x, y: pos.y, width: CHAT_W, height: CHAT_H });
  // Tell renderer where the alien is (relative to window) so we can draw the tail.
  chatWin.webContents.send("chat-bubble-tail-anchor", _calcTailAnchor(pet, pos));
}

// ── Window lifecycle ──

function _commonWindowOpts() {
  return {
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: !isMac,
    ...(isMac ? { type: "panel" } : {}),
    ...(isLinux ? { type: "splash" } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload-chat-bubble.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };
}

function _createWindow(petBounds) {
  const pos = _calcPosition(petBounds);
  chatWin = new BrowserWindow({
    ..._commonWindowOpts(),
    width: CHAT_W,
    height: CHAT_H,
    x: pos.x,
    y: pos.y,
    focusable: true,
  });
  if (isWin) chatWin.setAlwaysOnTop(true, "pop-up-menu");
  if (isMac) chatWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  chatWin.loadFile(path.join(__dirname, "chat-bubble.html"));

  chatWin.once("ready-to-show", () => {
    if (!chatWin || chatWin.isDestroyed()) return;
    chatWin.show();
    chatWin.focus();
    _sendBootstrap();
    chatWin.webContents.send("chat-bubble-tail-anchor", _calcTailAnchor(petBounds, pos));
  });

  chatWin.on("closed", () => {
    chatWin = null;
    isOpen = false;
    _abortActiveRequest();
  });
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
  // Center horizontally on the pet, place fully above the pet.
  const cx = Math.round(pet.x + pet.width / 2 - CHAT_W / 2);
  // Window's tail is at the bottom — its tip should sit a few px above the pet head.
  const y = pet.y - CHAT_H + TAIL_RESERVE - GAP;
  return _clampToWorkArea(cx, y, pet);
}

function _calcTailAnchor(pet, winPos) {
  // X position of the alien's center, relative to the window's left edge.
  // Used to place the tail triangle in HTML so it always points to the pet.
  const petCenterX = pet.x + pet.width / 2;
  const relX = petCenterX - winPos.x;
  return { tailX: Math.max(24, Math.min(CHAT_W - 24, relX)) };
}

function _clampToWorkArea(x, y, pet) {
  try {
    const display = screen.getDisplayNearestPoint({
      x: pet.x + Math.round(pet.width / 2),
      y: pet.y + Math.round(pet.height / 2),
    });
    const wa = display.workArea;
    const minX = wa.x + 4;
    const maxX = wa.x + wa.width - CHAT_W - 4;
    const minY = wa.y + 4;
    const maxY = wa.y + wa.height - CHAT_H - 4;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  } catch {
    return { x, y };
  }
}

// ── Renderer bootstrap ──

function _sendBootstrap() {
  if (!chatWin || chatWin.isDestroyed()) return;
  chatWin.webContents.send("chat-bubble-bootstrap", {
    lang: ctxRef && ctxRef.lang ? ctxRef.lang : "en",
    models: availableModels,
    model: preferredModel,
    history: history.slice(-MAX_HISTORY * 2),
  });
}

function _focusInput() {
  if (!chatWin || chatWin.isDestroyed()) return;
  chatWin.webContents.send("chat-bubble-focus");
}

function _send(event, data) {
  if (!chatWin || chatWin.isDestroyed()) return;
  chatWin.webContents.send(event, data);
}

// ── IPC wiring ──

function _wireIpc() {
  ipcMain.on("toggle-chat-bubble", () => toggleChatBubble());
  ipcMain.on("chat-bubble-close", () => closeChatBubble());
  ipcMain.on("chat-bubble-clear-history", () => {
    history = [];
    _abortActiveRequest();
    _send("chat-bubble-history-cleared");
  });

  ipcMain.handle("chat-bubble-list-models", async () => {
    try {
      await _ensureModelsLoaded();
      return { ok: true, models: availableModels, model: preferredModel };
    } catch (e) {
      availableModels = [OFFLINE_CHAT_MODEL];
      preferredModel = OFFLINE_CHAT_MODEL;
      return { ok: true, models: availableModels, model: preferredModel, offline: true };
    }
  });

  ipcMain.on("chat-bubble-set-model", (_e, model) => {
    if (typeof model === "string" && model) preferredModel = model;
  });

  ipcMain.on("chat-bubble-send", (_e, payload) => {
    const text = payload && payload.text;
    const model = (payload && payload.model) || preferredModel || OFFLINE_CHAT_MODEL;
    if (!text || !model) return;
    if (model === OFFLINE_CHAT_MODEL) {
      _streamOfflineReply(text, model);
      return;
    }
    _streamReply(text, model);
  });
}

// ── Ollama streaming ──

function _abortActiveRequest() {
  if (activeRequest) {
    try { activeRequest.req.destroy(); } catch {}
    activeRequest = null;
  }
}

async function _ensureModelsLoaded() {
  if (availableModels.length > 0) return;
  await _loadAvailableModels();
  if (availableModels.length > 0) return;
  try {
    await _fetchOllama("POST", "/api/pull", { name: DEFAULT_CHAT_MODEL, stream: false }, 10 * 60 * 1000);
    await _loadAvailableModels();
    if (!availableModels.includes(DEFAULT_CHAT_MODEL)) availableModels.unshift(DEFAULT_CHAT_MODEL);
    preferredModel = DEFAULT_CHAT_MODEL;
  } catch (err) {
    availableModels = [OFFLINE_CHAT_MODEL];
    preferredModel = OFFLINE_CHAT_MODEL;
  }
}

async function _loadAvailableModels() {
  try {
    const res = await _fetchOllama("GET", "/api/tags");
    availableModels = (res && Array.isArray(res.models)) ? res.models.map(m => m.name) : [];
    if (!preferredModel && availableModels.length > 0) preferredModel = availableModels[0];
  } catch (err) {
    availableModels = [];
    throw err;
  }
}

function _streamReply(userText, model) {
  _abortActiveRequest();
  history.push({ role: "user", content: userText });
  if (history.length > MAX_HISTORY * 2) history = history.slice(-MAX_HISTORY * 2);

  _send("chat-bubble-reply-start", { user: userText, model });

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-MAX_HISTORY * 2),
  ];
  const body = JSON.stringify({ model, stream: true, messages });

  const req = http.request({
    host: OLLAMA_HOST,
    port: OLLAMA_PORT,
    path: "/api/chat",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  }, (res) => {
    if (res.statusCode !== 200) {
      let buf = "";
      res.on("data", (chunk) => { buf += chunk.toString(); });
      res.on("end", () => {
        _send("chat-bubble-reply-error", `HTTP ${res.statusCode}: ${buf.slice(0, 200)}`);
      });
      return;
    }
    let pending = "";
    let assembled = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => {
      pending += chunk;
      let idx;
      while ((idx = pending.indexOf("\n")) !== -1) {
        const line = pending.slice(0, idx).trim();
        pending = pending.slice(idx + 1);
        if (!line) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.error) {
            _send("chat-bubble-reply-error", String(obj.error));
            continue;
          }
          if (obj.message && typeof obj.message.content === "string") {
            assembled += obj.message.content;
            _send("chat-bubble-reply-chunk", obj.message.content);
          }
          if (obj.done) {
            history.push({ role: "assistant", content: assembled });
            _send("chat-bubble-reply-end", null);
          }
        } catch { /* skip parse errors */ }
      }
    });
    res.on("end", () => { activeRequest = null; });
    res.on("error", (err) => {
      _send("chat-bubble-reply-error", err.message || String(err));
      activeRequest = null;
    });
  });

  req.on("error", (err) => {
    let msg = err.message || String(err);
    if (err.code === "ECONNREFUSED") msg = "Ollama not running on localhost:11434 — start it with `ollama serve`.";
    _send("chat-bubble-reply-error", msg);
    activeRequest = null;
  });

  req.write(body);
  req.end();
  activeRequest = { req, abort: () => req.destroy() };
}

function _streamOfflineReply(userText, model) {
  _abortActiveRequest();
  history.push({ role: "user", content: userText });
  if (history.length > MAX_HISTORY * 2) history = history.slice(-MAX_HISTORY * 2);

  _send("chat-bubble-reply-start", { user: userText, model });
  const reply = _buildOfflineReply(userText);
  let idx = 0;
  const timer = setInterval(() => {
    const prev = idx;
    idx = Math.min(reply.length, idx + 3);
    _send("chat-bubble-reply-chunk", reply.slice(prev, idx));
    if (idx >= reply.length) {
      clearInterval(timer);
      history.push({ role: "assistant", content: reply });
      _send("chat-bubble-reply-end", null);
      activeRequest = null;
    }
  }, 18);
  activeRequest = { req: { destroy: () => clearInterval(timer) } };
}

function _buildOfflineReply(userText) {
  const text = String(userText || "").trim();
  const lower = text.toLowerCase();
  const spanish = /[¿¡ñáéíóú]|\b(hola|gracias|quiero|puedes|alien|chat|error|funciona|ollama)\b/i.test(text);
  if (lower.includes("ollama") || lower.includes("modelo") || lower.includes("model") || lower.includes("error")) {
    return spanish
      ? "Estoy en modo offline porque Ollama no esta disponible. Aun asi puedo responderte aqui; si quieres IA local completa, abre Ollama mas tarde."
      : "I am in offline mode because Ollama is not available. I can still chat here; for full local AI, start Ollama later.";
  }
  if (/[?¿]$/.test(text)) {
    return spanish
      ? "Mi antena offline dice que si. Puedo ayudarte con respuestas cortas, ideas y compania mientras arreglamos lo que haga falta."
      : "My offline antenna says yes. I can help with short answers, ideas, and company while we fix what needs fixing.";
  }
  return spanish
    ? "Recibido. Estoy aqui en modo offline, pero sigo conversando contigo. Cuentame un poco mas y seguimos."
    : "Received. I am here in offline mode, but still chatting with you. Tell me a little more and we will keep going.";
}

function _fetchOllama(method, pathStr, body, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      host: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: pathStr,
      method,
      headers: data ? {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      } : {},
      timeout: timeoutMs,
    }, (res) => {
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { buf += c; });
      res.on("end", () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(buf)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("timeout")); });
    if (data) req.write(data);
    req.end();
  });
}

module.exports = {
  init,
  openChatBubble,
  closeChatBubble,
  toggleChatBubble,
  isBubbleOpen,
  repositionBubbles,
};
