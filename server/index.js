require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const {
  buildInterpretationPrompt,
  buildReflectionPrompt,
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
    duration_ms: 0,
    generation_duration_ms: 0
  };

  try {
    const route = preclassifyTranscript(transcript);
    const generationStartedAt = Date.now();
    const interpretationPrompt = buildInterpretationPrompt(transcript, route);
    const interpretationResult = await callLLM(interpretationPrompt, route);
    const interpretation = parseInterpretation(interpretationResult.text, route);

    let finalPrompt = '';
    let reflectionUsed = false;

    if (interpretation.status === 'SUFFICIENT') {
      finalPrompt = assembleFinalPrompt(interpretation, route);

      if (route.path === 'DEEP_PATH' && shouldReflect(interpretation, finalPrompt)) {
        const reflectionPrompt = buildReflectionPrompt({
          interpretation,
          selectedTemplateId: interpretation.output_template_id,
          finalPrompt
        });
        const reflectionResult = await callLLM(reflectionPrompt, {
          ...route,
          path: 'DEEP_PATH',
          complexity: 'high',
          purpose: 'reflection'
        });
        const improvedPrompt = parseReflection(reflectionResult.text);
        if (improvedPrompt) {
          finalPrompt = improvedPrompt;
          reflectionUsed = true;
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
