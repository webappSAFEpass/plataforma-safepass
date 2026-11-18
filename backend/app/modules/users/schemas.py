from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.shared.roles import Role


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    role: Role
