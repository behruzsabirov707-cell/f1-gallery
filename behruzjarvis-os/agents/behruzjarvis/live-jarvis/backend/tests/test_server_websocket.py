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


class _FailingStartSession:
    """Fake session whose start() raises, simulating a Gemini connect
    failure (bad API key, network error, etc.)."""

    async def start(self):
        raise RuntimeError("boom-start")

    async def send_audio(self, pcm_bytes):
        return None

    async def receive_events(self):
        return
        yield  # pragma: no cover - makes this an async generator

    async def close(self):
        return None


class _FailingReceiveSession:
    """Fake session whose receive_events() raises immediately, simulating
    a mid-conversation failure on the Gemini Live stream."""

    async def start(self):
        return None

    async def send_audio(self, pcm_bytes):
        return None

    async def receive_events(self):
        raise RuntimeError("boom-receive")
        yield  # pragma: no cover - makes this an async generator

    async def close(self):
        return None


def test_websocket_sends_error_when_session_start_fails():
    server.session_factory = _FailingStartSession
    client = TestClient(server.app)

    with client.websocket_connect("/ws") as ws:
        received = json.loads(ws.receive_text())

    assert received == {"type": "error", "text": "boom-start"}


def test_websocket_sends_error_when_receive_events_fails():
    server.session_factory = _FailingReceiveSession
    client = TestClient(server.app)

    with client.websocket_connect("/ws") as ws:
        received = [json.loads(ws.receive_text()) for _ in range(2)]

    assert received[0] == {"type": "error", "text": "boom-receive"}
    assert received[1] == {"type": "closed"}
