# Live Jarvis Voice Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local, wake-word-activated, voice-native "Live Jarvis" — a browser HUD (Arc Reactor visual) talking live to Behruz in Uzbek/English, executing 5 real actions (Telegram send, calendar add, finance log, web search, sheets read) via his existing backend scripts.

**Architecture:** A static browser frontend (Arc Reactor HUD, free `webkitSpeechRecognition` wake-word, mic capture, WebSocket client) talks to a local FastAPI + `websockets` Python backend over one WebSocket per session. The backend swaps between two interchangeable session backends behind the same 4-method interface (`start`/`send_audio`/`receive_events`/`close`): a free, deterministic `MockLiveSession` (built first, used for all non-paid testing) and the real `GeminiLiveSession` (added last, per Behruz's explicit request to wire the paid API only after everything else works). Function calls from Gemini dispatch to `tools.py`, which shells out to Behruz's existing, unmodified scripts in `~/.behruzjarvis/scripts/` using the venv interpreters that already have the right libraries (`telegram` venv for Telethon, `google` venv for Calendar/Sheets).

**Tech Stack:** Python 3.12, FastAPI, `websockets`, `google-genai` SDK, pytest + pytest-asyncio, vanilla HTML/CSS/JS (no frontend framework), Chrome-only (`webkitSpeechRecognition`).

## Global Constraints

- Python 3.12, matching the existing venvs at `/Users/behruz/.behruzjarvis/venvs/`.
- New dedicated venv for this project: `/Users/behruz/.behruzjarvis/venvs/live_jarvis` — do not reuse or modify the `telegram` or `google` venvs; the backend only *calls into* them via `subprocess`.
- Existing scripts in `/Users/behruz/.behruzjarvis/scripts/` are reused **unmodified** — never edit them as part of this project.
- Frontend is plain HTML/CSS/JS served as static files by the FastAPI backend itself (`StaticFiles` mount) — no build step, no framework, no bundler.
- Chrome is the only supported browser (`webkitSpeechRecognition` requirement) — do not add cross-browser fallback code.
- Bilingual Uzbek/English: system prompt and all user-facing status/transcript strings in the frontend default to Uzbek, matching the existing Telegram Jarvis's tone.
- No per-action confirmation before executing an action (per approved design spec) — actions execute immediately; Behruz can interrupt by voice.
- **The Gemini Live API integration (`gemini_session.py`, Task 9) must be the last task implemented** — every other piece must be built, wired, and verified using the free `MockLiveSession` first. This is an explicit process requirement from Behruz, not just a suggestion.
- All new code lives under `/Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/`.

---

## File Structure

```
live-jarvis/
  backend/
    requirements.txt
    pytest.ini
    server.py              # FastAPI app: /health, /ws websocket endpoint, static mount
    session_timer.py        # SilenceTimer: tracks last-activity, reports expiry
    tools.py                # 4 tool-executor functions -> subprocess into existing scripts
    mock_session.py         # MockLiveSession: free, scripted, deterministic stand-in
    gemini_session.py       # GeminiLiveSession: real Gemini Live wrapper (Task 9, last)
    tests/
      test_health.py
      test_session_timer.py
      test_tools.py
      test_mock_session.py
      test_server_websocket.py
      test_gemini_session_config.py
  frontend/
    index.html               # Arc Reactor HUD shell
    style.css                # Arc Reactor visuals + HUD panel layout
    app.js                   # wake-word, mic capture, WebSocket client, transcript, mute
```

---

## Task 1: Backend Scaffold + Health Check

**Files:**
- Create: `live-jarvis/backend/requirements.txt`
- Create: `live-jarvis/backend/pytest.ini`
- Create: `live-jarvis/backend/server.py`
- Create: `live-jarvis/backend/tests/test_health.py`

**Interfaces:**
- Produces: `app` (FastAPI instance) importable from `server.py`, with a `GET /health` route returning `{"status": "ok"}`. Later tasks import and extend this same `app`.

- [ ] **Step 1: Create the venv and directories**

```bash
mkdir -p /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend/tests
mkdir -p /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/frontend
python3 -m venv /Users/behruz/.behruzjarvis/venvs/live_jarvis
```

- [ ] **Step 2: Write `requirements.txt`**

```
fastapi==0.115.6
uvicorn[standard]==0.32.1
websockets==13.1
google-genai==0.3.0
pytest==8.3.4
pytest-asyncio==0.24.0
httpx==0.28.1
```

- [ ] **Step 3: Install dependencies**

```bash
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pip install -r /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend/requirements.txt
```

Expected: all packages install without errors.

- [ ] **Step 4: Write `pytest.ini`**

```ini
[pytest]
testpaths = tests
asyncio_mode = auto
```

- [ ] **Step 5: Write the failing test**

`live-jarvis/backend/tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from server import app


def test_health_returns_ok():
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_health.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'server'` (or import error, since `server.py` doesn't exist yet).

- [ ] **Step 7: Write minimal implementation**

`live-jarvis/backend/server.py`:

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 8: Run test to verify it passes**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_health.py -v
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/requirements.txt live-jarvis/backend/pytest.ini live-jarvis/backend/server.py live-jarvis/backend/tests/test_health.py
git commit -m "feat(live-jarvis): scaffold FastAPI backend with health check"
```

---

## Task 2: Tool Executor Functions

**Files:**
- Create: `live-jarvis/backend/tools.py`
- Test: `live-jarvis/backend/tests/test_tools.py`

**Interfaces:**
- Produces:
  - `tools.resolve_contact(query: str) -> dict` — returns `{"id": int, "name": str, "username": str|None}`, raises `RuntimeError` if no match.
  - `tools.send_telegram_message(contact_query: str, message: str) -> dict` — returns `{"sent_to": str, "message": str}`.
  - `tools.add_calendar_event(summary: str, start_iso: str, end_iso: str, description: str = "") -> dict` — returns `{"id": str, "htmlLink": str}`.
  - `tools.log_finance(kind: str, amount: float, currency: str, note: str = "") -> dict` — returns `{"balans_som": float, "balans_usd": float}`.
  - `tools.read_sheet(range_: str = "A1:Z50", spreadsheet_id: str = tools.FINANCE_SPREADSHEET_ID) -> dict` — returns `{"title": str, "sheet_names": list, "values": list}`.
  - `tools.FINANCE_SPREADSHEET_ID` — the spreadsheet ID already hardcoded in `finance_log.py` (`"1AYPlsIpFkrcHL-zsLQr-Nw4ayvLQOMz3bJTENyyT7ck"`), reused here so voice queries about "the sheet" default to Behruz's actual finance sheet.
- Consumes: nothing from earlier tasks (this module is self-contained; later tasks — `mock_session.py` in a scripted-only way, `gemini_session.py` for real — call these 4 functions by name).

- [ ] **Step 1: Write the failing tests**

`live-jarvis/backend/tests/test_tools.py`:

```python
import json
from unittest.mock import MagicMock, patch

import tools


def _fake_completed(stdout="", returncode=0, stderr=""):
    proc = MagicMock()
    proc.returncode = returncode
    proc.stdout = stdout
    proc.stderr = stderr
    return proc


def test_resolve_contact_returns_first_match():
    fake_matches = [{"id": 123, "name": "Otabek", "username": "otabekk"}]
    with patch("tools.subprocess.run", return_value=_fake_completed(stdout=json.dumps(fake_matches))) as mock_run:
        result = tools.resolve_contact("otabek")
    assert result == fake_matches[0]
    args = mock_run.call_args[0][0]
    assert args[0] == tools.TELEGRAM_PYTHON
    assert args[-1] == "otabek"


def test_resolve_contact_raises_when_no_match():
    with patch("tools.subprocess.run", return_value=_fake_completed(stdout="[]")):
        try:
            tools.resolve_contact("nobody")
            assert False, "expected RuntimeError"
        except RuntimeError as e:
            assert "topilmadi" in str(e)


def test_send_telegram_message_resolves_then_sends():
    fake_matches = [{"id": 555, "name": "Otabek", "username": None}]
    with patch("tools.subprocess.run") as mock_run:
        mock_run.side_effect = [
            _fake_completed(stdout=json.dumps(fake_matches)),
            _fake_completed(stdout="SENT"),
        ]
        result = tools.send_telegram_message("otabek", "Salom!")
    assert result == {"sent_to": "Otabek", "message": "Salom!"}
    second_call_args = mock_run.call_args_list[1][0][0]
    assert second_call_args[-2:] == ["555", "Salom!"]


def test_add_calendar_event_parses_json_output():
    fake_output = json.dumps({"id": "abc123", "htmlLink": "https://calendar.google.com/abc123"})
    with patch("tools.subprocess.run", return_value=_fake_completed(stdout=fake_output)):
        result = tools.add_calendar_event("Uchrashuv", "2026-07-13T20:00:00", "2026-07-13T21:00:00")
    assert result["id"] == "abc123"


def test_log_finance_parses_json_output():
    fake_output = json.dumps({"balans_som": 1250000, "balans_usd": 40})
    with patch("tools.subprocess.run", return_value=_fake_completed(stdout=fake_output)):
        result = tools.log_finance("chiqim", 5000, "UZS", "ovqat")
    assert result["balans_som"] == 1250000


def test_read_sheet_defaults_to_finance_spreadsheet():
    fake_output = json.dumps({"title": "Moliya", "sheet_names": ["Tranzaksiyalar"], "values": [["A"]]})
    with patch("tools.subprocess.run", return_value=_fake_completed(stdout=fake_output)) as mock_run:
        result = tools.read_sheet()
    assert result["title"] == "Moliya"
    args = mock_run.call_args[0][0]
    assert args[-2] == tools.FINANCE_SPREADSHEET_ID


def test_run_raises_on_nonzero_exit():
    with patch("tools.subprocess.run", return_value=_fake_completed(returncode=1, stderr="boom")):
        try:
            tools._run(tools.GOOGLE_PYTHON, "whatever.py", [])
            assert False, "expected RuntimeError"
        except RuntimeError as e:
            assert "boom" in str(e)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_tools.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'tools'`.

- [ ] **Step 3: Write the implementation**

`live-jarvis/backend/tools.py`:

```python
import json
import subprocess

SCRIPTS_DIR = "/Users/behruz/.behruzjarvis/scripts"
TELEGRAM_PYTHON = "/Users/behruz/.behruzjarvis/venvs/telegram/bin/python"
GOOGLE_PYTHON = "/Users/behruz/.behruzjarvis/venvs/google/bin/python"
FINANCE_SPREADSHEET_ID = "1AYPlsIpFkrcHL-zsLQr-Nw4ayvLQOMz3bJTENyyT7ck"


def _run(python_bin: str, script_name: str, args: list[str], timeout: int = 30) -> str:
    result = subprocess.run(
        [python_bin, f"{SCRIPTS_DIR}/{script_name}", *args],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"{script_name} failed")
    return result.stdout.strip()


def resolve_contact(query: str) -> dict:
    output = _run(TELEGRAM_PYTHON, "telegram_userbot_search_contact.py", [query])
    matches = json.loads(output)
    if not matches:
        raise RuntimeError(f"Kontakt topilmadi: {query}")
    return matches[0]


def send_telegram_message(contact_query: str, message: str) -> dict:
    contact = resolve_contact(contact_query)
    _run(TELEGRAM_PYTHON, "telegram_userbot_send_message.py", [str(contact["id"]), message])
    return {"sent_to": contact["name"], "message": message}


def add_calendar_event(summary: str, start_iso: str, end_iso: str, description: str = "") -> dict:
    output = _run(GOOGLE_PYTHON, "google_calendar_add_event.py", [summary, start_iso, end_iso, description])
    return json.loads(output)


def log_finance(kind: str, amount: float, currency: str, note: str = "") -> dict:
    output = _run(GOOGLE_PYTHON, "finance_log.py", [kind, str(amount), currency, note])
    return json.loads(output)


def read_sheet(range_: str = "A1:Z50", spreadsheet_id: str = FINANCE_SPREADSHEET_ID) -> dict:
    output = _run(GOOGLE_PYTHON, "google_sheets_read.py", [spreadsheet_id, range_])
    return json.loads(output)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_tools.py -v
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/tools.py live-jarvis/backend/tests/test_tools.py
git commit -m "feat(live-jarvis): add tool-executor functions wrapping existing scripts"
```

---

## Task 3: Silence Timer

**Files:**
- Create: `live-jarvis/backend/session_timer.py`
- Test: `live-jarvis/backend/tests/test_session_timer.py`

**Interfaces:**
- Produces: `SilenceTimer(timeout_seconds: float = 10.0, clock: Callable[[], float] = time.monotonic)` with `.touch()` (resets the clock) and `.expired() -> bool`. Consumed by `server.py` (Task 5) to close a session after ~10s of no activity.

- [ ] **Step 1: Write the failing tests**

`live-jarvis/backend/tests/test_session_timer.py`:

```python
from session_timer import SilenceTimer


def test_not_expired_immediately_after_creation():
    timer = SilenceTimer(timeout_seconds=10.0)
    assert timer.expired() is False


def test_expired_after_timeout_elapses():
    clock = {"t": 0.0}
    timer = SilenceTimer(timeout_seconds=10.0, clock=lambda: clock["t"])
    clock["t"] = 11.0
    assert timer.expired() is True


def test_touch_resets_the_timer():
    clock = {"t": 0.0}
    timer = SilenceTimer(timeout_seconds=10.0, clock=lambda: clock["t"])
    clock["t"] = 9.0
    timer.touch()
    clock["t"] = 15.0
    assert timer.expired() is False
    clock["t"] = 20.0
    assert timer.expired() is True
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_session_timer.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'session_timer'`.

- [ ] **Step 3: Write the implementation**

`live-jarvis/backend/session_timer.py`:

```python
import time
from typing import Callable


class SilenceTimer:
    def __init__(self, timeout_seconds: float = 10.0, clock: Callable[[], float] = time.monotonic):
        self.timeout_seconds = timeout_seconds
        self._clock = clock
        self._last_activity = clock()

    def touch(self) -> None:
        self._last_activity = self._clock()

    def expired(self) -> bool:
        return (self._clock() - self._last_activity) >= self.timeout_seconds
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_session_timer.py -v
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/session_timer.py live-jarvis/backend/tests/test_session_timer.py
git commit -m "feat(live-jarvis): add SilenceTimer for auto-closing idle sessions"
```

---

## Task 4: Mock Live Session

**Files:**
- Create: `live-jarvis/backend/mock_session.py`
- Test: `live-jarvis/backend/tests/test_mock_session.py`

**Interfaces:**
- Produces: `MockLiveSession` class with `async start()`, `async send_audio(pcm_bytes: bytes)`, `async receive_events()` (async generator yielding event dicts), `async close()`. This is the free, offline stand-in that Tasks 5-8 build and test against — no real Gemini connection, no cost, no real side effects (it never calls `tools.py`).
- Event shape produced (consumed by `server.py` in Task 5 and `app.js` in Task 8):
  - `{"type": "transcript", "role": "user"|"assistant", "text": str}`
  - `{"type": "status", "text": str}`
  - `{"type": "tool_result", "tool": str, "result": dict}`

- [ ] **Step 1: Write the failing tests**

`live-jarvis/backend/tests/test_mock_session.py`:

```python
import asyncio
import pytest

from mock_session import MockLiveSession


@pytest.mark.asyncio
async def test_mock_session_emits_scripted_events_after_three_chunks():
    session = MockLiveSession()
    await session.start()

    async def feed_audio():
        for _ in range(3):
            await session.send_audio(b"\x00\x00")

    events = []

    async def collect():
        async for event in session.receive_events():
            events.append(event)

    await asyncio.gather(feed_audio(), collect())

    assert events[0]["type"] == "transcript" and events[0]["role"] == "user"
    assert events[-1] == {"type": "status", "text": "idle"}
    assert any(e["type"] == "tool_result" for e in events)


@pytest.mark.asyncio
async def test_mock_session_silent_until_triggered():
    session = MockLiveSession()
    await session.send_audio(b"\x00\x00")

    async def collect_with_timeout():
        try:
            await asyncio.wait_for(session.receive_events().__anext__(), timeout=0.05)
            return "got_event"
        except asyncio.TimeoutError:
            return "timeout"

    result = await collect_with_timeout()
    assert result == "timeout"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_mock_session.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'mock_session'`.

- [ ] **Step 3: Write the implementation**

`live-jarvis/backend/mock_session.py`:

```python
import asyncio


class MockLiveSession:
    """Deterministic, offline stand-in for GeminiLiveSession. Lets the full
    audio/WebSocket/HUD pipeline be built and tested without a paid Gemini
    Live connection. Never calls tools.py — all results are fabricated."""

    TRIGGER_CHUNKS = 3

    def __init__(self):
        self._chunks_received = 0
        self._triggered = asyncio.Event()
        self._closed = False

    async def start(self) -> None:
        return None

    async def send_audio(self, pcm_bytes: bytes) -> None:
        self._chunks_received += 1
        if self._chunks_received >= self.TRIGGER_CHUNKS:
            self._triggered.set()

    async def receive_events(self):
        await self._triggered.wait()
        script = [
            {"type": "transcript", "role": "user", "text": "(mock) Xarajat yoz: 5000 som ovqatga"},
            {"type": "status", "text": "Bajarilmoqda: moliyaviy yozuv"},
            {"type": "tool_result", "tool": "log_finance", "result": {"balans_som": 1245000, "balans_usd": 40}},
            {"type": "transcript", "role": "assistant", "text": "(mock) Yozib qo'ydim."},
            {"type": "status", "text": "idle"},
        ]
        for event in script:
            if self._closed:
                return
            await asyncio.sleep(0.01)
            yield event

    async def close(self) -> None:
        self._closed = True
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_mock_session.py -v
```

Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/mock_session.py live-jarvis/backend/tests/test_mock_session.py
git commit -m "feat(live-jarvis): add free MockLiveSession for pipeline testing without API cost"
```

---

## Task 5: WebSocket Endpoint Wiring

**Files:**
- Modify: `live-jarvis/backend/server.py`
- Test: `live-jarvis/backend/tests/test_server_websocket.py`

**Interfaces:**
- Consumes: `SilenceTimer` (Task 3), `MockLiveSession` (Task 4) as the default `session_factory`.
- Produces: `GET /ws` WebSocket endpoint at `server.app`; module-level `server.session_factory` (a zero-arg callable returning a session object) that later tasks (Task 9) reassign to switch backends. Client protocol: send `{"type": "audio", "data": "<base64 pcm16>"}` or `{"type": "stop"}`; receive the event dicts documented in Task 4, plus `{"type": "closed"}` when the session ends.

- [ ] **Step 1: Write the failing test**

`live-jarvis/backend/tests/test_server_websocket.py`:

```python
import base64
import json

from fastapi.testclient import TestClient

import server
from mock_session import MockLiveSession


def test_websocket_relays_mock_session_events_to_client():
    server.session_factory = MockLiveSession
    client = TestClient(server.app)

    with client.websocket_connect("/ws") as ws:
        fake_pcm = base64.b64encode(b"\x00\x00").decode("ascii")
        for _ in range(3):
            ws.send_text(json.dumps({"type": "audio", "data": fake_pcm}))

        received = [json.loads(ws.receive_text()) for _ in range(6)]

    types = [e["type"] for e in received]
    assert types[0] == "transcript"
    assert "tool_result" in types
    assert types[-1] == "closed"
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_server_websocket.py -v
```

Expected: FAIL — `/ws` route does not exist yet (404 / connection rejection).

- [ ] **Step 3: Write the implementation**

`live-jarvis/backend/server.py` (replace entire file):

```python
import asyncio
import base64
import json
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles

from session_timer import SilenceTimer
from mock_session import MockLiveSession

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
SILENCE_TIMEOUT_SECONDS = 10.0

app = FastAPI()
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

session_factory = MockLiveSession


@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    session = session_factory()
    await session.start()
    timer = SilenceTimer(timeout_seconds=SILENCE_TIMEOUT_SECONDS)

    async def reader():
        try:
            while True:
                raw = await websocket.receive_text()
                message = json.loads(raw)
                if message["type"] == "audio":
                    pcm = base64.b64decode(message["data"])
                    await session.send_audio(pcm)
                    timer.touch()
                elif message["type"] == "stop":
                    return
        except WebSocketDisconnect:
            return

    async def writer():
        async for event in session.receive_events():
            timer.touch()
            await websocket.send_text(json.dumps(event))

    async def watch_timeout():
        while True:
            await asyncio.sleep(1.0)
            if timer.expired():
                return

    reader_task = asyncio.create_task(reader())
    writer_task = asyncio.create_task(writer())
    timeout_task = asyncio.create_task(watch_timeout())

    _done, pending = await asyncio.wait(
        {reader_task, writer_task, timeout_task}, return_when=asyncio.FIRST_COMPLETED
    )
    for task in pending:
        task.cancel()

    await session.close()
    try:
        await websocket.send_text(json.dumps({"type": "closed"}))
    except Exception:
        pass
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_server_websocket.py -v
```

Expected: PASS. (The writer's generator exhausts after 5 scripted events, `writer_task` completes first, the other tasks get cancelled, and `"closed"` is sent — all within well under a second, no need to wait out the real 10s timeout.)

- [ ] **Step 5: Run the full test suite so far**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/ -v
```

Expected: all tests from Tasks 1-5 PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/server.py live-jarvis/backend/tests/test_server_websocket.py
git commit -m "feat(live-jarvis): wire /ws endpoint to session backend with silence timeout"
```

---

## Task 6: Arc Reactor HUD Static Page

**Files:**
- Create: `live-jarvis/frontend/index.html`
- Create: `live-jarvis/frontend/style.css`

**Interfaces:**
- Produces: a static page served at `/` via `server.py`'s `StaticFiles` mount (Task 5), with DOM hooks Task 8's `app.js` will use: `#status-text`, `#transcript`, `#mute-btn`, `#core`, and a `--amp` CSS custom property on `<body>` driving ring/core pulse; `<body>` class toggles between `state-idle`, `state-listening`, `state-speaking`, `state-error`.
- Adapts the already-approved "Concept A — Arc Reactor" visual (cyan tilted 3D rings, HUD corner brackets) from the earlier mockup round into a live app shell.

- [ ] **Step 1: Write `index.html`**

`live-jarvis/frontend/index.html`:

```html
<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Live Jarvis</title>
<link rel="stylesheet" href="/static/style.css">
</head>
<body class="state-idle">
  <div class="topbar">
    <div class="logo">&#9670; JARVIS</div>
    <div class="status" id="status-text">Kutilmoqda... "Jarvis" deng</div>
  </div>

  <div class="stage">
    <div class="ring r1"></div>
    <div class="ring tick"></div>
    <div class="ring r2"></div>
    <div class="ring r3"></div>
    <div class="core" id="core"></div>
    <div class="hud-corner tl"></div><div class="hud-corner tr"></div>
    <div class="hud-corner bl"></div><div class="hud-corner br"></div>
  </div>

  <div class="transcript-panel" id="transcript"></div>

  <button class="mute-btn" id="mute-btn">MUTE</button>

  <script src="/static/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `style.css`**

`live-jarvis/frontend/style.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Orbitron:wght@700;900&display=swap');
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; background:#000; overflow:hidden; font-family:'JetBrains Mono',monospace; }
body { position:relative; background: radial-gradient(ellipse at center, #001a22 0%, #000 75%); color:#5ef5ff; --amp:0; }

.topbar { position:absolute; top:0; left:0; right:0; display:flex; justify-content:space-between; padding:22px 40px; z-index:10; }
.logo { font-family:'Orbitron',sans-serif; font-weight:900; letter-spacing:4px; color:#5ef5ff; }
.status { font-size:12px; letter-spacing:2px; color:#8fe0d0; }

.stage { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:600px; height:600px; perspective:1000px; }
.ring { position:absolute; top:50%; left:50%; border-radius:50%; border:2px solid rgba(94,245,255,0.55); transform-style:preserve-3d; transition: transform 0.15s ease-out; }
.ring.r1 { width:520px; height:520px; margin:-260px 0 0 -260px; transform:rotateX(72deg) scale(calc(1 + var(--amp) * 0.06)); border-color:rgba(94,245,255,0.25); }
.ring.r2 { width:420px; height:420px; margin:-210px 0 0 -210px; transform:rotateX(72deg) rotate(35deg) scale(calc(1 + var(--amp) * 0.1)); border-style:dashed; border-color:rgba(94,245,255,0.4); }
.ring.r3 { width:320px; height:320px; margin:-160px 0 0 -160px; transform:rotateX(72deg) rotate(70deg) scale(calc(1 + var(--amp) * 0.16)); border-color:rgba(160,255,240,0.6); border-width:1px; }
.ring.tick { width:560px; height:560px; margin:-280px 0 0 -280px; transform:rotateX(72deg); border:none;
  background: repeating-conic-gradient(rgba(94,245,255,0.5) 0deg 1.2deg, transparent 1.2deg 9deg);
  -webkit-mask: radial-gradient(circle, transparent 264px, black 266px, black 280px, transparent 282px);
  mask: radial-gradient(circle, transparent 264px, black 266px, black 280px, transparent 282px); }

.core { position:absolute; top:50%; left:50%; width:150px; height:150px; margin:-75px 0 0 -75px; border-radius:50%;
  background: radial-gradient(circle at 40% 35%, #fff 0%, #7fe9ff 18%, #17b7d6 45%, #013844 80%);
  box-shadow: 0 0 calc(60px + var(--amp) * 60px) calc(20px + var(--amp) * 20px) rgba(94,245,255,0.55);
  transition: box-shadow 0.1s linear; }

.hud-corner { position:absolute; width:60px; height:60px; border:2px solid rgba(94,245,255,0.6); }
.hud-corner.tl { top:40px; left:40px; border-right:none; border-bottom:none; }
.hud-corner.tr { top:40px; right:40px; border-left:none; border-bottom:none; }
.hud-corner.bl { bottom:40px; left:40px; border-right:none; border-top:none; }
.hud-corner.br { bottom:40px; right:40px; border-left:none; border-top:none; }

body.state-error .core { background: radial-gradient(circle at 40% 35%, #fff 0%, #ff9a9a 18%, #d61717 45%, #380101 80%); }
body.state-listening .status { color:#5ef5ff; }
body.state-speaking .status { color:#a0ffcf; }

.transcript-panel { position:absolute; bottom:100px; left:50%; transform:translateX(-50%); width:640px; max-height:160px;
  overflow-y:auto; background:rgba(0,20,26,0.6); border:1px solid #114550; border-radius:10px; padding:12px 20px; font-size:12px; line-height:1.6; }
.transcript-panel .line.user { color:#8fe0d0; }
.transcript-panel .line.assistant { color:#5ef5ff; }

.mute-btn { position:absolute; bottom:36px; right:40px; background:rgba(0,20,26,0.7); border:1px solid #5ef5ff; color:#5ef5ff;
  font-family:'JetBrains Mono',monospace; letter-spacing:2px; padding:10px 18px; border-radius:8px; cursor:pointer; }
.mute-btn.muted { color:#ff5e5e; border-color:#ff5e5e; }
```

- [ ] **Step 3: Verify visually with Playwright**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/uvicorn server:app --port 8770 &
```

Then use `mcp__plugin_playwright_playwright__browser_navigate` to `http://localhost:8770/`, then `browser_take_screenshot`. Confirm the idle-state ring/core render correctly (cyan tilted rings, glowing core, corner brackets, status text, transcript panel, mute button all visible). Use `browser_evaluate` to run `document.body.className = 'state-error'` and re-screenshot to confirm the red error-state core swap works, then reset with `document.body.className = 'state-idle'`.

Stop the server afterward: `kill %1` (or `pkill -f "uvicorn server:app"`).

- [ ] **Step 4: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/frontend/index.html live-jarvis/frontend/style.css
git commit -m "feat(live-jarvis): add Arc Reactor HUD static page"
```

---

## Task 7: Wake-word, Mic Capture, and WebSocket Client (`app.js`)

**Files:**
- Create: `live-jarvis/frontend/app.js`

**Interfaces:**
- Consumes: DOM hooks from Task 6 (`#status-text`, `#transcript`, `#mute-btn`, `--amp` CSS var, `state-*` body classes); the `/ws` WebSocket protocol from Task 5 (client sends `{"type":"audio","data":"<base64 pcm16>"}` / `{"type":"stop"}`, receives the event dicts from Task 4/5).
- Produces: fully wired frontend behavior — no further tasks consume this file directly (it's the top of the stack), but Task 9 changes what's *behind* `/ws` without requiring any change here, since the WebSocket protocol stays identical.

- [ ] **Step 1: Write `app.js`**

`live-jarvis/frontend/app.js`:

```javascript
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
```

Note: `ScriptProcessorNode` is deprecated in favor of `AudioWorklet`, but is used here deliberately — this is a local, single-user, Chrome-only tool, and `ScriptProcessorNode` needs no separate worklet file to load, keeping the frontend to one script. Chrome has not removed it.

- [ ] **Step 2: Manually verify the WebSocket + HUD wiring against the mock backend**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/uvicorn server:app --port 8770 &
```

Use `mcp__plugin_playwright_playwright__browser_navigate` to `http://localhost:8770/`, then `browser_evaluate` to run the following (this simulates the WebSocket flow without needing real mic/wake-word input, which Playwright's automated browser cannot reliably provide):

```javascript
() => {
  window.__testWs = new WebSocket('ws://' + location.host + '/ws');
  window.__testWs.onmessage = (e) => console.log('EVENT', e.data);
  window.__testWs.onopen = () => {
    const fake = btoa('\x00\x00');
    for (let i = 0; i < 3; i++) {
      window.__testWs.send(JSON.stringify({ type: 'audio', data: fake }));
    }
  };
}
```

Then use `mcp__plugin_playwright_playwright__browser_console_messages` to confirm 6 `EVENT` log lines appear (5 scripted mock events + `closed`), and `browser_take_screenshot` to confirm the transcript panel populated with the two mock lines and the status text updated. Stop the server: `pkill -f "uvicorn server:app"`.

- [ ] **Step 3: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/frontend/app.js
git commit -m "feat(live-jarvis): wire wake-word, mic capture, and WebSocket client"
```

---

## Task 8: Gemini Live Session (real backend — LAST, per Behruz's explicit instruction)

**Files:**
- Create: `live-jarvis/backend/gemini_session.py`
- Modify: `live-jarvis/backend/server.py:16` (the `session_factory = MockLiveSession` line)
- Test: `live-jarvis/backend/tests/test_gemini_session_config.py`

**Interfaces:**
- Consumes: `tools.py` functions (Task 2) as the function-call dispatch table; the same `start`/`send_audio`/`receive_events`/`close` interface as `MockLiveSession` (Task 4), so `server.py`'s websocket handler (Task 5) needs no changes beyond swapping which class it instantiates.
- Produces: `GeminiLiveSession` class; `build_config() -> dict` (pure function, unit-tested without any network call); `FUNCTION_DECLARATIONS` (list of dicts); `TOOL_DISPATCH` (dict mapping function name to `tools.py` callable).

This task only implements code — the actual live voice test with real cost happens in Task 9, with Behruz present.

- [ ] **Step 1: Write the failing tests**

`live-jarvis/backend/tests/test_gemini_session_config.py`:

```python
import gemini_session


def test_build_config_includes_google_search_and_function_tools():
    config = gemini_session.build_config()
    tool_types = [list(t.keys())[0] for t in config["tools"]]
    assert "google_search" in tool_types
    assert "function_declarations" in tool_types


def test_function_declarations_match_tool_dispatch():
    declared_names = {fn["name"] for fn in gemini_session.FUNCTION_DECLARATIONS}
    dispatch_names = set(gemini_session.TOOL_DISPATCH.keys())
    assert declared_names == dispatch_names


def test_each_function_declaration_has_object_parameters_schema():
    for decl in gemini_session.FUNCTION_DECLARATIONS:
        assert decl["parameters"]["type"] == "object"
        assert "properties" in decl["parameters"]
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_gemini_session_config.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'gemini_session'`.

- [ ] **Step 3: Write the implementation**

`live-jarvis/backend/gemini_session.py`:

```python
import base64

from google import genai
from google.genai import types

import tools

GEMINI_ENV_PATH = "/Users/behruz/behruzjarvis-os/state/behruzjarvis/gemini.env"
MODEL = "gemini-3.1-flash-live-preview"

SYSTEM_INSTRUCTION = (
    "Sening isming Jarvis — Behruzning ovozli yordamchisisan. "
    "U bilan o'zbek yoki ingliz tilida gaplash — u qaysi tilda so'zlasa, "
    "o'sha tilda javob ber. Harakatlarni darhol bajar, tasdiqlashni so'rama — "
    "Behruz hozir yoningda va kerak bo'lsa 'to'xta' deb seni to'xtata oladi. "
    "Har bir amaldan keyin natijani qisqa ovozda ayt."
)

FUNCTION_DECLARATIONS = [
    {
        "name": "send_telegram_message",
        "description": "Telegram orqali kimgadir xabar yuborish.",
        "parameters": {
            "type": "object",
            "properties": {
                "contact_query": {"type": "string", "description": "Qabul qiluvchining ismi yoki username'i"},
                "message": {"type": "string", "description": "Yuboriladigan xabar matni"},
            },
            "required": ["contact_query", "message"],
        },
    },
    {
        "name": "add_calendar_event",
        "description": "Google Calendar'ga yangi tadbir qo'shish.",
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {"type": "string", "description": "Tadbir nomi"},
                "start_iso": {"type": "string", "description": "Boshlanish vaqti, ISO format, masalan 2026-07-13T20:00:00"},
                "end_iso": {"type": "string", "description": "Tugash vaqti, ISO format"},
                "description": {"type": "string", "description": "Qo'shimcha tavsif (ixtiyoriy)"},
            },
            "required": ["summary", "start_iso", "end_iso"],
        },
    },
    {
        "name": "log_finance",
        "description": "Moliyaviy kirim yoki chiqimni yozib qo'yish.",
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {"type": "string", "enum": ["kirim", "chiqim"]},
                "amount": {"type": "number"},
                "currency": {"type": "string", "enum": ["UZS", "USD"]},
                "note": {"type": "string", "description": "Izoh (ixtiyoriy)"},
            },
            "required": ["kind", "amount", "currency"],
        },
    },
    {
        "name": "read_sheet",
        "description": "Google Sheets'dagi moliyaviy jadvaldan ma'lumot o'qish.",
        "parameters": {
            "type": "object",
            "properties": {
                "range_": {"type": "string", "description": "Sheet range, masalan A1:G20"},
            },
            "required": [],
        },
    },
]

TOOL_DISPATCH = {
    "send_telegram_message": tools.send_telegram_message,
    "add_calendar_event": tools.add_calendar_event,
    "log_finance": tools.log_finance,
    "read_sheet": tools.read_sheet,
}


def _load_api_key() -> str:
    with open(GEMINI_ENV_PATH) as f:
        return f.read().strip().split("=", 1)[1]


def build_config() -> dict:
    return {
        "response_modalities": ["AUDIO"],
        "system_instruction": SYSTEM_INSTRUCTION,
        "input_audio_transcription": {},
        "output_audio_transcription": {},
        "tools": [
            {"google_search": {}},
            {"function_declarations": FUNCTION_DECLARATIONS},
        ],
    }


class GeminiLiveSession:
    """Real Gemini Live backend. Same 4-method interface as MockLiveSession."""

    def __init__(self):
        self._client = genai.Client(api_key=_load_api_key())
        self._session_cm = None
        self._session = None

    async def start(self) -> None:
        self._session_cm = self._client.aio.live.connect(model=MODEL, config=build_config())
        self._session = await self._session_cm.__aenter__()

    async def send_audio(self, pcm_bytes: bytes) -> None:
        await self._session.send_realtime_input(
            audio=types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
        )

    async def receive_events(self):
        async for response in self._session.receive():
            content = response.server_content
            if content:
                if content.input_transcription and content.input_transcription.text:
                    yield {"type": "transcript", "role": "user", "text": content.input_transcription.text}
                if content.output_transcription and content.output_transcription.text:
                    yield {"type": "transcript", "role": "assistant", "text": content.output_transcription.text}
                if content.model_turn:
                    for part in content.model_turn.parts:
                        if part.inline_data:
                            yield {"type": "audio", "data": base64.b64encode(part.inline_data.data).decode("ascii")}

            if response.tool_call:
                function_responses = []
                for fc in response.tool_call.function_calls:
                    yield {"type": "status", "text": f"Bajarilmoqda: {fc.name}"}
                    try:
                        result = TOOL_DISPATCH[fc.name](**fc.args)
                        yield {"type": "tool_result", "tool": fc.name, "result": result}
                    except Exception as exc:
                        result = {"error": str(exc)}
                        yield {"type": "error", "text": f"{fc.name}: {exc}"}
                    function_responses.append(
                        types.FunctionResponse(name=fc.name, id=fc.id, response={"result": result})
                    )
                await self._session.send_tool_response(function_responses=function_responses)

    async def close(self) -> None:
        if self._session_cm:
            await self._session_cm.__aexit__(None, None, None)
```

**Note for whoever implements this task:** the `send_realtime_input` / `session.receive()` / `send_tool_response` method names and the `types.Blob` / `types.FunctionResponse` shapes above are taken directly from Google's official Live API SDK docs (`ai.google.dev/gemini-api/docs/live-api/get-started-sdk`) as of this plan's writing. The `input_audio_transcription` / `output_audio_transcription` / `system_instruction` config keys are standard Live API config fields but were not directly re-verified against a live call while writing this plan — if `client.aio.live.connect()` raises a config-validation error in Step 5 below, check the current SDK docs for the exact key names and adjust.

- [ ] **Step 4: Run the new tests to verify they pass**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_gemini_session_config.py -v
```

Expected: PASS (3 tests) — these test `build_config()` and the dispatch table only, no network call.

- [ ] **Step 5: Switch the server's default session backend**

Edit `live-jarvis/backend/server.py`. Change:

```python
from mock_session import MockLiveSession
...
session_factory = MockLiveSession
```

to:

```python
from mock_session import MockLiveSession
from gemini_session import GeminiLiveSession
...
session_factory = GeminiLiveSession
```

- [ ] **Step 6: Confirm Task 5's websocket test still passes**

`test_server_websocket.py` explicitly sets `server.session_factory = MockLiveSession` before connecting, so it is unaffected by this default change — this step just confirms that:

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/ -v
```

Expected: all tests from every task PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/gemini_session.py live-jarvis/backend/server.py live-jarvis/backend/tests/test_gemini_session_config.py
git commit -m "feat(live-jarvis): add real GeminiLiveSession backend, wired as default"
```

---

## Task 9: Live End-to-End Test With Behruz (manual, real cost)

This is the first task that spends real Gemini Live API money and the first that touches Behruz's real Telegram/Calendar/Sheets. Do not run it unattended.

- [ ] **Step 1: Start the server**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend
/Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/uvicorn server:app --port 8770
```

- [ ] **Step 2: Open in Chrome**

Behruz opens `http://localhost:8770/` in Chrome himself (mic permission prompt requires a real user gesture in a real Chrome window — this cannot be done through Playwright automation).

- [ ] **Step 3: Test each of the 5 actions live, per the approved design spec's testing plan**

  - Telegram send → say a message addressed to **Behruz's own account/number only**, not a real contact, until confirmed reliable.
  - Calendar add → add a throwaway test event, delete it afterward from Google Calendar.
  - Finance log → log a small test entry, correct or remove it afterward from the sheet if needed.
  - Web search → ask a simple factual question with a checkable answer, confirm Jarvis answers correctly via the `google_search` grounding tool.
  - Sheets read → ask about a known value already in the finance sheet, confirm the spoken answer matches.

- [ ] **Step 4: Test the mute button and barge-in**

  - Say "Jarvis", let it start responding, then say "to'xta" mid-response — confirm playback stops (Gemini Live's native interruption handling).
  - Click MUTE mid-conversation — confirm the mic and wake-word listener both stop immediately, and the reactor returns to idle.

- [ ] **Step 5: Only after all 5 actions and both control checks pass with Behruz watching, consider this "in use" rather than "testing."**

- [ ] **Step 6: Stop the server**

```bash
pkill -f "uvicorn server:app"
```

No commit needed for this task — it is a live verification pass, not a code change.

---

## Self-Review Notes

**Spec coverage:** every scope item in `2026-07-10-live-jarvis-voice-agent-design.md` maps to a task — the 5 actions (Tasks 2, 8), Arc Reactor visual (Task 6), wake-word/mic/mute/transcript (Task 7), silence-timeout cost control (Task 3, 5), Gemini-last sequencing (Tasks 4-8 build on the mock, Task 8/9 add the real backend last), barge-in (relies on Gemini Live's native handling, verified live in Task 9), error handling (status/error events wired end-to-end in Tasks 5, 7, 8).

**Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code. The one caveat flagged (Task 8's note on unverified `input_audio_transcription`/`output_audio_transcription`/`system_instruction` config keys) is an honest disclosure of API-surface risk for a task that necessarily touches a live external service, not a placeholder — the verified parts (`send_realtime_input`, `receive()`, `send_tool_response`, `types.Blob`, `types.FunctionResponse`, dict-based `tools`/`google_search`) come directly from Google's official docs.

**Type consistency:** `MockLiveSession` and `GeminiLiveSession` both expose `start()` / `send_audio(pcm_bytes: bytes)` / `receive_events()` (async generator of event dicts) / `close()` — checked against both class bodies. Event dict shapes (`transcript`/`status`/`tool_result`/`error`/`closed`) are consistent across `mock_session.py`, `gemini_session.py`, `server.py`, and `app.js`'s `handleServerEvent`. `tools.py` function names (`send_telegram_message`, `add_calendar_event`, `log_finance`, `read_sheet`) match `gemini_session.TOOL_DISPATCH` keys exactly, enforced by `test_function_declarations_match_tool_dispatch`.
