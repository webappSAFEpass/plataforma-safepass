from uuid import UUID

from pydantic import ValidationError

from app.core.exceptions import DomainError, conflict, forbidden, missing
from app.integrations.identity import IdentityGateway, Principal
from app.modules.providers import models as m
from app.modules.providers import schemas as s
from app.modules.providers.exceptions import ProviderNotFound
from app.modules.providers.repository import ProviderRepository
from app.shared.models import utcnow
from app.shared.schemas import Page
from app.shared.transaction import commit


class ProviderService:
    def __init__(self, repo: ProviderRepository, identity: IdentityGateway):
        self.repo = repo
        self.identity = identity

    def access(self, provider_id: UUID, actor: Principal, manage: bool = False) -> m.Provider:
        provider = self.repo.get(provider_id)
        if provider is None:
            raise ProviderNotFound()
        if actor.is_admin or provider.owner_user_id == actor.user_id:
            return provider
        link = self.repo.membership(provider_id, actor.user_id)
        if link is None or (manage and link.role != "manager"):
            raise forbidden()
        return provider

    def create(self, data: s.ProviderIn, actor: Principal) -> s.ProviderOut:
        if not actor.is_admin and "provider" not in actor.roles:
            raise forbidden()

        def action() -> s.ProviderOut:
            provider = m.Provider(
                owner_user_id=actor.user_id, **data.model_dump(mode="json", exclude={"tag_ids"})
            )
            self.set_tags(provider, data.tag_ids)
            self.repo.add(provider)
            return s.ProviderOut.model_validate(provider)

        return commit(self.repo.session, action)

    def set_tags(self, provider: m.Provider, tag_ids: list[UUID]) -> None:
        for tag_id in tag_ids:
            tag = self.repo.tag(tag_id)
            if tag is None or not tag.active:
                raise missing()
        # Reuse unchanged links to avoid transient unique constraint violations.
        old = {link.tag_id: link for link in provider.tag_links}
        provider.tag_links = [old.get(t) or m.ProviderTag(tag_id=t) for t in tag_ids]

    def get(self, provider_id: UUID, actor: Principal) -> s.ProviderOut:
        return s.ProviderOut.model_validate(self.access(provider_id, actor))

    def public(self, provider_id: UUID) -> s.ProviderPublic:
        provider = self.repo.get(provider_id)
        if provider is None or provider.status != "approved":
            raise missing()
        return s.ProviderPublic.model_validate(provider)

    def list(
        self, actor: Principal | None, page: int, size: int
    ) -> Page[s.ProviderOut] | Page[s.ProviderPublic]:
        items, total = self.repo.list_providers(
            actor.user_id if actor else None,
            actor is None,
            bool(actor and actor.is_admin),
            page,
            size,
        )
        if actor is None:
            return Page(
                items=[s.ProviderPublic.model_validate(p) for p in items],
                total=total,
                page=page,
                size=size,
            )
        return Page(
            items=[s.ProviderOut.model_validate(p) for p in items],
            total=total,
            page=page,
            size=size,
        )

    def update(self, provider_id: UUID, data: s.ProviderPatch, actor: Principal) -> s.ProviderOut:
        def action() -> s.ProviderOut:
            provider = self.access(provider_id, actor, manage=True)
            current = s.ProviderOut.model_validate(provider).model_dump()
            try:
                merged = s.ProviderIn.model_validate(
                    {
                        key: data.model_dump(exclude_unset=True).get(key, current[key])
                        for key in s.ProviderIn.model_fields
                    }
                )
            except ValidationError as exc:
                raise DomainError("invalid_profile", "Dados do perfil inválidos.") from exc
            for key, value in merged.model_dump(mode="json", exclude={"tag_ids"}).items():
                setattr(provider, key, value)
            self.set_tags(provider, merged.tag_ids)
            # Conservative interim policy: changed public data requires a new human review.
            if data.model_fields_set:
                provider.status = "pending"
                provider.reviewed_at = None
                provider.reviewed_by = None
                provider.review_reason = None
            self.repo.add(provider)
            return s.ProviderOut.model_validate(provider)

        return commit(self.repo.session, action)

    def review(self, provider_id: UUID, data: s.ReviewIn, actor: Principal) -> s.ProviderOut:
        if not actor.is_admin:
            raise forbidden()

        def action() -> s.ProviderOut:
            provider = self.access(provider_id, actor)
            if provider.status != "pending":
                raise conflict("Cadastro já analisado; edite o perfil antes de nova análise.")
            provider.status = data.decision
            provider.review_reason = data.reason
            provider.reviewed_by = actor.user_id
            provider.reviewed_at = utcnow()
            self.repo.add(provider)
            return s.ProviderOut.model_validate(provider)

        return commit(self.repo.session, action)

    def categories(self, page: int, size: int) -> Page[s.TaxonomyOut]:
        items, total = self.repo.categories(page, size)
        return Page(
            items=[s.TaxonomyOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def tags(self, page: int, size: int) -> Page[s.TaxonomyOut]:
        items, total = self.repo.tags(page, size)
        return Page(
            items=[s.TaxonomyOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def add_category(self, data: s.TaxonomyIn, actor: Principal) -> s.TaxonomyOut:
        if not actor.is_admin:
            raise forbidden()

        def action() -> s.TaxonomyOut:
            record = m.Category(**data.model_dump())
            self.repo.add(record)
            return s.TaxonomyOut.model_validate(record)

        return commit(self.repo.session, action)

    def add_tag(self, data: s.TaxonomyIn, actor: Principal) -> s.TaxonomyOut:
        if not actor.is_admin:
            raise forbidden()

        def action() -> s.TaxonomyOut:
            record = m.Tag(**data.model_dump())
            self.repo.add(record)
            return s.TaxonomyOut.model_validate(record)

        return commit(self.repo.session, action)

    def definitions(self, page: int, size: int, search: str) -> Page[s.DefinitionOut]:
        items, total = self.repo.definitions(page, size, search)
        return Page(
            items=[s.DefinitionOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def add_definition(self, data: s.DefinitionIn, actor: Principal) -> s.DefinitionOut:
        if not actor.is_admin:
            raise forbidden()

        def action() -> s.DefinitionOut:
            category = self.repo.category(data.category_id)
            if category is None or not category.active:
                raise missing()
            record = m.ServiceDefinition(**data.model_dump())
            self.repo.add(record)
            return s.DefinitionOut.model_validate(record)

        return commit(self.repo.session, action)

    def services(
        self, provider_id: UUID, actor: Principal, page: int, size: int
    ) -> Page[s.ServiceOut]:
        self.access(provider_id, actor, manage=True)
        items, total = self.repo.services(provider_id, page, size)
        return Page(
            items=[s.ServiceOut.model_validate(i) for i in items], total=total, page=page, size=size
        )

    def public_services(self, provider_id: UUID, page: int, size: int) -> Page[s.ServiceOut]:
        self.public(provider_id)
        items, total = self.repo.public_services(provider_id, page, size)
        return Page(
            items=[s.ServiceOut.model_validate(i) for i in items], total=total, page=page, size=size
        )

    def definition_required(self, service_id: UUID) -> None:
        definition = self.repo.definition(service_id)
        if definition is None or not definition.active:
            raise missing()

    def add_service(self, provider_id: UUID, data: s.ServiceIn, actor: Principal) -> s.ServiceOut:
        def action() -> s.ServiceOut:
            self.access(provider_id, actor, manage=True)
            self.definition_required(data.service_id)
            record = m.ProviderService(provider_id=provider_id, **data.model_dump())
            self.repo.add(record)
            return s.ServiceOut.model_validate(record)

        return commit(self.repo.session, action)

    def update_service(
        self, provider_id: UUID, link_id: UUID, data: s.PriceIn, actor: Principal
    ) -> s.ServiceOut:
        def action() -> s.ServiceOut:
            self.access(provider_id, actor, manage=True)
            record = self.repo.service(provider_id, link_id)
            if record is None:
                raise missing()
            for key, value in data.model_dump().items():
                setattr(record, key, value)
            self.repo.add(record)
            return s.ServiceOut.model_validate(record)

        return commit(self.repo.session, action)

    def requests(
        self, provider_id: UUID, actor: Principal, page: int, size: int
    ) -> Page[s.RequestOut]:
        self.access(provider_id, actor, manage=True)
        items, total = self.repo.requests(provider_id, page, size)
        return Page(
            items=[s.RequestOut.model_validate(i) for i in items], total=total, page=page, size=size
        )

    def request_service(
        self, provider_id: UUID, data: s.RequestIn, actor: Principal
    ) -> s.RequestOut:
        def action() -> s.RequestOut:
            self.access(provider_id, actor, manage=True)
            record = m.ServiceRequest(provider_id=provider_id, **data.model_dump())
            self.repo.add(record)
            return s.RequestOut.model_validate(record)

        return commit(self.repo.session, action)

    def decide_request(
        self, provider_id: UUID, request_id: UUID, data: s.RequestDecision, actor: Principal
    ) -> s.RequestOut:
        if not actor.is_admin:
            raise forbidden()

        def action() -> s.RequestOut:
            self.access(provider_id, actor)
            record = self.repo.request(provider_id, request_id)
            if record is None:
                raise missing()
            if record.status != "pending":
                raise conflict("Solicitação já analisada.")
            if data.service_id:
                self.definition_required(data.service_id)
            record.status = data.decision
            record.service_id = data.service_id
            record.decision_reason = data.reason
            record.decided_by = actor.user_id
            record.decided_at = utcnow()
            self.repo.add(record)
            return s.RequestOut.model_validate(record)

        return commit(self.repo.session, action)

    def create_professional(
        self, provider_id: UUID, data: s.ProfessionalIn, actor: Principal
    ) -> s.ProfessionalOut:
        def action() -> s.ProfessionalOut:
            self.access(provider_id, actor, manage=True)
            if data.user_id is not None:
                # Account binding requires self ownership or a trusted administrator.
                if not actor.is_admin and data.user_id != actor.user_id:
                    raise forbidden()
                self.identity.require_user(data.user_id)
            record = m.Professional(
                created_by=actor.user_id,
                **data.model_dump(exclude={"photo_url"}),
                photo_url=str(data.photo_url) if data.photo_url else None,
            )
            self.repo.add(record)
            return s.ProfessionalOut.model_validate(record)

        return commit(self.repo.session, action)

    def links(self, provider_id: UUID, actor: Principal, page: int, size: int) -> Page[s.LinkOut]:
        self.access(provider_id, actor, manage=True)
        items, total = self.repo.links(provider_id, page, size)
        return Page(
            items=[s.LinkOut.model_validate(i) for i in items], total=total, page=page, size=size
        )

    def add_link(self, provider_id: UUID, data: s.LinkIn, actor: Principal) -> s.LinkOut:
        def action() -> s.LinkOut:
            provider = self.access(provider_id, actor, manage=True)
            professional = self.repo.professional(data.professional_id)
            if professional is None:
                raise missing()
            if (
                not actor.is_admin
                and professional.created_by != actor.user_id
                and professional.user_id != actor.user_id
            ):
                raise forbidden()
            if (
                data.role == "manager"
                and not actor.is_admin
                and provider.owner_user_id != actor.user_id
            ):
                raise forbidden()
            record = m.ProfessionalLink(
                provider_id=provider_id, professional=professional, role=data.role
            )
            self.repo.add(record)
            return s.LinkOut.model_validate(record)

        return commit(self.repo.session, action)

    def update_link(
        self, provider_id: UUID, link_id: UUID, data: s.LinkPatch, actor: Principal
    ) -> s.LinkOut:
        def action() -> s.LinkOut:
            provider = self.access(provider_id, actor, manage=True)
            record = self.repo.link(provider_id, link_id)
            if record is None:
                raise missing()
            if not actor.is_admin and provider.owner_user_id != actor.user_id:
                # Managers cannot change access rights (including their own).
                raise forbidden()
            record.role = data.role
            record.active = data.active
            self.repo.add(record)
            return s.LinkOut.model_validate(record)

        return commit(self.repo.session, action)

    def remove_link(self, provider_id: UUID, link_id: UUID, actor: Principal) -> None:
        self.access(provider_id, actor, manage=True)
        record = self.repo.link(provider_id, link_id)
        if record is None:
            raise missing()
        self.update_link(provider_id, link_id, s.LinkPatch(role=record.role, active=False), actor)
