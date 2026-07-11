# Live Jarvis Camera Vision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Gemini-Live-triggered camera to the existing live-jarvis HUD — "kamerani och" opens the Mac's camera, streams it to Gemini Live at 1 frame/second so Jarvis can see and talk about what's in view, and it closes again by voice ("kamerani yop") or a manual HUD button.

**Architecture:** Two new function declarations (`open_camera`, `close_camera`) are added to the existing `GeminiLiveSession`. Unlike the 5 existing actions, these are never subprocess-dispatched — `receive_events()` special-cases them, immediately telling Gemini "success" (optimistic response) and forwarding a `{"type": "open_camera"}` / `{"type": "close_camera"}` event straight to the browser over the existing WebSocket. The browser then owns the camera (`getUserMedia`), takes over the MEDIA PLAYER panel with a live `<video>` feed, and every second grabs a downsized JPEG frame and sends it back over the same WebSocket as a new `video_frame` message. `server.py` relays that frame into a new `send_video()` method mirroring the existing `send_audio()` path (`send_realtime_input(video=...)`).

**Tech Stack:** Same as the base app — Python 3.12, FastAPI, `websockets`, `google-genai` SDK, pytest + pytest-asyncio for the backend; vanilla HTML/CSS/JS for the frontend (no test harness exists for the frontend — see Task 5's note).

## Global Constraints

- Frame capture rate: 1 frame/second (`setInterval(..., 1000)`), JPEG quality 0.6, downsized to ≤640px on the long edge — exact values from the approved design spec, not placeholders.
- Function-call response to Gemini is always immediate/optimistic (variant A) — never wait for the browser to confirm the camera actually opened before replying to Gemini.
- Camera closes two ways only: the `close_camera` Gemini function-call (voice) and a manual HUD button — both call the exact same client-side `closeCamera()` routine. The manual button does **not** round-trip through the backend/Gemini to close (per spec: "does not require a round trip through Gemini to close") — it stops the local stream and frame interval directly.
- Video takes over the existing `.panel-media` (MEDIA PLAYER) panel in place — no new panel, no layout changes elsewhere in the HUD.
- Video frames call `timer.touch()` on arrival, same as audio — this keeps the existing 10s-silence `SilenceTimer` (which ends the whole Gemini Live session) from firing while the camera is actively streaming. The camera itself has no separate auto-close timer.
- No new dependency: `google-genai`'s `send_realtime_input(video=...)` already exists and is used exactly like the existing `send_realtime_input(audio=...)` call in `send_audio()`.
- Every session backend (`GeminiLiveSession`, `MockLiveSession`, and any test fake standing in for a full session) keeps the same 5-method shape after this plan: `start` / `send_audio` / `send_video` / `receive_events` / `close`.

---

## File Structure

```
live-jarvis/
  backend/
    gemini_session.py   # MODIFY: +2 function declarations, camera dispatch branch, send_video()
    mock_session.py      # MODIFY: +send_video() no-op for interface parity
    server.py             # MODIFY: reader() handles new "video_frame" client message
    tests/
      test_gemini_session_config.py   # MODIFY: dispatch-match test updated, camera tests added
      test_mock_session.py             # MODIFY: send_video no-op test added
      test_server_websocket.py         # MODIFY: video_frame relay test added
  frontend/
    app.js                # MODIFY: open_camera/close_camera handlers, 1fps frame capture
    style.css              # MODIFY: styling for the injected camera video + close button
```

No new files — every change lands in an existing file.

---

## Task 1: Declare `open_camera`/`close_camera` Gemini functions

**Files:**
- Modify: `live-jarvis/backend/gemini_session.py:19-78` (FUNCTION_DECLARATIONS list and the new constant after TOOL_DISPATCH)
- Test: `live-jarvis/backend/tests/test_gemini_session_config.py`

**Interfaces:**
- Produces: `gemini_session.CAMERA_FUNCTION_NAMES` — a `set[str]` containing `{"open_camera", "close_camera"}`. Task 2 uses this set inside `receive_events()` to branch dispatch.

- [ ] **Step 1: Write the failing tests**

Replace the existing `test_function_declarations_match_tool_dispatch` in `live-jarvis/backend/tests/test_gemini_session_config.py` (it currently asserts full equality, which the new camera functions will break) and add a new test for the camera set:

```python
def test_function_declarations_match_tool_dispatch():
    declared_names = {fn["name"] for fn in gemini_session.FUNCTION_DECLARATIONS}
    dispatch_names = set(gemini_session.TOOL_DISPATCH.keys())
    assert declared_names - gemini_session.CAMERA_FUNCTION_NAMES == dispatch_names


def test_camera_function_names_are_declared_but_not_dispatched():
    declared_names = {fn["name"] for fn in gemini_session.FUNCTION_DECLARATIONS}
    assert gemini_session.CAMERA_FUNCTION_NAMES == {"open_camera", "close_camera"}
    assert gemini_session.CAMERA_FUNCTION_NAMES <= declared_names
    assert gemini_session.CAMERA_FUNCTION_NAMES.isdisjoint(gemini_session.TOOL_DISPATCH.keys())
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend && /Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_gemini_session_config.py -v`
Expected: `test_function_declarations_match_tool_dispatch` FAILS (old assertion body still checks straight equality — actually replaced, so this should fail with `AttributeError: module 'gemini_session' has no attribute 'CAMERA_FUNCTION_NAMES'`), and `test_camera_function_names_are_declared_but_not_dispatched` FAILS with the same `AttributeError`.

- [ ] **Step 3: Add the two function declarations and the constant**

In `live-jarvis/backend/gemini_session.py`, append two entries to `FUNCTION_DECLARATIONS` (before its closing `]` at line 71), right after the existing `read_sheet` entry:

```python
    {
        "name": "open_camera",
        "description": "Kamerani ochish — foydalanuvchi nima ko'rsatayotganini real vaqtda ko'rish uchun.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "close_camera",
        "description": "Kamerani yopish.",
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
```

Then, right after the existing `TOOL_DISPATCH` dict (after line 78), add:

```python
CAMERA_FUNCTION_NAMES = {"open_camera", "close_camera"}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend && /Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_gemini_session_config.py -v`
Expected: all tests PASS, including the pre-existing `test_build_config_includes_google_search_and_function_tools` and `test_each_function_declaration_has_object_parameters_schema` (the new entries' `"properties": {}` satisfies that test's `"properties" in fn["parameters"]` check).

- [ ] **Step 5: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/gemini_session.py live-jarvis/backend/tests/test_gemini_session_config.py
git commit -m "feat(live-jarvis): declare open_camera/close_camera Gemini functions"
```

---

## Task 2: Camera dispatch branch + `send_video()` on `GeminiLiveSession`

**Files:**
- Modify: `live-jarvis/backend/gemini_session.py:159-203` (`send_audio`/`receive_events`)
- Test: `live-jarvis/backend/tests/test_gemini_session_config.py`

**Interfaces:**
- Consumes: `gemini_session.CAMERA_FUNCTION_NAMES` (Task 1).
- Produces: `GeminiLiveSession.send_video(jpeg_bytes: bytes) -> None`, used by Task 4's `server.py` change. `receive_events()` now yields `{"type": "open_camera"}` / `{"type": "close_camera"}` (no `text`/`tool`/`result` keys) instead of the `status`/`tool_result` pair for these two function names — Task 5's frontend handler matches on exactly these two `type` strings.

- [ ] **Step 1: Write the failing tests**

Add to `live-jarvis/backend/tests/test_gemini_session_config.py`:

```python
class _RecordingToolResponseSession(_FakeSDKSession):
    def __init__(self, responses):
        super().__init__(responses)
        self.sent_tool_responses = []

    async def send_tool_response(self, function_responses):
        self.sent_tool_responses.append(function_responses)


class _RecordingRealtimeInputSession:
    def __init__(self):
        self.calls = []

    async def send_realtime_input(self, **kwargs):
        self.calls.append(kwargs)


async def test_receive_events_handles_open_camera_without_dispatch():
    fc = SimpleNamespace(name="open_camera", args={}, id="fc-open")
    response = SimpleNamespace(
        server_content=None,
        tool_call=SimpleNamespace(function_calls=[fc]),
    )
    session = gemini_session.GeminiLiveSession.__new__(gemini_session.GeminiLiveSession)
    fake_sdk = _RecordingToolResponseSession([response])
    session._session = fake_sdk
    session._closed = False

    events = []
    async for event in session.receive_events():
        events.append(event)
        if len(events) == 2:
            break

    assert events[0] == {"type": "open_camera"}
    assert len(fake_sdk.sent_tool_responses) == 1
    sent = fake_sdk.sent_tool_responses[0][0]
    assert sent.name == "open_camera"
    assert sent.response == {"result": {"status": "ok"}}


async def test_receive_events_handles_close_camera_without_dispatch():
    fc = SimpleNamespace(name="close_camera", args={}, id="fc-close")
    response = SimpleNamespace(
        server_content=None,
        tool_call=SimpleNamespace(function_calls=[fc]),
    )
    session = gemini_session.GeminiLiveSession.__new__(gemini_session.GeminiLiveSession)
    fake_sdk = _RecordingToolResponseSession([response])
    session._session = fake_sdk
    session._closed = False

    events = []
    async for event in session.receive_events():
        events.append(event)
        if len(events) == 2:
            break

    assert events[0] == {"type": "close_camera"}
    assert len(fake_sdk.sent_tool_responses) == 1
    sent = fake_sdk.sent_tool_responses[0][0]
    assert sent.name == "close_camera"
    assert sent.response == {"result": {"status": "ok"}}


async def test_send_video_wraps_jpeg_bytes_in_video_blob():
    session = gemini_session.GeminiLiveSession.__new__(gemini_session.GeminiLiveSession)
    fake = _RecordingRealtimeInputSession()
    session._session = fake

    await session.send_video(b"fake-jpeg-bytes")

    assert len(fake.calls) == 1
    blob = fake.calls[0]["video"]
    assert blob.data == b"fake-jpeg-bytes"
    assert blob.mime_type == "image/jpeg"
```

(`_FakeSDKSession` and `SimpleNamespace` are already imported/defined at the top of this test file — reuse them, don't redefine.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend && /Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_gemini_session_config.py -v`
Expected: the two `test_receive_events_handles_*_camera_*` tests FAIL with `KeyError: 'open_camera'` / `KeyError: 'close_camera'` (current code does `TOOL_DISPATCH[fc.name]` unconditionally). `test_send_video_wraps_jpeg_bytes_in_video_blob` FAILS with `AttributeError: 'GeminiLiveSession' object has no attribute 'send_video'`.

- [ ] **Step 3: Implement the camera branch and `send_video`**

In `live-jarvis/backend/gemini_session.py`, replace the `tool_call` handling block inside `receive_events()` (currently lines 188-203):

```python
                if response.tool_call:
                    function_responses = []
                    for fc in response.tool_call.function_calls:
                        if fc.name in CAMERA_FUNCTION_NAMES:
                            result = {"status": "ok"}
                            yield {"type": fc.name}
                        else:
                            yield {"type": "status", "text": f"Bajarilmoqda: {fc.name}"}
                            try:
                                result = TOOL_DISPATCH[fc.name](**(fc.args or {}))
                                yield {"type": "tool_result", "tool": fc.name, "result": result}
                            except Exception as exc:
                                result = {"error": str(exc)}
                                yield {"type": "error", "text": f"{fc.name}: {exc}"}
                        function_responses.append(
                            types.FunctionResponse(name=fc.name, id=fc.id, response={"result": result})
                        )
                    await self._session.send_tool_response(
                        function_responses=function_responses
                    )
```

Then add a new method right after `send_audio` (after line 162, before `async def receive_events(self):`):

```python
    async def send_video(self, jpeg_bytes: bytes) -> None:
        await self._session.send_realtime_input(
            video=types.Blob(data=jpeg_bytes, mime_type="image/jpeg")
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend && /Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_gemini_session_config.py -v`
Expected: all tests PASS, including the pre-existing `test_receive_events_yields_interrupted_on_server_side_barge_in` (unmodified, must not regress).

- [ ] **Step 5: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/gemini_session.py live-jarvis/backend/tests/test_gemini_session_config.py
git commit -m "feat(live-jarvis): dispatch camera function-calls without subprocess, add send_video"
```

---

## Task 3: `send_video` no-op on `MockLiveSession`

**Files:**
- Modify: `live-jarvis/backend/mock_session.py:19-23` (after `send_audio`, before `receive_events`)
- Test: `live-jarvis/backend/tests/test_mock_session.py`

**Interfaces:**
- Produces: `MockLiveSession.send_video(jpeg_bytes: bytes) -> None`, restoring the 5-method interface parity the class's own docstring already commits to. Task 4's server test does not use `MockLiveSession` directly (it uses a purpose-built fake, see Task 4), but any other code path constructing `MockLiveSession` and calling `send_video` must not crash.

- [ ] **Step 1: Write the failing test**

Add to `live-jarvis/backend/tests/test_mock_session.py`:

```python
@pytest.mark.asyncio
async def test_mock_session_send_video_is_a_noop():
    session = MockLiveSession()
    result = await session.send_video(b"\xff\xd8\xff")
    assert result is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend && /Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_mock_session.py -v`
Expected: `test_mock_session_send_video_is_a_noop` FAILS with `AttributeError: 'MockLiveSession' object has no attribute 'send_video'`.

- [ ] **Step 3: Add the method**

In `live-jarvis/backend/mock_session.py`, add right after `send_audio` (after line 22, before `async def receive_events(self):`):

```python
    async def send_video(self, jpeg_bytes: bytes) -> None:
        return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend && /Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_mock_session.py -v`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/mock_session.py live-jarvis/backend/tests/test_mock_session.py
git commit -m "feat(live-jarvis): add send_video no-op to MockLiveSession for interface parity"
```

---

## Task 4: Relay `video_frame` WebSocket messages to the session

**Files:**
- Modify: `live-jarvis/backend/server.py:62-74` (`reader()`)
- Test: `live-jarvis/backend/tests/test_server_websocket.py`

**Interfaces:**
- Consumes: `session.send_video(jpeg_bytes: bytes)` (Task 2/3 — works against either real backend since both now implement it).
- Produces: client → server WebSocket message shape `{"type": "video_frame", "data": "<base64 jpeg>"}`, which Task 5's `app.js` sends.

- [ ] **Step 1: Write the failing test**

Add to `live-jarvis/backend/tests/test_server_websocket.py` (add `import asyncio` at the top alongside the existing `base64`/`json` imports):

```python
class _RecordingVideoSession:
    """Fake session whose receive_events() never completes on its own
    (blocks on an Event that's never set) so the writer task can't race
    ahead and get cancelled before reader() has processed our messages."""

    def __init__(self):
        self.received_frames = []

    async def start(self):
        return None

    async def send_audio(self, pcm_bytes):
        return None

    async def send_video(self, jpeg_bytes):
        self.received_frames.append(jpeg_bytes)

    async def receive_events(self):
        await asyncio.Event().wait()
        return
        yield  # pragma: no cover - makes this an async generator

    async def close(self):
        return None


def test_websocket_relays_video_frame_to_session():
    fake = _RecordingVideoSession()
    server.session_factory = lambda: fake
    client = TestClient(server.app)

    with client.websocket_connect("/ws") as ws:
        fake_jpeg = base64.b64encode(b"\xff\xd8\xff").decode("ascii")
        ws.send_text(json.dumps({"type": "video_frame", "data": fake_jpeg}))
        ws.send_text(json.dumps({"type": "stop"}))
        received = json.loads(ws.receive_text())

    assert received == {"type": "closed"}
    assert fake.received_frames == [b"\xff\xd8\xff"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend && /Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_server_websocket.py -v`
Expected: `test_websocket_relays_video_frame_to_session` FAILS with `assert [] == [b'\xff\xd8\xff']` (current `reader()` silently ignores unknown `"type"` values, so `send_video` is never called).

- [ ] **Step 3: Handle the new message type**

In `live-jarvis/backend/server.py`, inside `reader()`, add a branch after the existing `audio` branch (after line 70, before `elif message["type"] == "stop":`):

```python
                elif message["type"] == "video_frame":
                    jpeg_bytes = base64.b64decode(message["data"])
                    await session.send_video(jpeg_bytes)
                    timer.touch()
```

The full `reader()` body should now read:

```python
    async def reader():
        try:
            while True:
                raw = await websocket.receive_text()
                message = json.loads(raw)
                if message["type"] == "audio":
                    pcm = base64.b64decode(message["data"])
                    await session.send_audio(pcm)
                    timer.touch()
                elif message["type"] == "video_frame":
                    jpeg_bytes = base64.b64decode(message["data"])
                    await session.send_video(jpeg_bytes)
                    timer.touch()
                elif message["type"] == "stop":
                    return
        except WebSocketDisconnect:
            return
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend && /Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest tests/test_server_websocket.py -v`
Expected: all tests PASS, including the three pre-existing tests in this file (unmodified, must not regress).

- [ ] **Step 5: Run the full backend suite before moving to the frontend**

Run: `cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis/live-jarvis/backend && /Users/behruz/.behruzjarvis/venvs/live_jarvis/bin/pytest -v`
Expected: all tests across all files PASS (this is the last backend-only task — a full green run here is the gate before frontend work begins).

- [ ] **Step 6: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/backend/server.py live-jarvis/backend/tests/test_server_websocket.py
git commit -m "feat(live-jarvis): relay video_frame websocket messages to Gemini session"
```

---

## Task 5: Frontend camera UI — open/close + 1fps frame capture

**Files:**
- Modify: `live-jarvis/frontend/app.js`
- Modify: `live-jarvis/frontend/style.css`

**Interfaces:**
- Consumes: server → client events `{"type": "open_camera"}` / `{"type": "close_camera"}` (Task 2) inside the existing `handleServerEvent(data)` dispatcher; client → server message shape `{"type": "video_frame", "data": "<base64 jpeg>"}` (Task 4).
- Produces: nothing consumed by later tasks — this is the last code task.

**No automated test for this task.** `live-jarvis/frontend/` has zero existing tests and no JS test runner configured (checked: no `package.json`, no `*.test.js`, no Jest/Vitest config anywhere in the project) — the existing `app.js` (wake-word, mic capture, playback) was built and verified the same way: manual browser testing with Behruz present, per the base spec's own Testing Plan. This task follows that established pattern rather than introducing a new test harness for one file (that would be scope creep beyond this feature). Step 3 below is the manual verification, done in place of automated test steps.

- [ ] **Step 1: Add camera DOM handles and state, capture the Media Player's original markup**

In `live-jarvis/frontend/app.js`, add these lines right after the existing top-of-file `const` DOM handles (after line 7, `const CMD_INPUT = ...`):

```js
const MEDIA_PANEL = document.querySelector('.panel-media');
const MEDIA_PANEL_DEFAULT_HTML = MEDIA_PANEL ? MEDIA_PANEL.innerHTML : '';
```

Add these lines to the existing top-of-file `let` state block (after line 20, `let waveLevels = ...`):

```js
let cameraStream = null;
let cameraFrameInterval = null;
```

- [ ] **Step 2: Implement `openCamera()` / `closeCamera()` and wire them into `handleServerEvent`**

Add these two functions anywhere below `stopMicCapture()` (e.g. right after it, before the `MUTE_BTN.addEventListener` block around line 317):

```js
async function openCamera() {
  if (cameraStream || !MEDIA_PANEL) return;
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
  } catch (err) {
    console.log('[camera] getUserMedia failed:', err);
    pushToolLog('Kamera ruxsati yo\'q');
    cameraStream = null;
    return;
  }

  MEDIA_PANEL.innerHTML =
    '<div class="panel-head">' +
    '<span class="panel-title">CAMERA</span>' +
    '<button type="button" class="media-cam-close" id="camera-close-btn" title="Kamerani yopish">✕</button>' +
    '</div>' +
    '<video class="media-cam-video" id="camera-video" autoplay muted playsinline></video>';

  const videoEl = document.getElementById('camera-video');
  videoEl.srcObject = cameraStream;
  document.getElementById('camera-close-btn').addEventListener('click', closeCamera);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  cameraFrameInterval = setInterval(() => {
    if (!videoEl.videoWidth) return;
    const scale = Math.min(1, 640 / videoEl.videoWidth);
    canvas.width = Math.round(videoEl.videoWidth * scale);
    canvas.height = Math.round(videoEl.videoHeight * scale);
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.6);
    const b64 = jpegDataUrl.split(',')[1];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'video_frame', data: b64 }));
    }
  }, 1000);
}

function closeCamera() {
  if (cameraFrameInterval) {
    clearInterval(cameraFrameInterval);
    cameraFrameInterval = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  if (MEDIA_PANEL) {
    MEDIA_PANEL.innerHTML = MEDIA_PANEL_DEFAULT_HTML;
  }
}
```

Then extend the existing `handleServerEvent` dispatcher (currently lines 165-189) by adding two branches before the closing `else if (data.type === 'interrupted')` line:

```js
  } else if (data.type === 'open_camera') {
    openCamera();
  } else if (data.type === 'close_camera') {
    closeCamera();
  } else if (data.type === 'interrupted') {
```

(Only the new two `else if` branches are inserted — the surrounding `handleServerEvent` body is otherwise unchanged.)

- [ ] **Step 3: Add camera styling**

In `live-jarvis/frontend/style.css`, add this block right after the existing `.media-controls .play { ... }` rule (after the `/* ---------- media ---------- */` section, before `/* ---------- command bar + dock ---------- */`):

```css
.media-cam-close {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 1px solid rgba(255, 90, 90, 0.45);
  background: rgba(120, 30, 30, 0.35);
  color: #ffb0b0;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  flex-shrink: 0;
}
.media-cam-video {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(90, 200, 255, 0.3);
  background: #05141f;
  display: block;
}
```

- [ ] **Step 4: Manual verification (Behruz present, replaces automated test)**

Start the backend (`GeminiLiveSession` is already the default `session_factory` in `server.py`) and open the HUD in Chrome, then:

1. Say "Jarvis, kamerani och" → confirm the MEDIA PLAYER panel is replaced by a live camera feed within ~1 second.
2. Point the camera at a known object and ask "bu nima?" → confirm Jarvis's spoken answer reflects what the camera actually sees (proves frames are reaching Gemini Live, not just the optimistic function-response).
3. Say "Jarvis, kamerani yop" → confirm the panel reverts to the Media Player and the Mac's camera indicator light turns off.
4. Repeat step 1, then click the HUD's ✕ button instead of using voice → confirm the same revert happens (validates the manual-close fallback independently of voice recognition).
5. Repeat step 1, then stay silent (no speech) for >10 seconds with the camera open → confirm the Gemini Live session does NOT time out (video frames call `timer.touch()`, same as audio) — the camera should still be live and the HUD should not drop to the idle/disconnected state.

Only proceed to Step 5 (commit) once all 5 checks pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/behruz/behruzjarvis-os/agents/behruzjarvis
git add live-jarvis/frontend/app.js live-jarvis/frontend/style.css
git commit -m "feat(live-jarvis): camera open/close UI with 1fps frame capture"
```

---

## Plan Self-Review Notes

- **Spec coverage:** all 5 brainstorming decisions (vision not preview, voice+button close, replaces Media Player panel, optimistic response, 1fps/q0.6/≤640px) are implemented in Tasks 1-5 and checked in Task 5 Step 4's manual verification. The spec's "sending `{"type": "close_camera"}` semantics" line for the manual button was ambiguous (no such client→server message exists elsewhere in the spec) — resolved here as "call the same `closeCamera()` function," which satisfies the spec's actual stated requirement ("does not require a round trip through Gemini to close") without inventing an unused wire message.
- **Type consistency:** `send_video(jpeg_bytes: bytes)` signature matches across `GeminiLiveSession` (Task 2), `MockLiveSession` (Task 3), and the test fake in Task 4 (`_RecordingVideoSession`). Event type strings `"open_camera"`/`"close_camera"` are identical in `gemini_session.py`'s yield (Task 2) and `app.js`'s `handleServerEvent` match (Task 5).
- **No placeholders:** every step has complete, runnable code — no TBD/TODO markers.
