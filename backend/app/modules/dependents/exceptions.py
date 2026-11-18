from app.core.exceptions import DomainError


class DependentNotFound(DomainError):
    def __init__(self) -> None:
        super().__init__("not_found", "Dependente não encontrado.", 404)
