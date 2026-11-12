from enum import StrEnum


class Role(StrEnum):
    USER = "user"
    DEPENDENT = "dependent"
    PROVIDER = "provider"
    COMPANY = "company"
    ADMIN = "admin"


# Papéis que a própria pessoa pode escolher ao se cadastrar.
SELF_REGISTRATION_ROLES = frozenset({Role.USER, Role.PROVIDER, Role.COMPANY})
