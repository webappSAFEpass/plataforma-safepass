from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import Field, PositiveInt

from app.modules.medications.schemas import Dose, MedicationOut, Posology, Time
from app.shared.schemas import Input, Name, Output, RecordOut

DocumentType = Literal["prescription", "exam", "consultation", "vaccine", "certificate"]
Title = Annotated[str, Field(min_length=1, max_length=200)]


class DocumentPatch(Input):
    title: Title | None = None
    type: DocumentType | None = None
    document_date: date | None = None
    dependent_id: UUID | None = None
    shared_with_assistant: bool | None = None


class DocumentOut(RecordOut):
    dependent_id: UUID | None
    type: DocumentType
    title: str
    document_date: date | None
    mime_type: str | None
    size: int | None
    has_file: bool
    ocr_reading_id: UUID | None
    shared_with_assistant: bool


class ExtractedMedicationOut(Output):
    name: str
    dose: str
    posology: str
    period: str
    duration_days: int | None
    needs_review: bool


class ExtractionOut(Output):
    ocr_reading_id: UUID
    source: Literal["gemini", "tesseract"]
    needs_review: bool
    notes: str | None
    doctor: str | None
    prescription_date: str | None
    medications: list[ExtractedMedicationOut]


class PrescriptionItemIn(Input):
    name: Name
    dose: Dose = ""
    posology: Posology = ""
    start_date: date | None = None  # nulo = hoje
    duration_days: PositiveInt | None = None  # nulo = uso contínuo
    first_dose: Time = "08:00"


class PrescriptionIn(Input):
    ocr_reading_id: UUID | None = None  # da extração; sem ele, é preenchimento manual
    dependent_id: UUID | None = None
    doctor: str | None = Field(default=None, max_length=160)
    prescription_date: date | None = None
    medications: list[PrescriptionItemIn] = Field(min_length=1)


class PrescriptionOut(RecordOut):
    ocr_reading_id: UUID
    document_id: UUID | None
    dependent_id: UUID | None
    doctor: str | None
    prescription_date: date | None
    medications: list[MedicationOut]
