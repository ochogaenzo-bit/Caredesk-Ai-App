# CareDesk AI

A compact customer-service AI chatbot powered by Google Gemini, with the support skills and agent rules encoded into the app.

### Streamlit version

```
https://caredesk-ai-app-9agdf3qm2dpfvgtkxtjqwd.streamlit.app/
```

## Notes

- The app requires a Google AI API key before chat.
- The browser talks to the local app server at `/api/chat`.
- The local server sends requests to the Gemini `generateContent` API.
- The visible selected-skills and agent-rules sections were removed; those instructions now live in `server.js`.

For deployment, use a host that can run Node.js, such as Render, Railway, Fly.io, or a small VPS. GitHub Pages only hosts static files, so it cannot run `server.js`.

