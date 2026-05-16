import random
import time

import requests
import streamlit as st


AGENT_INSTRUCTIONS = """
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
""".strip()

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}
MAX_GEMINI_ATTEMPTS = 8


def build_contents(history, message):
    contents = []

    for item in history[-10:]:
        role = "model" if item["role"] == "assistant" else "user"
        contents.append(
            {
                "role": role,
                "parts": [{"text": item["content"]}],
            }
        )

    contents.append({"role": "user", "parts": [{"text": message}]})
    return contents


def get_output_text(data):
    chunks = []

    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            text = part.get("text", "")
            if text:
                chunks.append(text)

    return "\n".join(chunks).strip() or "The model returned no text."


def is_retryable_error(response, data):
    message = str(data.get("error", {}).get("message", "")).lower()
    return response.status_code in RETRYABLE_STATUS_CODES or "retry" in message


def retry_delay(attempt):
    return min(1.2 * (2**attempt), 15) + random.random() * 0.5


def ask_gemini(api_key, model, message, history):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    params = {"key": api_key}
    payload = {
        "systemInstruction": {
            "parts": [{"text": AGENT_INSTRUCTIONS}],
        },
        "contents": build_contents(history, message),
    }

    last_error = "Google Gemini request failed."

    for attempt in range(MAX_GEMINI_ATTEMPTS):
        response = requests.post(url, params=params, json=payload, timeout=90)

        try:
            data = response.json()
        except ValueError:
            data = {}

        if response.ok:
            return get_output_text(data)

        last_error = data.get("error", {}).get("message", last_error)

        if not is_retryable_error(response, data) or attempt == MAX_GEMINI_ATTEMPTS - 1:
            raise RuntimeError(last_error)

        time.sleep(retry_delay(attempt))

    raise RuntimeError(last_error)


st.set_page_config(page_title="CareDesk AI", page_icon="C", layout="centered")

st.markdown(
    """
    <style>
    .block-container {
        max-width: 920px;
        padding-top: 2rem;
        padding-bottom: 2rem;
    }

    [data-testid="stChatMessage"] {
        border: 1px solid #d8e0da;
        border-radius: 8px;
        padding: 0.75rem;
        background: #ffffff;
    }

    .stButton button {
        border-radius: 8px;
        font-weight: 700;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

if "messages" not in st.session_state:
    st.session_state.messages = []

st.title("CareDesk AI")
st.caption("Customer support chatbot powered by Google Gemini")

with st.sidebar:
    st.header("Setup")
    api_key = st.text_input(
        "Google AI API key",
        type="password",
        placeholder="AIza...",
        help="Create a key in Google AI Studio. Do not paste your key into public code.",
    )
    model = st.selectbox(
        "Model",
        ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
        index=0,
    )

    if st.button("Clear chat", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

if not st.session_state.messages:
    with st.chat_message("assistant"):
        st.write("Hi, I am ready to help with customer support. Add your Google AI API key, then paste a customer message.")

for item in st.session_state.messages:
    with st.chat_message(item["role"]):
        st.write(item["content"])

prompt = st.chat_input("Paste the customer's issue here...")

if prompt:
    if not api_key:
        st.error("Add your Google AI API key in the sidebar before chatting.")
        st.stop()

    previous_messages = list(st.session_state.messages)
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.write(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            try:
                answer = ask_gemini(api_key, model, prompt, previous_messages)
            except Exception as error:
                answer = f"Could not complete the request: {error}"

        st.write(answer)

    st.session_state.messages.append({"role": "assistant", "content": answer})
