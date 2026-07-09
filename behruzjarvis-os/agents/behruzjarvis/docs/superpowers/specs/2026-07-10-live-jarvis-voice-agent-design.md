# Live Jarvis — voice-native agent + HUD dashboard

## Context

Behruz's existing Jarvis is turn-based over Telegram (voice message → transcribe → act → reply). He wants a second, separate app: a local, always-listening voice agent with a Tony-Stark-style animated dashboard, that can execute the same class of actions his Telegram Jarvis already does, but through live, real-time conversation instead of message turns.

This is explicitly a **new app running alongside** the Telegram Jarvis — it does not replace or modify it, and it does not need 24/7 uptime (interactive-only, runs on Behruz's Mac while he's using it).

Sparked by an Instagram reel (lukebuildsai) showing an AI-agent HUD dashboard. See `jarvis-live-voice-agent-project` memory for the fuller backstory and the rejected visual concepts (B: wireframe globe, C: neural particle sphere).

## Goals

- Talk to Jarvis live (not turn-based) in Uzbek or English, wake-word activated ("Jarvis").
- Jarvis executes real actions via existing backend scripts, immediately, no per-action confirmation (Behruz is present and can say "to'xta" to interrupt).
- A visually striking, animated HUD dashboard (Arc Reactor concept — cyan tilted rings around a glowing core) that reacts to voice/audio in real time and shows current status + a live transcript.
- Keep cost low: only run the paid Gemini Live session while actively in conversation; auto-sleep after ~10s of silence.

## Non-goals

- Not replacing the Telegram Jarvis or its userbot confirm-before-send policy — this is a separate, explicitly-opted-into live channel.
- Not 24/7 hosted — local Mac only for now.
- Not building a wake-word ML model — using the browser's built-in continuous speech recognition as a free, "good enough" trigger.

## Scope — first 5 actions

All already have working scripts in `~/.behruzjarvis/scripts/`:

1. Telegram xabar yuborish → `telegram_userbot_send_message.py`
2. Calendar'ga tadbir qo'shish → `google_calendar_add_event.py`
3. Moliyaviy kirim/chiqim yozish → `finance_log.py`
4. Internetdan savolga javob (web search)
5. Google Sheets'dan ma'lumot o'qish → `google_sheets_read.py`

## Architecture

**Two new pieces only** — everything else (the 5 actions) reuses existing scripts unchanged.

```
Browser tab (Chrome, localhost)                Local Python backend (FastAPI + websockets)
┌─────────────────────────────┐                ┌──────────────────────────────────┐
│ Arc Reactor HUD (canvas/CSS) │                │ Holds GEMINI_API_KEY               │
│ Web Audio API (mic + level)  │   WebSocket    │ Opens Gemini Live session on       │
│ webkitSpeechRecognition      │◄──────────────►│   wake-word trigger from client    │
│   (free, wake-word "Jarvis") │  raw audio +   │ Streams mic audio to Gemini Live   │
│ Mute button                  │  status/text   │ Receives audio+text+function-calls │
│ Live transcript panel        │  events        │ Executes tool calls via subprocess │
└─────────────────────────────┘                │   into existing scripts            │
                                                 │ Streams status + transcript back   │
                                                 └──────────────────────────────────┘
```

**Why this split**: the wake-word listener is free and can run continuously in the browser without touching the paid API. Only once "Jarvis" is heard does the browser open a WebSocket to the local backend, which is the only place the Gemini API key lives and the only place that can shell out to Behruz's existing automation scripts (keeping the trust boundary where it already exists — a browser tab should never hold credentials that can message people or touch his calendar).

### Components

- **Frontend (single static page, no framework needed — reuses the Arc Reactor mockup already built)**
  - Idle state: rings idle, `webkitSpeechRecognition` running continuously, listening only for "Jarvis".
  - On wake-word: opens WebSocket to backend, starts streaming mic audio (Web Audio API `AudioWorklet` or `ScriptProcessorNode`), ring pulse driven by live input amplitude (`AnalyserNode`).
  - Receives from backend over the same socket: assistant audio (plays back, ring pulse driven by output amplitude), status text ("Bajarilmoqda: Telegram xabar..."), transcript lines (user + assistant), error events.
  - After ~10s of silence with no active exchange: closes the Gemini Live session (backend closes it), reactor returns to idle/free-listening state.
  - Mute button: hard-stops `webkitSpeechRecognition` and mic capture entirely until re-enabled.

- **Backend (Python, FastAPI + `websockets`, run via existing `~/.behruzjarvis/venvs/` pattern)**
  - One WebSocket endpoint per browser session.
  - On connect: opens a Gemini Live session (`google-genai` SDK), registers 5 tool/function definitions (one per script above), system prompt instructs bilingual UZ/EN responses in whichever language the user just spoke.
  - Relays audio both directions between browser socket and Gemini Live session.
  - On a function-call event from Gemini: runs the matching script via `subprocess`, captures result/error, feeds the result back into the Live session (so Gemini can voice the outcome), and pushes a status event to the browser for the dashboard.
  - On silence timeout or explicit stop: closes the Gemini Live session cleanly.

### Error handling

- Script execution fails (e.g. network error, bad contact name): backend catches the exception, feeds an error result back into the Gemini Live session so Jarvis explains the failure out loud in the same language, and pushes an error status event to the dashboard (reactor briefly pulses red).
- Gemini Live session drops mid-conversation: backend detects the closed connection, notifies the frontend, frontend shows "Ulanish uzildi" and returns to idle wake-word-only state — does not crash the tab.
- Wake-word false trigger: since no action is taken without Gemini actually understanding a real request, a false trigger just opens a session that times out after 10s of silence — costs a few cents at most, not a safety issue.
- Barge-in (Behruz interrupts mid-response, e.g. says "to'xta"): Gemini Live's native interruption handling cuts off playback immediately — no custom logic needed beyond wiring it through.

### Testing plan

Before declaring this "ready," every one of the 5 actions is tested live with Behruz present:
- Telegram send → test message sent only to Behruz's own account/number first, not a real contact, until confirmed reliable.
- Calendar add → a throwaway test event, deleted after.
- Finance log → a small test entry, corrected/removed after if needed.
- Web search → a simple factual question with a checkable answer.
- Sheets read → confirmed against known sheet content.

Only after all 5 pass with Behruz watching does this move from "testing" to "in use."

### Cost control

- Wake-word listening is free (browser-native).
- Gemini Live session only open during active use + 10s trailing silence.
- If Gemini Live proves too unreliable (rate limits, as seen elsewhere this session), swap to OpenAI Realtime — the backend's Gemini-specific code is isolated to one module so this swap doesn't touch the frontend or the action scripts.

## Open items resolved during brainstorming (2026-07-09/10)

- Voice API: Gemini Live first (existing key), OpenAI Realtime as fallback if unreliable.
- Wake mode: always-listening wake-word ("Jarvis"), not push-to-talk.
- Language: bilingual Uzbek + English.
- Action confirmation: none — direct execution, interruptible.
- Browser: Chrome required (wake-word reliability).
- Visual: Concept A "Arc Reactor" (cyan, tilted 3D-perspective rings, HUD corner brackets).
- Added scope: live transcript panel, hard mute button.
- Hosting: local Mac only, not 24/7 — decoupled from the still-open Telegram-Jarvis hosting question.
- Sequencing: Aivora site work paused in favor of this project (Behruz's explicit call, 2026-07-09).
