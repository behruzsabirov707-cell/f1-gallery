import json
import subprocess

SCRIPTS_DIR = "/Users/behruz/.behruzjarvis/scripts"
TELEGRAM_PYTHON = "/Users/behruz/.behruzjarvis/venvs/telegram/bin/python"
GOOGLE_PYTHON = "/Users/behruz/.behruzjarvis/venvs/google/bin/python"
FINANCE_SPREADSHEET_ID = "1AYPlsIpFkrcHL-zsLQr-Nw4ayvLQOMz3bJTENyyT7ck"


def _run(python_bin: str, script_name: str, args: list[str], timeout: int = 30) -> str:
    result = subprocess.run(
        [python_bin, f"{SCRIPTS_DIR}/{script_name}", *args],
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"{script_name} failed")
    return result.stdout.strip()


def resolve_contact(query: str) -> dict:
    output = _run(TELEGRAM_PYTHON, "telegram_userbot_search_contact.py", [query])
    matches = json.loads(output)
    if not matches:
        raise RuntimeError(f"Kontakt topilmadi: {query}")
    return matches[0]


def send_telegram_message(contact_query: str, message: str) -> dict:
    contact = resolve_contact(contact_query)
    _run(TELEGRAM_PYTHON, "telegram_userbot_send_message.py", [str(contact["id"]), message])
    return {"sent_to": contact["name"], "message": message}


def add_calendar_event(summary: str, start_iso: str, end_iso: str, description: str = "") -> dict:
    output = _run(GOOGLE_PYTHON, "google_calendar_add_event.py", [summary, start_iso, end_iso, description])
    return json.loads(output)


def log_finance(kind: str, amount: float, currency: str, note: str = "") -> dict:
    output = _run(GOOGLE_PYTHON, "finance_log.py", [kind, str(amount), currency, note])
    return json.loads(output)


def read_sheet(range_: str = "A1:Z50", spreadsheet_id: str = FINANCE_SPREADSHEET_ID) -> dict:
    output = _run(GOOGLE_PYTHON, "google_sheets_read.py", [spreadsheet_id, range_])
    return json.loads(output)
