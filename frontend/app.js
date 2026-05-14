const form = document.getElementById('processForm');
const textarea = document.getElementById('transcript');
const button = document.getElementById('submitButton');
const buttonText = button.querySelector('.button-text');
const result = document.getElementById('result');

let promptTextarea = null;

textarea.addEventListener('input', () => {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 360)}px`;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const transcript = textarea.value.trim();
  if (!transcript) {
    showMessage('اكتب طلبك أولًا');
    textarea.focus();
    return;
  }

  setLoading(true);
  clearResult();

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      throw new Error('تعذر الاتصال');
    }

    if (!response.ok) {
      throw new Error(data.error || 'حدثت مشكلة أثناء تجهيز الطلب');
    }

    renderResult(data);
  } catch (error) {
    showError(
      'تعذر الاتصال',
      'تأكد من اتصال الإنترنت أو حاول مرة أخرى بعد قليل.'
    );
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  button.disabled = isLoading;
  button.classList.toggle('is-loading', isLoading);
  buttonText.textContent = isLoading ? 'جاري تجهيز الطلب...' : 'جهّز الطلب';
}

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

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}
