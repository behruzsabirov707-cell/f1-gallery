const STATUS = document.getElementById('status-text');
const TRANSCRIPT = document.getElementById('transcript');
const MUTE_BTN = document.getElementById('mute-btn');
const BODY = document.body;
const TOOLS_LOG = document.getElementById('tools-log');
const VOICE_WAVE = document.getElementById('voice-wave');
const CMD_INPUT = document.getElementById('command-input');

let muted = false;
let ws = null;
let audioContext = null;
let micStream = null;
let processorNode = null;
let recognition = null;
let nextPlayTime = 0;
let playbackContext = null;
let playbackAnalyser = null;
let playbackLevelLoopActive = false;
let sessionStartedAt = null;
let waveLevels = new Array(48).fill(0.08);

const PLAYBACK_SAMPLE_RATE = 24000;

function setState(state) {
  BODY.className = 'state-' + state;
}

function setStatus(text) {
  if (STATUS) STATUS.textContent = text;
  if (CMD_INPUT && !sessionStartedAt) {
    // keep placeholder idle prompt when no session
  }
}

function pushTranscript(role, text) {
  if (!TRANSCRIPT) return;
  // remove placeholder greeting if still the only default line and we have real traffic
  const msg = document.createElement('div');
  msg.className = 'chat-msg ' + role;
  msg.innerHTML =
    '<span class="avatar-dot"></span>' +
    '<div class="bubble"></div>';
  msg.querySelector('.bubble').textContent = text;
  TRANSCRIPT.appendChild(msg);
  TRANSCRIPT.scrollTop = TRANSCRIPT.scrollHeight;
}

function setAmplitude(value) {
  const v = Math.min(1, Math.max(0, value));
  BODY.style.setProperty('--amp', v.toFixed(3));
  // feed waveform
  const n = Math.floor(waveLevels.length * 0.35 + Math.random() * waveLevels.length * 0.3);
  waveLevels.push(Math.max(0.05, Math.min(1, v * 1.8 + Math.random() * 0.08)));
  waveLevels.shift();
  // sprinkle mid-band for more organic look
  if (waveLevels[n] !== undefined) {
    waveLevels[n] = Math.min(1, waveLevels[n] + v * 0.3);
  }
}

// Chrome's cloud STT frequently mis-transcribes the foreign word "jarvis"
// under uz-UZ (e.g. "jarves", "charviz", "javis") — a strict substring
// match on "jarvis" silently misses these. Use bounded edit-distance.
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function containsWakeWord(text) {
  return text
    .split(/[^a-z]+/)
    .filter((word) => word.length >= 4)
    .some((word) => levenshtein(word, 'jarvis') <= 1);
}

function startWakeWordListener() {
  const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
  if (!SpeechRecognition) {
    setStatus('Brauzer wake-word ni qollab-quvvatlamaydi (Chrome kerak)');
    return;
  }
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'uz-UZ';

  recognition.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const text = last[0].transcript.toLowerCase().trim();
    console.log('[wake-word] heard:', text);
    if (containsWakeWord(text) && ws === null) {
      console.log('[wake-word] matched, opening session');
      openLiveSession();
    }
  };

  recognition.onerror = (event) => {
    console.log('[wake-word] error:', event.error);
  };

  recognition.onend = () => {
    if (!muted) {
      try {
        recognition.start();
      } catch (err) {
        console.log('[wake-word] restart failed, retrying shortly:', err);
        setTimeout(() => { if (!muted) startWakeWordListener(); }, 300);
      }
    }
  };

  try {
    recognition.start();
  } catch (err) {
    console.log('[wake-word] start failed, retrying shortly:', err);
    setTimeout(() => { if (!muted) startWakeWordListener(); }, 300);
    return;
  }
  setState('idle');
  setStatus('Listening... "Jarvis" deng');
}

function openLiveSession() {
  setState('listening');
  setStatus('Connecting...');
  if (CMD_INPUT) CMD_INPUT.placeholder = 'Listening to you, Behruz...';
  nextPlayTime = 0;
  ws = new WebSocket('ws://' + location.host + '/ws');

  ws.onopen = () => {
    setStatus('Listening...');
    setConnState('Online');
    sessionStartedAt = Date.now();
    startMicCapture();
  };

  ws.onmessage = (event) => {
    handleServerEvent(JSON.parse(event.data));
  };

  ws.onclose = () => {
    stopMicCapture();
    ws = null;
    sessionStartedAt = null;
    setState('idle');
    setStatus('Listening... "Jarvis" deng');
    setConnState('Offline');
    if (CMD_INPUT) CMD_INPUT.placeholder = 'What would you like to command, Behruz?';
  };

  ws.onerror = () => {
    setState('error');
    setStatus('Connection error');
  };
}

function handleServerEvent(data) {
  if (data.type === 'transcript') {
    pushTranscript(data.role, data.text);
    setState(data.role === 'assistant' ? 'speaking' : 'listening');
    if (data.role === 'user' && CMD_INPUT) {
      CMD_INPUT.placeholder = data.text;
    }
  } else if (data.type === 'status') {
    setStatus(data.text);
    pushToolLog(data.text);
  } else if (data.type === 'tool_result') {
    setStatus('Done: ' + data.tool);
    pushToolLog('OK: ' + data.tool);
  } else if (data.type === 'error') {
    setState('error');
    setStatus('Error: ' + data.text);
    pushToolLog('ERR: ' + data.text);
  } else if (data.type === 'closed') {
    if (ws) ws.close();
  } else if (data.type === 'audio') {
    playAudioChunk(data.data);
  } else if (data.type === 'interrupted') {
    stopPlayback();
  }
}

function setConnState(text) {
  const el = document.getElementById('clock-connstate');
  if (el) el.textContent = text;
  const badge = document.querySelector('.online-badge b');
  if (badge) badge.textContent = text === 'Online' || text === 'Ulangan' ? 'ONLINE' : 'STANDBY';
}

function pushToolLog(text) {
  if (!TOOLS_LOG) return;
  TOOLS_LOG.hidden = false;
  TOOLS_LOG.textContent = text;
  clearTimeout(pushToolLog._t);
  pushToolLog._t = setTimeout(() => { TOOLS_LOG.hidden = true; }, 4000);
}

function stopPlayback() {
  if (playbackContext) {
    playbackContext.close();
    playbackContext = null;
  }
  playbackAnalyser = null;
  nextPlayTime = 0;
  setState('listening');
  setStatus('Listening...');
}

function pollPlaybackLevel() {
  if (!playbackContext || !playbackAnalyser) {
    playbackLevelLoopActive = false;
    return;
  }
  const data = new Uint8Array(playbackAnalyser.frequencyBinCount);
  playbackAnalyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  setAmplitude(Math.sqrt(sum / data.length) * 4);
  requestAnimationFrame(pollPlaybackLevel);
}

function playAudioChunk(base64Data) {
  if (!playbackContext) {
    playbackContext = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
    playbackAnalyser = playbackContext.createAnalyser();
    playbackAnalyser.fftSize = 256;
    playbackAnalyser.connect(playbackContext.destination);
    nextPlayTime = 0;
  }
  setState('speaking');

  if (!playbackLevelLoopActive) {
    playbackLevelLoopActive = true;
    requestAnimationFrame(pollPlaybackLevel);
  }

  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pcm16 = new Int16Array(bytes.buffer);

  const frameCount = pcm16.length;
  if (frameCount === 0) return;

  const buffer = playbackContext.createBuffer(1, frameCount, PLAYBACK_SAMPLE_RATE);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = pcm16[i] / 32768;
  }

  const source = playbackContext.createBufferSource();
  source.buffer = buffer;
  source.connect(playbackAnalyser);

  const startTime = Math.max(playbackContext.currentTime, nextPlayTime);
  source.start(startTime);
  nextPlayTime = startTime + buffer.duration;
}

async function startMicCapture() {
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(micStream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  const levels = new Uint8Array(analyser.frequencyBinCount);

  processorNode = audioContext.createScriptProcessor(4096, 1, 1);
  source.connect(analyser);
  analyser.connect(processorNode);
  processorNode.connect(audioContext.destination);

  processorNode.onaudioprocess = (e) => {
    analyser.getByteTimeDomainData(levels);
    let sum = 0;
    for (let i = 0; i < levels.length; i++) {
      const v = (levels[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / levels.length) * 4;
    setAmplitude(rms);

    const input = e.inputBuffer.getChannelData(0);
    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      pcm16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'audio', data: b64 }));
    }
  };
}

function stopMicCapture() {
  if (processorNode) { processorNode.disconnect(); processorNode = null; }
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  if (audioContext) { audioContext.close(); audioContext = null; }
  setAmplitude(0);
}

MUTE_BTN.addEventListener('click', () => {
  muted = !muted;
  MUTE_BTN.classList.toggle('muted', muted);
  MUTE_BTN.title = muted ? 'Unmute' : 'Mute';
  MUTE_BTN.textContent = muted ? '🔇' : '🎤';
  if (muted) {
    if (recognition) recognition.stop();
    if (ws) ws.send(JSON.stringify({ type: 'stop' }));
    stopMicCapture();
    stopPlayback();
    setStatus('Muted');
  } else {
    startWakeWordListener();
  }
});

// ---------------------------------------------------------------------
// Decorative chrome: clock, gauges, waveform, hologram particles
// ---------------------------------------------------------------------

function spawnParticles() {
  const host = document.getElementById('particles');
  if (!host) return;
  host.innerHTML = '';
  for (let i = 0; i < 36; i++) {
    const s = document.createElement('span');
    s.style.left = (8 + Math.random() * 84) + '%';
    s.style.top = (10 + Math.random() * 70) + '%';
    s.style.animationDelay = (Math.random() * 5) + 's';
    s.style.animationDuration = (4 + Math.random() * 5) + 's';
    s.style.width = s.style.height = (1 + Math.random() * 2.5) + 'px';
    host.appendChild(s);
  }
}
spawnParticles();

function drawVoiceWave() {
  if (!VOICE_WAVE) return;
  const canvas = VOICE_WAVE;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 300;
  const h = canvas.clientHeight || 56;
  if (canvas.width !== w * dpr) canvas.width = w * dpr;
  if (canvas.height !== h * dpr) canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  // idle gentle motion when amp is low
  const idle = BODY.classList.contains('state-idle') || BODY.classList.contains('state-listening');
  if (idle && parseFloat(getComputedStyle(BODY).getPropertyValue('--amp') || '0') < 0.05) {
    for (let i = 0; i < waveLevels.length; i++) {
      const t = Date.now() / 400 + i * 0.35;
      waveLevels[i] = 0.12 + Math.sin(t) * 0.08 + Math.random() * 0.04;
    }
  }

  const barW = w / waveLevels.length;
  for (let i = 0; i < waveLevels.length; i++) {
    const v = waveLevels[i];
    const bh = Math.max(3, v * h * 0.9);
    const x = i * barW + barW * 0.2;
    const y = (h - bh) / 2;
    const grad = ctx.createLinearGradient(0, y, 0, y + bh);
    grad.addColorStop(0, 'rgba(160, 240, 255, 0.95)');
    grad.addColorStop(1, 'rgba(40, 140, 220, 0.55)');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#5ad8ff';
    ctx.shadowBlur = 6;
    const rw = Math.max(2, barW * 0.55);
    ctx.beginPath();
    ctx.roundRect(x, y, rw, bh, 2);
    ctx.fill();
  }
  requestAnimationFrame(drawVoiceWave);
}
if (CanvasRenderingContext2D.prototype.roundRect === undefined) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}
requestAnimationFrame(drawVoiceWave);

const FAKE_READOUTS = {
  cpu: () => Math.round(70 + Math.random() * 28),
  gpu: () => Math.round(55 + Math.random() * 35),
  ram: () => Math.round(50 + Math.random() * 30),
  net: () => Math.round(40 + Math.random() * 40),
  wtemp: () => Math.round(18 + Math.random() * 10),
};

function updateGauges() {
  document.querySelectorAll('[data-fake]').forEach((el) => {
    const key = el.dataset.fake;
    if (!FAKE_READOUTS[key]) return;
    const val = FAKE_READOUTS[key]();
    el.textContent = val;
    const ring = el.closest('.ring-stat');
    if (ring) {
      const prog = ring.querySelector('.prog');
      if (prog) prog.style.strokeDashoffset = String(100 - Math.min(100, Number(val)));
    }
  });
}
updateGauges();
setInterval(updateGauges, 2200);

const CLOCK_TIME = document.getElementById('clock-time');
const CLOCK_DATE = document.getElementById('clock-date');
const CLOCK_SESSION = document.getElementById('clock-session');
const CAL_LINE = document.getElementById('cal-date-line');
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function tickClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  if (CLOCK_TIME) CLOCK_TIME.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (CLOCK_DATE) {
    CLOCK_DATE.textContent = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }
  if (CAL_LINE) {
    CAL_LINE.textContent = `${pad(now.getDate())} | ${MONTHS[now.getMonth()].toUpperCase()} | ${now.getFullYear()}`;
  }
  if (CLOCK_SESSION) {
    if (sessionStartedAt) {
      const elapsed = Math.floor((Date.now() - sessionStartedAt) / 1000);
      CLOCK_SESSION.textContent = `${pad(Math.floor(elapsed / 60))}:${pad(elapsed % 60)}`;
    } else {
      CLOCK_SESSION.textContent = '00:00';
    }
  }
}
setInterval(tickClock, 1000);
tickClock();

// soft idle amplitude pulse so the sphere feels alive
setInterval(() => {
  if (ws) return;
  const t = Date.now() / 1000;
  const idleAmp = 0.04 + Math.sin(t * 0.9) * 0.03;
  if (parseFloat(getComputedStyle(BODY).getPropertyValue('--amp') || '0') < 0.08) {
    BODY.style.setProperty('--amp', idleAmp.toFixed(3));
  }
}, 80);

startWakeWordListener();
