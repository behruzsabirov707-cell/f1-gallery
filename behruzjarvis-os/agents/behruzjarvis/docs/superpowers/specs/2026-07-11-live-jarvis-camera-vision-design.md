# Live Jarvis — camera vision (open/close via voice + HUD)

## Context

Follow-up to [[2026-07-10-live-jarvis-voice-agent-design]]. The base voice agent is built and running (5 actions: Telegram, Calendar, Finance log, Sheets read, web search — all dispatched from Gemini Live function calls through `backend/gemini_session.py` → `tools.py` subprocess scripts). Behruz asked for a new capability: saying "Jarvis, kamerani och" opens his Mac's camera and lets Jarvis actually see and talk about what's in view, closable again by voice or a HUD button.

This is scoped as an addition to the existing live-jarvis app, not a new app — it reuses the existing WebSocket, HUD, and `GeminiLiveSession` plumbing.

## Goals

- "Kamerani och" opens the camera and streams video to Gemini Live in real time — Jarvis can be asked "bu nima?" and answer based on what the camera currently sees, not just a static photo.
- Closable two ways: voice ("kamerani yop") and a manual HUD button — voice recognition can fail, the button is the reliable fallback.
- Camera video takes over the existing MEDIA PLAYER panel while active, reverting to the media player view on close — no new panel/layout slot needed.
- Function-call response to Gemini is immediate/optimistic (matches the existing 5 actions' "act now, don't wait" philosophy) rather than waiting for the browser to confirm the camera actually opened.
- Frame rate: 1 frame/second — Google's own Live API guidance for this use case, and the cheapest option that still reads as "live."

## Non-goals

- Not a standalone photo/screenshot mode — this is continuous vision while the camera is open, not a single-shot capture.
- Not auto-closing on the existing 10-second silence timer — camera stays open until explicitly closed (voice or button), since "watch this while I talk" is a real use case. Video frames DO count as activity and reset that timer like audio does, but the timer only ever closes the whole Gemini Live session, never the camera specifically.
- Not adding a new SDK dependency — `google-genai`'s `send_realtime_input(video=...)` already exists and is used the same way as the existing audio path.

## Architecture

Camera is different from the other 5 actions: those run a backend subprocess script; the camera itself physically lives in the **browser** (`getUserMedia`), so backend's job here is just relaying, not executing.

```
"Jarvis, kamerani och"
  → Gemini Live function-call: open_camera
  → backend does NOT subprocess-dispatch; sends frontend event {"type": "open_camera"}
  → backend replies to Gemini immediately: success (optimistic, variant A)
  → frontend: getUserMedia({video:true}), MEDIA PLAYER panel becomes a live <video> feed
  → frontend: every ~1000ms, grabs a frame via canvas, downsizes to ≤640px, JPEG q=0.6,
    base64-encodes, sends {"type":"video_frame","data":"..."} over the existing WebSocket
  → backend: session.send_video(jpeg_bytes) → Gemini Live sees the frame, can comment on it

"Jarvis, kamerani yop"  (or HUD ✕ button)
  → same path in reverse: track stopped, frame interval cleared, panel reverts to Media Player
```

## Components

1. **`backend/gemini_session.py`**
   - `FUNCTION_DECLARATIONS` gets two new entries: `open_camera` ("Kamerani ochish / foydalanuvchi ko'rsatayotgan narsani ko'rish") and `close_camera` ("Kamerani yopish").
   - In `receive_events()`, when `fc.name` is one of these two, skip `TOOL_DISPATCH` (no subprocess) — instead yield `{"type": "open_camera"}` or `{"type": "close_camera"}` to the frontend and immediately send Gemini a success `FunctionResponse` (variant A, no wait-for-confirmation).
   - New method `send_video(jpeg_bytes: bytes)`: `await self._session.send_realtime_input(video=types.Blob(data=jpeg_bytes, mime_type="image/jpeg"))` — same pattern already used for `send_audio`.

2. **`backend/mock_session.py`**
   - Add a no-op `send_video()` so the mock keeps the same 5-method interface (`start` / `send_audio` / `send_video` / `receive_events` / `close`) as the real session. The mock's scripted conversation does not need a camera scenario right now.

3. **`backend/server.py`**
   - `reader()` gets a new client message type: `{"type": "video_frame", "data": "<base64 jpeg>"}` → decodes and calls `session.send_video(...)`, then `timer.touch()` (a video frame counts as activity, same as audio, so the 10s silence timer that ends the whole Gemini Live session doesn't fire while the camera is actively streaming).

4. **`frontend/app.js`**
   - New WS event handlers:
     - `open_camera` → `getUserMedia({video: true})`, attaches the stream to a new `<video>` element inside `.panel-media` (existing Media Player markup hidden while active). Starts a `setInterval(1000)` that draws the current video frame to an offscreen canvas, downsizes to ≤640px on the long edge, exports JPEG at quality 0.6, base64-encodes it, and sends it as a `video_frame` message.
     - `close_camera` → stops the media stream's tracks, clears the frame interval, restores the original Media Player markup.
   - A manual close button (see below) calls the same close routine directly client-side, in addition to sending `{"type": "close_camera"}` semantics so state stays consistent — it does not require a round trip through Gemini to close.

5. **`frontend/index.html` / `style.css`**
   - `.panel-media` gets a small ✕ close button, visible only while the camera is active, styled consistently with the existing HUD chrome (see `.tools-chip` / `.online-badge` for the existing icon-button visual language).

## Error handling

- Camera permission denied or `getUserMedia` throws: frontend shows a brief inline error in the panel (e.g. "Kamera ruxsati yo'q") and does not attach a stream; Gemini has already been told "success" (variant A's known tradeoff), so it may claim the camera is open when it isn't — accepted, since permission prompts only appear once per browser profile and denial is rare after the first grant.
- WebSocket drops while camera is streaming: frontend stops the camera locally (same as a manual close) rather than leaving `getUserMedia` running against a dead socket.
- Gemini Live session itself times out/closes (10s silence with no audio AND no video frames — video frames reset the timer, so this only happens if the camera was already closed): existing session-drop handling from the base spec applies unchanged; frontend returns to idle state, and if the camera was still open it is closed too since there is no session left to stream into.

## Testing plan

- Voice open → confirm MEDIA PLAYER panel switches to a live camera feed within ~1s.
- Ask Jarvis "bu nima?" while pointing the camera at a known object → confirm the answer reflects what's actually in view (validates frames are reaching Gemini Live, not just the optimistic function-response).
- Voice close ("kamerani yop") → confirm panel reverts to Media Player and the camera's hardware indicator light turns off.
- HUD ✕ button close (independent of voice) → same check, confirms the manual fallback works even if voice recognition is muted or mishears.
- Long-idle-with-camera-open check: leave the camera open and silent (no speech) for >10s → confirm the session does NOT time out (video frames keep `timer.touch()` alive), unlike the base 5 actions.

## Open items resolved during brainstorming (2026-07-11)

- Camera purpose: full vision (HUD video + streamed to Gemini Live), not a passive preview or single-shot photo.
- Close mechanism: voice AND a manual HUD button, not voice-only.
- Panel placement: replaces the existing MEDIA PLAYER panel, no new panel added.
- Function-call response timing: immediate/optimistic (variant A), matching the existing 5 actions.
- Frame rate: 1 frame/second, JPEG quality 0.6, downsized to ≤640px.
