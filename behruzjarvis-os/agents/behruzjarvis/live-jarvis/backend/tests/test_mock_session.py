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


@pytest.mark.asyncio
async def test_mock_session_send_video_is_a_noop():
    session = MockLiveSession()
    result = await session.send_video(b"\xff\xd8\xff")
    assert result is None
