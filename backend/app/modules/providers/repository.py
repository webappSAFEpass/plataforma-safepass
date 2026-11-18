from decimal import Decimal
from uuid import UUID

from sqlalchemy import ColumnElement, Select, and_, exists, func, or_, select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.providers.models import (
    Category,
    Professional,
    ProfessionalLink,
    Provider,
    ProviderService,
    ProviderTag,
    ServiceDefinition,
    ServiceRequest,
    Tag,
)
from app.shared.pagination import paginate

# Faixas do marketplace (R$, preço médio dos serviços ativos). Decisão de produto pendente:
# o Desafio 03 guarda preços, o Desafio 02 filtra por faixa; estes limites ligam os dois.
PRICE_TIER_MEDIUM_FROM = Decimal(150)
PRICE_TIER_HIGH_FROM = Decimal(400)


class ProviderRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Base) -> None:
        self.session.add(record)
        self.session.flush()

    def get(self, provider_id: UUID) -> Provider | None:
        return self.session.scalar(
            select(Provider).where(Provider.id == provider_id).with_for_update()
        )

    def membership(self, provider_id: UUID, user_id: UUID) -> ProfessionalLink | None:
        return self.session.scalar(
            select(ProfessionalLink)
            .join(Professional)
            .where(
                ProfessionalLink.provider_id == provider_id,
                Professional.user_id == user_id,
                ProfessionalLink.active.is_(True),
            )
        )

    def list_providers(
        self, user_id: UUID | None, public: bool, admin: bool, page: int, size: int
    ) -> tuple[list[Provider], int]:
        query = select(Provider).order_by(Provider.display_name, Provider.id)
        if public:
            query = query.where(Provider.status == "approved")
        elif not admin:
            linked = (
                select(ProfessionalLink.provider_id)
                .join(Professional)
                .where(Professional.user_id == user_id, ProfessionalLink.active.is_(True))
            )
            query = query.where(or_(Provider.owner_user_id == user_id, Provider.id.in_(linked)))
        return paginate(self.session, query, page, size)

    def categories(self, page: int, size: int) -> tuple[list[Category], int]:
        return paginate(
            self.session,
            select(Category).where(Category.active).order_by(Category.name),
            page,
            size,
        )

    def tags(self, page: int, size: int) -> tuple[list[Tag], int]:
        return paginate(self.session, select(Tag).where(Tag.active).order_by(Tag.name), page, size)

    def category(self, category_id: UUID) -> Category | None:
        return self.session.get(Category, category_id)

    def tag(self, tag_id: UUID) -> Tag | None:
        return self.session.get(Tag, tag_id)

    def definition(self, service_id: UUID) -> ServiceDefinition | None:
        return self.session.get(ServiceDefinition, service_id)

    def definitions(self, page: int, size: int, search: str) -> tuple[list[ServiceDefinition], int]:
        query = select(ServiceDefinition).where(ServiceDefinition.active)
        if search:
            query = query.where(ServiceDefinition.name.icontains(search, autoescape=True))
        return paginate(self.session, query.order_by(ServiceDefinition.name), page, size)

    def services(
        self, provider_id: UUID, page: int, size: int
    ) -> tuple[list[ProviderService], int]:
        return paginate(
            self.session,
            select(ProviderService)
            .where(ProviderService.provider_id == provider_id)
            .order_by(ProviderService.id),
            page,
            size,
        )

    def public_services(
        self, provider_id: UUID, page: int, size: int
    ) -> tuple[list[ProviderService], int]:
        query = (
            select(ProviderService)
            .join(ServiceDefinition)
            .where(
                ProviderService.provider_id == provider_id,
                ProviderService.active,
                ServiceDefinition.active,
            )
            .order_by(ProviderService.id)
        )
        return paginate(self.session, query, page, size)

    def service(self, provider_id: UUID, link_id: UUID) -> ProviderService | None:
        return self.session.scalar(
            select(ProviderService).where(
                ProviderService.id == link_id, ProviderService.provider_id == provider_id
            )
        )

    def request(self, provider_id: UUID, request_id: UUID) -> ServiceRequest | None:
        return self.session.scalar(
            select(ServiceRequest).where(
                ServiceRequest.id == request_id, ServiceRequest.provider_id == provider_id
            )
        )

    def requests(self, provider_id: UUID, page: int, size: int) -> tuple[list[ServiceRequest], int]:
        return paginate(
            self.session,
            select(ServiceRequest)
            .where(ServiceRequest.provider_id == provider_id)
            .order_by(ServiceRequest.created_at),
            page,
            size,
        )

    def professional(self, professional_id: UUID) -> Professional | None:
        return self.session.get(Professional, professional_id)

    def link(self, provider_id: UUID, link_id: UUID) -> ProfessionalLink | None:
        return self.session.scalar(
            select(ProfessionalLink).where(
                ProfessionalLink.id == link_id, ProfessionalLink.provider_id == provider_id
            )
        )

    def links(self, provider_id: UUID, page: int, size: int) -> tuple[list[ProfessionalLink], int]:
        return paginate(
            self.session,
            select(ProfessionalLink)
            .where(ProfessionalLink.provider_id == provider_id)
            .order_by(ProfessionalLink.created_at),
            page,
            size,
        )

    # --- leitura para o catálogo consumido pelo marketplace (Desafio 02) ---

    def search_approved(
        self,
        query: str,
        category: str | None,
        price_tier: str | None,
        tags: list[str],
        page: int,
        size: int,
    ) -> tuple[list[Provider], int]:
        stmt = select(Provider).where(Provider.status == "approved")
        if query:
            stmt = stmt.where(Provider.display_name.icontains(query, autoescape=True))
        if category:
            stmt = stmt.where(
                exists().where(
                    ProviderService.provider_id == Provider.id,
                    ProviderService.active,
                    ProviderService.service_id == ServiceDefinition.id,
                    ServiceDefinition.active,
                    ServiceDefinition.category_id == Category.id,
                    Category.name == category,
                )
            )
        for tag in dict.fromkeys(tags):  # cada tag pedida precisa estar no prestador
            stmt = stmt.where(
                exists().where(
                    ProviderTag.provider_id == Provider.id,
                    ProviderTag.tag_id == Tag.id,
                    Tag.active,
                    Tag.name == tag,
                )
            )
        if price_tier:
            stmt = stmt.where(Provider.id.in_(self._provider_ids_in_tier(price_tier)))
        return paginate(self.session, stmt.order_by(Provider.display_name, Provider.id), page, size)

    def get_approved(self, provider_id: UUID) -> Provider | None:
        return self.session.scalar(
            select(Provider).where(Provider.id == provider_id, Provider.status == "approved")
        )

    def active_tag_names(self, provider_ids: list[UUID]) -> dict[UUID, list[str]]:
        rows = self.session.execute(
            select(ProviderTag.provider_id, Tag.name)
            .join(Tag, Tag.id == ProviderTag.tag_id)
            .where(ProviderTag.provider_id.in_(provider_ids), Tag.active)
            .order_by(Tag.name)
        )
        names: dict[UUID, list[str]] = {}
        for provider_id, name in rows:
            names.setdefault(provider_id, []).append(name)
        return names

    def first_category_names(self, provider_ids: list[UUID]) -> dict[UUID, str]:
        """Categoria principal: a primeira, em ordem alfabética, entre os serviços ativos."""
        rows = self.session.execute(
            select(ProviderService.provider_id, func.min(Category.name))
            .join(ServiceDefinition, ServiceDefinition.id == ProviderService.service_id)
            .join(Category, Category.id == ServiceDefinition.category_id)
            .where(
                ProviderService.provider_id.in_(provider_ids),
                ProviderService.active,
                ServiceDefinition.active,
            )
            .group_by(ProviderService.provider_id)
        )
        return dict(rows.tuples().all())

    def average_prices(self, provider_ids: list[UUID]) -> dict[UUID, Decimal]:
        rows = self.session.execute(
            select(ProviderService.provider_id, func.avg(_representative_price()))
            .where(ProviderService.provider_id.in_(provider_ids), ProviderService.active)
            .group_by(ProviderService.provider_id)
        )
        return {pid: avg for pid, avg in rows.tuples().all() if avg is not None}

    def _provider_ids_in_tier(self, tier: str) -> Select[tuple[UUID]]:
        average = func.avg(_representative_price())
        return (
            select(ProviderService.provider_id)
            .where(ProviderService.active)
            .group_by(ProviderService.provider_id)
            .having(_tier_condition(average, tier))
        )


def _representative_price() -> ColumnElement[Decimal]:
    """Preço fixo, ou o ponto médio da faixa quando o serviço é cobrado por faixa."""
    return func.coalesce(
        ProviderService.price, (ProviderService.min_price + ProviderService.max_price) / 2
    )


def _tier_condition(average: ColumnElement[Decimal], tier: str) -> ColumnElement[bool]:
    if tier == "baixo":
        return average < PRICE_TIER_MEDIUM_FROM
    if tier == "medio":
        return and_(average >= PRICE_TIER_MEDIUM_FROM, average < PRICE_TIER_HIGH_FROM)
    return average >= PRICE_TIER_HIGH_FROM
