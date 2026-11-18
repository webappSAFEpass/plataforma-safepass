from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.shared.models import Record


class OcrReading(Record, Base):
    """Uma leitura de receita por foto: processing → review → confirmed.

    Falha do Gemini não tem status próprio: vira source "tesseract" em revisão.
    """

    __tablename__ = "ocr_readings"
    __table_args__ = (
        CheckConstraint("status IN ('processing','review','confirmed')", name="ocr_status"),
        CheckConstraint("source IN ('gemini','tesseract','manual')", name="ocr_source"),
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(12), index=True)
    source: Mapped[str | None] = mapped_column(String(12))
    confidence: Mapped[float | None]  # interno: a API só expõe needs_review
    review_fields: Mapped[list[str]] = mapped_column(JSONB, default=list)
    extracted: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    file_key: Mapped[str | None] = mapped_column(String(64))
    mime_type: Mapped[str | None] = mapped_column(String(40))
    size: Mapped[int | None]
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Document(Record, Base):
    __tablename__ = "documents"
    __table_args__ = (
        CheckConstraint(
            "type IN ('prescription','exam','consultation','vaccine','certificate')",
            name="document_type",
        ),
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    dependent_id: Mapped[UUID | None] = mapped_column(ForeignKey("dependents.id"), index=True)
    type: Mapped[str] = mapped_column(String(16), index=True)
    title: Mapped[str] = mapped_column(String(200))
    document_date: Mapped[date | None]
    file_key: Mapped[str | None] = mapped_column(String(64))
    mime_type: Mapped[str | None] = mapped_column(String(40))
    size: Mapped[int | None]
    ocr_reading_id: Mapped[UUID | None] = mapped_column(ForeignKey("ocr_readings.id"), unique=True)
    # LGPD: o assistente de IA só vê o que o usuário autorizou.
    shared_with_assistant: Mapped[bool] = mapped_column(default=False)

    @property
    def has_file(self) -> bool:
        return self.file_key is not None


class Prescription(Record, Base):
    __tablename__ = "prescriptions"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    ocr_reading_id: Mapped[UUID] = mapped_column(ForeignKey("ocr_readings.id"), unique=True)
    document_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), index=True
    )
    doctor: Mapped[str | None] = mapped_column(String(160))
    prescription_date: Mapped[date | None]
