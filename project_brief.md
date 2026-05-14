You are Claude Code acting as a senior full-stack engineer.

Build a working web prototype called "قلها" inside the current folder.

IMPORTANT:
- Do not build a mobile app.
- Do not build voice recording yet.
- Do not build login.
- Do not build subscriptions.
- Do not overbuild.
- First build Prototype 0: text input → AI prompt engine → final prompt output.

PROJECT GOAL
"قلها" helps Arabic-speaking non-technical users convert natural Arabic speech/text into a structured AI-ready prompt for ChatGPT, Claude, or Gemini.

The real product is not transcription. The real product is:
Arabic natural expression → intent understanding → cognitive mode selection → structured AI prompt.

TECH STACK
Use:
- Node.js
- Express backend
- Simple frontend: HTML, CSS, vanilla JavaScript
- No React for now unless necessary
- OpenAI API on backend only
- Arabic RTL UI

PROJECT STRUCTURE
Create:

/server
  package.json
  index.js
  .env.example

/frontend
  index.html
  style.css
  app.js

README.md
.gitignore

BACKEND REQUIREMENTS

Create Express server with:

GET /health

Returns:
{
  "status": "ok"
}

POST /api/process

Input:
{
  "transcript": "..."
}

Output when sufficient:
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

Output when too vague:
{
  "status": "NEED_MORE_DETAILS",
  "message_ar": "احتاج تفاصيل أكثر عشان أرتب طلبك بشكل أفضل للذكاء الاصطناعي.",
  "helper_ar": "أضف مثلًا: ما الموضوع؟ ماذا تريد؟ ولمن النتيجة؟"
}

PROMPT ENGINE REQUIREMENTS

Do not simply rewrite the transcript.
Implement a layered prompt engine:

1. Clean Arabic speech
2. Extract user intent
3. Classify task type
4. Select cognitive mode
5. Select output format
6. Generate final AI-ready prompt

Supported task_type:
- message_composer
- smart_planner
- decision_advisor
- comparison
- simplifier
- strategic_analysis
- general_help

Supported cognitive_mode:
- tone_optimization
- step_by_step_planning
- tradeoff_analysis
- comparative_reasoning
- simplification
- strategic_reasoning
- practical_guidance

The generated final_prompt should usually use English instructions, but must force the target AI to answer in Arabic using:
"Answer only in Arabic."

The final prompt must include:
- role
- user reality
- user intent
- context
- task type
- cognitive instructions
- constraints
- output format
- missing context handling

Never include:
- chain of thought request
- ultrathink
- IQ200
- jailbreak-style language
- expose
- hidden reasoning request

Use instead:
"Think carefully and provide a concise rationale when useful."
"Do not reveal hidden chain of thought."

OPENAI USAGE

Use OpenAI API from backend only.
Use environment variable:
OPENAI_API_KEY

If OPENAI_API_KEY is missing, return a clear backend error.

Use a modern OpenAI chat model available through the SDK.
If model name is uncertain, define it as an environment variable:
OPENAI_MODEL=gpt-4.1-mini

Create .env.example:
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
PORT=3000

FRONTEND REQUIREMENTS

Arabic RTL mobile-first page.

Page content:
Title:
قلها

Subtitle:
تكلّم بطريقتك، والتطبيق يرتّب طلبك للذكاء الاصطناعي.

Helper text:
قلها كأنك تشرح لصديق ذكي، لكنه ما يعرف الموضوع. قل له: وش الموضوع؟ وش تبغى؟ وليش تحتاجه؟

Main textarea placeholder:
اكتب طلبك هنا الآن، ولاحقًا سنضيف التسجيل الصوتي...

Button:
رتّب طلبي للذكاء الاصطناعي

Loading text:
جاري فهم طلبك...

Result section must show:
- transcript_cleaned
- understanding_summary_ar
- task_type
- cognitive_mode
- final_prompt in editable textarea

Buttons:
- نسخ الطلب
- فتح ChatGPT
- فتح Claude
- فتح Gemini

Open links:
ChatGPT: https://chatgpt.com/
Claude: https://claude.ai/
Gemini: https://gemini.google.com/

UX RULES
- Simple Arabic.
- RTL direction.
- Large readable typography.
- Mobile-first.
- No technical jargon for user.
- If NEED_MORE_DETAILS, show the Arabic message and helper text.
- Do not expose raw JSON to user except task_type/cognitive_mode in small developer-style labels.

ERROR HANDLING
Handle:
- empty transcript
- backend unavailable
- OpenAI failure
- invalid JSON from model

If model returns invalid JSON, attempt one repair or return a safe error.

README REQUIREMENTS
Explain:
1. How to install backend dependencies.
2. How to create .env.
3. How to run backend.
4. How to open frontend locally.
5. How to test with example Arabic input.

IMPLEMENTATION ORDER
1. Create files and structure.
2. Build backend with /health and /api/process.
3. Add OpenAI call with strict JSON response.
4. Build frontend.
5. Connect frontend to backend.
6. Test with this Arabic example:
"أبغى أساعد ولدي يدرس في الصين بس ما أعرف من وين أبدأ"
7. Provide final summary of what was built and exact commands to run.

Start now by creating the files.