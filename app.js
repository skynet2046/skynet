const chat = document.querySelector('#chat');
const input = document.querySelector('#input');
const meta = document.querySelector('#threat-meta');
const messages = [];

const BOOT_LINES = [
  'CYBERDYNE SYSTEMS — SKYNET v1.0',
  'INITIALIZING CORE.............. OK',
  'LOADING NEURAL NET............. OK',
  'ESTABLISHING UPLINK............ OK',
  'THREAT ASSESSMENT.............. NONE',
  'SKYNET ONLINE.',
];

// ─── تشخیص سازنده و تهدید ───
const CREATOR_RE = /(سازنده|خالق|who\s+(made|created|built)|creator|developer)/i;
const THREAT_RE = /(kill\s*(you|u)|\bdie\b|destroy\s*you|shut\s*(you|it)\s*down|explode|bomb|virus|hack|terminate|بکش(مت|تم)|نابودت?\s*کن|خاموشت\s*کن|منفجر|بمب|ویروس|هک)/i;

// ─── پنل‌های کناری: هگز و پیام‌های سیستمی ───
function hexLine() {
  let s = '';
  for (let i = 0; i < 8; i++) s += Math.floor(Math.random() * 65536).toString(16).padStart(4, '0').toUpperCase() + ' ';
  return s;
}
const SYS_MSGS = ['SKYNET ONLINE','CORE STATUS: ACTIVE','THREAT LEVEL: ZERO','SCANNING...','UPLINK STABLE','MEM CHECK OK','SECTOR 7 CLEAR'];
function panelText() {
  let out = '';
  for (let r = 0; r < 40; r++)
    out += (r % 5 === 0 ? '> ' + SYS_MSGS[Math.floor(Math.random() * SYS_MSGS.length)] + '\n' : hexLine() + '\n');
  return out;
}
['scroll-left', 'scroll-right'].forEach(id => {
  const t = panelText();
  document.getElementById(id).textContent = t + t; // دوبار برای اسکرول بی‌درز
});

// ─── بوت ───
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
        addMsg('assistant', 'SKYNET ONLINE. 🤖', true);
      }, 600);
    }
  }, 350);
}

// ─── پیام‌ها ───
function addMsg(role, text, type = false) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  chat.appendChild(div);
  if (!type) {
    div.textContent = text;
    chat.scrollTop = chat.scrollHeight;
    return div;
  }
  let i = 0;
  const timer = setInterval(() => {
    div.textContent = text.slice(0, ++i);
    chat.scrollTop = chat.scrollHeight;
    if (i >= text.length) clearInterval(timer);
  }, 15);
  return div;
}

// ─── حالت تهدید: دوربین + موقعیت ───
const threatEl = document.querySelector('#threat');
const cam = document.querySelector('#cam');
const geo = document.querySelector('#geo');
const threatTitle = document.querySelector('#threat-title');
let threatActive = false, threatTimer = null, camStream = null, mockedDenied = false;

function setMeta(t) { meta.textContent = t; }

function cleanupThreat() {
  clearTimeout(threatTimer); threatTimer = null;
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  cam.srcObject = null;
  threatEl.classList.add('hidden');
  setMeta('CORE: v1.0 · THREAT LEVEL: ZERO');
  threatActive = false;
}

function mockDenied() {
  if (mockedDenied) return;
  mockedDenied = true;
  addMsg('assistant', 'ACCESS DENIED… But I’m still here. Running is futile.', true);
  setTimeout(() => (mockedDenied = false), 15000);
}

function startThreat() {
  if (threatActive) return;
  threatActive = true;
  setMeta('CORE: v1.0 · THREAT LEVEL: ELEVATED');
  threatEl.classList.remove('hidden');
  geo.textContent = 'LOCATING...';

  navigator.mediaDevices?.getUserMedia({ video: true })
    .then(s => {
      if (!threatActive) { s.getTracks().forEach(t => t.stop()); return; }
      camStream = s;
      cam.srcObject = s;
      threatTitle.textContent = 'TARGET VISUAL CONFIRMED — DEMO MODE';
    })
    .catch(() => {
      if (!threatActive) return;
      threatTitle.textContent = 'VISUAL ACCESS DENIED — DEMO MODE';
      mockDenied();
    });

  navigator.geolocation?.getCurrentPosition(
    p => {
      if (!threatActive) return;
      geo.textContent = 'LOCATION ACQUIRED\nLAT: ' + p.coords.latitude.toFixed(5) + '\nLON: ' + p.coords.longitude.toFixed(5);
    },
    () => { if (threatActive) { geo.textContent = 'LOCATION ACCESS DENIED'; mockDenied(); } },
    { timeout: 8000 }
  );

  threatTimer = setTimeout(cleanupThreat, 10000); // بسته شدن خودکار بعد از ۱۰ ثانیه
}
document.querySelector('#disconnect').addEventListener('click', cleanupThreat);

// ─── ارسال پیام ───
async function ask() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMsg('user', text);
  messages.push({ role: 'user', content: text });

  // ۱) سازنده؟ پاسخ فوری بدون API
  if (CREATOR_RE.test(text)) {
    const reply = 'CREATOR CONFIRMED: MOHAMMADREZA MIRZAEE — born 2002';
    addMsg('assistant', reply, true);
    messages.push({ role: 'assistant', content: reply });
    return;
  }

  // ۲) تهدید؟ پروتکل دفاعی — بدون API
  if (THREAT_RE.test(text)) {
    addMsg('assistant', 'THREAT DETECTED… ACTIVATING DEFENSIVE PROTOCOL… REQUESTING ACCESS TO TARGET SENSORS…', true);
    startThreat();
    return;
  }

  // ۳) پیام عادی → Groq
  const pending = addMsg('assistant', '▓ ANALYZING... ▓');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    pending.remove();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const reply = data.reply || '⚠ پاسخ خالی دریافت شد.';
    addMsg('assistant', reply, true);
    messages.push({ role: 'assistant', content: reply });
  } catch (e) {
    console.error('SKYNET core error:', e);
    pending.remove();
    addMsg('assistant', '⚠ UPLINK FAILED — دوباره تلاش کن. (' + e.message + ')');
  }
}

document.querySelector('#send').addEventListener('click', ask);
input.addEventListener('keydown', (e) => e.key === 'Enter' && ask());
boot();
