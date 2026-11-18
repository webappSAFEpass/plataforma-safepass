from app.core.exceptions import NotFoundError


class PlanNotFoundError(NotFoundError):
    code = "plan_not_found"
    default_message = "Plano não encontrado."
