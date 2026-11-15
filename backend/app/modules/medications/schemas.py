from datetime import date, datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, PositiveInt

from app.shared.schemas import Input, Name, Output, RecordOut

Time = Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$", examples=["08:00"])]
Dose = Annotated[str, Field(max_length=80)]
Posology = Annotated[str, Field(max_length=160)]


class MedicationIn(Input):
    name: Name
    dose: Dose = ""
    posology: Posology = ""
    start_date: date | None = None  # nulo = hoje
    duration_days: PositiveInt | None = None  # nulo = uso contínuo
    first_dose: Time = "08:00"
    dependent_id: UUID | None = None


class MedicationPatch(Input):
    name: Name | None = None
    dose: Dose | None = None
    posology: Posology | None = None
    start_date: date | None = None
    duration_days: PositiveInt | None = None
    first_dose: Time | None = None
    dependent_id: UUID | None = None
    ended_on: date | None = None  # encerrar = gravar a data; null reabre


class MedicationOut(RecordOut):
    source: Literal["manual", "prescription"]
    prescription_id: UUID | None
    dependent_id: UUID | None
    name: str
    dose: str
    posology: str
    start_date: date
    duration_days: int | None
    first_dose: str
    ended_on: date | None
    schedule: list[str]
    active: bool


class DoseIn(Input):
    date: date  # dia do horário avisado, não o de agora
    time: Time


class DoseOut(Output):
    medication_id: UUID
    date: date
    time: str
    taken_at: datetime = Field(validation_alias="created_at")


class VaccineIn(Input):
    name: Name
    dose: Dose = ""
    applied_on: date
    next_dose_on: date | None = None
    dependent_id: UUID | None = None
    document_id: UUID | None = None
    shared_with_assistant: bool = False


class VaccinePatch(Input):
    name: Name | None = None
    dose: Dose | None = None
    applied_on: date | None = None
    next_dose_on: date | None = None
    dependent_id: UUID | None = None
    document_id: UUID | None = None
    shared_with_assistant: bool | None = None


class VaccineOut(RecordOut):
    dependent_id: UUID | None
    name: str
    dose: str
    applied_on: date
    next_dose_on: date | None
    document_id: UUID | None
    shared_with_assistant: bool


class ReminderOut(Output):
    kind: Literal["medication", "vaccine"]
    medication_id: UUID | None
    vaccine_id: UUID | None
    name: str
    dose: str
    dependent_id: UUID | None
    date: date
    time: str | None
    taken: bool
    last_day: bool
