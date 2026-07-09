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
