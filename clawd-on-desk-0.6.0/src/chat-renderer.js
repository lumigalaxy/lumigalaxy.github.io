// src/chat-renderer.js — renderer for the Alien chat window.
// Talks to local Ollama (http://localhost:11434) via streaming fetch.
"use strict";

const OLLAMA_HOST = "http://localhost:11434";
const DEFAULT_CHAT_MODEL = "llama3.2";
const OFFLINE_CHAT_MODEL = "Alien offline";
const STORAGE_KEY_MODEL = "alien.chat.model";
const STORAGE_KEY_HISTORY = "alien.chat.history";
const STORAGE_KEY_MEMORY = "alien.chat.memory";
const MAX_HISTORY = 40; // turns (user+assistant pairs trimmed together)

const BASE_SYSTEM_PROMPT = [
  "You are Alien, a friendly pixel-art alien desktop pet companion.",
  "Keep answers concise (1-4 short paragraphs unless the user asks for depth).",
  "Be warm, a little playful, and helpful. Reply in the user's language.",
].join(" ");

const els = {
  messages: document.getElementById("messages"),
  welcome: document.getElementById("welcome"),
  input: document.getElementById("input"),
  send: document.getElementById("send"),
  modelSelect: document.getElementById("model-select"),
  clearBtn: document.getElementById("clear-btn"),
  status: document.getElementById("status"),
  statusText: document.getElementById("status-text"),
};

let messages = [];      // [{ role: "user" | "assistant", content: string }]
let abortController = null;
let currentModel = loadStoredModel();
let offlineMode = false;
const alienMemory = loadMemory();

// ── Status helpers ──
function setStatus(state, text) {
  els.status.className = state || "";
  els.statusText.textContent = text;
}

// Lightweight memory inspired by archive/001's visit counter. It gives the
// alien continuity without sending personal data anywhere.
function loadStoredModel() {
  const stored = localStorage.getItem(STORAGE_KEY_MODEL) || "";
  if (stored === OFFLINE_CHAT_MODEL) {
    localStorage.removeItem(STORAGE_KEY_MODEL);
    return "";
  }
  return stored;
}

function loadMemory() {
  const now = new Date().toISOString();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMORY);
    const parsed = raw ? JSON.parse(raw) : {};
    const memory = {
      encounters: Number.isFinite(parsed.encounters) ? parsed.encounters + 1 : 1,
      firstSeen: typeof parsed.firstSeen === "string" ? parsed.firstSeen : now,
      lastSeen: now,
    };
    localStorage.setItem(STORAGE_KEY_MEMORY, JSON.stringify(memory));
    return memory;
  } catch {
    return { encounters: 1, firstSeen: now, lastSeen: now };
  }
}

function buildSystemPrompt() {
  return [
    BASE_SYSTEM_PROMPT,
    `You have opened this chat with the user ${alienMemory.encounters} time(s).`,
    "Use that as quiet relationship memory only when it helps the reply feel natural.",
  ].join(" ");
}

function hasRealModel() {
  return !!currentModel && currentModel !== OFFLINE_CHAT_MODEL && !offlineMode;
}

function persistCurrentModel() {
  if (currentModel && currentModel !== OFFLINE_CHAT_MODEL) {
    localStorage.setItem(STORAGE_KEY_MODEL, currentModel);
  }
}

// ── Rendering ──
function hideWelcome() {
  if (els.welcome && els.welcome.parentNode) els.welcome.parentNode.removeChild(els.welcome);
}

function appendMessage(role, content = "") {
  hideWelcome();
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${role}`;
  wrapper.innerHTML = `
    <div class="avatar"></div>
    <div class="body">
      <div class="name">${role === "user" ? "You" : "Alien"}</div>
      <div class="content"></div>
    </div>
  `;
  const contentEl = wrapper.querySelector(".content");
  contentEl.textContent = content;
  els.messages.appendChild(wrapper);
  scrollToBottom();
  return { wrapper, contentEl };
}

function scrollToBottom() {
  els.messages.scrollTop = els.messages.scrollHeight;
}

// ── History persistence ──
function saveHistory() {
  try {
    const trimmed = messages.slice(-MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(trimmed));
  } catch {}
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    messages = arr.filter(m => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"));
    if (messages.length === 0) return;
    hideWelcome();
    for (const m of messages) appendMessage(m.role, m.content);
  } catch {}
}

// ── Models ──
async function refreshModels() {
  try {
    setStatus("", "Fetching available models…");
    offlineMode = false;
    let models = await fetchModels();
    els.modelSelect.innerHTML = "";
    if (models.length === 0) {
      els.send.disabled = true;
      setStatus("thinking", `Installing local model ${DEFAULT_CHAT_MODEL}. This can take a few minutes once.`);
      await pullDefaultModel();
      models = await fetchModels();
      if (models.length === 0) models = [{ name: DEFAULT_CHAT_MODEL }];
    }
    for (const m of models) {
      const opt = document.createElement("option");
      opt.value = m.name;
      opt.textContent = m.name;
      els.modelSelect.appendChild(opt);
    }
    // Restore previously chosen model if still available
    if (currentModel && models.some(m => m.name === currentModel)) {
      els.modelSelect.value = currentModel;
    } else {
      currentModel = els.modelSelect.value;
      persistCurrentModel();
    }
    setStatus("ok", `Connected · ${currentModel}`);
    els.send.disabled = false;
  } catch (e) {
    enableOfflineMode();
  }
}

function enableOfflineMode() {
  offlineMode = true;
  currentModel = OFFLINE_CHAT_MODEL;
  localStorage.removeItem(STORAGE_KEY_MODEL);
  els.modelSelect.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = OFFLINE_CHAT_MODEL;
  opt.textContent = OFFLINE_CHAT_MODEL;
  els.modelSelect.appendChild(opt);
  els.modelSelect.value = OFFLINE_CHAT_MODEL;
  els.send.disabled = false;
  setStatus("ok", "Offline mode · Alien can chat without Ollama");
}

async function fetchModels() {
  const res = await fetch(`${OLLAMA_HOST}/api/tags`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.models) ? data.models : [];
}

async function pullDefaultModel() {
  const res = await fetch(`${OLLAMA_HOST}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: DEFAULT_CHAT_MODEL, stream: false }),
  });
  if (!res.ok) throw new Error(`Could not install ${DEFAULT_CHAT_MODEL} (HTTP ${res.status})`);
}

els.modelSelect.addEventListener("change", () => {
  currentModel = els.modelSelect.value;
  offlineMode = currentModel === OFFLINE_CHAT_MODEL;
  if (offlineMode) localStorage.removeItem(STORAGE_KEY_MODEL);
  else persistCurrentModel();
  setStatus("ok", offlineMode ? "Offline mode · Alien can chat without Ollama" : `Connected · ${currentModel}`);
});

// ── Clear ──
els.clearBtn.addEventListener("click", () => {
  if (!messages.length) return;
  messages = [];
  saveHistory();
  els.messages.innerHTML = "";
  const w = document.createElement("div");
  w.className = "welcome";
  w.innerHTML = `<div class="big">🛸</div><div>Fresh start. What's on your mind?</div>`;
  els.messages.appendChild(w);
  els.welcome = w;
});

// ── Composer ──
function autoResizeInput() {
  els.input.style.height = "auto";
  els.input.style.height = Math.min(els.input.scrollHeight, 180) + "px";
}
els.input.addEventListener("input", autoResizeInput);

els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSendOrStop();
  }
});

els.send.addEventListener("click", handleSendOrStop);

function handleSendOrStop() {
  if (abortController) {
    abortController.abort();
    return;
  }
  const text = els.input.value.trim();
  if (!text) return;
  sendMessage(text);
}

function setSendingState(sending) {
  if (sending) {
    els.send.textContent = "Stop";
    els.send.classList.add("stop");
    els.input.disabled = true;
  } else {
    els.send.textContent = "Send";
    els.send.classList.remove("stop");
    els.input.disabled = false;
    els.input.focus();
  }
}

// ── Streaming chat ──
async function sendMessage(userText) {
  if (!currentModel && !offlineMode) {
    setStatus("err", "Select a model first.");
    return;
  }

  // Append user message
  messages.push({ role: "user", content: userText });
  appendMessage("user", userText);
  els.input.value = "";
  autoResizeInput();
  saveHistory();

  // Prepare assistant placeholder
  const { wrapper, contentEl } = appendMessage("assistant", "");
  wrapper.classList.add("streaming");

  if (offlineMode || currentModel === OFFLINE_CHAT_MODEL) {
    await tryReconnectToOllama();
  }

  setStatus("thinking", `Thinking… (${currentModel})`);
  setSendingState(true);
  abortController = new AbortController();

  let accumulated = "";
  try {
    if (!hasRealModel()) {
      accumulated = buildOfflineReply(userText);
      await typeOfflineReply(contentEl, accumulated);
      messages.push({ role: "assistant", content: accumulated });
      saveHistory();
      setStatus("ok", "Offline mode · Alien can chat without Ollama");
      return;
    }

    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortController.signal,
      body: JSON.stringify({
        model: currentModel,
        stream: true,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          ...messages.slice(-MAX_HISTORY),
        ],
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nlIdx;
      while ((nlIdx = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nlIdx).trim();
        buffer = buffer.slice(nlIdx + 1);
        if (!line) continue;
        try {
          const evt = JSON.parse(line);
          if (evt.message && typeof evt.message.content === "string") {
            accumulated += evt.message.content;
            contentEl.textContent = accumulated;
            scrollToBottom();
          }
          if (evt.error) throw new Error(evt.error);
        } catch (parseErr) {
          // Ignore malformed chunks (shouldn't happen with Ollama)
        }
      }
    }

    // Save assistant reply
    messages.push({ role: "assistant", content: accumulated });
    saveHistory();
    setStatus("ok", `Connected · ${currentModel}`);
  } catch (err) {
    if (err.name === "AbortError") {
      accumulated += accumulated ? "\n\n[stopped]" : "[stopped]";
      contentEl.textContent = accumulated;
      messages.push({ role: "assistant", content: accumulated });
      saveHistory();
      setStatus("ok", `Connected · ${currentModel}`);
    } else {
      enableOfflineMode();
      accumulated = buildOfflineReply(userText);
      contentEl.textContent = accumulated;
      messages.push({ role: "assistant", content: accumulated });
      saveHistory();
    }
  } finally {
    wrapper.classList.remove("streaming");
    abortController = null;
    setSendingState(false);
  }
}

function buildOfflineReply(userText) {
  const text = String(userText || "").trim();
  const lower = text.toLowerCase();
  const spanish = /[¿¡ñáéíóú]|\b(hola|gracias|quiero|puedes|alien|chat|error|funciona|ollama)\b/i.test(text);
  if (lower.includes("ollama") || lower.includes("modelo") || lower.includes("model") || lower.includes("error")) {
    return spanish
      ? "Estoy en modo offline porque Ollama no esta disponible. Aun asi puedo responderte aqui; si quieres IA local completa, abre Ollama mas tarde y volvere a usar el modelo automaticamente al reiniciar el chat."
      : "I am in offline mode because Ollama is not available. I can still chat here; for full local AI, start Ollama later and I will use the model again when the chat restarts.";
  }
  if (/[?¿]$/.test(text)) {
    return spanish
      ? "Mi antena offline dice que si. Puedo ayudarte con respuestas cortas, ideas y acompanarte mientras arreglamos lo que haga falta."
      : "My offline antenna says yes. I can help with short answers, ideas, and keeping you company while we fix what needs fixing.";
  }
  return spanish
    ? "Recibido. Estoy aqui en modo offline, pero sigo conversando contigo. Cuéntame un poco mas y seguimos."
    : "Received. I am here in offline mode, but still chatting with you. Tell me a little more and we will keep going.";
}

async function tryReconnectToOllama() {
  try {
    const models = await fetchModels();
    if (!models.length) return false;
    els.modelSelect.innerHTML = "";
    for (const m of models) {
      const opt = document.createElement("option");
      opt.value = m.name;
      opt.textContent = m.name;
      els.modelSelect.appendChild(opt);
    }
    const stored = loadStoredModel();
    currentModel = models.some(m => m.name === stored)
      ? stored
      : (models.some(m => m.name === DEFAULT_CHAT_MODEL) ? DEFAULT_CHAT_MODEL : models[0].name);
    els.modelSelect.value = currentModel;
    offlineMode = false;
    persistCurrentModel();
    setStatus("ok", `Connected · ${currentModel}`);
    return true;
  } catch {
    return false;
  }
}

function typeOfflineReply(contentEl, text) {
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      i = Math.min(text.length, i + 3);
      contentEl.textContent = text.slice(0, i);
      scrollToBottom();
      if (i >= text.length) return resolve();
      setTimeout(tick, 18);
    };
    tick();
  });
}

// ── Boot ──
loadHistory();
refreshModels();
els.input.focus();
