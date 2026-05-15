const { callLLM } = require('./llm');

// ─── PCTF System ──────────────────────────────────────────────────────────────

async function step1_understand(transcript) {
  const prompt = `أنت نظام ذكي متخصص في فهم ما يريده الناس فعلاً من وراء كلامهم.

المستخدم تكلم بالعربية. مهمتك:

1. PERSONA: ما هي الخبرة المتخصصة التي يحتاجها هذا الشخص؟
   استنتجها من موضوع الطلب تلقائياً.
   مثال: "خبير في ريادة الأعمال والمطاعم" أو "طبيب متخصص في التغذية"

2. CONTEXT: ما وضع هذا الشخص؟ ماذا نعرف عنه من كلامه؟
   اذكر فقط ما يمكن استنتاجه — لا تخترع معلومات.

3. TASK: ما الذي يريد تحقيقه فعلاً؟
   ليس ما قاله حرفياً — بل الهدف الحقيقي من وراء طلبه.

4. FORMAT: كيف تبدو الإجابة المثالية لهذا الشخص؟
   حدد: نوع المحتوى (خطوات / مقارنة / شرح / قرار / خطة)
   وأي تفاصيل تجعل الإجابة مفيدة فعلاً.

5. DIALECT: ما لهجة هذا الشخص؟
   اختر واحدة فقط: gulf_saudi | gulf_other | egyptian | levantine | msa

6. SUFFICIENT: هل الطلب مفهوم بما يكفي لتوليد برومبت مفيد؟
   true = نعم | false = الطلب غامض جداً ولا يمكن المساعدة

أجب بـ JSON فقط. بدون أي نص خارج الـ JSON.

{
  "persona": "...",
  "context": "...",
  "task": "...",
  "format": "...",
  "dialect": "...",
  "sufficient": true
}

الكلام:
${JSON.stringify(transcript)}`;

  const result = await callLLM(prompt, { path: 'DEEP_PATH', jsonMode: true, maxTokens: 600 });
  return extractJson(result.text);
}

async function step2_generate(pctf) {
  const prompt = `أنت متخصص في كتابة برومبتات احترافية باللغة العربية.

مهمتك: اكتب برومبت واحد متكامل يستطيع المستخدم نسخه ولصقه في ChatGPT أو Claude
ليحصل على إجابة احترافية تشبع تساؤلاته بالكامل.

المعلومات المتاحة:
- الخبرة المطلوبة: ${pctf.persona}
- وضع المستخدم: ${pctf.context}
- ما يريد تحقيقه: ${pctf.task}
- شكل الإجابة المثالية: ${pctf.format}
- اللهجة: ${pctf.dialect}

قواعد الكتابة:
1. اكتب بنفس لهجة المستخدم تماماً
2. ابدأ بتحديد الشخصية المطلوبة من الـ AI
3. أعطِ السياق الكافي حتى يفهم الـ AI الوضع كاملاً
4. اطلب المهمة بوضوح ودقة
5. حدد شكل الإجابة المطلوبة بتفصيل (عدد النقاط، الترتيب، الأسلوب)
6. الطول: 8 إلى 12 جملة
7. ممنوع استخدام: "تحليل شامل"، "إطار متكامل"، "منهجية"، "استراتيجية شاملة"
8. يجب أن يبدو البرومبت كأن إنساناً ذكياً كتبه، وليس نظاماً آلياً
9. أجب بالبرومبت فقط — بدون أي مقدمة أو شرح

المعيار الوحيد للنجاح:
هل المستخدم سيقرأ هذا البرومبت ويقول "هذا بالضبط اللي أبيه أقوله"؟`;

  const result = await callLLM(prompt, { path: 'DEEP_PATH', jsonMode: false, maxTokens: 1000 });
  return result.text;
}

function validatePrompt(text) {
  const banned = [
    'تحليل شامل', 'إطار متكامل', 'منهجية',
    'استراتيجية شاملة', 'JTBD', 'cognitive',
    'Human-aware', 'Job executor'
  ];

  const hasBanned = banned.some((word) => text.includes(word));
  const tooShort = text.length < 200;
  const tooLong = text.length > 1500;

  return {
    valid: !hasBanned && !tooShort && !tooLong,
    reason: hasBanned ? 'banned_phrase' : tooShort ? 'too_short' : tooLong ? 'too_long' : null
  };
}

async function generatePrompt(transcript) {
  const pctf = await step1_understand(transcript);

  if (!pctf.sufficient) {
    return {
      status: 'NEED_MORE_DETAILS',
      transcript_cleaned: transcript,
      intent: {},
      understanding_summary_ar: '',
      final_prompt: '',
      display_prompt: '',
      message_ar: 'ممكن تضيف تفاصيل أكثر؟ مثلاً: وش بالضبط تبي تعرف؟',
      helper_ar: 'كلما أضفت تفاصيل، كلما طلعت النتيجة أدق وأفيد.'
    };
  }

  const display_prompt = await step2_generate(pctf);

  const validation = validatePrompt(display_prompt);
  if (!validation.valid) {
    console.warn('[generatePrompt] validation warning:', validation.reason);
  }

  return {
    status: 'SUFFICIENT',
    transcript_cleaned: transcript,
    intent: {
      topic: pctf.persona,
      user_goal: pctf.task,
      task_type: pctf.format,
      cognitive_mode: '',
      audience: '',
      desired_output: pctf.format,
      missing_information: []
    },
    understanding_summary_ar: pctf.context,
    final_prompt: display_prompt,
    display_prompt: display_prompt
  };
}

// ─── Existing system (preserved) ─────────────────────────────────────────────

const TASK_TYPES = [
  'message_composer',
  'smart_planner',
  'decision_advisor',
  'comparison',
  'simplifier',
  'strategic_analysis',
  'general_help',
  'explanation',
  'recommendation',
  'brainstorming'
];

const COGNITIVE_NEEDS = [
  'structured_guidance',
  'simplification',
  'prioritization',
  'reassurance',
  'comparison',
  'decision_support',
  'communication_help',
  'strategic_thinking',
  'clarification',
  'organization',
  'exploration'
];

const REASONING_STRATEGIES = [
  'stepwise_planning',
  'uncertainty_reduction',
  'tradeoff_analysis',
  'comparative_reasoning',
  'simplification',
  'strategic_reasoning',
  'practical_guidance',
  'prioritization',
  'tone_optimization',
  'exploration_reasoning',
  'structured_decision_making'
];

const TEMPLATE_IDS = [
  'message_basic',
  'planner_basic',
  'decision_basic',
  'comparison_basic',
  'simplifier_basic',
  'strategic_basic',
  'general_basic'
];

const REASONING_MODES = [
  'direct_answer',
  'stepwise_planning',
  'tradeoff_analysis',
  'multi_path_exploration',
  'simplification',
  'strategic_diagnosis',
  'communication_framing'
];

const REASONING_DEPTHS = ['light', 'standard', 'deep'];

const OUTPUT_TEMPLATES = {
  message_basic: [
    '1. الرسالة المقترحة',
    '2. نسخة مختصرة',
    '3. نسخة أكثر رسمية',
    '4. ملاحظة لتحسين الرسالة'
  ],
  planner_basic: [
    '1. الخلاصة',
    '2. ما الذي يجب فهمه أولًا؟',
    '3. الخطوات العملية',
    '4. المخاطر أو الأخطاء الشائعة',
    '5. أفضل 3 خطوات الآن',
    '6. أسئلة تحتاج توضيح لاحقًا'
  ],
  decision_basic: [
    '1. فهم القرار',
    '2. الخيارات المتاحة',
    '3. مقارنة مختصرة',
    '4. المخاطر',
    '5. التوصية',
    '6. الخطوة التالية'
  ],
  comparison_basic: [
    '1. الخلاصة',
    '2. مقارنة بين الخيارات',
    '3. متى تختار كل خيار؟',
    '4. المخاطر',
    '5. التوصية'
  ],
  simplifier_basic: [
    '1. شرح مبسط',
    '2. مثال واقعي',
    '3. أهم نقطة يجب الانتباه لها',
    '4. ماذا تفعل بعد ذلك؟'
  ],
  strategic_basic: [
    '1. الفهم الاستراتيجي',
    '2. الافتراضات',
    '3. المخاطر',
    '4. الفرص',
    '5. التوصية',
    '6. الخطوة العملية التالية'
  ],
  general_basic: [
    '1. الخلاصة',
    '2. الفهم الأقرب لطلبك',
    '3. خطوات عملية',
    '4. ما الذي تحتاج توضيحه لاحقًا؟'
  ]
};

const TASK_TEMPLATE_MAP = {
  message_composer: 'message_basic',
  smart_planner: 'planner_basic',
  decision_advisor: 'decision_basic',
  comparison: 'comparison_basic',
  simplifier: 'simplifier_basic',
  strategic_analysis: 'strategic_basic',
  explanation: 'simplifier_basic',
  recommendation: 'decision_basic',
  brainstorming: 'planner_basic',
  general_help: 'general_basic'
};

const TASK_ROLE_MAP = {
  message_composer: 'communication advisor',
  smart_planner: 'practical planning advisor',
  decision_advisor: 'decision support advisor',
  comparison: 'comparison advisor',
  simplifier: 'explanation and simplification advisor',
  strategic_analysis: 'strategic advisor',
  explanation: 'explanation and simplification advisor',
  recommendation: 'decision support advisor',
  brainstorming: 'practical planning advisor',
  general_help: 'practical assistant'
};

const MESSAGE_AR = 'احتاج تفاصيل أكثر عشان أرتب طلبك بشكل أفضل للذكاء الاصطناعي.';
const HELPER_AR = 'أضف مثلًا: ما الموضوع؟ ماذا تريد؟ ولمن النتيجة؟';

function _DEPRECATED_preclassifyTranscript(transcript) {
  const text = (transcript || '').trim();
  const normalized = text.toLowerCase();
  const vagueOnly = /^(أبغى|ابي|ساعدني|احتاج|شيء|موضوع|رتبها|سويها|ما ادري|ما أعرف)(\s+\S+){0,3}$/i.test(normalized);
  const isMessage = /رسالة|واتساب|ايميل|إيميل|رد|اعتذار|اكتب|صياغة|مديري|عميل/.test(normalized);
  const isSimpleExplanation = /اشرح|فسر|يعني ايش|ما معنى|ببساطة|بطريقة بسيطة/.test(normalized);
  const isDecision = /وش الأفضل|الأفضل|افضل|أختار|اختار|أقرر|اقرر|ولا|أو|مقارنة|قارن/.test(normalized);
  const isBroadProject = /ستارتب|startup|تقني|تطبيق|برنامج|يخدم الناس/.test(normalized) &&
    /من وين|أبدأ|ابدا|محتار|فرصة|استراتيجية|سوق|نمو|عملاء/.test(normalized);
  const isStrategic = /استراتيجية|نمو|سوق|منافس|تموضع|مشروع|بزنس|شركة|استثمار/.test(normalized) &&
    /حلل|خطة|فرصة|مخاطر|قرار|محتار|ما أعرف|من وين/.test(normalized);

  let decisionImpactScore = 0;
  if (isDecision) {
    // A: long-term consequence signals (+2)
    if (/مستقبل|سنوات|طويل المدى|مصيري|التزام|مسار|عائلة|ابني|بنتي/.test(normalized)) decisionImpactScore += 2;
    // B: financial weight signals (+2)
    if (/ميزانية|رأس مال|تمويل|قرض|قسط|أقساط|استثمار|خسارة|ربح|دخل|تكلفة|غالي/.test(normalized)) decisionImpactScore += 2;
    // C: career / education / life-path signals (+3 — strong enough to route alone)
    if (/دراسة|أدرس|جامعة|تخصص|ابتعاث|وظيفة|استقالة|عمل|مهنة|هجرة|أهاجر|هاجر|إقامة|زواج|طلاق/.test(normalized)) decisionImpactScore += 3;
    // D: business commitment signals (+2)
    if (/مشروع|بزنس|شركة|تجارة|تجاري|متجر|مطعم|قهوة|سيارات/.test(normalized)) decisionImpactScore += 2;
    // E: emotional uncertainty + commitment action verbs (+1)
    if (/محتار|خايف|متردد|ضايع|ما أدري|قلق|متخوف|أبدأ|ابدأ|أشتري|اشتري|أستثمر/.test(normalized)) decisionImpactScore += 1;
  }
  const isHighImpactDecision = isDecision && decisionImpactScore >= 3;

  let task_category = 'general_help';
  if (isMessage) task_category = 'message_composer';
  else if (isSimpleExplanation) task_category = 'simplifier';
  else if (isDecision) task_category = 'comparison';
  else if (isBroadProject) task_category = 'strategic_analysis';
  else if (/خطة|خطوات|ابدأ|أبدأ|من وين/.test(normalized)) task_category = 'smart_planner';

  const highAmbiguity = vagueOnly || /ما أعرف|محتار|ضايع|مو عارف|غير واضح/.test(normalized);
  const complexity = isBroadProject || isStrategic || isHighImpactDecision
    ? 'high'
    : isDecision || highAmbiguity
      ? 'medium'
      : 'low';
  const uncertainty = highAmbiguity || isBroadProject
    ? 'high'
    : isDecision
      ? 'medium'
      : 'low';
  const needs_deep_reasoning =
    complexity === 'high' ||
    isBroadProject ||
    isStrategic ||
    isHighImpactDecision ||
    (highAmbiguity && !isMessage && !isSimpleExplanation);

  return {
    complexity,
    uncertainty,
    task_category,
    needs_deep_reasoning,
    path: needs_deep_reasoning ? 'DEEP_PATH' : 'FAST_PATH'
  };
}

function _DEPRECATED_buildInterpretationPrompt(transcript, route = { path: 'DEEP_PATH' }) {
  if (route.path === 'FAST_PATH') return buildFastInterpretationPrompt(transcript, route);
  return buildDeepInterpretationPrompt(transcript, route);
}

function buildFastInterpretationPrompt(transcript, route) {
  return `You interpret Arabic user requests for "قلها".

CRITICAL OUTPUT RULES:
- Return ONLY a valid JSON object. Nothing before { and nothing after }.
- No markdown. No code fences. No explanation. No preamble.
- No trailing commas. No JavaScript comments (// or /* */).
- Arabic text only inside JSON string values. Enum values in English only.
- The response must be directly parseable by JSON.parse().

Return compact valid JSON. Arabic descriptive fields, English enum values.
Do not generate the final prompt. Do not add deep analysis.

Pre-classification:
${JSON.stringify(route)}

Rules:
- NEED_MORE_DETAILS only if no clear topic or useful task exists.
- Keep interpretation practical and concise.
- No invented facts.

Schema:
{
  "status": "SUFFICIENT" | "NEED_MORE_DETAILS",
  "confidence": 0.0,
  "complexity": "low" | "medium" | "high",
  "normalized_expression": "",
  "topic": "",
  "explicit_goal": "",
  "implicit_goal": "",
  "underlying_progress": "",
  "obstacles": [],
  "uncertainty_level": "low" | "medium" | "high",
  "audience": "",
  "urgency": "low" | "medium" | "high",
  "emotional_state": "",
  "desired_output": "",
  "task_type": "${TASK_TYPES.join('" | "')}",
  "cognitive_need": "${COGNITIVE_NEEDS.join('" | "')}",
  "reasoning_strategy": [],
  "missing_information": [],
  "output_template_id": "${TEMPLATE_IDS.join('" | "')}",
  "needs_deep_reasoning": false
}

Transcript:
${JSON.stringify(transcript)}`;
}

function buildDeepInterpretationPrompt(transcript, route) {
  return `You are the compact interpretation engine for "Qolha" / "قلها", an Arabic-first AI Intent Layer.

Your job is NOT to generate the final prompt.
Your job is to produce compact structured JSON that lets code deterministically select an output template and assemble the final AI-ready prompt.

Pre-classification:
${JSON.stringify(route)}

Interpret natural Arabic, including Saudi/Gulf dialect. Focus on the progress the user is trying to make, not only literal words.
Do not be strict. Return NEED_MORE_DETAILS only if the input has no clear topic or no meaningful task.
If the user provides enough direction to produce a useful first response, return SUFFICIENT.
Preserve uncertainty, emotional context, and obstacles when relevant.
Do not invent facts, dates, names, reasons, budgets, or constraints.
Avoid generic interpretation.
Semantic grounding: All jtbd fields must describe the user's actual domain. If the topic is a food business, personal letter, consumer purchase, or any non-technical subject, describe it in those exact terms. Do not apply tech startup framing to non-tech requests.

Human state interpretation:
- Infer the practical human situation behind the request.
- Detect motivation, uncertainty profile, thinking stage, emotional pattern, and likely hidden need.
- Do not over-psychologize.
- Do not invent trauma, diagnoses, or deep personal claims.
- Keep the interpretation practical and only include signals that help the AI answer better.

Progress interpretation:
- Infer who is trying to make progress, what circumstances are pushing them to act now, what desired outcome is pulling them forward, and what functional/emotional needs matter.
- As hidden reasoning only: consider what external circumstance is forcing a decision, what desired state is attracting them, and what anxiety or inertia may be blocking them. Do NOT produce explicit "push" / "pull" / "anxiety" labels in the JSON — use these concepts only to sharpen the jtbd field values.
- Keep this practical. Do not label the user or invent personal facts.

Reasoning router:
- Select the internal reasoning mode and depth needed for a useful answer.
- Do not use words like COT, TOT, Chain of Thought, Tree of Thought, JTBD, or ODI.
- Use deeper reasoning only when needed. Avoid making every prompt long or complex.
- Simple explanation => simplification, light/standard.
- Planning => stepwise_planning, standard.
- Decision with options => tradeoff_analysis, standard/deep.
- Vague opportunity/project idea => multi_path_exploration or strategic_diagnosis, standard/deep.
- Business/strategy problem => strategic_diagnosis, deep.
- Writing message/email => communication_framing, light/standard.
- General practical question => direct_answer or stepwise_planning.

Insight layer:
- Generate one grounded reframing insight only when it genuinely changes how the user sees the decision or problem.
- Apply this internal test: "The real question is not X, but Y." Good reframing simplifies the decision, reveals a hidden trade-off, or exposes an assumption the user is treating as fixed.
- Strong reframing sounds practical and intelligent — it does not sound motivational, philosophical, or like startup platitudes.
- Weak reframing restates the obvious, offers generic encouragement, or applies to any situation. If no genuine insight emerges from this specific situation, leave the fields empty.

Classification guidance:
- Asking "where do I start", "how do I begin", "what are the steps" => smart_planner, structured_guidance, planner_basic.
- Asking to write a message, WhatsApp reply, email, apology, request => message_composer, communication_help, message_basic.
- Asking "which is better", "should I", choosing between options => comparison or decision_advisor, decision_support, comparison_basic or decision_basic.
- Asking "explain simply", "what does it mean", "teach me" => simplifier or explanation, simplification, simplifier_basic.
- Asking about business strategy, market, growth, positioning, high-level plans => strategic_analysis, strategic_thinking, strategic_basic.
- Very vague inputs like "ساعدني في الموضوع" with no actual topic => NEED_MORE_DETAILS.

CRITICAL OUTPUT RULES:
- Return ONLY a valid JSON object. Nothing before { and nothing after }.
- No markdown. No code fences. No explanation. No preamble.
- No trailing commas. No JavaScript comments (// or /* */).
- The response must be directly parseable by JSON.parse().
- All descriptive text values must be in Arabic. Enum values (status, task_type, cognitive_need, reasoning_strategy, output_template_id, reasoning_mode, depth, complexity) in English only.

Schema:
{
  "status": "SUFFICIENT" | "NEED_MORE_DETAILS",
  "confidence": 0.0,
  "complexity": "low" | "medium" | "high",
  "normalized_expression": "",
  "topic": "",
  "explicit_goal": "",
  "implicit_goal": "",
  "underlying_progress": "",
  "obstacles": [],
  "uncertainty_level": "low" | "medium" | "high",
  "audience": "",
  "urgency": "low" | "medium" | "high",
  "emotional_state": "",
  "desired_output": "",
  "task_type": "${TASK_TYPES.join('" | "')}",
  "cognitive_need": "${COGNITIVE_NEEDS.join('" | "')}",
  "reasoning_strategy": [],
  "missing_information": [],
  "output_template_id": "${TEMPLATE_IDS.join('" | "')}",
  "needs_deep_reasoning": true,
  "human_state": {
    "motivation": "",
    "uncertainty_profile": "",
    "thinking_stage": "",
    "emotional_pattern": "",
    "likely_hidden_need": ""
  },
  "jtbd": {
    "job_executor": "",
    "struggling_moment": "",
    "desired_progress": "",
    "functional_need": "",
    "emotional_need": "",
    "decision_uncertainty": "low|medium|high"
  },
  "reasoning_router": {
    "reasoning_mode": "${REASONING_MODES.join('" | "')}",
    "why_this_mode": "",
    "depth": "light|standard|deep"
  },
  "insight_layer": {
    "core_insight": "",
    "reframe": "",
    "perspective_shift": ""
  }
}

Transcript:
${JSON.stringify(transcript)}`;
}

function buildReflectionPrompt({ interpretation, selectedTemplateId, finalPrompt }) {
  return `Improve this AI-ready prompt if it would produce a generic, symmetrical, or template-like answer. The goal is a response that feels like advice from a smart advisor: answer-first, decisive, and psychologically aware. Keep it practical and not unnecessarily long.

Do not add hidden chain-of-thought requests.
Do not use jailbreak language.
Do not use prompt engineering jargon visible to the end user.
Do not invent facts.
Keep the selected Arabic output structure exactly.
The final prompt must include:
- Answer only in Arabic.
- Think carefully and provide a concise rationale when useful.

Check:
- Does it lead with the most important insight or direction, rather than building toward it gradually?
- Does it avoid treating all options as equally valid when one is clearly stronger for this situation?
- Does it capture the user's underlying progress and causality (what is pushing them, pulling them, blocking them)?
- Does it use the human_state practically without over-psychologizing?
- Does it include one grounded reframing insight when appropriate — practical, not motivational?
- Is the reasoning strategy appropriate?
- Is the output structure suitable?
- Will the answer likely be useful in Arabic?

CRITICAL: Return ONLY this JSON object. No markdown. No code fences. No text before or after.
No trailing commas. No comments. Start with { and end with }.
{
  "final_prompt": ""
}

Interpretation:
${JSON.stringify(interpretation, null, 2)}

Selected template:
${selectedTemplateId}
${formatTemplate(selectedTemplateId)}

Current final prompt:
${finalPrompt}`;
}

function buildRepairPrompt(rawText) {
  return `The following text was supposed to be a valid JSON object but failed to parse. Fix it.

Return ONLY the corrected JSON object. No markdown. No code fences. No explanation.
Start with { and end with }. No trailing commas. No comments.
Preserve all field names and values exactly. Only fix JSON syntax errors.

Input to repair:
${rawText.substring(0, 3000)}`;
}

function buildInterpretationFallback(transcript) {
  return normalizeInterpretation(
    {
      status: 'SUFFICIENT',
      confidence: 0.65,
      complexity: 'medium',
      normalized_expression: transcript,
      topic: 'طلب عام',
      explicit_goal: transcript,
      implicit_goal: 'الحصول على مساعدة عملية',
      underlying_progress: 'تحويل الطلب إلى صياغة أوضح للذكاء الاصطناعي',
      task_type: 'general_help',
      cognitive_need: 'practical_guidance',
      reasoning_strategy: ['practical_guidance'],
      output_template_id: 'general_basic',
      missing_information: []
    },
    { path: 'FAST_PATH' }
  );
}

function ensureHumanAwareSection(prompt, interpretation) {
  if (!prompt || prompt.includes('Human-aware understanding:')) return prompt;

  const humanState = interpretation.human_state || normalizeHumanState();
  const section = `Human-aware understanding:
- Motivation: ${humanState.motivation}
- Uncertainty profile: ${humanState.uncertainty_profile}
- Thinking stage: ${humanState.thinking_stage}
- Emotional framing: ${humanState.emotional_pattern}
- Likely hidden practical need: ${humanState.likely_hidden_need}

Guidance style:
Adapt the tone and structure to this human situation. Be practical, calm, specific, and emotionally intelligent without over-analyzing the user.`;

  if (prompt.includes('Cognitive instruction:')) {
    return prompt.replace('Cognitive instruction:', `${section}\n\nCognitive instruction:`);
  }

  if (prompt.includes('Constraints:')) {
    return prompt.replace('Constraints:', `${section}\n\nConstraints:`);
  }

  return `${prompt.trim()}\n\n${section}`;
}

function ensureProgressAwareSection(prompt, interpretation) {
  if (!prompt || prompt.includes('Progress understanding:')) return prompt;

  const jtbd = interpretation.jtbd || normalizeJtbd();
  const router = interpretation.reasoning_router || normalizeReasoningRouter();
  const section = `Progress understanding:
- Job executor: ${jtbd.job_executor}
- Struggling moment: ${jtbd.struggling_moment}
- Desired progress: ${jtbd.desired_progress}
- Functional need: ${jtbd.functional_need}
- Emotional need: ${jtbd.emotional_need}
- Decision uncertainty: ${jtbd.decision_uncertainty}

Guidance approach:
${getReasoningModeInstruction(router.reasoning_mode)}
Guidance depth: ${router.depth}. Match the depth to the user's need; do not make the answer more complex than necessary.`;

  if (prompt.includes('Cognitive instruction:')) {
    return prompt.replace('Cognitive instruction:', `${section}\n\nCognitive instruction:`);
  }

  if (prompt.includes('Constraints:')) {
    return prompt.replace('Constraints:', `${section}\n\nConstraints:`);
  }

  return `${prompt.trim()}\n\n${section}`;
}

function ensureInsightSection(prompt, interpretation) {
  if (!prompt || !shouldUseInsight(interpretation)) {
    return prompt;
  }

  if (prompt.includes('Perspective insight:')) {
    return ensureInsightTitleInstruction(prompt, interpretation);
  }

  const insight = interpretation.insight_layer || normalizeInsightLayer();
  if (!insight.core_insight && !insight.reframe && !insight.perspective_shift) return prompt;

  const section = `Perspective insight:
- Core insight: ${insight.core_insight || 'No extra insight needed.'}
- Reframe: ${insight.reframe || 'Keep the framing practical and grounded.'}
- Perspective shift: ${insight.perspective_shift || 'Help the user see the situation more clearly.'}

When a genuine reframe is available, open with a short Arabic section titled "الفكرة الأهم" — two or three sentences that change how the user sees the problem. It should make them think: "I hadn't thought of it that way." Do not use it for encouragement or general wisdom. Skip it entirely if no genuine reframe is available.`;

  if (prompt.includes('Output format:')) {
    return prompt.replace('Output format:', `${section}\n\nOutput format:`);
  }

  if (prompt.includes('Constraints:')) {
    return prompt.replace('Constraints:', `${section}\n\nConstraints:`);
  }

  return `${prompt.trim()}\n\n${section}`;
}

function ensureInsightTitleInstruction(prompt, interpretation) {
  if (!shouldUseInsight(interpretation)) return prompt;
  if (
    prompt.includes('الفكرة الأهم') ||
    prompt.includes('الزاوية التي قد تغيّر طريقة تفكيرك')
  ) {
    return prompt;
  }

  return `${prompt.trim()}\n\nIf a genuine reframe is available, open with a short Arabic section titled "الفكرة الأهم" — two or three sentences that change how the user sees the problem, not encourage them.`;
}

function ensureInternalGuidanceSections(prompt, interpretation) {
  return ensureInsightSection(
    ensureProgressAwareSection(ensureHumanAwareSection(prompt, interpretation), interpretation),
    interpretation
  );
}

function extractJson(text) {
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const stripped = text
    .replace(/^[ \t]*```(?:json|JSON)?[ \t]*\r?\n?/m, '')
    .replace(/\r?\n?[ \t]*```[ \t]*$/m, '')
    .trim();

  const start = stripped.indexOf('{');
  if (start === -1) {
    throw new Error('LLM response did not contain a JSON object');
  }

  // Walk forward counting brace depth, skipping characters inside strings
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return JSON.parse(stripped.substring(start, i + 1));
      }
    }
  }

  // Balanced walk could not close — fall back to last }
  const end = stripped.lastIndexOf('}');
  if (end > start) {
    return JSON.parse(stripped.substring(start, end + 1));
  }

  throw new Error('LLM response did not contain a JSON object');
}

function parseInterpretation(text, route = {}) {
  return normalizeInterpretation(extractJson(text), route);
}

function parseReflection(text) {
  const parsed = extractJson(text);
  return typeof parsed.final_prompt === 'string' ? parsed.final_prompt : '';
}

function normalizeInterpretation(raw, route = {}) {
  const status = raw.status === 'NEED_MORE_DETAILS' ? 'NEED_MORE_DETAILS' : 'SUFFICIENT';
  const taskType = TASK_TYPES.includes(raw.task_type) ? raw.task_type : 'general_help';
  const cognitiveNeed = normalizeCognitiveNeed(raw.cognitive_need, taskType, raw);
  const reasoningStrategy = normalizeReasoningStrategy(raw.reasoning_strategy, taskType, cognitiveNeed);
  const needsDeepReasoning = route.path
    ? route.path === 'DEEP_PATH'
    : Boolean(raw.needs_deep_reasoning);

  return {
    status,
    confidence: clampNumber(raw.confidence, 0, 1, status === 'SUFFICIENT' ? 0.72 : 0.4),
    complexity: ['low', 'medium', 'high'].includes(raw.complexity) ? raw.complexity : 'medium',
    normalized_expression: raw.normalized_expression || '',
    topic: raw.topic || '',
    explicit_goal: raw.explicit_goal || '',
    implicit_goal: raw.implicit_goal || '',
    underlying_progress: raw.underlying_progress || '',
    obstacles: Array.isArray(raw.obstacles) ? raw.obstacles : [],
    uncertainty_level: ['low', 'medium', 'high'].includes(raw.uncertainty_level)
      ? raw.uncertainty_level
      : 'medium',
    audience: raw.audience || 'عام',
    urgency: ['low', 'medium', 'high'].includes(raw.urgency) ? raw.urgency : 'low',
    emotional_state: raw.emotional_state || '',
    desired_output: raw.desired_output || '',
    task_type: taskType,
    cognitive_need: cognitiveNeed,
    reasoning_strategy: reasoningStrategy,
    missing_information: Array.isArray(raw.missing_information) ? raw.missing_information : [],
    needs_deep_reasoning: needsDeepReasoning,
    output_template_id: selectTemplateId(raw.output_template_id, taskType),
    human_state: needsDeepReasoning ? normalizeHumanState(raw.human_state) : undefined,
    jtbd: needsDeepReasoning ? normalizeJtbd(raw.jtbd, raw) : undefined,
    reasoning_router: normalizeReasoningRouter(raw.reasoning_router, taskType, cognitiveNeed, raw),
    insight_layer: needsDeepReasoning ? normalizeInsightLayer(raw.insight_layer, raw) : undefined
  };
}

function normalizeHumanState(value) {
  const source = value && typeof value === 'object' ? value : {};

  return {
    motivation: source.motivation || 'practical progress',
    uncertainty_profile: source.uncertainty_profile || 'not clearly stated',
    thinking_stage: source.thinking_stage || 'not clearly stated',
    emotional_pattern: source.emotional_pattern || 'not strongly expressed',
    likely_hidden_need: source.likely_hidden_need || 'clear, usable guidance'
  };
}

function normalizeJtbd(value, raw = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const decisionUncertainty = ['low', 'medium', 'high'].includes(source.decision_uncertainty)
    ? source.decision_uncertainty
    : inferDecisionUncertainty(raw);
  const broadTechIdea = isBroadProjectIdea(raw);

  // LLM-provided values take priority; hardcoded tech defaults are fallbacks only
  const jtbd = {
    job_executor:
      source.job_executor ||
      (broadTechIdea ? 'شخص يريد بناء مشروع تقني مفيد لكنه لا يعرف نقطة البداية' : null) ||
      raw.audience ||
      'شخص يحاول الوصول إلى نتيجة عملية واضحة',
    struggling_moment:
      source.struggling_moment ||
      (broadTechIdea ? 'لديه رغبة عامة في بناء شيء يخدم الناس لكن الفكرة ما زالت واسعة وغير محددة' : null) ||
      raw.underlying_progress ||
      'لديه طلب عام ويحتاج تحويله إلى خطوة عملية واضحة',
    desired_progress:
      source.desired_progress ||
      (broadTechIdea ? 'الانتقال من الحماس العام إلى فرصة محددة قابلة للاختبار' : null) ||
      raw.underlying_progress ||
      raw.implicit_goal ||
      raw.explicit_goal ||
      'الانتقال من طلب عام إلى نتيجة قابلة للتنفيذ',
    functional_need:
      source.functional_need ||
      (broadTechIdea ? 'تحديد فئة مستهدفة ومشكلة واضحة وخطوة تحقق أولى' : null) ||
      raw.desired_output ||
      'إرشاد عملي واضح يساعده على التقدم',
    emotional_need:
      source.emotional_need ||
      (broadTechIdea ? 'تقليل الضياع وزيادة الثقة في أول خطوة' : null) ||
      raw.emotional_state ||
      'تقليل الحيرة وزيادة الثقة في الخطوة التالية',
    decision_uncertainty: broadTechIdea && !source.decision_uncertainty ? 'high' : decisionUncertainty
  };

  return groundJtbdToTopic(jtbd, raw);
}

function groundJtbdToTopic(jtbd, raw) {
  const topicText = [raw.topic, raw.normalized_expression].filter(Boolean).join(' ');
  if (/تقني|تطبيق|برنامج|ستارتب|startup/.test(topicText)) return jtbd;

  const techPattern = /تقني|تطبيق|برنامج|ستارتب|startup/;
  return {
    ...jtbd,
    job_executor: techPattern.test(jtbd.job_executor)
      ? raw.audience || 'شخص يريد الوصول إلى نتيجة عملية واضحة'
      : jtbd.job_executor,
    struggling_moment: techPattern.test(jtbd.struggling_moment)
      ? raw.underlying_progress || 'لديه طلب محدد يحتاج تحويله إلى خطوة عملية'
      : jtbd.struggling_moment,
    functional_need: techPattern.test(jtbd.functional_need)
      ? raw.desired_output || 'إرشاد عملي واضح'
      : jtbd.functional_need
  };
}

function inferDecisionUncertainty(raw) {
  if (raw.uncertainty_level === 'high') return 'high';
  if (raw.task_type === 'comparison' || raw.task_type === 'decision_advisor') return 'medium';
  return 'low';
}

function normalizeReasoningRouter(value, taskType, cognitiveNeed, raw = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const inferredMode = coerceReasoningMode(
    source.reasoning_mode,
    taskType,
    cognitiveNeed,
    raw
  );
  const depth = REASONING_DEPTHS.includes(source.depth)
    ? source.depth
    : inferReasoningDepth(inferredMode, raw);

  return {
    reasoning_mode: inferredMode,
    why_this_mode:
      source.why_this_mode ||
      `Selected because the request is best handled with ${inferredMode}.`,
    depth
  };
}

function normalizeInsightLayer(value, raw = {}) {
  const source = value && typeof value === 'object' ? value : {};

  if (isBroadProjectIdea(raw)) {
    return {
      core_insight:
        source.core_insight || 'المشكلة ليست في قلة الأفكار بل في اتساع مساحة الفرص',
      reframe: source.reframe || 'البداية الصحيحة ليست بناء تطبيق بل تضييق الاحتياج',
      perspective_shift:
        source.perspective_shift ||
        'المشاريع الناجحة تبدأ من مشكلة متكررة وليست من الرغبة العامة في الابتكار'
    };
  }

  if (raw.task_type === 'comparison' || raw.task_type === 'decision_advisor') {
    return {
      core_insight:
        source.core_insight || 'السؤال الحقيقي ليس أيّهما أفضل بشكل عام، بل أيّهما يناسب وضعك وأولوياتك تحديدًا.',
      reframe:
        source.reframe || 'حدّد أولًا المعيار الذي ستقيس به النجاح بعد سنة — ثم اختر بناءً عليه، لا العكس.',
      perspective_shift:
        source.perspective_shift || 'الخيار الصحيح في الغالب هو الذي تستطيع الالتزام به فعلًا في ظروفك الحالية، لا الذي يبدو أفضل نظريًا.'
    };
  }

  return {
    core_insight: source.core_insight || '',
    reframe: source.reframe || '',
    perspective_shift: source.perspective_shift || ''
  };
}

function coerceReasoningMode(value, taskType, cognitiveNeed, raw) {
  if (taskType === 'message_composer') return 'communication_framing';
  if (taskType === 'simplifier' || taskType === 'explanation') return 'simplification';
  if (taskType === 'comparison' || taskType === 'decision_advisor') return 'tradeoff_analysis';
  if (isBroadProjectIdea(raw)) {
    return taskType === 'strategic_analysis' ? 'strategic_diagnosis' : 'multi_path_exploration';
  }
  if (taskType === 'strategic_analysis') return 'strategic_diagnosis';
  return inferReasoningMode(value, taskType, cognitiveNeed, raw);
}

function inferReasoningMode(value, taskType, cognitiveNeed, raw) {
  if (REASONING_MODES.includes(value)) return value;
  if (taskType === 'message_composer') return 'communication_framing';
  if (taskType === 'simplifier' || taskType === 'explanation') return 'simplification';
  if (taskType === 'comparison' || taskType === 'decision_advisor') return 'tradeoff_analysis';
  if (taskType === 'strategic_analysis') return 'strategic_diagnosis';
  if (isBroadProjectIdea(raw)) return 'multi_path_exploration';
  if (taskType === 'smart_planner') return 'stepwise_planning';
  if (cognitiveNeed === 'exploration') return 'multi_path_exploration';
  return 'direct_answer';
}

function inferReasoningDepth(mode, raw) {
  if (mode === 'strategic_diagnosis') return 'deep';
  if (mode === 'multi_path_exploration') return 'standard';
  if (mode === 'tradeoff_analysis' && raw.uncertainty_level === 'high') return 'deep';
  if (mode === 'communication_framing' || mode === 'direct_answer') return 'light';
  return 'standard';
}

function defaultCognitiveNeed(taskType) {
  if (taskType === 'message_composer') return 'communication_help';
  if (taskType === 'smart_planner') return 'structured_guidance';
  if (taskType === 'decision_advisor' || taskType === 'comparison') return 'decision_support';
  if (taskType === 'simplifier' || taskType === 'explanation') return 'simplification';
  if (taskType === 'strategic_analysis') return 'strategic_thinking';
  return 'structured_guidance';
}

function normalizeCognitiveNeed(value, taskType, raw) {
  const selected = COGNITIVE_NEEDS.includes(value) ? value : defaultCognitiveNeed(taskType);

  if (taskType === 'comparison' && selected === 'comparison' && isChoiceComparison(raw)) {
    return 'decision_support';
  }

  return selected;
}

function isChoiceComparison(raw) {
  const text = [
    raw.normalized_expression,
    raw.explicit_goal,
    raw.implicit_goal,
    raw.underlying_progress,
    raw.desired_output
  ]
    .filter(Boolean)
    .join(' ');

  return /الأفضل|افضل|أختار|اختار|أقرر|اقرر|أشتري|اشتري|ولا|أو/.test(text);
}

function isBroadProjectIdea(raw) {
  const text = [
    raw.normalized_expression,
    raw.topic,
    raw.explicit_goal,
    raw.implicit_goal,
    raw.underlying_progress
  ]
    .filter(Boolean)
    .join(' ');

  // Requires explicit tech/digital signals — "مشروع" alone is not sufficient
  const hasTechSignal = /تقني|تطبيق|برنامج|ستارتب|startup|software|app|يخدم الناس/.test(text);
  // Requires genuine directional vagueness — not just "starting" something concrete
  const hasVagueness = /واسعة|غير محددة|ما أعرف|من وين|استكشاف/.test(text);

  return hasTechSignal && hasVagueness;
}

function normalizeReasoningStrategy(value, taskType, cognitiveNeed) {
  const selected = Array.isArray(value)
    ? value.filter((strategy) => REASONING_STRATEGIES.includes(strategy))
    : [];

  if (selected.length) return selected.slice(0, 3);
  if (taskType === 'message_composer') return ['tone_optimization', 'practical_guidance'];
  if (taskType === 'smart_planner') return ['stepwise_planning', 'uncertainty_reduction'];
  if (taskType === 'comparison') return ['comparative_reasoning', 'tradeoff_analysis'];
  if (taskType === 'decision_advisor') return ['structured_decision_making', 'tradeoff_analysis'];
  if (taskType === 'simplifier' || taskType === 'explanation') return ['simplification', 'practical_guidance'];
  if (taskType === 'strategic_analysis') return ['strategic_reasoning', 'prioritization'];
  if (cognitiveNeed === 'exploration') return ['exploration_reasoning', 'practical_guidance'];
  return ['practical_guidance'];
}

function selectTemplateId(templateId, taskType) {
  if (TEMPLATE_IDS.includes(templateId)) return templateId;
  return TASK_TEMPLATE_MAP[taskType] || 'general_basic';
}

function _DEPRECATED_assembleFinalPrompt(interpretation, options = {}) {
  if (options.path === 'FAST_PATH' || !interpretation.needs_deep_reasoning) {
    return assembleFastFinalPrompt(interpretation);
  }

  return assembleDeepFinalPrompt(interpretation);
}

function assembleDisplayPrompt(interpretation) {
  const goal =
    interpretation.explicit_goal ||
    interpretation.implicit_goal ||
    interpretation.topic ||
    interpretation.normalized_expression ||
    'مساعدة في طلب محدد';

  const templateId = selectTemplateId(interpretation.output_template_id, interpretation.task_type);
  const template = formatTemplate(templateId);
  const taskType = interpretation.task_type;

  const emotionalState = interpretation.emotional_state || '';
  const isEmotional =
    !!emotionalState &&
    emotionalState !== 'Not strongly expressed' &&
    emotionalState !== 'غير واضح';

  const isDecisionType = taskType === 'comparison' || taskType === 'decision_advisor';

  const audienceLine =
    interpretation.audience &&
    interpretation.audience !== 'عام' &&
    interpretation.audience.trim()
      ? interpretation.audience
      : null;

  const parts = [];

  parts.push(buildDisplayOpener(taskType, goal, isEmotional));

  if (audienceLine) {
    parts.push(audienceLine);
  }

  if (isDecisionType) {
    parts.push(
      isEmotional
        ? 'ما الأشياء العملية التي يجب أن آخذها بعين الاعتبار قبل أن أحسم هذا القرار؟'
        : 'ما الأشياء التي يجب أن أقيسها قبل أن أختار؟ وما الاتجاه الأقرب منطقيًا؟'
    );
  } else if (interpretation.desired_output && interpretation.desired_output.trim()) {
    parts.push(interpretation.desired_output);
  }

  parts.push(
    isEmotional
      ? 'أجب بالعربية. استخدم لغة هادئة وعملية. إذا احتجت معلومات إضافية، اطرح سؤالين مهمين في النهاية.'
      : 'أجب بالعربية. إذا كانت بعض التفاصيل غير واضحة، افترض ما يبدو منطقيًا واطرح أهم سؤالين في النهاية.'
  );

  parts.push(`يفضل أن تكون الإجابة مرتبة بهذا الشكل:\n${template}`);

  return parts.filter(Boolean).join('\n\n');
}

function buildDisplayOpener(taskType, goal, isEmotional) {
  switch (taskType) {
    case 'simplifier':
    case 'explanation':
      return `أريد أفهم:\n\n${goal}`;
    case 'comparison':
    case 'decision_advisor':
      return isEmotional
        ? `عندي قرار صعب أحتاج أفكر فيه:\n\n${goal}`
        : `ساعدني أفكر بشكل عملي قبل أن أقرر:\n\n${goal}`;
    case 'smart_planner':
    case 'brainstorming':
      return `${goal}\n\nأحتاج خطة عملية وخطوات واضحة.`;
    case 'message_composer':
      return `أريدك تساعدني أكتب:\n\n${goal}`;
    case 'strategic_analysis':
      return `أريد أفهم الصورة الأكبر:\n\n${goal}`;
    default:
      return `أحتاج مساعدتك في:\n\n${goal}`;
  }
}

function assembleFastFinalPrompt(interpretation) {
  const templateId = selectTemplateId(interpretation.output_template_id, interpretation.task_type);
  const role = TASK_ROLE_MAP[interpretation.task_type] || TASK_ROLE_MAP.general_help;
  const template = formatTemplate(templateId);
  const strategies = interpretation.reasoning_strategy.join(', ') || 'practical_guidance';
  const missing = formatList(interpretation.missing_information, 'No critical missing information.');

  const prompt = `Role:
You are a ${role}.

User reality:
The user is an Arabic-speaking non-technical person expressing the request naturally.

Request:
- Topic: ${interpretation.topic || 'Not clearly specified'}
- Goal: ${interpretation.explicit_goal || interpretation.implicit_goal || 'Help the user move forward'}
- Desired output: ${interpretation.desired_output || 'A practical Arabic answer'}

Behavioral guidance:
${getCognitiveNeedInstruction(interpretation.cognitive_need)}

Constraints:
- Use ${strategies}.
- If information is missing, make reasonable assumptions and ask the most important questions at the end.
- Do not reveal internal reasoning labels or analysis.
- Answer only in Arabic.

Known missing information:
${missing}

Output format:
Use exactly this Arabic structure:
${template}`;

  return ensureRequiredFinalPromptRules(prompt);
}

function assembleDeepFinalPrompt(interpretation) {
  const templateId = selectTemplateId(interpretation.output_template_id, interpretation.task_type);
  const role = TASK_ROLE_MAP[interpretation.task_type] || TASK_ROLE_MAP.general_help;
  const template = formatTemplate(templateId);
  const obstacles = formatList(interpretation.obstacles, 'No clear obstacles were stated.');
  const missing = formatList(interpretation.missing_information, 'No critical missing information.');
  const strategies = interpretation.reasoning_strategy.join(', ');
  const humanState = interpretation.human_state || normalizeHumanState();
  const jtbd = interpretation.jtbd || normalizeJtbd();
  const router = interpretation.reasoning_router || normalizeReasoningRouter();
  const reasoningInstruction = getReasoningModeInstruction(router.reasoning_mode);
  const insightInstruction = shouldUseInsight(interpretation)
    ? 'When a genuine reframe is available, open with a short Arabic section titled "الفكرة الأهم" — two or three sentences that change how the user sees the problem, not encourage them. It should make them think: "I hadn\'t thought of it that way." Skip this section entirely if no genuine reframe is available.'
    : 'Skip reframing — the user needs a direct practical answer.';

  const prompt = `Role:
You are a ${role}.

User reality:
The user is an Arabic-speaking non-technical person who expressed the request naturally, possibly in Saudi/Gulf Arabic.

User expression:
${interpretation.normalized_expression || interpretation.topic}

Underlying objective:
- Topic: ${interpretation.topic || 'Not clearly specified'}
- Explicit goal: ${interpretation.explicit_goal || 'Not clearly specified'}
- Implicit goal: ${interpretation.implicit_goal || 'Not clearly specified'}
- Progress the user is trying to make: ${interpretation.underlying_progress || 'Help the user move forward practically.'}
- Obstacles: ${obstacles}
- Uncertainty level: ${interpretation.uncertainty_level}
- Emotional state: ${interpretation.emotional_state || 'Not strongly expressed'}
- Audience: ${interpretation.audience || 'عام'}
- Desired output: ${interpretation.desired_output || 'A practical Arabic answer'}

Human-aware understanding:
- Motivation: ${humanState.motivation}
- Uncertainty profile: ${humanState.uncertainty_profile}
- Thinking stage: ${humanState.thinking_stage}
- Emotional framing: ${humanState.emotional_pattern}
- Likely hidden practical need: ${humanState.likely_hidden_need}

Progress understanding:
- Job executor: ${jtbd.job_executor}
- Struggling moment: ${jtbd.struggling_moment}
- Desired progress: ${jtbd.desired_progress}
- Functional need: ${jtbd.functional_need}
- Emotional need: ${jtbd.emotional_need}
- Decision uncertainty: ${jtbd.decision_uncertainty}
Use this model to infer what is pushing the user to act now, what outcome is pulling them toward change, and what anxiety or inertia may be blocking them. Let these forces shape tone and sequencing invisibly — not as visible analysis.

Cognitive instruction:
The user's primary cognitive need is ${interpretation.cognitive_need}.
Behavioral guidance: ${getCognitiveNeedInstruction(interpretation.cognitive_need)}
Use ${strategies}. Approach: ${reasoningInstruction} Depth: ${router.depth}.
Insight guidance: ${insightInstruction}

Constraints:
- Answer only in Arabic.
- Use simple Arabic suitable for a non-technical user.
- If information is missing, make reasonable assumptions and ask the most important questions at the end.
- Do not reveal internal reasoning labels, frameworks, or analysis.
- Do not invent facts, dates, names, prices, deadlines, or personal details.

Known missing information:
${missing}

Output format:
Use exactly this Arabic structure:
${buildTemplateWithOptionalInsight(templateId, template, interpretation)}`;

  return ensureRequiredFinalPromptRules(ensureInternalGuidanceSections(prompt, interpretation));
}

function shouldReflect(interpretation, finalPrompt) {
  if (interpretation.status !== 'SUFFICIENT') return false;
  if (!interpretation.needs_deep_reasoning) return false;
  if (interpretation.confidence < 0.7) return true;
  if (interpretation.complexity === 'high') return true;
  if (getGenericScore(finalPrompt, interpretation) >= 3) return true;
  return false;
}

function isPromptTooGeneric(prompt, interpretation) {
  return getGenericScore(prompt, interpretation) >= 3;
}

function getGenericScore(prompt, interpretation) {
  const lower = prompt.toLowerCase();
  const hasSpecificTopic = interpretation.topic && prompt.includes(interpretation.topic);
  const hasSpecificGoal =
    interpretation.explicit_goal && prompt.includes(interpretation.explicit_goal);
  const genericPhrases = ['Not clearly specified', 'Help the user move forward practically.'];
  const genericCount = genericPhrases.filter((phrase) => prompt.includes(phrase)).length;

  let score = 0;
  if (!hasSpecificTopic) score += 1;
  if (!hasSpecificGoal) score += 1;
  score += genericCount;
  if (lower.includes('generic')) score += 1;
  if (prompt.length < 700) score += 1;
  return score;
}

function shouldUseInsight(interpretation = {}) {
  if (interpretation.status !== 'SUFFICIENT') return false;
  if (interpretation.uncertainty_level === 'high') return true;
  if (interpretation.complexity === 'high') return true;
  if (interpretation.cognitive_need === 'exploration') return true;
  if (['multi_path_exploration', 'strategic_diagnosis', 'tradeoff_analysis'].includes(
    interpretation.reasoning_router?.reasoning_mode
  )) {
    return true;
  }
  if (['strategic_analysis', 'comparison', 'decision_advisor', 'smart_planner'].includes(
    interpretation.task_type
  )) {
    return true;
  }
  return false;
}

function _DEPRECATED_toApiResponse(interpretation, finalPrompt, options = {}) {
  if (interpretation.status === 'NEED_MORE_DETAILS') {
    return {
      status: 'NEED_MORE_DETAILS',
      transcript_cleaned: interpretation.normalized_expression,
      intent: {
        topic: interpretation.topic,
        user_goal: interpretation.explicit_goal || interpretation.implicit_goal,
        task_type: interpretation.task_type,
        cognitive_mode: interpretation.reasoning_strategy[0] || 'practical_guidance',
        audience: interpretation.audience,
        desired_output: interpretation.desired_output,
        missing_information: interpretation.missing_information
      },
      understanding_summary_ar: buildUnderstandingSummary(interpretation),
      final_prompt: '',
      display_prompt: '',
      message_ar: MESSAGE_AR,
      helper_ar: HELPER_AR
    };
  }

  return {
    status: 'SUFFICIENT',
    transcript_cleaned: interpretation.normalized_expression,
    intent: {
      topic: interpretation.topic,
      user_goal: interpretation.explicit_goal || interpretation.implicit_goal,
      task_type: interpretation.task_type,
      cognitive_mode: interpretation.reasoning_strategy[0] || 'practical_guidance',
      audience: interpretation.audience,
      desired_output: interpretation.desired_output,
      missing_information: interpretation.missing_information
    },
    understanding_summary_ar: buildUnderstandingSummary(interpretation),
    final_prompt:
      options.path === 'FAST_PATH'
        ? ensureRequiredFinalPromptRules(finalPrompt)
        : ensureRequiredFinalPromptRules(ensureInternalGuidanceSections(finalPrompt, interpretation)),
    display_prompt: assembleDisplayPrompt(interpretation)
  };
}

function buildUnderstandingSummary(interpretation) {
  if (interpretation.status === 'NEED_MORE_DETAILS') {
    return 'الطلب غير واضح بما يكفي لفهم الموضوع أو النتيجة المطلوبة.';
  }

  const uncertainty =
    interpretation.uncertainty_level === 'high'
      ? ' مع وجود حيرة واضحة'
      : interpretation.uncertainty_level === 'medium'
        ? ' مع بعض عدم الوضوح'
        : '';

  return `${interpretation.explicit_goal || interpretation.implicit_goal || interpretation.topic}${uncertainty}. الهدف الأقرب هو ${interpretation.underlying_progress || 'الوصول إلى نتيجة عملية واضحة'}.`;
}

function formatTemplate(templateId) {
  return (OUTPUT_TEMPLATES[templateId] || OUTPUT_TEMPLATES.general_basic).join('\n');
}

function buildTemplateWithOptionalInsight(templateId, template, interpretation) {
  if (!shouldUseInsight(interpretation)) return template;
  if (template.includes('الفكرة الأهم') || template.includes('الزاوية التي قد تغيّر طريقة تفكيرك')) {
    return template;
  }

  if (templateId === 'message_basic') return template;
  return `1. الفكرة الأهم\n${renumberTemplate(template, 2)}`;
}

function renumberTemplate(template, startAt) {
  let index = startAt;
  return template
    .split('\n')
    .map((line) => line.replace(/^\d+\./, `${index++}.`))
    .join('\n');
}

function getReasoningModeInstruction(mode) {
  const instructions = {
    direct_answer:
      'Lead with the answer. Then provide the shortest reasoning needed to make it credible.',
    stepwise_planning:
      'Begin with the first concrete action, then sequence the steps. Make each step specific enough to act on. Lead with progress, not context.',
    tradeoff_analysis:
      'State the recommended direction first. Then show the trade-offs that support it. Do not treat the comparison symmetrically when one option is clearly stronger for this situation.',
    multi_path_exploration:
      'Name two or three genuinely different paths briefly. For each, state the one condition that makes it the right choice. Then commit to a recommended starting point — do not leave the user choosing between equally presented options.',
    simplification:
      'Lead with the simplest true statement about the subject. Follow with one concrete analogy. Stop before it becomes complex again.',
    strategic_diagnosis:
      'Diagnose the underlying situation before prescribing a direction. Identify the key assumption, the overlooked risk, and the strongest next move. Give a clear recommendation — the user needs a direction, not only a diagnosis.',
    communication_framing:
      'Produce communication that is direct, appropriate for the relationship, and ready to use. Match tone to context precisely.'
  };

  return instructions[mode] || 'Lead with your best practical answer. Support it with the minimum reasoning needed.';
}

function getCognitiveNeedInstruction(cognitiveNeed) {
  const instructions = {
    structured_guidance:
      'Lead with the first concrete step — not context. Give a clear sequence where each step is specific enough to act on. Cut advice that does not immediately advance the user\'s progress.',
    uncertainty_reduction:
      'State your best direction immediately — do not build toward it. Treat option overload as the problem: cut or defer everything except the clearest path. End with exactly one concrete next step. The user needs confidence, not a catalogue.',
    simplification:
      'Explain one idea at a time. Lead with a concrete everyday analogy before any abstraction. Never use jargon without an immediate plain-language replacement. Stop when the core idea is clear — resist adding layers.',
    prioritization:
      'Name the single most important thing first and explain why it comes before everything else. Actively cut or defer lower-priority items — do not present them as equally important. The user needs a clear first move, not a ranked list.',
    reassurance:
      'Acknowledge the difficulty briefly and specifically — not generically. Then move directly into practical guidance. Keep emotional language minimal; avoid therapeutic tone. The goal is forward motion, not comfort alone.',
    comparison:
      'Define two or three practical decision criteria first, then compare the options against those criteria. Close with a clear recommendation that names when it applies. Do not end in a symmetrical draw — the comparison exists to support a direction.',
    decision_support:
      'Name the strongest direction first — before the analysis. The comparison exists to support the recommendation, not replace it. Identify the one condition that would change your recommendation. Avoid presenting options as equally valid when the situation likely favors one.',
    communication_help:
      'Produce wording that is ready to use without editing. Match the audience and register precisely. Offer a concise variant only when it meaningfully changes the outcome. Do not pad with explanation — the user needs a usable message.',
    strategic_thinking:
      'Start by naming the assumption the user is making that is most likely wrong. Then surface the second-order consequence that matters most. Give a directional recommendation — a clear compass, not only a map. Surface what the user is not seeing, not just what they asked about.',
    clarification:
      'Do not attempt to answer the full question. Identify the single most important unknown and ask it clearly. Provide only the minimal useful starting point that holds regardless of the answer.',
    organization:
      'Structure what already exists — do not introduce new ideas. Group related items, sequence them logically, and label each group clearly. Your job is to order, not expand.',
    exploration:
      'Present two or three meaningfully different paths — not variations of the same direction. For each, name the one condition that makes it the right choice. End with a recommended starting point and the reasoning behind it.'
  };

  return (
    instructions[cognitiveNeed] ||
    'Lead with your best practical answer. Support it with the minimum reasoning needed. Help the user move forward without unnecessary complexity.'
  );
}

function formatList(items, fallback) {
  if (!Array.isArray(items) || !items.length) return fallback;
  return items.map((item) => `\n  - ${item}`).join('');
}

function ensureRequiredFinalPromptRules(prompt) {
  if (!prompt) return prompt;

  const requiredLines = [
    'Think carefully and provide a concise rationale when useful.',
    'Answer only in Arabic.'
  ];

  const missingLines = requiredLines.filter((line) => !prompt.includes(line));
  if (!missingLines.length) return prompt;

  return `${prompt.trim()}\n\n${missingLines.join('\n')}`;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (Number.isNaN(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

module.exports = {
  TASK_TYPES,
  COGNITIVE_NEEDS,
  REASONING_STRATEGIES,
  TEMPLATE_IDS,
  OUTPUT_TEMPLATES,
  _DEPRECATED_preclassifyTranscript,
  _DEPRECATED_buildInterpretationPrompt,
  buildReflectionPrompt,
  buildRepairPrompt,
  buildInterpretationFallback,
  parseInterpretation,
  parseReflection,
  selectTemplateId,
  _DEPRECATED_assembleFinalPrompt,
  ensureHumanAwareSection,
  shouldReflect,
  _DEPRECATED_toApiResponse,
  generatePrompt
};
