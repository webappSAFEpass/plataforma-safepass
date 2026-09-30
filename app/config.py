from datetime import date, datetime
from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

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

    whatsapp_number: str = "5561999999999"
    timezone: str = "America/Sao_Paulo"
    consent_valid_days: int = 365

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
