const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenAI } = require('@google/genai');

function getProvider() {
  return (process.env.LLM_PROVIDER || 'openai').toLowerCase();
}

function hasEnv(name) {
  return Boolean(process.env[name]);
}

function requireEnv(name, provider) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${provider} is selected but ${name} is not configured`);
  }
  return value;
}

async function callOpenAI(prompt, options = {}) {
  const client = new OpenAI({
    apiKey: requireEnv('OPENAI_API_KEY', 'OpenAI')
  });

  const response = await client.chat.completions.create({
    model: options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: options.maxTokens || 1800,
    temperature: 0.2
  });

  return response.choices?.[0]?.message?.content?.trim() || '';
}

async function callAnthropic(prompt, options = {}) {
  const client = new Anthropic({
    apiKey: requireEnv('ANTHROPIC_API_KEY', 'Anthropic')
  });

  const messages = [{ role: 'user', content: prompt }];

  // Prefill forces the model to start inside a JSON object, preventing preamble or markdown
  if (options.jsonMode) {
    messages.push({ role: 'assistant', content: '{' });
  }

  const requestParams = {
    model: options.model || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
    max_tokens: options.maxTokens || 1800,
    temperature: 0.2,
    messages
  };

  if (options.jsonMode) {
    requestParams.system =
      'You are a JSON output engine. Return only a valid JSON object. No markdown. No code fences. No explanation text.';
  }

  const response = await client.messages.create(requestParams);

  let text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  // Restore the prefilled '{' — Anthropic returns only the continuation after it
  if (options.jsonMode) {
    text = '{' + text;
  }

  return text;
}

async function callGemini(prompt, options = {}) {
  const client = new GoogleGenAI({
    apiKey: requireEnv('GEMINI_API_KEY', 'Gemini')
  });

  const response = await client.models.generateContent({
    model: options.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.2,
      maxOutputTokens: options.maxTokens || 1800
    }
  });

  return response.text?.trim() || '';
}

function selectModelRoute(route = {}) {
  if (route.path === 'FAST_PATH' || route.complexity === 'low') {
    if (hasEnv('GEMINI_API_KEY')) {
      return {
        provider: 'gemini',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        maxTokens: route.maxTokens || 1200
      };
    }

    if (hasEnv('OPENAI_API_KEY')) {
      return {
        provider: 'openai',
        model: process.env.OPENAI_FAST_MODEL || 'gpt-4.1-mini',
        maxTokens: route.maxTokens || 1200
      };
    }
  }

  return {
    provider: 'anthropic',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
    maxTokens: route.maxTokens || (route.purpose === 'reflection' ? 900 : route.path === 'FAST_PATH' ? 1200 : 1800)
  };
}

async function callProvider(prompt, modelRoute) {
  if (modelRoute.provider === 'anthropic') return callAnthropic(prompt, modelRoute);
  if (modelRoute.provider === 'gemini') return callGemini(prompt, modelRoute);
  if (modelRoute.provider === 'openai') return callOpenAI(prompt, modelRoute);

  throw new Error(`Unsupported LLM provider: ${modelRoute.provider}`);
}

async function callLLM(prompt, route = {}) {
  const modelRoute = selectModelRoute(route);
  if (route.jsonMode) modelRoute.jsonMode = true;

  try {
    const text = await callProvider(prompt, modelRoute);
    return {
      text,
      provider: modelRoute.provider,
      model: modelRoute.model
    };
  } catch (error) {
    if (modelRoute.provider !== 'anthropic' && hasEnv('ANTHROPIC_API_KEY')) {
      console.warn(
        `[llm] ${modelRoute.provider} failed, falling back to anthropic: ${error.message}`
      );
      const fallbackRoute = {
        provider: 'anthropic',
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        maxTokens: route.purpose === 'reflection' ? 900 : route.path === 'FAST_PATH' ? 1200 : 1800,
        jsonMode: route.jsonMode
      };
      const text = await callProvider(prompt, fallbackRoute);
      return {
        text,
        provider: fallbackRoute.provider,
        model: fallbackRoute.model
      };
    }

    throw error;
  }
}

module.exports = {
  callOpenAI,
  callAnthropic,
  callGemini,
  callLLM,
  getProvider,
  selectModelRoute
};
