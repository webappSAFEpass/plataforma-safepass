# syntax=docker/dockerfile:1
FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Lockfile com hashes: build reprodutível e protegido contra pacote adulterado.
COPY requirements.txt .
RUN pip install --require-hashes -r requirements.txt

COPY app ./app
COPY migrations ./migrations
COPY scripts ./scripts

# Nunca rodar como root.
RUN useradd --create-home --uid 10001 safepass
USER safepass

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log", "--proxy-headers"]
