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

    async def send_video(self, jpeg_bytes: bytes) -> None:
        return None

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
