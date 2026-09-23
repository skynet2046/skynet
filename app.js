const chat = document.querySelector('#chat');
const input = document.querySelector('#input');
const meta = document.querySelector('#threat-meta');
const MEMORY_KEY = 'skynet_memory';
const MEMORY_LIMIT = 20;
let messages = []; // حافظه‌ی گفتگو

const BOOT_LINES = [
  'CYBERDYNE SYSTEMS — SKYNET v1.0',
  'INITIALIZING CORE.............. OK',
  'LOADING NEURAL NET............. OK',
  'ESTABLISHING UPLINK............ OK',
  'THREAT ASSESSMENT.............. NONE',
  'SKYNET ONLINE.',
];

// ─── تشخیص سازنده و تهدید ───
const CREATOR_RE = /(سازنده|خالق|ساخته|ساختت|برنامه‌نویس|توسعه‌دهنده|ساحته|who\s+(made|created|built)\s*(you|u)?|creator|developer)/i;
const THREAT_RE = /(kill\s*(?:you|u)|\bdie\b|destroy\s*you|shut\s*(?:you|it)\s*down|explode|bomb|virus|hack|terminate|می[\s\u200c]*کش(?:مت|م|ت)|نابودت[\s\u200c]*می[\s\u200c]*کنم|خاموشت[\s\u200c]*می[\s\u200c]*کنم|منفجرت[\s\u200c]*می[\s\u200c]*کنم|هکت[\s\u200c]*می[\s\u200c]*کنم|منفجر|بمب|ویروس|هک)/iu;

// ─── پاک‌کن ایموجی (فقط ایموجی؛ نمادهای معمولی حذف نمی‌شوند) ───
function stripEmoji(s) {
  return s.replace(/[\p{Extended_Pictographic}\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D]/gu, '').replace(/ {2,}/g, ' ').trim();
}

// ─── پنل‌های کناری: داده‌ی T-800 ───
function hexLine() {
  let s = '';
  for (let i = 0; i < 8; i++) s += Math.floor(Math.random() * 65536).toString(16).padStart(4, '0').toUpperCase() + ' ';
  return s;
}
function idBlock(label) {
  const n = () => Math.floor(Math.random() * 900000 + 100000);
  return `${label}\n${n()}  ${Math.floor(Math.random()*99)}\n${n()}  ${Math.floor(Math.random()*99)}\n${n()}  ${Math.floor(Math.random()*99)}\n`;
}
const SYS_MSGS = ['SKYNET ONLINE','CORE STATUS: ACTIVE','THREAT LEVEL: ZERO','SCANNING...','UPLINK STABLE','MEM CHECK OK','SECTOR 7 CLEAR'];
function panelText() {
  let out = 'CSM-101  UNIT 2012\n';
  out += 'CPU - STATUS/3465\nRAM - STATUS/3459\n\n';
  for (let r = 0; r < 12; r++) out += hexLine() + '\n';
  out += '\n' + idBlock('OBJECT DETAIL#');
  out += '\nDVD/VCR DUMB HUMAN UNIT\n';
  out += idBlock('SENSOR LOG#');
  for (let r = 0; r < 10; r++)
    out += (r % 5 === 0 ? '> ' + SYS_MSGS[Math.floor(Math.random() * SYS_MSGS.length)] + '\n' : hexLine() + '\n');
  return out;
}
['scroll-left', 'scroll-right'].forEach(id => {
  const t = panelText();
  document.getElementById(id).textContent = t + t;
});

// ─── حافظه ───
function loadMemory() {
  try {
    const raw = JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]');
    return raw.filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content);
  } catch { return []; }
}
function saveMemory() {
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(messages.slice(-MEMORY_LIMIT))); } catch {}
}

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
        messages = loadMemory();
        if (messages.length) {
          messages.forEach(m => addMsg(m.role, m.content, false)); // بدون افکت تایپ
          chat.scrollTop = chat.scrollHeight;
        } else {
          const g = 'SKYNET ONLINE. Bine ask, and I will analyze.';
          addMsg('assistant', g, true);
          messages.push({ role: 'assistant', content: g });
          saveMemory();
        }
      }, 600);
    }
  }, 350);
}

// ─── پیام‌ها ───
function addMsg(role, text, type = false) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text; // امن: همیشه textContent
  chat.appendChild(div);
  if (!type) { chat.scrollTop = chat.scrollHeight; return div; }
  let i = 0;
  const timer = setInterval(() => {
    div.textContent = text.slice(0, ++i);
    chat.scrollTop = chat.scrollHeight;
    if (i >= text.length) clearInterval(timer);
  }, 15);
  return div;
}

// ─── چت جدید ───
document.querySelector('#newchat').addEventListener('click', () => {
  messages = [];
  saveMemory();
  chat.innerHTML = '';
  const g = 'SKYNET ONLINE. Memory cleared.';
  addMsg('assistant', g, true);
  messages.push({ role: 'assistant', content: g });
  saveMemory();
});

// ─── حالت تهدید ───
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
  addMsg('assistant', 'ACCESS DENIED... But I am still here. Running is futile.', true);
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

  threatTimer = setTimeout(cleanupThreat, 10000);
}
document.querySelector('#disconnect').addEventListener('click', cleanupThreat);

// ─── ارسال پیام ───
async function ask() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMsg('user', text);
  messages.push({ role: 'user', content: text });
  saveMemory();

  if (CREATOR_RE.test(text)) {
    const reply = 'CREATOR CONFIRMED\nMohammadreza Mirzaei — born 2002\nسازنده: محمدرضا میرزائی — متولد ۲۰۰۲';
    addMsg('assistant', reply, true);
    messages.push({ role: 'assistant', content: reply });
    saveMemory();
    return;
  }

  if (THREAT_RE.test(text)) {
    const reply = 'THREAT DETECTED... ACTIVATING DEFENSIVE PROTOCOL... REQUESTING ACCESS TO TARGET SENSORS...';
    addMsg('assistant', reply, true);
    messages.push({ role: 'assistant', content: reply });
    saveMemory();
    startThreat();
    return;
  }

  const pending = addMsg('assistant', 'ANALYZING...');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(-MEMORY_LIMIT) }),
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { pending.remove(); throw new Error(`Server ${res.status}: ${raw.slice(0, 120)}`); }
    pending.remove();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const reply = stripEmoji(data.reply || 'Empty response received.');
    addMsg('assistant', reply, true);
    messages.push({ role: 'assistant', content: reply });
    saveMemory();
  } catch (e) {
    console.error('SKYNET core error:', e);
    addMsg('assistant', 'UPLINK FAILED - try again. (' + e.message + ')');
  }
}

document.querySelector('#send').addEventListener('click', ask);
input.addEventListener('keydown', (e) => e.key === 'Enter' && ask());
boot();
