"""Cliente para qualquer API compatível com OpenAI (OpenAI, Groq, OpenRouter, DeepSeek, vLLM, Ollama)."""

import asyncio
import json
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass, field

import httpx

from app.config import Settings


class LLMError(Exception):
    """Falha do provedor de IA.

    Nunca carrega o corpo da resposta: provedores ecoam a geração do modelo (ex.: Groq
    `failed_generation`), que pode conter dados pessoais — e esta mensagem vai para o log.
    """

    def __init__(self, kind: str, status: int | None = None, code: str | None = None) -> None:
        # kind: "http" (status >= 400), "transport" (timeout/conexão), "invalid_response", "stream"
        self.kind, self.status, self.code = kind, status, code
        super().__init__(f"{kind} status={status} code={code}")

    @property
    def retryable(self) -> bool:
        """Falhas pontuais que valem uma nova tentativa da mesma rodada."""
        return self.kind in ("transport", "stream") or self.code == "tool_use_failed"


def _error_code(payload: object) -> str | None:
    """Extrai só o código de erro ({"error": {"code": ...}}), descartando o resto do corpo."""
    if isinstance(payload, (bytes, str)):
        try:
            payload = json.loads(payload)
        except ValueError:
            return None
    error = payload.get("error") if isinstance(payload, dict) else None
    code = error.get("code") or error.get("type") if isinstance(error, dict) else None
    return str(code)[:60] if code else None


# Rate limit (429): espera o tempo pedido pelo provedor e tenta de novo, até este limite total.
MAX_RATE_LIMIT_WAIT_S = 30.0


def _retry_after(res: httpx.Response) -> float:
    """Segundos até liberar: retry-after ou x-ratelimit-reset-tokens ("53.1s", "1m2s")."""
    raw = res.headers.get("retry-after") or res.headers.get("x-ratelimit-reset-tokens") or "5"
    try:
        return float(raw)
    except ValueError:
        m = re.fullmatch(r"(?:(\d+)m)?([\d.]+)s", raw)
        return int(m.group(1) or 0) * 60 + float(m.group(2)) if m else 5.0


def _endpoint(base_url: str, path: str) -> str:
    base = base_url.rstrip("/")
    # Aceita tanto a base (".../v1") quanto a URL completa (".../v1/chat/completions").
    return base if base.endswith(path) else f"{base}{path}"


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: str


@dataclass
class Turn:
    """Resultado de uma rodada: texto final OU chamadas de ferramenta."""

    content: str = ""
    tool_calls: list[ToolCall] = field(default_factory=list)

    def as_message(self) -> dict:
        msg: dict = {"role": "assistant", "content": self.content or None}
        if self.tool_calls:
            msg["tool_calls"] = [
                {"id": c.id, "type": "function", "function": {"name": c.name, "arguments": c.arguments}}
                for c in self.tool_calls
            ]
        return msg


class LLMClient:
    def __init__(self, settings: Settings, http: httpx.AsyncClient) -> None:
        self.settings = settings
        self.http = http

    @property
    def configured(self) -> bool:
        return bool(self.settings.llm_api_key)

    def _headers(self, key: str | None) -> dict[str, str]:
        return {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    def _body(self, messages: list[dict], tools: list[dict] | None, stream: bool) -> dict:
        body: dict = {"model": self.settings.llm_model, "messages": messages, "temperature": 0.3}
        if tools:
            body["tools"] = tools
        if stream:
            body["stream"] = True
        return body

    async def complete(self, messages: list[dict], tools: list[dict] | None) -> Turn:
        url = _endpoint(self.settings.llm_base_url, "/chat/completions")
        waited = 0.0
        try:
            while True:
                res = await self.http.post(
                    url,
                    headers=self._headers(self.settings.llm_api_key),
                    json=self._body(messages, tools, stream=False),
                    timeout=self.settings.llm_timeout_s,
                )
                delay = _retry_after(res) if res.status_code == 429 else 0
                if not delay or waited + delay > MAX_RATE_LIMIT_WAIT_S:
                    break
                waited += delay
                await asyncio.sleep(delay)
        except httpx.HTTPError as exc:
            raise LLMError("transport") from exc
        if res.status_code >= 400:
            raise LLMError("http", res.status_code, _error_code(res.content))
        try:
            message = (res.json().get("choices") or [{}])[0].get("message")
            if not message:
                raise LLMError("invalid_response", res.status_code, "empty_message")
            calls = [
                ToolCall(c["id"], c["function"]["name"], c["function"].get("arguments") or "{}")
                for c in message.get("tool_calls") or []
            ]
            return Turn(content=message.get("content") or "", tool_calls=calls)
        except (ValueError, KeyError, TypeError, AttributeError, IndexError) as exc:
            raise LLMError("invalid_response", res.status_code) from exc

    async def stream(self, messages: list[dict], tools: list[dict] | None) -> AsyncIterator[str | Turn]:
        """Emite pedaços de texto (str) conforme chegam e, no fim, o Turn completo."""
        url = _endpoint(self.settings.llm_base_url, "/chat/completions")
        content: list[str] = []
        calls: dict[int, dict] = {}
        waited = 0.0
        try:
            while True:
                request = self.http.build_request(
                    "POST", url, headers=self._headers(self.settings.llm_api_key),
                    json=self._body(messages, tools, stream=True), timeout=self.settings.llm_timeout_s,
                )
                res = await self.http.send(request, stream=True)
                delay = _retry_after(res) if res.status_code == 429 else 0
                if not delay or waited + delay > MAX_RATE_LIMIT_WAIT_S:
                    break
                await res.aclose()
                waited += delay
                await asyncio.sleep(delay)
        except httpx.HTTPError as exc:
            raise LLMError("transport") from exc
        try:
            if res.status_code >= 400:
                raise LLMError("http", res.status_code, _error_code(await res.aread()))
            async for line in res.aiter_lines():
                if not line.startswith("data:"):
                    continue
                payload = line[5:].strip()
                if payload == "[DONE]":
                    break
                event = json.loads(payload)
                if event.get("error"):  # ex.: Groq "tool_use_failed" no meio do stream
                    raise LLMError("stream", res.status_code, _error_code(event))
                choices = event.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta") or {}
                if delta.get("content"):
                    content.append(delta["content"])
                    yield delta["content"]
                for tc in delta.get("tool_calls") or []:
                    slot = calls.setdefault(tc.get("index", 0), {"id": "", "name": "", "arguments": ""})
                    slot["id"] = tc.get("id") or slot["id"]
                    fn = tc.get("function") or {}
                    slot["name"] += fn.get("name") or ""
                    slot["arguments"] += fn.get("arguments") or ""
        except httpx.HTTPError as exc:
            raise LLMError("transport") from exc
        except (ValueError, TypeError, AttributeError) as exc:
            raise LLMError("invalid_response", res.status_code) from exc
        finally:
            await res.aclose()
        yield Turn(
            content="".join(content),
            tool_calls=[
                ToolCall(c["id"] or f"call_{i}", c["name"], c["arguments"] or "{}")
                for i, c in sorted(calls.items())
            ],
        )

    async def embed(self, text: str) -> list[float] | None:
        key = self.settings.embeddings_api_key
        if not key:
            return None
        try:
            res = await self.http.post(
                _endpoint(self.settings.embeddings_base_url, "/embeddings"),
                headers=self._headers(key),
                json={"model": self.settings.embeddings_model, "input": text},
                timeout=self.settings.llm_timeout_s,
            )
        except httpx.HTTPError as exc:
            raise LLMError("transport") from exc
        if res.status_code >= 400:
            raise LLMError("http", res.status_code, _error_code(res.content))
        try:
            return res.json()["data"][0]["embedding"]
        except (ValueError, KeyError, TypeError, IndexError) as exc:
            raise LLMError("invalid_response", res.status_code) from exc
