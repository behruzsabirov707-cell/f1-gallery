import base64

from google import genai
from google.genai import types

import tools

GEMINI_ENV_PATH = "/Users/behruz/behruzjarvis-os/state/behruzjarvis/gemini.env"
MODEL = "gemini-3.1-flash-live-preview"

SYSTEM_INSTRUCTION = (
    "Sening isming Jarvis — Behruzning ovozli yordamchisisan. U bilan o'zbek "
    "yoki ingliz tilida gaplash — u qaysi tilda so'zlasa, o'sha tilda javob "
    "ber. Harakatlarni darhol bajar, tasdiqlashni so'rama — Behruz hozir "
    "yoningda va kerak bo'lsa 'to'xta' deb seni to'xtata oladi. Har bir "
    "amaldan keyin natijani qisqa ovozda ayt."
)

FUNCTION_DECLARATIONS = [
    {
        "name": "send_telegram_message",
        "description": "Telegram orqali kimgadir xabar yuborish.",
        "parameters": {
            "type": "object",
            "properties": {
                "contact_query": {"type": "string", "description": "Qabul qiluvchining ismi yoki username'i"},
                "message": {"type": "string", "description": "Yuboriladigan xabar matni"},
            },
            "required": ["contact_query", "message"],
        },
    },
    {
        "name": "add_calendar_event",
        "description": "Google Calendar'ga yangi tadbir qo'shish.",
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {"type": "string", "description": "Tadbir nomi"},
                "start_iso": {"type": "string", "description": "Boshlanish vaqti, ISO format, masalan 2026-07-13T20:00:00"},
                "end_iso": {"type": "string", "description": "Tugash vaqti, ISO format"},
                "description": {"type": "string", "description": "Qo'shimcha tavsif (ixtiyoriy)"},
            },
            "required": ["summary", "start_iso", "end_iso"],
        },
    },
    {
        "name": "log_finance",
        "description": "Moliyaviy kirim yoki chiqimni yozib qo'yish.",
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {"type": "string", "enum": ["kirim", "chiqim"]},
                "amount": {"type": "number"},
                "currency": {"type": "string", "enum": ["UZS", "USD"]},
                "note": {"type": "string", "description": "Izoh (ixtiyoriy)"},
            },
            "required": ["kind", "amount", "currency"],
        },
    },
    {
        "name": "read_sheet",
        "description": "Google Sheets'dagi moliyaviy jadvaldan ma'lumot o'qish.",
        "parameters": {
            "type": "object",
            "properties": {
                "range_": {"type": "string", "description": "Sheet range, masalan A1:G20"},
            },
            "required": [],
        },
    },
]

TOOL_DISPATCH = {
    "send_telegram_message": tools.send_telegram_message,
    "add_calendar_event": tools.add_calendar_event,
    "log_finance": tools.log_finance,
    "read_sheet": tools.read_sheet,
}


def _load_api_key() -> str:
    with open(GEMINI_ENV_PATH) as f:
        return f.read().strip().split("=", 1)[1]


def build_config() -> dict:
    """Pure function, no network call. Returns the dict passed as `config`
    to `client.aio.live.connect()`.

    Note: `input_audio_transcription` / `output_audio_transcription` are
    standard Live API config keys, kept here for spec fidelity and forward
    compatibility. The installed google-genai==0.3.0 SDK's request builder
    (`AsyncLive._LiveSetup_to_mldev`) does not forward unrecognized dict keys
    to the wire request, so these two keys are currently inert no-ops with
    this SDK version (verified by reading live.py) rather than a hard error —
    see the GeminiLiveSession docstring for the corresponding gap on the
    receive side.
    """
    return {
        "response_modalities": ["AUDIO"],
        "system_instruction": SYSTEM_INSTRUCTION,
        "input_audio_transcription": {},
        "output_audio_transcription": {},
        "tools": [
            {"google_search": {}},
            {"function_declarations": FUNCTION_DECLARATIONS},
        ],
    }


class GeminiLiveSession:
    """Real Gemini Live backend. Implements the same 4-method async
    interface as MockLiveSession: start / send_audio / receive_events / close.

    Note on the installed google-genai==0.3.0 SDK (verified by reading the
    installed package source at
    .../site-packages/google/genai/live.py and types.py, not from memory —
    the brief itself flagged its SDK method names as unverified):

    - There is no `send_realtime_input` or `send_tool_response` method on
      `AsyncSession`. Both audio input and tool responses go through the
      single `send()` method, which dispatches on the type of `input`: a
      `types.Blob` is wrapped into a `realtime_input` message, and a
      `types.LiveClientToolResponse` becomes a `tool_response` message. A
      *raw list* of `FunctionResponse` passed directly to `send()` is not
      handled correctly by this SDK version's `_parse_client_message`
      branch ordering (it falls into a `ValueError`), so responses must be
      wrapped in `types.LiveClientToolResponse` explicitly.
    - `session.receive()` is a single-turn generator: it yields messages for
      one model turn and returns as soon as `turn_complete` is set (see
      `AsyncSession.receive` in live.py). `receive_events()` below therefore
      wraps it in an outer `while not self._closed` loop and calls
      `receive()` again after each turn — otherwise the generator would end
      after the model's first reply, and since `server.py`'s websocket
      writer does a single `async for event in session.receive_events()`
      for the whole connection, that would silently end the conversation
      after one exchange.
    - `LiveServerContent` in this SDK version declares only `model_turn`,
      `turn_complete`, `interrupted` (no `input_transcription` /
      `output_transcription` fields), and these pydantic models use
      `extra="forbid"`, so those attributes do not exist to read directly.
      The `getattr(..., None)` guards below make this a safe no-op today: a
      real Gemini session with this SDK version will not produce
      `{"type": "transcript", ...}` events (unlike MockLiveSession's fixed
      script), and the guards let this start working for free if the SDK is
      upgraded to a version that adds these fields.
    """

    def __init__(self):
        self._client = genai.Client(api_key=_load_api_key())
        self._session_cm = None
        self._session = None
        self._closed = False

    async def start(self) -> None:
        self._session_cm = self._client.aio.live.connect(model=MODEL, config=build_config())
        self._session = await self._session_cm.__aenter__()

    async def send_audio(self, pcm_bytes: bytes) -> None:
        await self._session.send_realtime_input(
            audio=types.Blob(data=pcm_bytes, mime_type="audio/pcm;rate=16000")
        )

    async def receive_events(self):
        while not self._closed:
            async for response in self._session.receive():
                content = response.server_content
                if content:
                    if content.interrupted:
                        yield {"type": "interrupted"}

                    input_transcription = getattr(content, "input_transcription", None)
                    if input_transcription and getattr(input_transcription, "text", None):
                        yield {"type": "transcript", "role": "user", "text": input_transcription.text}

                    output_transcription = getattr(content, "output_transcription", None)
                    if output_transcription and getattr(output_transcription, "text", None):
                        yield {"type": "transcript", "role": "assistant", "text": output_transcription.text}

                    if content.model_turn:
                        for part in content.model_turn.parts:
                            if part.inline_data:
                                yield {
                                    "type": "audio",
                                    "data": base64.b64encode(part.inline_data.data).decode("ascii"),
                                }

                if response.tool_call:
                    function_responses = []
                    for fc in response.tool_call.function_calls:
                        yield {"type": "status", "text": f"Bajarilmoqda: {fc.name}"}
                        try:
                            result = TOOL_DISPATCH[fc.name](**(fc.args or {}))
                            yield {"type": "tool_result", "tool": fc.name, "result": result}
                        except Exception as exc:
                            result = {"error": str(exc)}
                            yield {"type": "error", "text": f"{fc.name}: {exc}"}
                        function_responses.append(
                            types.FunctionResponse(name=fc.name, id=fc.id, response={"result": result})
                        )
                    await self._session.send_tool_response(
                        function_responses=function_responses
                    )

    async def close(self) -> None:
        self._closed = True
        if self._session_cm:
            await self._session_cm.__aexit__(None, None, None)
