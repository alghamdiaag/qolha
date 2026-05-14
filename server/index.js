require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const {
  buildInterpretationPrompt,
  buildReflectionPrompt,
  buildRepairPrompt,
  buildInterpretationFallback,
  preclassifyTranscript,
  parseInterpretation,
  parseReflection,
  assembleFinalPrompt,
  shouldReflect,
  toApiResponse
} = require('./src/promptEngine');
const { callLLM, getProvider } = require('./src/llm');

const app = express();
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || '256kb';
const corsOrigin = process.env.CORS_ORIGIN;

app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    }
  })
);
app.use(express.json({ limit: requestBodyLimit }));
app.use((req, res, next) => {
  if (corsOrigin) {
    res.header('Access-Control-Allow-Origin', corsOrigin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: getProvider()
  });
});

app.post('/api/process', async (req, res) => {
  const startedAt = Date.now();
  const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';

  if (!transcript) {
    return res.status(400).json({ error: 'Transcript required' });
  }

  let logData = {
    provider: getProvider(),
    model: 'unknown',
    orchestration_path: 'unknown',
    task_type: 'unknown',
    cognitive_need: 'unknown',
    reasoning_strategy: [],
    confidence: 0,
    complexity: 'unknown',
    output_template_id: 'unknown',
    jtbd_job_executor: 'unknown',
    jtbd_desired_progress: 'unknown',
    reasoning_mode: 'unknown',
    reasoning_depth: 'unknown',
    reflection_used: false,
    reflection_parse_failed: false,
    repair_used: false,
    fallback_used: false,
    parse_error_message: null,
    duration_ms: 0,
    generation_duration_ms: 0
  };

  try {
    const route = preclassifyTranscript(transcript);
    const generationStartedAt = Date.now();
    const interpretationPrompt = buildInterpretationPrompt(transcript, route);
    const interpretationResult = await callLLM(interpretationPrompt, { ...route, jsonMode: true });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[api/process raw_interpretation]', interpretationResult.text.substring(0, 500));
    }

    let interpretation;
    let repairUsed = false;
    let fallbackUsed = false;
    let parseErrorMessage = null;

    try {
      interpretation = parseInterpretation(interpretationResult.text, route);
    } catch (parseErr) {
      parseErrorMessage = parseErr.message;
      try {
        const repairPrompt = buildRepairPrompt(interpretationResult.text);
        const repairResult = await callLLM(repairPrompt, {
          path: 'FAST_PATH',
          purpose: 'repair',
          jsonMode: true
        });
        interpretation = parseInterpretation(repairResult.text, route);
        repairUsed = true;
      } catch (_repairErr) {
        interpretation = buildInterpretationFallback(transcript);
        fallbackUsed = true;
      }
    }

    let finalPrompt = '';
    let reflectionUsed = false;
    let reflectionParseFailed = false;

    if (interpretation.status === 'SUFFICIENT') {
      finalPrompt = assembleFinalPrompt(interpretation, route);

      if (route.path === 'DEEP_PATH' && shouldReflect(interpretation, finalPrompt)) {
        try {
          const reflectionPrompt = buildReflectionPrompt({
            interpretation,
            selectedTemplateId: interpretation.output_template_id,
            finalPrompt
          });
          const reflectionResult = await callLLM(reflectionPrompt, {
            ...route,
            path: 'DEEP_PATH',
            complexity: 'high',
            purpose: 'reflection',
            jsonMode: true
          });

          if (process.env.NODE_ENV !== 'production') {
            console.log('[api/process raw_reflection]', reflectionResult.text.substring(0, 500));
          }

          const improvedPrompt = parseReflection(reflectionResult.text);
          if (improvedPrompt) {
            finalPrompt = improvedPrompt;
            reflectionUsed = true;
          }
        } catch (_reflErr) {
          reflectionParseFailed = true;
          // finalPrompt stays as the originally assembled prompt
        }
      }
    }

    logData = {
      provider: interpretationResult.provider,
      model: interpretationResult.model,
      orchestration_path: route.path,
      needs_deep_reasoning: route.needs_deep_reasoning,
      task_type: interpretation.task_type,
      cognitive_need: interpretation.cognitive_need,
      reasoning_strategy: interpretation.reasoning_strategy,
      confidence: interpretation.confidence,
      complexity: interpretation.complexity,
      output_template_id: interpretation.output_template_id,
      jtbd_job_executor: interpretation.jtbd?.job_executor,
      jtbd_desired_progress: interpretation.jtbd?.desired_progress,
      reasoning_mode: interpretation.reasoning_router?.reasoning_mode,
      reasoning_depth: interpretation.reasoning_router?.depth,
      reflection_used: reflectionUsed,
      reflection_parse_failed: reflectionParseFailed,
      repair_used: repairUsed,
      fallback_used: fallbackUsed,
      parse_error_message: parseErrorMessage,
      duration_ms: Date.now() - startedAt,
      generation_duration_ms: Date.now() - generationStartedAt
    };
    console.log('[api/process]', JSON.stringify(logData));

    const result = toApiResponse(interpretation, finalPrompt, route);
    res.json(result);
  } catch (error) {
    logData.duration_ms = Date.now() - startedAt;
    console.log('[api/process]', JSON.stringify(logData));
    console.error(error);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
