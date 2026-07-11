from types import SimpleNamespace

import gemini_session


class _FakeSDKSession:
    def __init__(self, responses):
        self._responses = responses

    async def receive(self):
        for response in self._responses:
            yield response


async def test_receive_events_yields_interrupted_on_server_side_barge_in():
    content = SimpleNamespace(
        interrupted=True,
        input_transcription=None,
        output_transcription=None,
        model_turn=None,
    )
    response = SimpleNamespace(server_content=content, tool_call=None)

    session = gemini_session.GeminiLiveSession.__new__(gemini_session.GeminiLiveSession)
    session._session = _FakeSDKSession([response])
    session._closed = False

    first_event = await session.receive_events().__anext__()

    assert first_event == {"type": "interrupted"}


def test_build_config_includes_google_search_and_function_tools():
    config = gemini_session.build_config()
    tool_types = [list(t.keys())[0] for t in config["tools"]]
    assert "google_search" in tool_types
    assert "function_declarations" in tool_types


def test_function_declarations_match_tool_dispatch():
    declared_names = {fn["name"] for fn in gemini_session.FUNCTION_DECLARATIONS}
    dispatch_names = set(gemini_session.TOOL_DISPATCH.keys())
    assert declared_names - gemini_session.CAMERA_FUNCTION_NAMES == dispatch_names


def test_camera_function_names_are_declared_but_not_dispatched():
    declared_names = {fn["name"] for fn in gemini_session.FUNCTION_DECLARATIONS}
    assert gemini_session.CAMERA_FUNCTION_NAMES == {"open_camera", "close_camera"}
    assert gemini_session.CAMERA_FUNCTION_NAMES <= declared_names
    assert gemini_session.CAMERA_FUNCTION_NAMES.isdisjoint(gemini_session.TOOL_DISPATCH.keys())


def test_each_function_declaration_has_object_parameters_schema():
    for fn in gemini_session.FUNCTION_DECLARATIONS:
        assert fn["parameters"]["type"] == "object"
        assert "properties" in fn["parameters"]
