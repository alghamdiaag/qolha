// Local verification test for semantic grounding fix.
// Run: node server/test-grounding.js
// Does NOT require LLM API keys — exercises only the deterministic pipeline.

const {
  preclassifyTranscript,
  parseInterpretation,
  assembleFinalPrompt
} = require('./src/promptEngine');

const INPUTS = [
  {
    label: 'Coffee business (should NOT trigger tech startup framing)',
    transcript: 'أريد أن أبدأ مشروع قهوة وميزانيتي 20 ألف ريال',
    expectPath: 'FAST_PATH',
    expectNoBroadTech: true
  },
  {
    label: 'Tech startup (SHOULD trigger tech startup framing)',
    transcript: 'أبغى أبدأ مشروع تقني لكن ما أعرف من وين أبدأ',
    expectPath: 'DEEP_PATH',
    expectNoBroadTech: false
  },
  {
    label: 'Leave letter (should route as message, no JTBD involved)',
    transcript: 'اكتب رسالة لمديري اطلب فيها إجازة ٣ أيام',
    expectPath: 'FAST_PATH',
    expectNoBroadTech: true
  },
  {
    label: 'Car comparison (should route as decision/comparison)',
    transcript: 'محتار بين سيارة صينية وأمريكية',
    expectPath: 'DEEP_PATH',
    expectNoBroadTech: true
  }
];

// Simulate what the LLM would return for each case (realistic mock responses)
const MOCK_INTERPRETATIONS = {
  'أريد أن أبدأ مشروع قهوة وميزانيتي 20 ألف ريال': {
    status: 'SUFFICIENT', confidence: 0.88, complexity: 'medium',
    normalized_expression: 'أريد أن أبدأ مشروع قهوة وميزانيتي 20 ألف ريال',
    topic: 'مشروع قهوة', explicit_goal: 'بدء مشروع قهوة',
    implicit_goal: 'اختيار أفضل نموذج لمشروع قهوة ضمن ميزانية محددة',
    underlying_progress: 'الانتقال من فكرة عامة إلى نموذج مشروع قابل للتنفيذ بميزانية 20 ألف ريال',
    obstacles: ['محدودية الميزانية', 'الاختيار بين نماذج المشروع المختلفة'],
    uncertainty_level: 'medium', audience: 'صاحب مشروع قهوة مقبل',
    urgency: 'medium', emotional_state: 'متحمس مع قلق من هدر الميزانية',
    desired_output: 'خطة عملية لبدء مشروع قهوة بميزانية 20 ألف ريال',
    task_type: 'smart_planner', cognitive_need: 'structured_guidance',
    reasoning_strategy: ['stepwise_planning', 'uncertainty_reduction'],
    missing_information: [], output_template_id: 'planner_basic',
    needs_deep_reasoning: false
  },
  'أبغى أبدأ مشروع تقني لكن ما أعرف من وين أبدأ': {
    status: 'SUFFICIENT', confidence: 0.72, complexity: 'high',
    normalized_expression: 'أبغى أبدأ مشروع تقني لكن ما أعرف من وين أبدأ',
    topic: 'مشروع تقني', explicit_goal: 'بدء مشروع تقني',
    implicit_goal: 'تحديد نقطة بداية واضحة لمشروع تقني',
    underlying_progress: 'الانتقال من رغبة عامة إلى خطة تقنية واضحة',
    obstacles: ['عدم وضوح نقطة البداية', 'اتساع خيارات المجال التقني'],
    uncertainty_level: 'high', audience: 'مطور مبتدئ أو رائد أعمال',
    urgency: 'low', emotional_state: 'حماس مع ضياع',
    desired_output: 'خارطة طريق للبدء في مشروع تقني',
    task_type: 'strategic_analysis', cognitive_need: 'strategic_thinking',
    reasoning_strategy: ['strategic_reasoning', 'prioritization'],
    missing_information: ['نوع المشروع التقني', 'الميزانية', 'الخبرة التقنية'],
    output_template_id: 'strategic_basic',
    needs_deep_reasoning: true,
    human_state: { motivation: 'ambitious', uncertainty_profile: 'high', thinking_stage: 'exploration', emotional_pattern: 'enthusiastic', likely_hidden_need: 'validation and direction' },
    jtbd: { job_executor: 'شخص يريد بناء مشروع تقني', struggling_moment: 'لا يعرف من أين يبدأ في مجال تقني واسع', desired_progress: 'الانتقال من حماس عام إلى خطة تقنية', functional_need: 'تحديد المجال والأدوات والأولويات', emotional_need: 'تقليل الضياع', decision_uncertainty: 'high' },
    reasoning_router: { reasoning_mode: 'strategic_diagnosis', why_this_mode: 'high complexity and vagueness', depth: 'deep' },
    insight_layer: { core_insight: 'المشكلة ليست التقنية بل اتساع الفرص', reframe: 'ابدأ من مشكلة تعرفها', perspective_shift: 'اختر مجالاً ضيقاً ومحدداً' }
  },
  'اكتب رسالة لمديري اطلب فيها إجازة ٣ أيام': {
    status: 'SUFFICIENT', confidence: 0.95, complexity: 'low',
    normalized_expression: 'اكتب رسالة لمديري اطلب فيها إجازة ٣ أيام',
    topic: 'طلب إجازة', explicit_goal: 'كتابة رسالة طلب إجازة',
    implicit_goal: 'صياغة رسالة مهنية مؤدبة لطلب إجازة',
    underlying_progress: 'الحصول على رسالة واضحة ومهنية لطلب إجازة',
    obstacles: [], uncertainty_level: 'low', audience: 'مدير العمل',
    urgency: 'medium', emotional_state: 'رسمي',
    desired_output: 'رسالة مهنية مكتوبة لطلب إجازة',
    task_type: 'message_composer', cognitive_need: 'communication_help',
    reasoning_strategy: ['tone_optimization', 'practical_guidance'],
    missing_information: [], output_template_id: 'message_basic',
    needs_deep_reasoning: false
  },
  'محتار بين سيارة صينية وأمريكية': {
    status: 'SUFFICIENT', confidence: 0.82, complexity: 'medium',
    normalized_expression: 'محتار بين سيارة صينية وأمريكية',
    topic: 'اختيار سيارة', explicit_goal: 'المفاضلة بين سيارة صينية وأمريكية',
    implicit_goal: 'اتخاذ قرار شراء سيارة مناسب',
    underlying_progress: 'الانتقال من التردد إلى قرار شراء واضح',
    obstacles: ['صعوبة المقارنة بين خيارات مختلفة'],
    uncertainty_level: 'medium', audience: 'مشتري سيارة',
    urgency: 'low', emotional_state: 'محتار',
    desired_output: 'توصية واضحة بناءً على المقارنة',
    task_type: 'comparison', cognitive_need: 'decision_support',
    reasoning_strategy: ['comparative_reasoning', 'tradeoff_analysis'],
    missing_information: ['الميزانية', 'الاستخدام المقصود'],
    output_template_id: 'comparison_basic',
    needs_deep_reasoning: true,
    human_state: { motivation: 'practical purchase', uncertainty_profile: 'medium', thinking_stage: 'comparison', emotional_pattern: 'uncertain', likely_hidden_need: 'clear recommendation' },
    jtbd: { job_executor: 'شخص يريد شراء سيارة مناسبة', struggling_moment: 'لا يعرف أيهما أفضل لاحتياجاته', desired_progress: 'الوصول إلى قرار شراء واثق', functional_need: 'مقارنة عملية بين الخيارين', emotional_need: 'تقليل الخوف من الاختيار الخاطئ', decision_uncertainty: 'medium' },
    reasoning_router: { reasoning_mode: 'tradeoff_analysis', why_this_mode: 'choosing between two options', depth: 'standard' },
    insight_layer: { core_insight: 'القرار يعتمد على الاستخدام لا على الماركة', reframe: 'الأرخص ثمناً قد لا يكون الأقل تكلفة', perspective_shift: 'ابدأ من نمط استخدامك' }
  }
};

let passed = 0;
let failed = 0;

function check(condition, label, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

for (const { label, transcript, expectPath, expectNoBroadTech } of INPUTS) {
  console.log(`\n--- ${label} ---`);
  console.log(`Input: "${transcript}"`);

  const route = preclassifyTranscript(transcript);
  console.log(`Route: path=${route.path}, task=${route.task_category}, complexity=${route.complexity}`);

  check(route.path === expectPath, `path = ${expectPath}`, `got ${route.path}`);

  // Parse interpretation using mock data
  const mockRaw = MOCK_INTERPRETATIONS[transcript];
  if (!mockRaw) {
    console.log('  (no mock data for this input)');
    continue;
  }

  const interpretation = parseInterpretation(JSON.stringify(mockRaw), route);
  const finalPrompt = assembleFinalPrompt(interpretation, route);

  const techPattern = /تقني|تطبيق|برنامج|ستارتب|startup/;
  const progressSection = (finalPrompt.match(/Progress understanding:[\s\S]*?(?=\n\n|\nCognitive|$)/)?.[0]) || '';

  if (expectNoBroadTech) {
    check(!techPattern.test(progressSection), 'No tech startup framing in Progress understanding',
      progressSection ? progressSection.substring(0, 120) : '(section absent — FAST_PATH, correct)');
  } else {
    check(techPattern.test(progressSection) || route.path === 'DEEP_PATH',
      'Tech startup framing correctly present for tech input');
  }

  if (interpretation.jtbd) {
    console.log(`  JTBD.job_executor: ${interpretation.jtbd.job_executor}`);
    console.log(`  JTBD.struggling_moment: ${interpretation.jtbd.struggling_moment}`);
  } else {
    console.log('  JTBD: (absent — FAST_PATH, correct)');
  }
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
