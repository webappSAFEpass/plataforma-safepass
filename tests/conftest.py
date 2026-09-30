import json

import httpx
import pytest
import respx

from app.config import get_settings

TOKEN = "test-token-usr001"
OTHER_TOKEN = "test-token-other-service"
LLM_URL = "https://llm.test/v1/chat/completions"
AUTH = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setenv("SERVICE_TOKENS", f"{TOKEN}:1,{OTHER_TOKEN}:999")
    monkeypatch.setenv("LLM_API_KEY", "sk-test")
    monkeypatch.setenv("LLM_BASE_URL", "https://llm.test/v1")
    monkeypatch.setenv("LLM_MODEL", "test-model")
    monkeypatch.setenv("TODAY_OVERRIDE", "2026-08-20")
    # Vazio (e não ausente) para não herdar valores de um .env local.
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setenv("EMBEDDINGS_API_KEY", "")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
async def client(env):
    from app.main import app

    async with app.router.lifespan_context(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.fixture
def repo(client):
    from app.main import app

    return app.state.repo


# ---- LLM falso (respx) ----


def tool_call(name: str, args: dict | None = None, call_id: str = "call_1") -> dict:
    return {"id": call_id, "type": "function",
            "function": {"name": name, "arguments": json.dumps(args or {})}}


def completion(content: str | None = None, tool_calls: list[dict] | None = None) -> httpx.Response:
    message: dict = {"role": "assistant", "content": content}
    if tool_calls:
        message["tool_calls"] = tool_calls
    return httpx.Response(200, json={"choices": [{"index": 0, "message": message}]})


def sse(chunks: list[dict]) -> httpx.Response:
    body = "".join(f"data: {json.dumps({'choices': [{'index': 0, 'delta': c}]})}\n\n" for c in chunks)
    return httpx.Response(200, text=body + "data: [DONE]\n\n", headers={"content-type": "text/event-stream"})


@pytest.fixture
def llm():
    """Enfileira respostas do LLM; guarda os corpos enviados em `llm.requests`."""

    class Script:
        def __init__(self) -> None:
            self.responses: list[httpx.Response | Exception] = []
            self.requests: list[dict] = []

        def push(self, *responses: httpx.Response | Exception) -> None:
            self.responses.extend(responses)

        def __call__(self, request: httpx.Request) -> httpx.Response:
            self.requests.append(json.loads(request.content))
            if not self.responses:
                raise AssertionError("LLM falso chamado sem resposta enfileirada")
            response = self.responses.pop(0)
            if isinstance(response, Exception):  # simula falha de transporte (ConnectError, timeout)
                raise response
            return response

    script = Script()
    with respx.mock(assert_all_called=False) as mock:
        mock.post(LLM_URL).mock(side_effect=script)
        yield script


async def start_conversation(client: httpx.AsyncClient, mensagem: str = "Oi") -> str:
    res = await client.post("/leads", headers=AUTH, json={
        "userId": "1", "nome": "Ana Beatriz", "telefone": "61999990000", "mensagem": mensagem})
    assert res.status_code == 200, res.text
    return res.json()["conversationId"]


def chat_body(conversation_id: str, text: str, **extra) -> dict:
    return {"userId": "1", "conversationId": conversation_id,
            "lead": {"nome": "Ana Beatriz", "telefone": "61999990000"},
            "messages": [{"role": "user", "content": text}], **extra}
