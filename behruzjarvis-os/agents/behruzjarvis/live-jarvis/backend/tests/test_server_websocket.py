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
