// src/translator.js — Quick word/sentence translator popup.
//
// Trigger:
//   • Global shortcut (default ⌘⇧T / Ctrl+Shift+T) — pops up at the cursor
//   • Tray / pet right-click → "Translate clipboard"
//
// Backend: two free, keyless endpoints queried in parallel for richer UI:
//   1. https://dict.youdao.com/jsonapi?q=…  — phonetics + dictionary senses
//      (full data for single words, examples for sentences)
//   2. https://api.mymemory.translated.net/get?q=…&langpair=…  — direct
//      machine translation for sentences (Youdao dict has no `fanyi` field
//      anymore, the old fanyi.youdao.com/translate endpoint 302s to error.html)
//
// The renderer is fully passive: main.js owns all networking and ships
// already-shaped result payloads. This keeps the small popup HTML tidy and
// avoids CSP gymnastics.
"use strict";

const { app, BrowserWindow, ipcMain, globalShortcut, screen, clipboard } = require("electron");
const path = require("path");
const https = require("https");

const isMac = process.platform === "darwin";
const isLinux = process.platform === "linux";
const isWin = process.platform === "win32";

const WIN_W = 380;
const WIN_H = 260;
const CURSOR_OFFSET_X = 16;
const CURSOR_OFFSET_Y = 16;

let ctxRef = null;
let translatorWin = null;
let registeredShortcut = null;
let activeRequestId = 0;
let ipcWired = false;

// ── Public API ──

function init(ctx) {
  ctxRef = ctx;
  if (!ipcWired) {
    _wireIpc();
    ipcWired = true;
  }
  // globalShortcut can't be called before app is ready. Defer if needed.
  if (app.isReady()) applyShortcut();
  else app.whenReady().then(() => applyShortcut()).catch(() => {});
}

function applyShortcut() {
  if (!app.isReady()) return;
  const cfg = _readConfig();
  // Always unregister old shortcut first
  if (registeredShortcut) {
    try { globalShortcut.unregister(registeredShortcut); } catch {}
    registeredShortcut = null;
  }
  if (!cfg.enabled) return;
  if (!cfg.shortcut) return;
  try {
    const ok = globalShortcut.register(cfg.shortcut, () => openTranslator());
    if (ok) registeredShortcut = cfg.shortcut;
    else console.warn(`Translator: failed to register shortcut "${cfg.shortcut}"`);
  } catch (e) {
    console.warn(`Translator: shortcut register error:`, e.message || e);
  }
}

// Open the popup. If `prefilledText` is given, fill it in and translate immediately.
function openTranslator(prefilledText) {
  const initialText = (typeof prefilledText === "string" ? prefilledText : "").slice(0, 1000);
  if (translatorWin && !translatorWin.isDestroyed()) {
    translatorWin.show();
    translatorWin.focus();
    if (initialText) {
      translatorWin.webContents.send("translator-set-text", initialText);
      _translate(initialText);
    } else {
      translatorWin.webContents.send("translator-focus");
    }
    return;
  }
  _createWindow(initialText);
}

function translateClipboard() {
  let text = "";
  try { text = (clipboard.readText() || "").trim(); } catch {}
  openTranslator(text);
}

function close() {
  if (translatorWin && !translatorWin.isDestroyed()) translatorWin.close();
  translatorWin = null;
}

function shutdown() {
  if (registeredShortcut) {
    try { globalShortcut.unregister(registeredShortcut); } catch {}
    registeredShortcut = null;
  }
  close();
}

// ── Window ──

function _createWindow(initialText) {
  const pos = _calcPosition();
  translatorWin = new BrowserWindow({
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    alwaysOnTop: true,
    width: WIN_W,
    height: WIN_H,
    x: pos.x,
    y: pos.y,
    ...(isMac ? { type: "panel" } : {}),
    ...(isLinux ? { type: "splash" } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload-translator.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  if (isWin) translatorWin.setAlwaysOnTop(true, "pop-up-menu");
  if (isMac) translatorWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  translatorWin.loadFile(path.join(__dirname, "translator-window.html"));

  translatorWin.once("ready-to-show", () => {
    if (!translatorWin || translatorWin.isDestroyed()) return;
    translatorWin.show();
    translatorWin.focus();
    translatorWin.webContents.send("translator-bootstrap", {
      lang: ctxRef && ctxRef.lang ? ctxRef.lang : "en",
      initialText: initialText || "",
    });
    if (initialText) _translate(initialText);
  });

  translatorWin.on("blur", () => {
    // Auto-close on blur to keep it Spotlight-like.
    if (translatorWin && !translatorWin.isDestroyed()) {
      try { translatorWin.close(); } catch {}
    }
  });

  translatorWin.on("closed", () => { translatorWin = null; });
}

function _calcPosition() {
  try {
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const wa = display.workArea;
    let x = cursor.x + CURSOR_OFFSET_X;
    let y = cursor.y + CURSOR_OFFSET_Y;
    // Flip if it would overflow
    if (x + WIN_W > wa.x + wa.width - 4) x = cursor.x - WIN_W - CURSOR_OFFSET_X;
    if (y + WIN_H > wa.y + wa.height - 4) y = cursor.y - WIN_H - CURSOR_OFFSET_Y;
    x = Math.max(wa.x + 4, Math.min(wa.x + wa.width - WIN_W - 4, x));
    y = Math.max(wa.y + 4, Math.min(wa.y + wa.height - WIN_H - 4, y));
    return { x, y };
  } catch {
    return { x: 100, y: 100 };
  }
}

// ── IPC + translation ──

function _wireIpc() {
  ipcMain.on("translator-close", () => close());
  ipcMain.on("translator-translate", (_e, text) => _translate(text));
}

function _translate(rawText) {
  if (!translatorWin || translatorWin.isDestroyed()) return;
  const text = (rawText || "").trim();
  if (!text) return;

  const reqId = ++activeRequestId;
  translatorWin.webContents.send("translator-loading", { text });

  const direction = _detectDirection(text);
  const isSingleWord = text.length <= 30 && !/\s/.test(text);

  const result = {
    text,
    direction,
    translation: "",
    phoneticUS: "",
    phoneticUK: "",
    senses: [],     // [{ pos, def }]
    examples: [],   // [string]
    error: null,
  };

  let dictDone = false;
  let mtDone = false;

  const sendMaybe = () => {
    if (reqId !== activeRequestId) return;
    if (!translatorWin || translatorWin.isDestroyed()) return;
    if (!dictDone || !mtDone) return;
    // If nothing came back at all, surface an error
    if (!result.translation && !result.senses.length) {
      if (!result.error) result.error = "No translation found.";
    } else {
      result.error = null;
    }
    translatorWin.webContents.send("translator-result", result);
  };

  // 1) Youdao dict — phonetics, definitions, examples
  _dictCall(text).then((d) => {
    if (reqId !== activeRequestId || !d) return;
    if (d.phoneticUS) result.phoneticUS = d.phoneticUS;
    if (d.phoneticUK) result.phoneticUK = d.phoneticUK;
    if (d.senses && d.senses.length) {
      result.senses = d.senses;
      // For single words, use the first Youdao definition as the prominent
      // translation (much higher quality than MyMemory for dictionary lookups).
      if (isSingleWord && !result.translation) {
        result.translation = d.senses[0].def;
      }
    }
    if (d.examples && d.examples.length) result.examples = d.examples;
  }).catch(() => { /* ignore — MT alone is fine */ })
    .finally(() => { dictDone = true; sendMaybe(); });

  // 2) MyMemory — machine translation for sentences (and single-word fallback)
  _mymemoryCall(text, direction).then((tr) => {
    if (reqId !== activeRequestId) return;
    if (!tr) return;
    // Only override dict translation if the dict had no senses (i.e. no entry).
    // For sentences the MT is the primary output.
    if (!isSingleWord || !result.translation) {
      result.translation = tr;
    }
  }).catch((e) => {
    if (reqId !== activeRequestId) return;
    // Store error but only show it to user if nothing else came back
    if (!result.error) result.error = e.message || String(e);
  }).finally(() => { mtDone = true; sendMaybe(); });
}

function _detectDirection(text) {
  const hasCJK = /[\u4e00-\u9fff]/.test(text);
  return hasCJK ? "ZH_CN2EN" : "EN2ZH_CN";
}

// Free MyMemory machine-translation endpoint. No key required; ~5000 chars/IP/day.
// GET https://api.mymemory.translated.net/get?q=<text>&langpair=<src>|<dst>
// Response: { responseData: { translatedText: "..." }, responseStatus: 200 }
function _mymemoryCall(text, direction) {
  return new Promise((resolve, reject) => {
    const langPair = direction === "ZH_CN2EN" ? "zh-CN|en" : "en|zh-CN";
    const params = new URLSearchParams({ q: text, langpair: langPair });
    const opts = {
      hostname: "api.mymemory.translated.net",
      path: "/get?" + params.toString(),
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
      },
      timeout: 8000,
    };
    const req = https.request(opts, (res) => {
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { buf += c; });
      res.on("end", () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try {
          const obj = JSON.parse(buf);
          if (obj.responseStatus !== 200 && obj.responseStatus !== "200") {
            return reject(new Error(obj.responseDetails || "MyMemory error"));
          }
          const tr = obj.responseData && obj.responseData.translatedText;
          resolve(typeof tr === "string" ? tr.trim() : "");
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.end();
  });
}

// Dictionary endpoint: https://dict.youdao.com/jsonapi?q=word
// We pluck phonetics + ec.word.trs definitions when present.
function _dictCall(text) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ q: text });
    const opts = {
      hostname: "dict.youdao.com",
      path: "/jsonapi?" + params.toString(),
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      timeout: 8000,
    };
    const req = https.request(opts, (res) => {
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { buf += c; });
      res.on("end", () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(_extractDict(JSON.parse(buf))); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.end();
  });
}

function _extractDict(obj) {
  const out = { phoneticUS: "", phoneticUK: "", senses: [], examples: [] };
  if (!obj || typeof obj !== "object") return out;

  // English → Chinese path: obj.ec.word[0]
  const ec = obj.ec && Array.isArray(obj.ec.word) && obj.ec.word[0];
  if (ec) {
    if (typeof ec.usphone === "string") out.phoneticUS = ec.usphone;
    if (typeof ec.ukphone === "string") out.phoneticUK = ec.ukphone;
    if (Array.isArray(ec.trs)) {
      for (const tr of ec.trs) {
        const inner = tr && tr.tr && tr.tr[0];
        const items = inner && inner.l && inner.l.i;
        if (Array.isArray(items)) {
          for (const it of items) {
            if (typeof it === "string" && it.trim()) {
              out.senses.push({ pos: "", def: it.trim() });
            }
          }
        }
      }
    }
  }

  // Chinese → English path: obj.ce.word[0]
  const ce = obj.ce && Array.isArray(obj.ce.word) && obj.ce.word[0];
  if (ce && Array.isArray(ce.trs)) {
    for (const tr of ce.trs) {
      const inner = tr && tr["#text"] ? tr["#text"] : (tr && tr.tr && tr.tr[0] && tr.tr[0]["#text"]);
      if (typeof inner === "string" && inner.trim()) {
        out.senses.push({ pos: "", def: inner.trim() });
      } else if (tr && tr.tr && tr.tr[0] && tr.tr[0].l && Array.isArray(tr.tr[0].l.i)) {
        for (const it of tr.tr[0].l.i) {
          const txt = typeof it === "string" ? it : (it && it["#text"]);
          if (typeof txt === "string" && txt.trim()) {
            out.senses.push({ pos: "", def: txt.trim() });
          }
        }
      }
    }
  }

  // Example sentences (best effort: blng_sents_part.sentence-pair)
  const blng = obj.blng_sents_part && obj.blng_sents_part["sentence-pair"];
  if (Array.isArray(blng)) {
    for (const s of blng.slice(0, 2)) {
      if (s && typeof s.sentence === "string" && typeof s.sentence_translation === "string") {
        out.examples.push(`${s.sentence}\n${s.sentence_translation}`);
      }
    }
  }
  return out;
}

function _readConfig() {
  const defaults = { enabled: true, shortcut: "CmdOrCtrl+Shift+T" };
  try {
    const snap = ctxRef && ctxRef.settings && ctxRef.settings.getSnapshot
      ? ctxRef.settings.getSnapshot() : null;
    if (snap && snap.translator) return { ...defaults, ...snap.translator };
  } catch {}
  return defaults;
}

module.exports = {
  init,
  applyShortcut,
  openTranslator,
  translateClipboard,
  close,
  shutdown,
};
