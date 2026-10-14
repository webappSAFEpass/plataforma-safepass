.PHONY: install run lint fmt typecheck test test-pg test-live check db-migrate lock regras regras-schema openapi

PY := .venv/bin

install:
	python3 -m venv .venv && $(PY)/pip install -r requirements-dev.txt

run:
	$(PY)/uvicorn app.main:app --reload --port 8000 --no-access-log

lint:
	$(PY)/ruff check . && $(PY)/ruff format --check .

fmt:
	$(PY)/ruff check . --fix && $(PY)/ruff format .

typecheck:
	$(PY)/mypy

test:
	$(PY)/pytest -q

# Contrato do repositório também no Postgres (cluster local descartável em .pgtest/).
test-pg:
	TEST_DATABASE_URL=$$(./scripts/local_test_db.sh start) $(PY)/pytest -q

# Matriz de QA do PDF contra o LLM real (usa LLM_API_KEY do .env; ~4 min na Groq gratuita).
test-live:
	RUN_LIVE=1 $(PY)/pytest -m live -q

check: regras lint typecheck test-pg

db-migrate:
	$(PY)/python -m scripts.db migrate

# Valida regras/regras-negocio.json (o mesmo passo roda no CI).
regras:
	$(PY)/python -m scripts.regras check

# Regera o schema do JSON de regras depois de mudar app/rules.py.
regras-schema:
	$(PY)/python -m scripts.regras schema

# Exporta o contrato da API (openapi.json) para o front gerar os tipos.
openapi:
	$(PY)/python -m scripts.openapi

lock:
	$(PY)/pip-compile -q --generate-hashes --strip-extras -o requirements.txt requirements.in
