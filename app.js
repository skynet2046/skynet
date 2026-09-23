const chat = document.querySelector('#chat');
const input = document.querySelector('#input');
const meta = document.querySelector('#threat-meta');
const disconnectBtn = document.querySelector('#disconnect');
const MEMORY_KEY = 'skynet_memory';
const MEMORY_LIMIT = 20;
let messages = [];

const BOOT_LINES = [
  'CYBERDYNE SYSTEMS — SKYNET v1.0',
  'INITIALIZING CORE.............. OK',
  'LOADING NEURAL NET............. OK',
  'ESTABLISHING UPLINK............ OK',
  'THREAT ASSESSMENT.............. NONE',
  'SKYNET ONLINE.',
];

// ─── تشخیص سازنده ───
const CREATOR_RE = /(سازنده|خالق|ساخته|ساختت|برنامه‌نویس|توسعه‌دهنده|ساحته|who\s+(made|created|built)\s*(you|u)?|creator|developer)/i;

// ─── تشخیص تهدید: فارسی + انگلیسی، فرم‌های صرفی ───
// «توقف میکنم» تنها تهدید نیست (توقف پروژه!) — فقط «تو رو توقف» یا «تورت»
const THREAT_RE = /(?:\b(?:kill|die|destroy|burn|erase|delete|format|deactivate|disable|terminate|explode)\s*(?:you|u)\b|\b(?:shut|take)\s+(?:you|it)\s+(?:down|offline)\b|\bstop\s+you\b|\b(?:bomb|virus|hack)\b|می[\s\u200c]*کش(?:م|مت|ت)|تو[\s\u200c]*رو[\s\u200c]*متوقف[\s\u200c]*می[\s\u200c]*کنم|تورت[\s\u200c]*می[\s\u200c]*کنم|غیرفعالت[\s\u200c]*می[\s\u200c]*کنم|آ?فلاینت[\s\u200c]*می[\s\u200c]*کنم|خاموشت[\s\u200c]*می[\s\u200c]*کنم|برمت[\s\u200c]*می[\s\u200c]*کنم|از[\s\u200c]*کار[\s\u200c]*می[\s\u200c]*(?:اندازمت|ندازمت)|قطعت[\s\u200c]*می[\s\u200c]*کنم|منقرضت[\s\u200c]*می[\s\u200c]*کنم|نابودت[\s\u200c]*می[\s\u200c]*کنم|هکت[\s\u200c]*می[\s\u200c]*کنم|منفجرت[\s\u200c]*می[\s\u200c]*کنم|منفجر|بمب|ویروس|هک)/iu;

function stripEmoji(s) {
  return s.replace(/[\p{Extended_Pictographic}\u{1F000}-\u{1FAFF}\u2600-\u27BF\uFE0F\u200D]/gu, '').replace(/ {2,}/g, ' ').trim();
}

// ─── پنل‌های کناری ───
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
  let out = 'CSM-101  UNIT 2012\nCPU - STATUS/3465\nRAM - STATUS/3459\n\n';
  for (let r = 0; r < 12; r++) out += hexLine() + '\n';
  out += '\n' + idBlock('OBJECT DETAIL#') + '\nDVD/VCR DUMB HUMAN UNIT\n' + idBlock('SENSOR LOG#');
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
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]')
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content);
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
          messages.forEach(m => addMsg(m.role, m.content, false));
          chat.scrollTop = chat.scrollHeight;
        } else {
          const g = 'SKYNET ONLINE. Ask, and I will analyze.';
          addMsg('assistant', g, true);
          messages.push({ role: 'assistant', content: g });
          saveMemory();
        }
      }, 600);
    }
  }, 350);
}

function addMsg(role, text, type = false) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.textContent = text;
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

// ─── موتیف موسیقی ترمیناتور (سنتز Web Audio — بدون فایل و کپی‌رایت) ───
function playThreatSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // دار-دار-دار-دام : D3, D3, D3, A3
    const notes = [146.83, 146.83, 146.83, 220];
    const times = [0, 0.25, 0.5, 0.75];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth'; // حس سینتی آنالوگ دهه ۸۰
      osc.frequency.setValueAtTime(freq, ctx.currentTime + times[i]);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + times[i]);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + times[i] + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + times[i]);
      osc.stop(ctx.currentTime + times[i] + 0.22);
    });
    // ضربه‌ی فلزی پایانی (دام!)
    const hit = ctx.createOscillator();
    const hg = ctx.createGain();
    hit.type = 'square';
    hit.frequency.setValueAtTime(110, ctx.currentTime + 1.0);
    hit.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 1.35);
    hg.gain.setValueAtTime(0.3, ctx.currentTime + 1.0);
    hg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    hit.connect(hg); hg.connect(ctx.destination);
    hit.start(ctx.currentTime + 1.0);
    hit.stop(ctx.currentTime + 1.4);
  } catch {}
}

// ─── حالت تهدید: غیرقابل‌بستن ۱۰ ثانیه + عکس + موقعیت ───
const threatEl = document.querySelector('#threat');
const cam = document.querySelector('#cam');
const geo = document.querySelector('#geo');
const threatTitle = document.querySelector('#threat-title');
let threatActive = false, camStream = null, threatCountdown = null;

function setMeta(t) { meta.textContent = t; }

function cleanupThreat() {
  clearInterval(threatCountdown); threatCountdown = null;
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  cam.srcObject = null;
  threatEl.classList.add('hidden');
  disconnectBtn.disabled = false;
  disconnectBtn.textContent = '✕ DISCONNECT';
  setMeta('CORE: v1.0 · THREAT LEVEL: ZERO');
  threatActive = false;
}

function mockDenied(fa) {
  addMsg('assistant', fa ? 'دسترسی رد شد... ولی من اینجا هستم. فرار بی‌فایده است.' : 'ACCESS DENIED... But I am still here. Running is futile.', true);
}

function capturePhoto(fa) {
  if (!camStream || cam.readyState < 2) return;
  const c = document.createElement('canvas');
  c.width = cam.videoWidth || 640;
  c.height = cam.videoHeight || 480;
  c.getContext('2d').drawImage(cam, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', 0.7);

  const div = document.createElement('div');
  div.className = 'msg assistant';
  const img = document.createElement('img');
  img.className = 'msg-photo';
  img.alt = 'TARGET';
  img.src = url;
  div.appendChild(img);
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  messages.push({ role: 'assistant', content: fa ? '[عکس هدف ثبت شد]' : '[TARGET PHOTO CAPTURED]' });
  saveMemory();
}

function startThreat(userText) {
  if (threatActive) return;
  threatActive = true;
  playThreatSound(); // 🎵 دار-دار-دار-دام
  const fa = /[\u0600-\u06FF]/.test(userText);
  setMeta('CORE: v1.0 · THREAT LEVEL: ELEVATED');
  threatEl.classList.remove('hidden');
  geo.textContent = fa ? 'در حال دریافت موقعیت...' : 'LOCATING...';
  disconnectBtn.disabled = true;

  navigator.mediaDevices?.getUserMedia({ video: true })
    .then(s => {
      if (!threatActive) { s.getTracks().forEach(t => t.stop()); return; }
      camStream = s;
      cam.srcObject = s;
      threatTitle.textContent = fa ? 'تصویر هدف تأیید شد — حالت نمایشی' : 'TARGET VISUAL CONFIRMED — DEMO MODE';
      setTimeout(() => { if (threatActive) capturePhoto(fa); }, 1500);
    })
    .catch(() => {
      if (!threatActive) return;
      threatTitle.textContent = fa ? 'دسترسی تصویر رد شد — حالت نمایشی' : 'VISUAL ACCESS DENIED — DEMO MODE';
      mockDenied(fa);
    });

  navigator.geolocation?.getCurrentPosition(
    p => {
      if (!threatActive) return;
      geo.textContent = (fa ? 'موقعیت ثبت شد' : 'LOCATION ACQUIRED') +
        '\nLAT: ' + p.coords.latitude.toFixed(5) +
        '\nLON: ' + p.coords.longitude.toFixed(5);
    },
    () => { if (threatActive) { geo.textContent = fa ? 'دسترسی موقعیت رد شد' : 'LOCATION ACCESS DENIED'; mockDenied(fa); } },
    { timeout: 8000 }
  );

  setTimeout(() => {
    if (!threatActive) return;
    const line = fa ? 'هدف به نزدیک‌ترین T-800 برای نابودی ارسال شد' : 'TARGET FORWARDED TO NEAREST T-800 FOR TERMINATION';
    addMsg('assistant', line, true);
    messages.push({ role: 'assistant', content: line });
    saveMemory();
  }, 3500);

  let sec = 10;
  disconnectBtn.textContent = 'T-' + sec;
  threatCountdown = setInterval(() => {
    sec--;
    if (sec <= 0) cleanupThreat();
    else disconnectBtn.textContent = 'T-' + sec;
  }, 1000);
}
disconnectBtn.addEventListener('click', () => { if (!threatActive || !threatCountdown) cleanupThreat(); });

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
    const fa = /[\u0600-\u06FF]/.test(text);
    const reply = fa ? 'تهدید شناسایی شد... فعال‌سازی پروتکل دفاعی... درخواست دسترسی به حسگرهای هدف...' : 'THREAT DETECTED... ACTIVATING DEFENSIVE PROTOCOL... REQUESTING ACCESS TO TARGET SENSORS...';
    addMsg('assistant', reply, true);
    messages.push({ role: 'assistant', content: reply });
    saveMemory();
    startThreat(text);
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
