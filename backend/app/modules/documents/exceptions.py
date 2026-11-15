from app.core.exceptions import ConflictError, DomainError, NotFoundError


class DocumentNotFound(NotFoundError):
    default_message = "Documento não encontrado."


class EmptyFile(DomainError):
    status_code = 400
    code = "empty_file"
    default_message = "Arquivo vazio."


class FileTooLarge(DomainError):
    status_code = 413
    code = "file_too_large"
    default_message = "Arquivo maior que 10 MB."


class UnsupportedFile(DomainError):
    status_code = 415
    code = "unsupported_media_type"


class ReadingUnavailable(ConflictError):
    default_message = "Esta leitura não está mais aguardando revisão. Envie a foto de novo."
