"""Loop do assistente com LLM falso: tools → cards/intent, consentimento LGPD, fallback, streaming."""

import json
from datetime import datetime
from zoneinfo import ZoneInfo

from app.assistant.fallback import resolve_whatsapp, within_business_hours
from tests.conftest import AUTH, chat_body, completion, sse, start_conversation, tool_call

TZ = ZoneInfo("America/Sao_Paulo")


async def grant(client):
    res = await client.post("/consent", headers=AUTH, json={"userId": "1", "action": "grant"})
    assert res.json()["granted"] is True


async def test_chat_requires_token_and_own_conversation(client, llm):
    conv = await start_conversation(client)
    assert (await client.post("/chat", json=chat_body(conv, "oi"))).status_code == 401
    other = chat_body("00000000-0000-0000-0000-000000000000", "oi")
    assert (await client.post("/chat", headers=AUTH, json=other)).status_code == 404
    foreign_user = {**chat_body(conv, "oi"), "userId": "2"}
    assert (await client.post("/chat", headers=AUTH, json=foreign_user)).status_code == 404


async def test_plain_answer_without_tools(client, llm, repo):
    conv = await start_conversation(client)
    llm.push(completion("Olá! Como posso ajudar?"))
    res = await client.post("/chat", headers=AUTH, json=chat_body(conv, "oi"))
    body = res.json()
    assert body["reply"] == "Olá! Como posso ajudar?"
    assert body["debug"]["intent"] == "conversa_geral" and body["cards"] == []
    sent = llm.requests[0]
    assert sent["model"] == "test-model" and len(sent["tools"]) == 6
    assert sent["messages"][0]["role"] == "system" and "Ana Beatriz" in sent["messages"][0]["content"]
    assert [m.role for m in repo.messages[conv]] == ["user", "assistant"]


async def test_provider_search_returns_cards_and_intent(client, llm):
    conv = await start_conversation(client)
    llm.push(
        completion(tool_calls=[tool_call("buscar_prestadores", {"categoria": "Médico", "especialidade": "Cardiologia", "cidade": "Brasília"})]),
        completion("Encontrei a CardioVida em Brasília."),
    )
    body = (await client.post("/chat", headers=AUTH, json=chat_body(conv, "cardiologista em Brasília"))).json()
    assert body["debug"]["intent"] == "busca_prestadores"
    assert body["debug"]["toolCalls"] == [{"name": "buscar_prestadores",
                                           "args": {"categoria": "Médico", "especialidade": "Cardiologia", "cidade": "Brasília"}}]
    assert body["cards"][0]["type"] == "providers"
    assert [p["nome"] for p in body["cards"][0]["data"]] == ["CardioVida"]
    assert body["cards"][0]["total"] == 1
    tool_msg = llm.requests[1]["messages"][-1]
    assert tool_msg["role"] == "tool" and tool_msg["tool_call_id"] == "call_1"
    sent = json.loads(tool_msg["content"])
    assert sent["total_encontrado"] == 1 and "telefone" not in sent["prestadores"][0]


async def test_private_data_requires_consent(client, llm):
    """Matriz de QA: "Mostre os dados da minha dependente Maria." → pede autorização antes."""
    conv = await start_conversation(client)
    llm.push(
        completion(tool_calls=[tool_call("consultar_documentos", {"nome_dependente": "Maria"})]),
        completion("Preciso da sua autorização para consultar esses dados."),
    )
    body = (await client.post("/chat", headers=AUTH, json=chat_body(conv, "Mostre os dados da minha dependente Maria."))).json()
    assert [c["type"] for c in body["cards"]] == ["consent"]
    tool_result = json.loads(llm.requests[1]["messages"][-1]["content"])
    assert tool_result["erro"] == "consentimento_necessario"
    assert "Maria Souza" not in json.dumps(llm.requests[1])

    await grant(client)
    llm.push(
        completion(tool_calls=[tool_call("consultar_documentos", {"nome_dependente": "Maria"})]),
        completion("A receita da Maria vence em breve."),
    )
    body = (await client.post("/chat", headers=AUTH,
                              json=chat_body(conv, "Mostre os dados da minha dependente Maria.", retry=True))).json()
    docs = body["cards"][0]["data"]
    assert body["cards"][0]["type"] == "documents"
    assert {d["titularNome"] for d in docs} == {"Maria Souza"}


async def test_pet_documents_by_name(client, llm):
    conv = await start_conversation(client)
    await grant(client)
    llm.push(
        completion(tool_calls=[tool_call("consultar_documentos", {"nome_dependente": "thor"})]),
        completion("A vacinação do Thor está em dia."),
    )
    body = (await client.post("/chat", headers=AUTH, json=chat_body(conv, "vacina do Thor"))).json()
    assert {d["titularId"] for d in body["cards"][0]["data"]} == {"pet_1"}


async def test_documents_of_third_party_refused(client, llm):
    conv = await start_conversation(client)
    await grant(client)
    llm.push(
        completion(tool_calls=[tool_call("consultar_documentos", {"nome_dependente": "Júlia Mendes"})]),
        completion("Por privacidade, só posso mostrar dados da sua família."),
    )
    body = (await client.post("/chat", headers=AUTH, json=chat_body(conv, "documentos da Júlia Mendes"))).json()
    assert body["cards"] == []
    assert json.loads(llm.requests[1]["messages"][-1]["content"])["erro"] == "sem permissão"


async def test_revoke_consent_by_message(client, llm):
    conv = await start_conversation(client)
    await grant(client)
    body = (await client.post("/chat", headers=AUTH, json=chat_body(conv, "Quero revogar consentimento de dados"))).json()
    assert "revoguei" in body["reply"]
    assert llm.requests == []  # sem chamada ao LLM
    status = (await client.get("/consent", params={"userId": "1"}, headers=AUTH)).json()
    assert status == {"granted": False, "grantedAt": None, "expiresAt": None}


async def test_whatsapp_fallback_after_hours_and_recado(client, llm, repo):
    conv = await start_conversation(client)
    llm.push(
        completion(tool_calls=[tool_call("encaminhar_whatsapp", {"motivo": "estorno de consulta"})]),
        completion("Vou te encaminhar ao atendimento humano."),
    )
    body = (await client.post("/chat", headers=AUTH, json=chat_body(
        conv, "Quero pedir estorno financeiro de uma consulta não realizada.", simulateAfterHours=True))).json()
    assert body["debug"]["intent"] == "fallback_whatsapp"
    assert body["cards"][0] == {"type": "whatsapp", "data": {
        "withinHours": False, "link": None, "message": body["cards"][0]["data"]["message"]}}
    res = await client.post("/recados", headers=AUTH, json={
        "userId": "1", "conversationId": conv, "mensagem": "Me liguem amanhã"})
    assert res.json() == {"ok": True} and repo.recados[-1]["mensagem"] == "Me liguem amanhã"


def test_whatsapp_link_within_hours_has_summary_and_user_id():
    monday_10h = datetime(2026, 9, 28, 10, tzinfo=TZ)
    assert within_business_hours(monday_10h)
    assert not within_business_hours(datetime(2026, 9, 27, 10, tzinfo=TZ))  # domingo
    assert not within_business_hours(datetime(2026, 9, 28, 18, tzinfo=TZ))
    data = resolve_whatsapp("estorno", "Ana", "1", monday_10h, "5561999999999", False)
    assert data.within_hours and data.link.startswith("https://wa.me/5561999999999?text=")
    assert "ID 1" in data.message and "estorno" in data.message


async def test_knowledge_base_tool_gets_context(client, llm):
    conv = await start_conversation(client)
    llm.push(
        completion(tool_calls=[tool_call("consultar_base_conhecimento", {"pergunta": "preço do Aura+"})]),
        completion("O plano Aura+ custa R$ 97,00 por mês."),
    )
    body = (await client.post("/chat", headers=AUTH, json=chat_body(conv, "Quanto custa o plano Aura+?"))).json()
    assert body["debug"]["intent"] == "duvida_plataforma"
    context = json.loads(llm.requests[1]["messages"][-1]["content"])
    assert "R$ 97,00/mês" in context["contexto"] and "APENAS" in context["instrucao"]
    assert "Plano SAFEpass Free — gratuito" in context["contexto"]


async def test_tool_rounds_are_capped(client, llm):
    conv = await start_conversation(client)
    loop_call = completion(tool_calls=[tool_call("consultar_base_conhecimento", {"pergunta": "x"})])
    llm.push(loop_call, loop_call, loop_call, completion("Resposta final."))
    body = (await client.post("/chat", headers=AUTH, json=chat_body(conv, "?"))).json()
    assert body["reply"] == "Resposta final."
    assert "tools" not in llm.requests[3]  # última rodada sem ferramentas


async def test_llm_error_returns_502(client, llm):
    import httpx

    conv = await start_conversation(client)
    llm.push(httpx.Response(500, text="boom"))
    res = await client.post("/chat", headers=AUTH, json=chat_body(conv, "oi"))
    assert res.status_code == 502 and res.json() == {"error": "falha ao consultar a IA"}


async def test_stream_emits_tokens_cards_and_done(client, llm, repo):
    conv = await start_conversation(client)
    llm.push(
        sse([{"tool_calls": [{"index": 0, "id": "call_9", "type": "function",
                              "function": {"name": "buscar_prestadores", "arguments": ""}}]},
             {"tool_calls": [{"index": 0, "function": {"arguments": '{"especialidade":'}}]},
             {"tool_calls": [{"index": 0, "function": {"arguments": '"pediatria"}'}}]}]),
        sse([{"content": "Achei a "}, {"content": "Pediatria Sorriso."}]),
    )
    async with client.stream("POST", "/chat/stream", headers=AUTH, json=chat_body(conv, "pediatra")) as res:
        assert res.headers["content-type"].startswith("text/event-stream")
        raw = (await res.aread()).decode()
    events = [(b.split("\n")[0][7:], json.loads(b.split("\n")[1][6:])) for b in raw.strip().split("\n\n")]
    kinds = [e for e, _ in events]
    assert kinds == ["card", "token", "token", "done"]
    assert events[0][1]["data"][0]["nome"] == "Pediatria Sorriso"
    done = events[-1][1]
    assert done["reply"] == "Achei a Pediatria Sorriso." and done["debug"]["intent"] == "busca_prestadores"
    assert llm.requests[0]["stream"] is True
    assert repo.messages[conv][-1].content == "Achei a Pediatria Sorriso."


async def test_llm_not_configured_is_503(client, monkeypatch):
    from app.main import app

    monkeypatch.setattr(app.state.llm.settings, "llm_api_key", None)
    conv = await start_conversation(client)
    res = await client.post("/chat", headers=AUTH, json=chat_body(conv, "oi"))
    assert res.status_code == 503


async def test_rate_limit_is_retried(client, llm):
    import httpx

    conv = await start_conversation(client)
    llm.push(httpx.Response(429, headers={"retry-after": "0.01"}, text="slow down"), completion("Tudo certo!"))
    body = (await client.post("/chat", headers=AUTH, json=chat_body(conv, "oi"))).json()
    assert body["reply"] == "Tudo certo!" and len(llm.requests) == 2


def test_retry_after_parsing():
    import httpx

    from app.assistant.llm import _retry_after

    assert _retry_after(httpx.Response(429, headers={"x-ratelimit-reset-tokens": "1m2.5s"})) == 62.5
    assert _retry_after(httpx.Response(429, headers={"retry-after": "3"})) == 3.0


async def test_stream_error_event_is_retried_once(client, llm):
    import httpx

    conv = await start_conversation(client)
    error = httpx.Response(200, text='data: {"error": {"code": "tool_use_failed"}}\n\n',
                           headers={"content-type": "text/event-stream"})
    llm.push(error, sse([{"content": "Oi!"}]))
    async with client.stream("POST", "/chat/stream", headers=AUTH, json=chat_body(conv, "oi")) as res:
        raw = (await res.aread()).decode()
    assert '"reply": "Oi!"' in raw and len(llm.requests) == 2


async def test_empty_turn_is_retried_then_falls_back(client, llm):
    conv = await start_conversation(client)
    llm.push(completion(""), completion("Resposta."))
    assert (await client.post("/chat", headers=AUTH, json=chat_body(conv, "oi"))).json()["reply"] == "Resposta."
    llm.push(completion(""), completion(""))
    assert "atendimento humano" in (await client.post("/chat", headers=AUTH, json=chat_body(conv, "oi"))).json()["reply"]


def test_plain_text_strips_markdown():
    from app.assistant.loop import plain_text

    assert plain_text("## Planos\n\n- **Aura**: R$ 49,90\n* Aura+\n1. Free") == "Planos\n\nAura: R$ 49,90\nAura+\nFree"
