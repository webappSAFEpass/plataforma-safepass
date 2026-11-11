from app.core.exceptions import DomainError


class ProviderNotFound(DomainError):
    def __init__(self) -> None:
        super().__init__("not_found", "Prestador não encontrado.", 404)
