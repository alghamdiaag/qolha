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

function preclassifyTranscript(transcript) {
  const text = (transcript || '').trim();
  const normalized = text.toLowerCase();
  const vagueOnly = /^(أبغى|ابي|ساعدني|احتاج|شيء|موضوع|رتبها|سويها|ما ادري|ما أعرف)(\s+\S+){0,3}$/i.test(normalized);
  const isMessage = /رسالة|واتساب|ايميل|إيميل|رد|اعتذار|اكتب|صياغة|مديري|عميل/.test(normalized);
  const isSimpleExplanation = /اشرح|فسر|يعني ايش|ما معنى|ببساطة|بطريقة بسيطة/.test(normalized);
  const isDecision = /وش الأفضل|الأفضل|افضل|أختار|اختار|أقرر|اقرر|ولا|أو|مقارنة|قارن/.test(normalized);
  const isBroadProject = /مشروع|ستارتب|startup|تقني|فكرة|بزنس|شركة/.test(normalized) &&
    /من وين|أبدأ|ابدا|محتار|يخدم الناس|فرصة|استراتيجية|سوق|نمو|عملاء/.test(normalized);
  const isStrategic = /استراتيجية|نمو|سوق|منافس|تموضع|مشروع|بزنس|شركة|استثمار/.test(normalized) &&
    /حلل|خطة|فرصة|مخاطر|قرار|محتار|ما أعرف|من وين/.test(normalized);

  let task_category = 'general_help';
  if (isMessage) task_category = 'message_composer';
  else if (isSimpleExplanation) task_category = 'simplifier';
  else if (isDecision) task_category = 'comparison';
  else if (isBroadProject) task_category = 'strategic_analysis';
  else if (/خطة|خطوات|ابدأ|أبدأ|من وين/.test(normalized)) task_category = 'smart_planner';

  const highAmbiguity = vagueOnly || /ما أعرف|محتار|ضايع|مو عارف|غير واضح/.test(normalized);
  const complexity = isBroadProject || isStrategic
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
    (highAmbiguity && !isMessage && !isSimpleExplanation);

  return {
    complexity,
    uncertainty,
    task_category,
    needs_deep_reasoning,
    path: needs_deep_reasoning ? 'DEEP_PATH' : 'FAST_PATH'
  };
}

function buildInterpretationPrompt(transcript, route = { path: 'DEEP_PATH' }) {
  if (route.path === 'FAST_PATH') return buildFastInterpretationPrompt(transcript, route);
  return buildDeepInterpretationPrompt(transcript, route);
}

function buildFastInterpretationPrompt(transcript, route) {
  return `You interpret Arabic user requests for "قلها".
Return compact valid JSON only. Arabic descriptive fields, English enum values.
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

Human state interpretation:
- Infer the practical human situation behind the request.
- Detect motivation, uncertainty profile, thinking stage, emotional pattern, and likely hidden need.
- Do not over-psychologize.
- Do not invent trauma, diagnoses, or deep personal claims.
- Keep the interpretation practical and only include signals that help the AI answer better.

Progress interpretation:
- Infer who is trying to make progress, what struggling moment caused the request, what progress they want, and what functional/emotional needs matter.
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
- Generate one practical perspective-shifting insight when it helps the user progress.
- Ask internally: What assumption should be reframed? What is the user likely misunderstanding? What perspective shift would help?
- Avoid motivational clichés, fake profundity, and over-philosophizing.
- Keep the insight grounded in the user's situation.

Classification guidance:
- Asking "where do I start", "how do I begin", "what are the steps" => smart_planner, structured_guidance, planner_basic.
- Asking to write a message, WhatsApp reply, email, apology, request => message_composer, communication_help, message_basic.
- Asking "which is better", "should I", choosing between options => comparison or decision_advisor, decision_support, comparison_basic or decision_basic.
- Asking "explain simply", "what does it mean", "teach me" => simplifier or explanation, simplification, simplifier_basic.
- Asking about business strategy, market, growth, positioning, high-level plans => strategic_analysis, strategic_thinking, strategic_basic.
- Very vague inputs like "ساعدني في الموضوع" with no actual topic => NEED_MORE_DETAILS.

Return only valid JSON. No markdown. No extra text.
All descriptive natural-language values must be in Arabic. Use English only for enum values such as task_type, cognitive_need, reasoning_strategy, output_template_id, reasoning_mode, depth, status, confidence, and complexity.

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
  return `Improve this AI-ready prompt once if it is too generic or weak. Keep it practical and not unnecessarily long.

Do not add hidden chain-of-thought requests.
Do not use jailbreak language.
Do not use prompt engineering jargon visible to the end user.
Do not invent facts.
Keep the selected Arabic output structure exactly.
The final prompt must include:
- Answer only in Arabic.
- Think carefully and provide a concise rationale when useful.

Check:
- Does it capture the user's underlying progress?
- Does it use the human_state practically without over-psychologizing?
- Does it use the progress understanding and reasoning router without exposing internal labels?
- Does it include one grounded reframing insight when appropriate, without generic encouragement?
- Is the reasoning strategy appropriate?
- Is the output structure suitable?
- Will the answer likely be useful in Arabic?
- Does it reduce uncertainty?

Return only valid JSON:
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

Use this insight only if it genuinely helps. If appropriate, include a short Arabic section titled "الفكرة الأهم" or "الزاوية التي قد تغيّر طريقة تفكيرك". Keep it practical and avoid generic encouragement.`;

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

  return `${prompt.trim()}\n\nIf appropriate, include a short Arabic section titled "الفكرة الأهم" near the beginning.`;
}

function ensureInternalGuidanceSections(prompt, interpretation) {
  return ensureInsightSection(
    ensureProgressAwareSection(ensureHumanAwareSection(prompt, interpretation), interpretation),
    interpretation
  );
}

function extractJson(text) {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    throw new Error('LLM response did not contain a JSON object');
  }

  return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
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
  const broadProjectIdea = isBroadProjectIdea(raw);

  return {
    job_executor:
      broadProjectIdea
        ? 'شخص يريد بناء مشروع تقني مفيد لكنه لا يعرف نقطة البداية'
        :
      source.job_executor || raw.audience || 'شخص يحاول الوصول إلى نتيجة عملية واضحة',
    struggling_moment:
      broadProjectIdea
        ? 'لديه رغبة عامة في بناء شيء يخدم الناس لكن الفكرة ما زالت واسعة وغير محددة'
        :
      source.struggling_moment ||
      raw.underlying_progress ||
      'لديه طلب عام ويحتاج تحويله إلى خطوة عملية واضحة',
    desired_progress:
      broadProjectIdea
        ? 'الانتقال من الحماس العام إلى فرصة محددة قابلة للاختبار'
        :
      source.desired_progress ||
      raw.underlying_progress ||
      raw.implicit_goal ||
      raw.explicit_goal ||
      'الانتقال من طلب عام إلى نتيجة قابلة للتنفيذ',
    functional_need:
      broadProjectIdea
        ? 'تحديد فئة مستهدفة ومشكلة واضحة وخطوة تحقق أولى'
        :
      source.functional_need ||
      raw.desired_output ||
      'إرشاد عملي واضح يساعده على التقدم',
    emotional_need:
      broadProjectIdea
        ? 'تقليل الضياع وزيادة الثقة في أول خطوة'
        :
      source.emotional_need ||
      raw.emotional_state ||
      'تقليل الحيرة وزيادة الثقة في الخطوة التالية',
    decision_uncertainty: broadProjectIdea ? 'high' : decisionUncertainty
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
        source.core_insight || 'القرار لا يتعلق بالخيار الأفضل مطلقًا بل بالخيار الأنسب لظروفك',
      reframe:
        source.reframe || 'الأرخص أو الأشهر ليس دائمًا الأقل تكلفة أو الأعلى قيمة على المدى الطويل',
      perspective_shift:
        source.perspective_shift || 'ابدأ من نمط استخدامك وتحملك للمخاطر قبل مقارنة الخيارات'
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

  return /مشروع|فكرة|تقني|يخدم الناس|ستارتب|startup|ابني/.test(text) &&
    /واسعة|غير محددة|ما أعرف|من وين|أبدأ|استكشاف|فرصة|يخدم الناس/.test(text);
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

function assembleFinalPrompt(interpretation, options = {}) {
  if (options.path === 'FAST_PATH' || !interpretation.needs_deep_reasoning) {
    return assembleFastFinalPrompt(interpretation);
  }

  return assembleDeepFinalPrompt(interpretation);
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

Guidance:
- Use ${strategies}.
- Give a clear, practical answer.
- Focus on the user's real objective, not only the literal wording.
- If information is missing, make reasonable assumptions and ask the most important questions at the end.
- Do not overwhelm the user.
- Do not reveal hidden reasoning.
- Think carefully and provide a concise rationale when useful.
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
    ? 'When appropriate, introduce one useful reframing insight that changes how the user sees the situation, without making the answer long or abstract.'
    : 'Do not force a reframing insight if the user mainly needs a direct practical answer.';

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

Cognitive instruction:
The user's primary cognitive need is ${interpretation.cognitive_need}.
Use these reasoning strategies: ${strategies}.
Guidance approach: ${reasoningInstruction}
Guidance depth: ${router.depth}. Match the depth to the user's need; do not make the answer more complex than necessary.
Insight guidance: ${insightInstruction}
Focus on the user's real objective, not only the literal wording.
Reduce uncertainty and make the next steps clear.
Adapt the tone and guidance style to the human-aware understanding above. Be steady, practical, and emotionally intelligent without over-analyzing the user.

Constraints:
- Answer only in Arabic.
- Use simple Arabic suitable for a non-technical user.
- If information is missing, make reasonable assumptions and ask the most important questions at the end.
- Do not overwhelm the user.
- Do not reveal hidden reasoning.
- Think carefully and provide a concise rationale when useful.
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

function toApiResponse(interpretation, finalPrompt, options = {}) {
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
        : ensureRequiredFinalPromptRules(ensureInternalGuidanceSections(finalPrompt, interpretation))
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
    direct_answer: 'Give a direct, practical answer.',
    stepwise_planning: 'Break the response into clear practical steps.',
    tradeoff_analysis: 'Compare the trade-offs before recommending a direction.',
    multi_path_exploration:
      'Explore a few possible directions, compare them briefly, then recommend the strongest starting point.',
    simplification: 'Explain in simple terms suitable for a beginner.',
    strategic_diagnosis:
      'Diagnose the situation, identify assumptions, risks, and the best next move.',
    communication_framing:
      'Help the user communicate clearly, respectfully, and effectively.'
  };

  return instructions[mode] || instructions.direct_answer;
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
  preclassifyTranscript,
  buildInterpretationPrompt,
  buildReflectionPrompt,
  parseInterpretation,
  parseReflection,
  selectTemplateId,
  assembleFinalPrompt,
  ensureHumanAwareSection,
  shouldReflect,
  toApiResponse
};
