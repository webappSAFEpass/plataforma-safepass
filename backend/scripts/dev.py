"""Development only. Run uv run python -m scripts.dev; binds only loopback.

Troca apenas a identidade por tokens fictícios (`Bearer local-manager`, `local-owner`...).
O catálogo de prestadores é o real: crie prestadores via `/api/v1/providers` e aprove-os
com `local-admin`.
"""

import uvicorn

from app.core.dependencies import get_identity
from app.integrations.local_identity import LocalIdentity
from app.main import create_app

app = create_app()
app.dependency_overrides[get_identity] = LocalIdentity

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
