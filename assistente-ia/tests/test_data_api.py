"""Checklist de aceite do briefing (seção 8) — API de dados, no formato das tabelas reais."""

import pytest

from app.contracts import Provider, ProviderFilters
from app.services.search import filter_providers
from app.services.text import plan_slug, uf_from_address
from tests.conftest import AUTH, OTHER_TOKEN, RULES


async def test_account_returns_profile_without_sensitive_data(client):
    res = await client.get("/account/1", headers=AUTH)
    assert res.status_code == 200
    assert res.json() == {
        "id": "1",
        "nome": "Ana Beatriz Souza",
        "plano": "aura_plus",
        "planoNome": "SAFEpass Aura+",
        "uf": "DF",
        "possuiPlanoSaude": False,
        "planoSaude": None,
    }


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer errado"}, {"Authorization": "Basic abc"}])
async def test_missing_or_invalid_token_is_401(client, headers):
    res = await client.get("/account/1", headers=headers)
    assert res.status_code == 401
    assert "error" in res.json()


async def test_token_of_other_service_cannot_read_user(client):
    res = await client.get("/account/1", headers={"Authorization": f"Bearer {OTHER_TOKEN}"})
    assert res.status_code == 404


async def test_plans_come_from_table(client):
    res = await client.get("/plans", headers=AUTH)
    plans = {p["id"]: p for p in res.json()}
    assert set(plans) == {"free", "aura", "aura_plus"}
    assert plans["aura_plus"]["valor"] == 97.0 and plans["aura_plus"]["qtdDependentes"] == 6


async def test_dependents_include_people_and_pets(client):
    res = await client.get("/dependents", params={"userId": "1"}, headers=AUTH)
    assert res.status_code == 200
    assert [(d["id"], d["tipo"]) for d in res.json()] == [("dep_1", "pessoa"), ("dep_2", "pessoa"), ("pet_1", "pet")]
    assert res.json()[2]["especie"] == "Cachorro"


@pytest.mark.parametrize(
    "path,params",
    [
        ("/account/2", {}),
        ("/dependents", {"userId": "2"}),
        ("/documents", {"userId": "2"}),
        ("/account/9999999999", {}),  # formato válido, mas fora do int4
    ],
)
async def test_other_user_never_exposed(client, path, params):
    res = await client.get(path, params=params, headers=AUTH)
    assert res.status_code == 404
    assert "Carlos" not in res.text and "Júlia" not in res.text


@pytest.mark.parametrize(
    "path,params",
    [
        ("/account/abc", {}),
        ("/account/²", {}),  # dígito Unicode: antes virava 500
        ("/account/012", {}),
        ("/account/12345678901", {}),
        ("/dependents", {"userId": "1 or 1=1"}),
        ("/documents", {"userId": "1", "dependentId": "dep_x"}),
    ],
)
async def test_malformed_ids_are_422(client, path, params):
    res = await client.get(path, params=params, headers=AUTH)
    assert res.status_code == 422 and res.json()["error"].startswith("parâmetro inválido")


async def test_documents_of_family_with_status(client):
    res = await client.get("/documents", params={"userId": "1"}, headers=AUTH)
    assert res.status_code == 200
    docs = {d["id"]: d for d in res.json()}
    assert {d["titularId"] for d in docs.values()} == {"1", "dep_1", "dep_2", "pet_1"}
    # hoje fixo = 2026-08-20
    assert docs["1"]["status"] == "valido"  # CNH 2026-10-05 (46 dias)
    assert docs["5"]["status"] == "vencendo"  # Receita 2026-09-01 (12 dias)
    assert docs["4"]["validade"] is None and docs["4"]["status"] == "valido"


async def test_documents_status_expired(client, settings):
    from datetime import date

    settings.today_override = date(2026, 9, 29)
    res = await client.get("/documents", params={"userId": "1"}, headers=AUTH)
    docs = {d["id"]: d["status"] for d in res.json()}
    assert docs["5"] == "vencido"  # Receita 2026-09-01
    assert docs["1"] == "vencendo"  # CNH 2026-10-05 (6 dias)


async def test_documents_of_one_dependent_or_pet(client):
    res = await client.get("/documents", params={"userId": "1", "dependentId": "dep_2"}, headers=AUTH)
    assert {d["titularNome"] for d in res.json()} == {"Maria Souza"}
    res = await client.get("/documents", params={"userId": "1", "dependentId": "pet_1"}, headers=AUTH)
    assert {d["titularNome"] for d in res.json()} == {"Thor"}


async def test_documents_of_foreign_dependent_is_404(client):
    res = await client.get("/documents", params={"userId": "1", "dependentId": "dep_3"}, headers=AUTH)
    assert res.status_code == 404


async def test_providers_natural_language_filters(client):
    res = await client.get("/providers", params={"especialidade": "cardiologista", "cidade": "brasilia"}, headers=AUTH)
    assert res.status_code == 200
    assert [p["nome"] for p in res.json()] == ["CardioVida"]
    assert set(res.json()[0]) == {
        "id",
        "nome",
        "categoria",
        "registroProfissional",
        "descricao",
        "tags",
        "modalidade",
        "localizacao",
        "faixaPreco",
        "avaliacao",
        "qtdAvaliacoes",
        "telefone",
    }


async def test_providers_pet_dermatology(client):
    res = await client.get("/providers", params={"categoria": "veterinario", "especialidade": "dermato"}, headers=AUTH)
    assert [p["nome"] for p in res.json()] == ["Clínica Pet Derma"]


async def test_providers_online_includes_hybrid_and_limit(client):
    res = await client.get("/providers", params={"modalidade": "online"}, headers=AUTH)
    assert {p["modalidade"] for p in res.json()} <= {"Online", "Híbrido"}
    res = await client.get("/providers", params={"limit": 3}, headers=AUTH)
    ratings = [p["avaliacao"] for p in res.json()]
    assert len(ratings) == 3 and ratings == sorted(ratings, reverse=True)


async def test_providers_invalid_modalidade_is_422(client):
    res = await client.get("/providers", params={"modalidade": "drive-thru"}, headers=AUTH)
    assert res.status_code == 422
    assert res.json()["error"].startswith("parâmetro inválido")


def _provider(localizacao: str, tags: list[str], categoria: str = "Médico") -> Provider:
    return Provider(
        id="x",
        nome="X",
        categoria=categoria,
        registro_profissional=None,
        descricao=None,
        tags=tags,
        modalidade="Presencial",
        localizacao=localizacao,
        faixa_preco=None,
        avaliacao=4.0,
        qtd_avaliacoes=1,
        telefone=None,
    )


@pytest.mark.parametrize(
    "cidade,localizacao,expected",
    [
        ("São Paulo", "SP", True),  # registro só com a UF
        ("sao paulo", "São Paulo, SP", True),
        ("SP", "Campinas, SP", True),
        ("Brasília", "SP", False),
        ("Rio de Janeiro", "Atendimento 100% Online", False),
    ],
)
def test_location_matching(cidade, localizacao, expected):
    found = filter_providers(
        [_provider(localizacao, ["Clínica"])], ProviderFilters(cidade=cidade), RULES.busca_prestadores
    )
    assert bool(found) is expected


def test_synonyms_and_stems():
    vet = _provider("SP", ["Cães e Gatos", "Dermatologia"], categoria="Veterinário")
    assert filter_providers([vet], ProviderFilters(especialidade="cachorro"), RULES.busca_prestadores)
    assert filter_providers([vet], ProviderFilters(especialidade="dermato para gato"), RULES.busca_prestadores)
    assert not filter_providers([vet], ProviderFilters(especialidade="cardiologia"), RULES.busca_prestadores)


def test_helpers():
    assert plan_slug("SAFEpass Aura+") == "aura_plus" and plan_slug("SAFEpass Aura") == "aura"
    assert plan_slug("SAFEpass Free") == "free"
    assert uf_from_address("Rua Tiradentes, 789, Centro - PE") == "PE"
    assert uf_from_address(None) is None
