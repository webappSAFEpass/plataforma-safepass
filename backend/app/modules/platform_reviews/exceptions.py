from app.core.exceptions import NotFoundError


class PlatformReviewNotFoundError(NotFoundError):
    code = "platform_review_not_found"
    default_message = "Avaliação não encontrada."
