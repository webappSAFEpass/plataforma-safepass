"""Exporta o contrato da API para openapi.json (na raiz do repo), sem subir o servidor.

    python -m scripts.openapi

O front gera os tipos a partir dele, por exemplo:
    npx openapi-typescript openapi.json -o src/features/assistente/contracts.ts
Um teste garante que o arquivo versionado está em dia com o código.
"""

import json
from pathlib import Path

from app.config import Settings
from app.main import create_app

OPENAPI_PATH = Path(__file__).resolve().parent.parent / "openapi.json"


def openapi_text() -> str:
    # Settings sem .env: o contrato não pode depender da máquina de quem exporta.
    app = create_app(Settings(_env_file=None, expose_docs=True))
    return json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    OPENAPI_PATH.write_text(openapi_text(), encoding="utf-8")
    print(f"contrato gravado em {OPENAPI_PATH}")
