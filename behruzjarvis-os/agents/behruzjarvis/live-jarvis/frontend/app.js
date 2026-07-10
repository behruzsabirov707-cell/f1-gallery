const STATUS = document.getElementById('status-text');
const TRANSCRIPT = document.getElementById('transcript');
const MUTE_BTN = document.getElementById('mute-btn');
const BODY = document.body;

let muted = false;
let ws = null;
let audioContext = null;
let micStream = null;
let processorNode = null;
let recognition = null;

function setState(state) {
  BODY.className = 'state-' + state;
}

function setStatus(text) {
  STATUS.textContent = text;
}

function pushTranscript(role, text) {
  const line = document.createElement('div');
  line.className = 'line ' + role;
  line.textContent = (role === 'user' ? '> ' : '« ') + text;
  TRANSCRIPT.appendChild(line);
  TRANSCRIPT.scrollTop = TRANSCRIPT.scrollHeight;
}

function setAmplitude(value) {
  BODY.style.setProperty('--amp', Math.min(1, Math.max(0, value)).toFixed(3));
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
    const text = last[0].transcript.toLowerCase();
    if (text.includes('jarvis') && ws === null) {
      openLiveSession();
    }
  };

  recognition.onend = () => {
    if (!muted) recognition.start();
  };

  recognition.start();
  setState('idle');
  setStatus('Kutilmoqda... "Jarvis" deng');
}

function openLiveSession() {
  setState('listening');
  setStatus('Ulanmoqda...');
  ws = new WebSocket('ws://' + location.host + '/ws');

  ws.onopen = () => {
    setStatus('Tinglamoqda...');
    startMicCapture();
  };

  ws.onmessage = (event) => {
    handleServerEvent(JSON.parse(event.data));
  };

  ws.onclose = () => {
    stopMicCapture();
    ws = null;
    setState('idle');
    setStatus('Kutilmoqda... "Jarvis" deng');
  };

  ws.onerror = () => {
    setState('error');
    setStatus('Ulanish xatosi');
  };
}

function handleServerEvent(data) {
  if (data.type === 'transcript') {
    pushTranscript(data.role, data.text);
    setState(data.role === 'assistant' ? 'speaking' : 'listening');
  } else if (data.type === 'status') {
    setStatus(data.text);
  } else if (data.type === 'tool_result') {
    setStatus('Bajarildi: ' + data.tool);
  } else if (data.type === 'error') {
    setState('error');
    setStatus('Xato: ' + data.text);
  } else if (data.type === 'closed') {
    if (ws) ws.close();
  }
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
    setAmplitude(Math.sqrt(sum / levels.length) * 4);

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
  MUTE_BTN.textContent = muted ? 'MUTED' : 'MUTE';
  if (muted) {
    if (recognition) recognition.stop();
    if (ws) ws.send(JSON.stringify({ type: 'stop' }));
    stopMicCapture();
  } else {
    startWakeWordListener();
  }
});

startWakeWordListener();
