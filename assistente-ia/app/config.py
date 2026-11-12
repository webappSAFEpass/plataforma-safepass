from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict

from app.rules import DEFAULT_PATH


class Settings(BaseSettings):
    """Configuração da aplicação. Uma instância por app (create_app), guardada em app.state."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Rotas da API ficam sob este prefixo (o front usa BACKEND_API_URL=.../v1).
    api_prefix: str = "/v1"
    # /docs e /openapi.json só quando explicitamente ligados (fora de produção).
    expose_docs: bool = False
    log_json: bool = False
    log_level: str = "INFO"

    # "token_a:89,token_b:*"  — cada token de serviço fica vinculado aos usuários que pode ler.
    # "*" libera qualquer usuário (use só para o servidor do app com sessão própria).
    service_tokens: str = ""

    # Sem DATABASE_URL o backend roda com os dados do protótipo em memória.
    database_url: str | None = None

    llm_api_key: str | None = None
    llm_base_url: str = "https://api.openai.com/v1"
    llm_model: str = "gpt-4o-mini"
    llm_timeout_s: float = 30.0
    # Teto da requisição inteira de chat (várias rodadas + esperas de rate limit).
    chat_timeout_s: float = 90.0
    # Mensagens por conversa por minuto (protege a cota do LLM).
    chat_rate_per_min: int = 12

    # RAG: sem chave de embeddings, consultar_base_conhecimento devolve a base inteira.
    embeddings_api_key: str | None = None
    embeddings_base_url: str = "https://api.openai.com/v1"
    embeddings_model: str = "text-embedding-3-small"

    timezone: str = "America/Sao_Paulo"
    # Regras de negócio editáveis pela PO (horários, prazos, mensagens, base de conhecimento).
    regras_path: Path = DEFAULT_PATH

    # Data fixa (ISO) para testes e demonstrações do cálculo de vencimento.
    today_override: date | None = None

    def token_scopes(self) -> dict[str, set[str]]:
        scopes: dict[str, set[str]] = {}
        for entry in self.service_tokens.split(","):
            token, _, users = entry.strip().partition(":")
            if token and users:
                scopes[token] = {u.strip() for u in users.split("|") if u.strip()}
        return scopes

    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)

    def now(self) -> datetime:
        return datetime.now(self.tz())

    def today(self) -> date:
        return self.today_override or self.now().date()
