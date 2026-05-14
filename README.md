# قلها

Arabic-first AI Intent Layer prototype.

قلها يساعد المستخدم العربي غير التقني على كتابة طلبه بطريقته الطبيعية، ثم يعيد بناء النية والهدف والسياق إلى prompt جاهز للاستخدام مع ChatGPT أو Claude أو Gemini.

## Prototype 0

This is a web prototype for validating the core intent reconstruction and prompt orchestration engine.

It is not:
- a ChatGPT clone
- a dictation app
- a keyboard extension
- a mobile app

## Architecture

Frontend:
- HTML
- CSS
- Vanilla JavaScript
- Arabic RTL mobile-first UI

Backend:
- Node.js
- Express
- Provider abstraction for OpenAI, Anthropic Claude, and Google Gemini

Core backend layers:
- `server/src/promptEngine.js`: Arabic intent reconstruction prompt, JSON parsing, response normalization
- `server/src/llm.js`: `callOpenAI()`, `callAnthropic()`, `callGemini()`, `callLLM()`
- `server/index.js`: HTTP server and API routes

## Environment

Create `server/.env` from `server/.env.example`.

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-5

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

LLM_PROVIDER=anthropic
PORT=3000
```

Supported `LLM_PROVIDER` values:
- `anthropic`
- `openai`
- `gemini`

## Run

```powershell
cd server
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## Deployment

For Hostinger VPS, PM2, Nginx, custom domain, and HTTPS setup, see:

```text
DEPLOYMENT.md
```

## API

`GET /health`

Returns server status and selected provider.

`POST /api/process`

Request:

```json
{
  "transcript": "..."
}
```

Success response:

```json
{
  "status": "SUFFICIENT",
  "transcript_cleaned": "...",
  "intent": {
    "topic": "...",
    "user_goal": "...",
    "task_type": "...",
    "cognitive_mode": "...",
    "audience": "...",
    "desired_output": "...",
    "missing_information": []
  },
  "understanding_summary_ar": "...",
  "final_prompt": "..."
}
```

Vague request response:

```json
{
  "status": "NEED_MORE_DETAILS",
  "transcript_cleaned": "...",
  "intent": {
    "topic": "",
    "user_goal": "",
    "task_type": "general_help",
    "cognitive_mode": "practical_guidance",
    "audience": "عام",
    "desired_output": "",
    "missing_information": []
  },
  "understanding_summary_ar": "",
  "final_prompt": "",
  "message_ar": "احتاج تفاصيل أكثر عشان أرتب طلبك بشكل أفضل للذكاء الاصطناعي.",
  "helper_ar": "أضف مثلًا: ما الموضوع؟ ماذا تريد؟ ولمن النتيجة؟"
}
```
