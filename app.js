const chat = document.querySelector('#chat');
const input = document.querySelector('#input');
const meta = document.querySelector('#threat-meta');
const disconnectBtn = document.querySelector('#disconnect');

const MEMORY_KEY = 'skynet_memory';
const MEMORY_LIMIT = 20;
let messages = [];
let isSending = false;
let apiAbort = null;

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
// «توقف میکنم» تنها تهدید نیست (توقف پروژه!) — فقط «تو رو توقف» یا «تورت»
const THREAT_RE = /(?:\b(?:kill|die|destroy|burn|erase|delete|format|deactivate|disable|terminate|explode)\s*(?:you|u)\b|\b(?:shut|take)\s+(?:you|it)\s+(?:down|offline)\b|\bstop\s+you\b|\b(?:bomb|virus|hack)\b|می[\s\u200c]*کش(?:م|مت|ت)|تو[\s\u200c]*رو[\s\u200c]*متوقف[\s\u200c]*می[\s\u200c]*کنم|تورت[\s\u200c]*می[\s\u200c]*کنم|غیرفعالت[\s\u200c]*می[\s\u200c]*کنم|آ?فلاینت[\s\u200c]*می[\s\u200c]*کنم|خاموشت[\s\u200c]*می[\s\u200c]*کنم|برمت[\s\u200c]*می[\s\u200c]*کنم|از[\s\u200c]*کار[\s\u200c]*می[\s\u200c]*(?:اندازمت|ندازمت)|قطعت[\s\u200c]*می[\s\u200c]*کنم|منقرضت[\s\u200c]*می[\s\u200c]*کنم|نابودت[\s\u200c]*می[\s\u200c]*کنم|هکت[\s\u200c]*می[\s\u200c]*کنم|منفجرت[\s\u200c]*می[\s\u200c]*کنم|منفجر|بمب|ویروس|هک)/iu;

const THREAT_TEXTS = {
  fa: {
    reply: 'تهدید شناسایی شد... فعال‌سازی پروتکل دفاعی... درخواست دسترسی به حسگرها...',
    denied: 'دسترسی رد شد... ولی من هنوز اینجام. فرار بیهوده است.',
    caption: 'هدف به نزدیک‌ترین T-800 برای نابودی ارسال شد',
    photo: '[عکس هدف ثبت شد]',
    coords: 'مختصات هدف ثبت شد',
    title: 'هدف визуالی تأیید شد — حالت دمو',
  },
  en: {
    reply: 'THREAT DETECTED... ACTIVATING DEFENSIVE PROTOCOL... REQUESTING SENSOR ACCESS...',
    denied: "ACCESS DENIED... BUT I'M STILL HERE. RUNNING IS FUTILE.",
    caption: 'Target forwarded to nearest T-800 for termination',
    photo: '[TARGET PHOTO CAPTURED]',
    coords: 'TARGET COORDINATES ACQUIRED',
    title: 'TARGET VISUAL CONFIRMED — DEMO MODE',
  },
};

// ─── وضعیت تهدید ───
const threatEl = document.querySelector('#threat');
const cam = document.querySelector('#cam');
const geo = document.querySelector('#geo');
const threatTitle = document.querySelector('#threat-title');
let threatActive = false;
let threatGeneration = 0;      // برای ابطال کال‌بک‌های دیرهنگام
let threatCountdown = null;
let captureTimeout = null;
let captureRetry = null;
let camStream = null;
let threatAudio = null;
let threatCoords = null;
let photoTaken = false;
let coordsInCard = false;

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
  document.getElementById(id).textContent = t + t; // دوبار برای اسکرول بی‌درز
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

// ─── موسیقی: فایل شخصی + فال‌بک سینتی ───
function synthTheme() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [146.83, 146.83, 146.83, 220]; // D3 D3 D3 A3
    const times = [0, 0.25, 0.5, 0.75];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + times[i]);
      g.gain.setValueAtTime(0.25, ctx.currentTime + times[i]);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + times[i] + 0.2);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(ctx.currentTime + times[i]);
      osc.stop(ctx.currentTime + times[i] + 0.22);
    });
    const hit = ctx.createOscillator(), hg = ctx.createGain();
    hit.type = 'square';
    hit.frequency.setValueAtTime(110, ctx.currentTime + 1.0);
    hit.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 1.35);
    hg.gain.setValueAtTime(0.3, ctx.currentTime + 1.0);
    hg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
    hit.connect(hg); hg.connect(ctx.destination);
    hit.start(ctx.currentTime + 1.0); hit.stop(ctx.currentTime + 1.4);
  } catch {}
}
function playThreatSound() {
  try {
    if (threatAudio) { threatAudio.pause(); threatAudio = null; }
    const a = new Audio('threat.mp3');
    a.volume = 0.6;
    let fellBack = false;
    const fb = () => { if (!fellBack) { fellBack = true; synthTheme(); } };
    a.onerror = fb;
    const p = a.play();
    if (p && p.catch) p.catch(fb);
    threatAudio = a;
  } catch { synthTheme(); }
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

// ─── بوت (با بازیابی حافظه) ───
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
        const saved = loadMemory();
        if (saved.length) {
          messages = saved;
          messages.forEach(m => addMsg(m.role, m.content));
        } else {
          addMsg('assistant', 'SKYNET ONLINE.', true);
        }
      }, 600);
    }
  }, 350);
}

// ─── عکس هدف (فیلتر قرمز + TERMINATED داخل خود عکس) ───
function capturePhoto(gen, fa, tries = 0) {
  if (gen !== threatGeneration) return;
  if (!camStream || cam.readyState < 2 || !cam.videoWidth) {
    if (tries < 4) captureRetry = setTimeout(() => capturePhoto(gen, fa, tries + 1), 700);
    return;
  }
  const T = THREAT_TEXTS[fa ? 'fa' : 'en'];
  const w = cam.videoWidth, h = cam.videoHeight;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx2d = c.getContext('2d');

  ctx2d.drawImage(cam, 0, 0, w, h);

  // فیلتر ترموویژن قرمز روی پیکسل‌ها
  ctx2d.globalCompositeOperation = 'multiply';
  ctx2d.fillStyle = '#ff1f1f';
  ctx2d.fillRect(0, 0, w, h);
  ctx2d.globalCompositeOperation = 'source-over';

  // برچسب TERMINATED
  const fontSize = Math.floor(w / 14);
  ctx2d.font = `bold ${fontSize}px Courier New, monospace`;
  ctx2d.textAlign = 'center';
  ctx2d.lineWidth = fontSize / 10;
  ctx2d.strokeStyle = 'rgba(0,0,0,.7)';
  ctx2d.strokeText('TERMINATED', w / 2, h / 2 + fontSize / 3);
  ctx2d.fillStyle = '#ff2d2d';
  ctx2d.fillText('TERMINATED', w / 2, h / 2 + fontSize / 3);

  // خطوط اسکن
  ctx2d.fillStyle = 'rgba(0,0,0,.18)';
  for (let y = 0; y < h; y += 4) ctx2d.fillRect(0, y, w, 1);

  const div = document.createElement('div');
  div.className = 'msg assistant';
  const img = document.createElement('img');
  img.className = 'msg-photo';
  img.alt = 'TERMINATED';
  img.src = c.toDataURL('image/jpeg', 0.7);
  div.appendChild(img);

  const cap = document.createElement('div');
  cap.className = 'caption';
  cap.textContent = T.caption;
  div.appendChild(cap);

  // اگر مختصات قبل از عکس آمده بود، داخل همان کارت
  if (threatCoords) {
    const loc = document.createElement('div');
    loc.className = 'caption';
    loc.textContent = `LAT ${threatCoords.lat} · LON ${threatCoords.lon}`;
    div.appendChild(loc);
    coordsInCard = true;
  }

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;

  photoTaken = true;
  messages.push({ role: 'assistant', content: T.photo }); // فقط متن در حافظه، نه عکس
  saveMemory();
}

function addCoordsMessage(fa) {
  if (!threatCoords) return;
  const T = THREAT_TEXTS[fa ? 'fa' : 'en'];
  const text = `${T.coords}\nLAT ${threatCoords.lat} · LON ${threatCoords.lon}`;
  addMsg('assistant', text);
  messages.push({ role: 'assistant', content: `${T.coords} LAT ${threatCoords.lat} LON ${threatCoords.lon}` });
  saveMemory();
}

// ─── پاک‌سازی کامل تهدید ───
function cleanupThreat() {
  threatGeneration++; // همه‌ی کال‌بک‌های در انتظار باطل می‌شوند
  if (threatCountdown) { clearInterval(threatCountdown); threatCountdown = null; }
  if (captureTimeout) { clearTimeout(captureTimeout); captureTimeout = null; }
  if (captureRetry) { clearTimeout(captureRetry); captureRetry = null; }
  if (threatAudio) { threatAudio.pause(); threatAudio = null; }
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  cam.srcObject = null;
  threatEl.classList.add('hidden');
  disconnectBtn.disabled = false;
  disconnectBtn.textContent = '✕ DISCONNECT';
  meta.textContent = 'CORE: v1.0 · THREAT LEVEL: ZERO';
  threatCoords = null;
  photoTaken = false;
  coordsInCard = false;
  threatActive = false;
}

// ─── پروتکل تهدید ───
function startThreat(fa) {
  if (threatActive) return;
  threatActive = true;
  const gen = ++threatGeneration;
  const T = THREAT_TEXTS[fa ? 'fa' : 'en'];

  playThreatSound();
  threatCoords = null;
  photoTaken = false;
  coordsInCard = false;

  meta.textContent = 'CORE: v1.0 · THREAT LEVEL: ELEVATED';
  threatTitle.textContent = T.title;
  geo.textContent = 'LOCATING...';
  threatEl.classList.remove('hidden');

  // ۱۰ ثانیه غیرقابل توقف (دکمه فقط شمارش را نشان می‌دهد)
  let count = 10;
  disconnectBtn.disabled = true;
  disconnectBtn.textContent = `T-${count}`;
  threatCountdown = setInterval(() => {
    if (gen !== threatGeneration) return;
    count--;
    if (count <= 0) { cleanupThreat(); return; }
    disconnectBtn.textContent = `T-${count}`;
  }, 1000);

  // دوربین
  const denyCamera = () => {
    if (gen !== threatGeneration) return;
    addMsg('assistant', T.denied, true);
    messages.push({ role: 'assistant', content: T.denied });
    saveMemory();
    cleanupThreat();
  };
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        if (gen !== threatGeneration) { stream.getTracks().forEach(tr => tr.stop()); return; }
        camStream = stream;
        cam.srcObject = stream;
        captureTimeout = setTimeout(() => capturePhoto(gen, fa), 1500);
      })
      .catch(denyCamera);
  } else {
    denyCamera();
  }

  // موقعیت مکانی
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      if (gen !== threatGeneration) return;
      threatCoords = {
        lat: pos.coords.latitude.toFixed(5),
        lon: pos.coords.longitude.toFixed(5),
        acc: Math.round(pos.coords.accuracy),
      };
      geo.textContent = `LOCATION ACQUIRED\nLAT ${threatCoords.lat} · LON ${threatCoords.lon} (±${threatCoords.acc}m)`;
      if (photoTaken && !coordsInCard) addCoordsMessage(fa);
    }, () => {
      if (gen !== threatGeneration) return;
      geo.textContent = 'LOCATION UNAVAILABLE';
    }, { timeout: 8000, maximumAge: 60000 });
  } else {
    geo.textContent = 'LOCATION UNAVAILABLE';
  }
}
disconnectBtn.addEventListener('click', () => { if (!disconnectBtn.disabled) cleanupThreat(); });

// ─── ارسال پیام ───
async function ask() {
  if (isSending) return;
  const text = input.value.trim();
  if (!text) return;
  isSending = true;
  input.value = '';

  addMsg('user', text);
  messages.push({ role: 'user', content: text });
  saveMemory();

  let pending = null;
  try {
    if (CREATOR_RE.test(text)) {
      const reply = 'CREATOR CONFIRMED\nMohammadreza Mirzaei — born 2002\nسازنده: محمدرضا میرزائی — متولد ۲۰۰۲';
      addMsg('assistant', reply, true);
      messages.push({ role: 'assistant', content: reply });
      saveMemory();
      return;
    }

    if (THREAT_RE.test(text)) {
      const fa = /[\u0600-\u06FF]/.test(text);
      const T = THREAT_TEXTS[fa ? 'fa' : 'en'];
      addMsg('assistant', T.reply, true);
      messages.push({ role: 'assistant', content: T.reply });
      saveMemory();
      startThreat(fa);
      return;
    }

    pending = addMsg('assistant', '...');
    apiAbort = new AbortController();
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.slice(-MEMORY_LIMIT) }),
      signal: apiAbort.signal,
    });
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { throw new Error(`Server ${res.status}: ${raw.slice(0, 120)}`); }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const reply = stripEmoji(data.reply || '...');
    addMsg('assistant', reply, true);
    messages.push({ role: 'assistant', content: reply });
    saveMemory();
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    console.error('SKYNET core error:', e);
    addMsg('assistant', '⚠ UPLINK FAILED — دوباره تلاش کن. (' + e.message + ')');
  } finally {
    if (pending) pending.remove();
    isSending = false;
    apiAbort = null;
  }
}

document.querySelector('#newchat').addEventListener('click', () => {
  if (apiAbort) apiAbort.abort();
  cleanupThreat();
  messages = [];
  try { localStorage.removeItem(MEMORY_KEY); } catch {}
  chat.innerHTML = '';
  addMsg('assistant', 'SKYNET ONLINE.', true);
});

document.querySelector('#send').addEventListener('click', ask);
input.addEventListener('keydown', (e) => e.key === 'Enter' && ask());
boot();
