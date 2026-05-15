require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const { generatePrompt } = require('./src/promptEngine');
const { getProvider } = require('./src/llm');

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
        scriptSrc: [
          "'self'",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com"
        ],
        styleSrc: [
          "'self'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://www.google-analytics.com",
          "https://www.googletagmanager.com"
        ],
        connectSrc: [
          "'self'",
          "https://www.google-analytics.com",
          "https://region1.google-analytics.com"
        ],
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
    duration_ms: 0
  };

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM_TIMEOUT')), 25000)
    );

    const result = await Promise.race([
      generatePrompt(transcript),
      timeoutPromise
    ]);

    logData.status = result.status;
    logData.duration_ms = Date.now() - startedAt;
    console.log('[api/process]', JSON.stringify(logData));
    res.json(result);
  } catch (error) {
    logData.duration_ms = Date.now() - startedAt;
    console.log('[api/process]', JSON.stringify(logData));
    console.error(error);
    if (error.message === 'LLM_TIMEOUT') {
      return res.status(504).json({ error: 'Request timed out' });
    }
    res.status(500).json({ error: 'AI processing failed' });
  }
});

app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
