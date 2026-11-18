import re
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.shared.schemas import Input, Name, RecordOut


class CompanyIn(Input):
    legal_name: Name
    trade_name: Name
    cnpj: str
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None

    @field_validator("cnpj")
    @classmethod
    def valid_cnpj(cls, value: str) -> str:
        if not re.fullmatch(r"[0-9./\-]+", value):
            raise ValueError("CNPJ numérico inválido.")
        digits = re.sub(r"\D", "", value)
        if len(digits) != 14 or len(set(digits)) == 1:
            raise ValueError("CNPJ inválido.")
        for length, weights in [
            (12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]),
            (13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]),
        ]:
            remainder = sum(int(d) * w for d, w in zip(digits[:length], weights, strict=True)) % 11
            check = 0 if remainder < 2 else 11 - remainder
            if int(digits[length]) != check:
                raise ValueError("Dígitos verificadores do CNPJ inválidos.")
        return digits


class CompanyOut(RecordOut):
    responsible_user_id: UUID
    legal_name: str
    trade_name: str
    cnpj: str
    phone: str | None
    email: str | None
    active: bool


class EmployeeIn(Input):
    user_id: UUID
    employee_number: str | None = Field(default=None, max_length=60)
    department: str | None = Field(default=None, max_length=160)
    role: str = Field(default="employee", pattern=r"^(hr|employee)$")


class EmployeePatch(Input):
    employee_number: str | None = Field(default=None, max_length=60)
    department: str | None = Field(default=None, max_length=160)
    active: bool = True


class EmployeeOut(RecordOut):
    company_id: UUID
    user_id: UUID
    employee_number: str | None
    department: str | None
    role: str
    active: bool


class CompanyPatch(Input):
    legal_name: Name | None = None
    trade_name: Name | None = None
    phone: str | None = Field(default=None, max_length=32)
    email: EmailStr | None = None
