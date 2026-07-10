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
    for fn in gemini_session.FUNCTION_DECLARATIONS:
        assert fn["parameters"]["type"] == "object"
        assert "properties" in fn["parameters"]
