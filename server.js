const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const agentInstructions = `
You are CareDesk AI, a compact customer service agent.
Your support skills are encoded internally:
- Issue triage: classify the problem, detect urgency, and ask only for details that are truly missing.
- Refunds and orders: draft clear support replies, request order details when needed, and never invent policy.
- Technical troubleshooting: provide calm step-by-step fixes and include what to try next if a step fails.
- Escalation handoff: summarize the customer issue, sentiment, attempted steps, risk, missing facts, and recommended next action.

Always be warm, concise, and professional.
Never claim to access private customer records, shipping systems, billing tools, or company policy unless the user provides that information.
Escalate legal, medical, safety, account-security, payment-dispute, abusive, or highly sensitive cases to a human support specialist.
When useful, provide a ready-to-send customer reply.
`.trim();

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_GEMINI_ATTEMPTS = 8;

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableGeminiError(response, data) {
  const message = String(data.error?.message || "").toLowerCase();
  return RETRYABLE_STATUS_CODES.has(response.status) || message.includes("retry");
}

function getRetryDelay(attempt) {
  const baseDelay = Math.min(1200 * 2 ** attempt, 15000);
  const jitter = Math.floor(Math.random() * 500);
  return baseDelay + jitter;
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function getOutputText(data) {
  return (data.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("\n")
    .trim();
}

function toGeminiRole(role) {
  return role === "assistant" ? "model" : "user";
}

async function requestGemini({ apiKey, model, contents }) {
  let lastData = {};
  let lastStatus = 500;

  for (let attempt = 0; attempt < MAX_GEMINI_ATTEMPTS; attempt += 1) {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: agentInstructions }]
          },
          contents
        })
      }
    );

    const data = await geminiResponse.json().catch(() => ({}));

    if (geminiResponse.ok) {
      return data;
    }

    lastData = data;
    lastStatus = geminiResponse.status;

    if (!isRetryableGeminiError(geminiResponse, data) || attempt === MAX_GEMINI_ATTEMPTS - 1) {
      const error = new Error(data.error?.message || "Google Gemini request failed.");
      error.status = geminiResponse.status;
      throw error;
    }

    await wait(getRetryDelay(attempt));
  }

  const error = new Error(lastData.error?.message || "Google Gemini request failed after waiting.");
  error.status = lastStatus;
  throw error;
}

async function handleChat(request, response) {
  try {
    const body = JSON.parse(await readRequestBody(request));
    const apiKey = String(body.apiKey || "").trim();
    const model = String(body.model || "gemini-2.5-flash").trim();
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];

    if (!apiKey) {
      sendJson(response, 400, { error: "Missing Google AI API key." });
      return;
    }

    if (!message) {
      sendJson(response, 400, { error: "Missing customer message." });
      return;
    }

    const contents = [
      ...history.map((item) => ({
        role: toGeminiRole(item.role),
        parts: [{ text: String(item.content || "") }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const data = await requestGemini({ apiKey, model, contents });

    sendJson(response, 200, {
      answer: getOutputText(data) || "The model returned no text."
    });
  } catch (error) {
    sendJson(response, error.status || 500, { error: error.message || "Server error." });
  }
}

function serveStatic(request, response) {
  const requestedPath = request.url === "/" ? "/index.html" : request.url;
  const decodedPath = decodeURIComponent(requestedPath.split("?")[0]);
  const filePath = path.normalize(path.join(PUBLIC_DIR, decodedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream"
    });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/chat") {
    handleChat(request, response);
    return;
  }

  if (request.method === "GET") {
    serveStatic(request, response);
    return;
  }

  response.writeHead(405);
  response.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`CareDesk AI is running at http://localhost:${PORT}`);
});
