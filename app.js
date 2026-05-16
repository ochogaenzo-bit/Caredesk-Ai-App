const state = {
  messages: []
};

const apiKeyInput = document.querySelector("#apiKey");
const keyForm = document.querySelector("#keyForm");
const keyStatus = document.querySelector("#keyStatus");
const chat = document.querySelector("#chat");
const chatForm = document.querySelector("#chatForm");
const messageInput = document.querySelector("#messageInput");
const modelSelect = document.querySelector("#model");
const clearChat = document.querySelector("#clearChat");
const sendButton = document.querySelector("#sendButton");

function setKeyStatus(message, type = "") {
  keyStatus.textContent = message;
  keyStatus.className = type;
}

function loadSavedSettings() {
  const savedKey = localStorage.getItem("caredesk_api_key");
  const savedModel = localStorage.getItem("caredesk_model");

  if (savedKey?.startsWith("sk-")) {
    localStorage.removeItem("caredesk_api_key");
    setKeyStatus("Add a Google AI API key before chatting.", "error");
  } else if (savedKey) {
    apiKeyInput.value = savedKey;
    setKeyStatus("API key loaded from this browser.", "ok");
  }

  if (savedModel) {
    modelSelect.value = savedModel;
  }
}

function appendMessage(role, text) {
  const message = document.createElement("article");
  message.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "You" : "AI";

  const body = document.createElement("p");
  body.textContent = text;

  message.append(avatar, body);
  chat.append(message);
  chat.scrollTop = chat.scrollHeight;

  return body;
}

function getApiKey() {
  return apiKeyInput.value.trim();
}

async function sendToAgent(message) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("Add your Google AI API key first.");
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      apiKey,
      model: modelSelect.value,
      message,
      history: state.messages.slice(-10)
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}.`);
  }

  return data.answer;
}

keyForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!getApiKey()) {
    localStorage.removeItem("caredesk_api_key");
    setKeyStatus("Add a Google AI API key before chatting.", "error");
    return;
  }

  localStorage.setItem("caredesk_api_key", getApiKey());
  localStorage.setItem("caredesk_model", modelSelect.value);
  setKeyStatus("API key saved in this browser.", "ok");
});

modelSelect.addEventListener("change", () => {
  localStorage.setItem("caredesk_model", modelSelect.value);
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  state.messages.push({ role: "user", content: message });
  messageInput.value = "";
  sendButton.disabled = true;

  const pending = appendMessage("assistant", "Thinking...");

  try {
    const answer = await sendToAgent(message);
    pending.textContent = answer;
    state.messages.push({ role: "assistant", content: answer });
  } catch (error) {
    pending.textContent = `Could not complete the request: ${error.message}`;
  } finally {
    sendButton.disabled = false;
    messageInput.focus();
  }
});

clearChat.addEventListener("click", () => {
  state.messages = [];
  chat.innerHTML = "";
  appendMessage("assistant", "Chat cleared. Paste the next customer support issue when you are ready.");
});

loadSavedSettings();
