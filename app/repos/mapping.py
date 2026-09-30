"""Linha do banco (dict no formato das tabelas do squad) → modelos da API. Usado pelos dois repositórios."""

from typing import Any

from app.contracts import Plan, Provider, UserProfile
from app.services.text import plan_slug, uf_from_address


def plan_from_row(row: dict[str, Any]) -> Plan:
    return Plan(**{**row, "id": plan_slug(row["nome"]), "valor": float(row["valor"])})


def provider_from_row(row: dict[str, Any]) -> Provider:
    return Provider(
        id=str(row["id"]),
        nome=row["nome"],
        categoria=row["categoria"],
        registro_profissional=row["registro_profissional"],
        descricao=row["descricao_atendimento"],
        tags=list(row["tags_atendimento"] or []),
        modalidade=row["modalidade_atendimento"],
        localizacao=row["localizacao_atendimento"],
        faixa_preco=row["faixa_preco"],
        avaliacao=float(row["avaliacao"]) if row["avaliacao"] is not None else None,
        qtd_avaliacoes=row["qtd_avaliacoes"],
        telefone=row["telefone"],
    )


def profile_from_row(row: dict[str, Any], plans: dict[int, dict[str, Any]]) -> UserProfile:
    plano = plans.get(row["plano_safepass_id"]) or plans[1]
    return UserProfile(
        id=str(row["id"]),
        nome=row["nome"],
        plano=plan_slug(plano["nome"]),
        plano_nome=plano["nome"],
        uf=uf_from_address(row["endereco"]),
        possui_plano_saude=row["possui_plano_saude"],
        plano_saude=row["plano_saude"],
    )
