const form = document.getElementById('processForm');
const textarea = document.getElementById('transcript');
const button = document.getElementById('submitButton');
const result = document.getElementById('result');

let promptTextarea = null;

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const transcript = textarea.value.trim();
  if (!transcript) {
    showStatus('اكتب طلبك أولًا');
    textarea.focus();
    return;
  }

  setLoading(true);
  showStatus('جاري التجهيز...');

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'حدثت مشكلة أثناء تجهيز الطلب. حاول مرة أخرى بعد قليل.');
    }

    renderResult(data);
  } catch (error) {
    showStatus(error.message || 'تعذر تجهيز الطلب الآن. تأكد من الاتصال وحاول مرة أخرى.');
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.textContent = isLoading ? 'جاري التجهيز...' : 'جهّز الطلب';
}

function showStatus(message) {
  result.hidden = false;
  promptTextarea = null;
  result.replaceChildren(createElement('p', 'status-text', message));
}

function renderResult(data) {
  result.hidden = false;
  promptTextarea = null;

  if (data.status === 'NEED_MORE_DETAILS') {
    result.replaceChildren(
      createElement('h2', null, 'أضف تفاصيل أكثر'),
      createElement('p', 'muted', 'اكتب الموضوع وما الذي تريد الوصول إليه.')
    );
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
    createElement(
      'p',
      'muted',
      'انسخه والصقه في التطبيق الذي تفضله.'
    ),
    promptTextarea,
    copyButton
  );
}

async function copyPrompt() {
  if (!promptTextarea?.value) return;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(promptTextarea.value);
  } else {
    promptTextarea.focus();
    promptTextarea.select();
    document.execCommand('copy');
  }

  const success = createElement(
    'p',
    'success-message',
    'تم النسخ'
  );

  const existingMessage = result.querySelector('.success-message');
  if (existingMessage) existingMessage.remove();
  result.append(success);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}
