import asyncio
import base64
import json
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
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


@app.get("/")
def index():
    return FileResponse(FRONTEND_DIR / "index.html")


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
