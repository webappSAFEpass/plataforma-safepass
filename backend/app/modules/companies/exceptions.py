from app.core.exceptions import DomainError


class CompanyNotFound(DomainError):
    def __init__(self) -> None:
        super().__init__("not_found", "Empresa não encontrado.", 404)
