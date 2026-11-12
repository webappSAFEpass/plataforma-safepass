"""P2: forma da API — prefixo /v1, erros sempre {error}, docs ocultos, request id, readiness."""

import os

import httpx
import pytest

from app.main import create_app
from tests.conftest import AUTH, chat_body, completion, make_settings, start_conversation


async def test_routes_live_under_v1_prefix(app):
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
            assert (await c.get("/v1/plans", headers=AUTH)).status_code == 200
            assert (await c.get("/plans", headers=AUTH)).status_code == 404


async def test_unknown_route_and_method_return_error_json(client):
    res = await client.get("/nao-existe", headers=AUTH)
    assert res.status_code == 404 and res.json() == {"error": "Not Found"}
    res = await client.delete("/plans", headers=AUTH)
    assert res.status_code == 405 and "error" in res.json()


@pytest.mark.parametrize("expose,expected", [(False, 404), (True, 200)])
async def test_docs_only_when_enabled(expose, expected):
    app = create_app(make_settings(expose_docs=expose))
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        assert (await c.get("/openapi.json")).status_code == expected
        assert (await c.get("/docs")).status_code == expected


async def test_request_id_is_propagated_or_generated(client):
    res = await client.get("/plans", headers={**AUTH, "X-Request-ID": "req-123"})
    assert res.headers["x-request-id"] == "req-123"
    forged = "a b; request_id=admin"  # fora do formato permitido: é substituído
    res = await client.get("/plans", headers={**AUTH, "X-Request-ID": forged})
    assert res.headers["x-request-id"] != forged and len(res.headers["x-request-id"]) == 32


async def test_access_log_uses_route_template_not_real_path(client, caplog):
    import logging

    with caplog.at_level(logging.INFO, logger="safepass"):
        await client.get("/account/1", headers=AUTH)
    ours = " | ".join(r.getMessage() for r in caplog.records if r.name == "safepass")
    assert "/v1/account/{userId}" in ours and "/v1/account/1 " not in ours


async def test_health_and_ready(app):
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
            assert (await c.get("/health")).json() == {"ok": True}
            assert (await c.get("/ready")).json() == {"ok": True}


async def test_ready_is_503_when_repo_fails(app, client, repo, monkeypatch):
    async def boom():
        raise RuntimeError("db down")

    monkeypatch.setattr(repo, "list_plans", boom)
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        assert (await c.get("/ready")).status_code == 503


async def test_creation_endpoints_return_201(client):
    conv = await start_conversation(client)  # já confere 201 no /leads
    res = await client.post("/recados", headers=AUTH, json={"userId": "1", "conversationId": conv, "mensagem": "x"})
    assert res.status_code == 201 and res.json() == {"ok": True}


@pytest.mark.skipif(not os.environ.get("TEST_DATABASE_URL"), reason="TEST_DATABASE_URL não definido")
async def test_end_to_end_on_postgres(llm):
    """Lead → chat → consentimento → documentos, com o app inteiro sobre Postgres."""
    from tests.test_repo_contract import TEST_DATABASE_URL, _prepare_postgres, _safe_test_url

    assert _safe_test_url(TEST_DATABASE_URL)
    await _prepare_postgres(TEST_DATABASE_URL)
    app = create_app(make_settings(database_url=TEST_DATABASE_URL))
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test/v1") as c:
            conv = await start_conversation(c)
            await c.post("/consent", headers=AUTH, json={"userId": "1", "action": "grant"})
            llm.push(
                completion(tool_calls=[{"id": "c1", "type": "function", "function": {
                    "name": "consultar_documentos", "arguments": '{"nome_dependente": "Maria"}'}}]),
                completion("A receita da Maria vence em breve."),
            )  # fmt: skip
            body = (await c.post("/chat", headers=AUTH, json=chat_body(conv, "documentos da Maria"))).json()
            assert body["cards"][0]["type"] == "documents"
            assert {d["titularNome"] for d in body["cards"][0]["data"]} == {"Maria Souza"}
            history = await app.state.repo.list_messages(conv, 10)
            assert [m.role for m in history] == ["user", "assistant"]


def test_openapi_file_matches_the_code():
    """openapi.json é o contrato que o front usa para gerar os tipos: `make openapi` depois de mudar a API."""
    from scripts.openapi import OPENAPI_PATH, openapi_text

    assert OPENAPI_PATH.read_text(encoding="utf-8") == openapi_text()
