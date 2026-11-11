FROM python:3.12-slim AS build
COPY --from=ghcr.io/astral-sh/uv:0.12.23 /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
# Optional trust bundle for environments with an HTTPS egress proxy. TLS stays verified.
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then \
      SSL_CERT_FILE=/run/secrets/build_ca uv --system-certs sync --frozen --no-dev --no-install-project; \
    else uv sync --frozen --no-dev --no-install-project; fi

FROM python:3.12-slim
WORKDIR /app
RUN useradd --create-home --uid 10001 safepass
COPY --from=build /app/.venv /app/.venv
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY scripts ./scripts
ENV PATH="/app/.venv/bin:$PATH"
USER safepass
EXPOSE 8000
CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
