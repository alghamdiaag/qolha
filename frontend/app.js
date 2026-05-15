// ─── State ────────────────────────────────────────────────────────────────────

const STATES = { IDLE: 'idle', RECORDING: 'recording', REVIEWING: 'reviewing', TYPING: 'typing' };
let appState = STATES.IDLE;
let recognition = null;
let voiceSupported = false;
let recognitionActive = false;
let finalTranscript = '';
let promptTextarea = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────

const idleView          = document.getElementById('idleView');
const recordingView     = document.getElementById('recordingView');
const reviewView        = document.getElementById('reviewView');
const manualView        = document.getElementById('manualView');
const result            = document.getElementById('result');

const micButton         = document.getElementById('micButton');
const stopMicButton     = document.getElementById('stopMicButton');
const typeToggle        = document.getElementById('typeToggle');
const interimDisplay    = document.getElementById('interimDisplay');
const voiceStatus       = document.getElementById('voiceStatus');
const unsupportedNotice = document.getElementById('unsupportedNotice');

const reviewTranscript  = document.getElementById('reviewTranscript');
const generateButton    = document.getElementById('generateButton');
const retryButton       = document.getElementById('retryButton');

const manualForm            = document.getElementById('manualForm');
const manualTranscript      = document.getElementById('manualTranscript');
const manualGenerateButton  = document.getElementById('manualGenerateButton');
const backToMicButton       = document.getElementById('backToMicButton');

// ─── Views ────────────────────────────────────────────────────────────────────

function setView(state) {
  appState = state;
  idleView.hidden      = state !== STATES.IDLE;
  recordingView.hidden = state !== STATES.RECORDING;
  reviewView.hidden    = state !== STATES.REVIEWING;
  manualView.hidden    = state !== STATES.TYPING;
}

// ─── Voice ────────────────────────────────────────────────────────────────────

function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    voiceSupported = false;
    unsupportedNotice.hidden = false;
    backToMicButton.hidden = true;
    setView(STATES.TYPING);
    return;
  }

  voiceSupported = true;
  recognition = new SR();
  recognition.lang = 'ar-SA';
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    recognitionActive = true;
  };

  recognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) {
        finalTranscript += e.results[i][0].transcript;
      } else {
        interim += e.results[i][0].transcript;
      }
    }
    interimDisplay.textContent = finalTranscript + interim;
  };

  recognition.onend = () => {
    recognitionActive = false;
    if (appState !== STATES.RECORDING) return;
    const text = finalTranscript.trim();
    if (!text) {
      setView(STATES.IDLE);
      voiceStatus.textContent = 'لم يُلتقط كلام';
      showMessage('لم ألتقط كلامًا واضحًا. حاول مرة أخرى أو اكتب طلبك.');
      return;
    }
    reviewTranscript.value = text;
    resizeTextarea(reviewTranscript);
    voiceStatus.textContent = 'انتهى التسجيل — راجع النص';
    setView(STATES.REVIEWING);
    reviewTranscript.focus();
  };

  recognition.onerror = (e) => {
    recognitionActive = false;
    if (e.error === 'aborted') return;
    if (appState !== STATES.RECORDING) return;
    setView(STATES.IDLE);
    if (e.error === 'not-allowed') {
      voiceStatus.textContent = 'لم يُسمح بالميكروفون';
      showMessage('لم يتم السماح باستخدام الميكروفون. يمكنك الكتابة مباشرة.');
    } else {
      voiceStatus.textContent = 'تعذر التسجيل';
      showMessage('لم ألتقط كلامًا واضحًا. حاول مرة أخرى أو اكتب طلبك.');
    }
  };
}

function startRecording() {
  if (!voiceSupported || !recognition || recognitionActive) return;
  finalTranscript = '';
  interimDisplay.textContent = '';
  voiceStatus.textContent = 'جاري الاستماع...';
  setView(STATES.RECORDING);
  try {
    recognition.start();
  } catch (_) {
    setView(STATES.IDLE);
    voiceStatus.textContent = 'تعذر تشغيل الميكروفون';
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

micButton.addEventListener('click', startRecording);

stopMicButton.addEventListener('click', () => recognition?.stop());

typeToggle.addEventListener('click', () => {
  setView(STATES.TYPING);
  manualTranscript.focus();
});

retryButton.addEventListener('click', () => {
  reviewTranscript.value = '';
  startRecording();
});

generateButton.addEventListener('click', () => {
  const text = reviewTranscript.value.trim();
  if (!text) { reviewTranscript.focus(); return; }
  processRequest(text, generateButton, retryButton);
});

manualForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = manualTranscript.value.trim();
  if (!text) { manualTranscript.focus(); return; }
  processRequest(text, manualGenerateButton, null);
});

backToMicButton.addEventListener('click', () => setView(STATES.IDLE));

reviewTranscript.addEventListener('input', () => resizeTextarea(reviewTranscript));
manualTranscript.addEventListener('input',  () => resizeTextarea(manualTranscript));

// ─── API ──────────────────────────────────────────────────────────────────────

async function processRequest(transcript, primaryBtn, secondaryBtn) {
  clearResult();

  primaryBtn.disabled = true;
  primaryBtn.classList.add('is-loading');
  const textEl = primaryBtn.querySelector('.button-text');
  if (textEl) textEl.textContent = 'جاري التوليد...';
  if (secondaryBtn) secondaryBtn.disabled = true;

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });

    if (!response.ok) {
      let data = {};
      try { data = await response.json(); } catch (_) {}
      throw new Error(data.error || 'حدثت مشكلة أثناء تجهيز الطلب');
    }

    const data = await response.json();
    renderResult(data);
  } catch (_) {
    showError('تعذر الاتصال', 'تأكد من اتصال الإنترنت أو حاول مرة أخرى بعد قليل.');
  } finally {
    primaryBtn.disabled = false;
    primaryBtn.classList.remove('is-loading');
    if (textEl) textEl.textContent = 'توليد النتيجة';
    if (secondaryBtn) secondaryBtn.disabled = false;
  }
}

// ─── Result rendering ─────────────────────────────────────────────────────────

function clearResult() {
  promptTextarea = null;
  result.hidden = true;
  result.replaceChildren();
}

function showMessage(message) {
  result.hidden = false;
  promptTextarea = null;
  result.className = 'result-card message-card is-visible';
  result.replaceChildren(createElement('p', 'message-text', message));
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(title, message) {
  result.hidden = false;
  promptTextarea = null;
  result.className = 'result-card message-card is-visible';
  result.replaceChildren(
    createElement('h2', null, title),
    createElement('p', 'muted', message)
  );
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderResult(data) {
  result.hidden = false;
  result.className = 'result-card is-visible';
  promptTextarea = null;

  if (data.status === 'NEED_MORE_DETAILS') {
    result.classList.add('message-card');
    result.replaceChildren(
      createElement('h2', null, 'أضف تفاصيل أكثر عن طلبك'),
      createElement('p', 'muted', 'اكتب الموضوع وما الذي تريد الوصول إليه.')
    );
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  promptTextarea = document.createElement('textarea');
  promptTextarea.className = 'prompt-output';
  promptTextarea.value = data.final_prompt || '';
  promptTextarea.setAttribute('aria-label', 'الطلب الجاهز');
  promptTextarea.spellcheck = false;

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'copy-button';
  copyButton.textContent = 'نسخ الطلب';
  copyButton.addEventListener('click', copyPrompt);

  result.replaceChildren(
    createElement('h2', null, 'الطلب الجاهز'),
    createElement('p', 'muted', 'انسخه واستخدمه في أي تطبيق ذكاء اصطناعي.'),
    promptTextarea,
    copyButton
  );

  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

async function copyPrompt() {
  if (!promptTextarea?.value) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(promptTextarea.value);
  } else {
    promptTextarea.focus();
    promptTextarea.select();
    document.execCommand('copy');
  }
  showToast('تم النسخ');
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = createElement('div', 'toast', message);
  document.body.append(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  window.setTimeout(() => {
    toast.classList.remove('show');
    window.setTimeout(() => toast.remove(), 180);
  }, 1800);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resizeTextarea(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 360)}px`;
}

function createElement(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

initVoice();
