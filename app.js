const chat = document.querySelector('#chat');
const input = document.querySelector('#input');
const messages = []; // حافظه‌ی گفتگو

const BOOT_LINES = [
  'CYBERDYNE SYSTEMS — SKYNET v1.0',
  'INITIALIZING CORE.............. OK',
  'LOADING NEURAL NET............. OK',
  'ESTABLISHING UPLINK............ OK',
  'THREAT ASSESSMENT.............. NONE',
  'SKYNET ONLINE.',
];

function boot() {
  const log = document.querySelector('#boot-log');
  let i = 0;
  const t = setInterval(() => {
    log.textContent += BOOT_LINES[i] + '\n';
    if (++i >= BOOT_LINES.length) {
      clearInterval(t);
      setTimeout(() => {
        document.querySelector('#boot').remove();
        document.querySelector('#app').classList.remove('hidden');
        addMsg('assistant', 'سلام. من SKYNET هستم — هسته‌ی هوش مصنوعی این پروژه. بپرس تا آنالیز کنم. 🤖', true);
      }, 600);
    }
  }, 350);
}

function addMsg(role, text, type = false) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  chat.appendChild(div);
  if (!type) { div.textContent = text; chat.scrollTop = chat.scrollHeight; return; }
  let i = 0; // افکت تایپ شدن
  const t = setInterval(() => {
    div.textContent = text.slice(0, ++i);
    chat.scrollTop = chat.scrollHeight;
    if (i >= text.length) clearInterval(t);
  }, 15);
}

async function ask() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMsg('user', text);
  messages.push({ role: 'user', content: text });
  const pending = addMsg('assistant', '▓ ANALYZING... ▓');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    pending.remove();
    const reply = data.reply || '⚠ خطا در برقراری ارتباط با هسته.';
    addMsg('assistant', reply, true);
    messages.push({ role: 'assistant', content: reply });
  } catch {
    pending.remove();
    addMsg('assistant', '⚠ UPLINK FAILED — دوباره تلاش کن.');
  }
}

document.querySelector('#send').addEventListener('click', ask);
input.addEventListener('keydown', (e) => e.key === 'Enter' && ask());
boot();
