// src/chat-renderer.js — renderer for the Alien chat window.
// Talks to local Ollama (http://localhost:11434) via streaming fetch.
"use strict";

const OLLAMA_HOST = "http://localhost:11434";
const DEFAULT_CHAT_MODEL = "llama3.2";
const STORAGE_KEY_MODEL = "alien.chat.model";
const STORAGE_KEY_HISTORY = "alien.chat.history";
const MAX_HISTORY = 40; // turns (user+assistant pairs trimmed together)

const SYSTEM_PROMPT = [
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
let currentModel = localStorage.getItem(STORAGE_KEY_MODEL) || "";

// ── Status helpers ──
function setStatus(state, text) {
  els.status.className = state || "";
  els.statusText.textContent = text;
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
      localStorage.setItem(STORAGE_KEY_MODEL, currentModel);
    }
    setStatus("ok", `Connected · ${currentModel}`);
    els.send.disabled = false;
  } catch (e) {
    setStatus("err", `Ollama not reachable at ${OLLAMA_HOST} — start it with: ollama serve`);
    els.send.disabled = true;
    els.modelSelect.innerHTML = '<option disabled>Not connected</option>';
  }
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
  localStorage.setItem(STORAGE_KEY_MODEL, currentModel);
  setStatus("ok", `Connected · ${currentModel}`);
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
  if (!currentModel) {
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

  setStatus("thinking", `Thinking… (${currentModel})`);
  setSendingState(true);
  abortController = new AbortController();

  let accumulated = "";
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortController.signal,
      body: JSON.stringify({
        model: currentModel,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
      contentEl.textContent = accumulated || `⚠️ Error: ${err.message}`;
      if (accumulated) messages.push({ role: "assistant", content: accumulated });
      saveHistory();
      setStatus("err", `Error: ${err.message}`);
    }
  } finally {
    wrapper.classList.remove("streaming");
    abortController = null;
    setSendingState(false);
  }
}

// ── Boot ──
loadHistory();
refreshModels();
els.input.focus();
