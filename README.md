# CareDesk AI

A compact customer-service AI chatbot powered by Google Gemini, with the support skills and agent rules encoded into the app.

### Streamlit version

```
https://caredesk-ai-app-9agdf3qm2dpfvgtkxtjqwd.streamlit.app/
```

## Notes
Users:

• Online customers needing fast support with orders, delivery, and refunds
Problem:

• Long wait times and repetitive customer questions, resulting in constant human review
Why it matters:

• Businesses lose customer satisfaction when support is slow

What was built:

• AI customer service chatbot for common support requests

• Handles order tracking, returns, FAQs, and account help

• Uses Generative AI to create helpful responses

• Designed to have 24/7 customer interaction

• Provides a simple interface for both customers and support staff

Evaluation Process:

• I had compared AI responses to basic scripted chatbot replies.

• Tested common customer support scenarios; Refund requests, delivery delay questioning, return requests, damaged/missing product reports.

• The rubric I had used focused on response accuracy alongside speed and helpfulness.

	 • Did the agent follow the customer’s description of the problem well?
   
	 • Can the agent solve the problem on its own? Is human interference needed?
   
	 • Does it identify customer needs?
   
	 • Does it answer and try to understand the customer’s tone and the severity of the problem?
   
	 • What is the most efficient way for the agent to solve the problem in the quickest possible time?

• Agent has provided complete and helpful responses regarding problems such as delayed orders or refund requests.

• Reduced response time and improved user experience.

Example Screenshots:

https://i.postimg.cc/KYMWdg1d/Screenshot-2026-05-16-010533.png

https://i.postimg.cc/QMTzRWBL/Screenshot-2026-05-16-010640.png

https://i.postimg.cc/g0Z7f6wF/Screenshot-2026-05-16-010653.png

For deployment, use a host that can run Node.js, such as Render, Railway, Fly.io, or a small VPS. GitHub Pages only hosts static files, so it cannot run `server.js`.

For Streamlit Community Cloud, set the app entrypoint to `app.py`.

## Local installation guide

To run this project on your own computer, you need:

- Git, to download the repository.
- Python 3.10 or newer, to run the Streamlit app.
- Node.js 18 or newer, if you want to run the Node version.
- A Google AI Studio API key for Gemini.

Clone the repository:

```bash
git clone https://github.com/ochogaenzo-bit/Caredesk-Ai-App.git
cd Caredesk-Ai-App
```

Run the Streamlit version:

```bash
pip install -r requirements.txt
streamlit run app.py
```

Run the Node version:

```bash
npm start
```

After starting the Node version, open this in your browser:

```text
http://localhost:3000
```
