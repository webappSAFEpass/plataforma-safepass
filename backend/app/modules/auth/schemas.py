from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, StringConstraints, field_validator

from app.modules.subscriptions.schemas import SubscriptionOut
from app.modules.users.schemas import UserOut

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128

AccountType = Literal["user", "provider", "company"]
FullName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=120)]


def _validate_password_strength(value: str) -> str:
    if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
        raise ValueError("A senha precisa ter letras e números.")
    return value


class RegisterIn(BaseModel):
    full_name: FullName
    email: EmailStr
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)
    account_type: AccountType = "user"

    _check_password = field_validator("password")(_validate_password_strength)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=PASSWORD_MAX_LENGTH)


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    _check_password = field_validator("new_password")(_validate_password_strength)


class AuthOut(BaseModel):
    user: UserOut


class MeOut(BaseModel):
    user: UserOut
    subscription: SubscriptionOut | None


class MessageOut(BaseModel):
    message: str
