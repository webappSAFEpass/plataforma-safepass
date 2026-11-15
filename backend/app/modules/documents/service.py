from datetime import date
from uuid import UUID

from app.integrations.prescription_ocr import CONFIDENCE_THRESHOLD, PrescriptionReader
from app.modules.dependents.ownership import OwnershipCheck
from app.modules.documents import models as m
from app.modules.documents import schemas as s
from app.modules.documents.exceptions import (
    DocumentNotFound,
    EmptyFile,
    FileTooLarge,
    ReadingUnavailable,
    UnsupportedFile,
)
from app.modules.documents.repository import DocumentRepository
from app.modules.documents.storage import FileStorage
from app.modules.medications.models import Medication
from app.modules.medications.schedule import duration_days
from app.modules.medications.service import changes, local_today, medication_out
from app.shared.clock import Clock
from app.shared.identity import CurrentUser
from app.shared.models import utcnow
from app.shared.schemas import Page
from app.shared.transaction import commit

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# Tipo pela assinatura do arquivo, não pelo Content-Type que o cliente declara.
IMAGES = {b"\xff\xd8\xff": "image/jpeg", b"\x89PNG\r\n\x1a\n": "image/png"}
DOCUMENT_FILES = {**IMAGES, b"%PDF-": "application/pdf"}


def detect_file(content: bytes, signatures: dict[bytes, str], accepted: str) -> str:
    if not content:
        raise EmptyFile()
    if len(content) > MAX_UPLOAD_BYTES:
        raise FileTooLarge()
    for signature, mime_type in signatures.items():
        if content.startswith(signature):
            return mime_type
    raise UnsupportedFile(f"Envie {accepted}.")


class DocumentService:
    def __init__(self, repo: DocumentRepository, owners: OwnershipCheck, storage: FileStorage):
        self.repo = repo
        self.owners = owners
        self.storage = storage

    def _get(self, user: CurrentUser, document_id: UUID) -> m.Document:
        record = self.repo.get(user.id, document_id)
        if record is None:
            raise DocumentNotFound()
        return record

    def list(
        self,
        user: CurrentUser,
        type: str | None,
        search: str | None,
        dependent_id: UUID | None,
        page: int,
        size: int,
    ) -> Page[s.DocumentOut]:
        items, total = self.repo.list(user.id, type, search, dependent_id, page, size)
        return Page(
            items=[s.DocumentOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def get(self, user: CurrentUser, document_id: UUID) -> s.DocumentOut:
        return s.DocumentOut.model_validate(self._get(user, document_id))

    def upload(
        self,
        user: CurrentUser,
        content: bytes,
        type: s.DocumentType,
        title: str,
        document_date: date | None,
        dependent_id: UUID | None,
    ) -> s.DocumentOut:
        mime_type = detect_file(content, DOCUMENT_FILES, "uma foto em JPG/PNG ou um PDF")
        self.owners.require(user.id, dependent_id)
        file_key = self.storage.save(content)

        def action() -> s.DocumentOut:
            record = m.Document(
                user_id=user.id,
                dependent_id=dependent_id,
                type=type,
                title=title,
                document_date=document_date,
                file_key=file_key,
                mime_type=mime_type,
                size=len(content),
            )
            self.repo.add(record)
            return s.DocumentOut.model_validate(record)

        try:
            return commit(self.repo.session, action)
        except Exception:
            self.storage.delete(file_key)  # não deixa arquivo órfão
            raise

    def update(self, user: CurrentUser, document_id: UUID, data: s.DocumentPatch) -> s.DocumentOut:
        values = changes(data)
        if "dependent_id" in values:
            self.owners.require(user.id, values["dependent_id"])

        def action() -> s.DocumentOut:
            record = self._get(user, document_id)
            for key, value in values.items():
                setattr(record, key, value)
            self.repo.add(record)
            if "dependent_id" in values:
                self.repo.reassign_prescription(record.id, record.dependent_id)
            return s.DocumentOut.model_validate(record)

        return commit(self.repo.session, action)

    def remove(self, user: CurrentUser, document_id: UUID) -> None:
        def action() -> str | None:
            record = self._get(user, document_id)
            self.repo.delete(record)
            return record.file_key

        file_key = commit(self.repo.session, action)
        if file_key:
            self.storage.delete(file_key)

    def download(self, user: CurrentUser, document_id: UUID) -> tuple[bytes, str, str]:
        """(conteúdo, mime_type, nome do arquivo)."""
        record = self._get(user, document_id)
        if record.file_key is None or record.mime_type is None:
            raise DocumentNotFound("Este documento não tem arquivo.")
        extension = record.mime_type.rsplit("/", 1)[-1].replace("jpeg", "jpg")
        return self.storage.read(record.file_key), record.mime_type, f"documento.{extension}"


class PrescriptionService:
    def __init__(
        self,
        repo: DocumentRepository,
        owners: OwnershipCheck,
        storage: FileStorage,
        reader: PrescriptionReader,
        clock: Clock,
    ):
        self.repo = repo
        self.owners = owners
        self.storage = storage
        self.reader = reader
        self.clock = clock

    def extract(self, user: CurrentUser, content: bytes) -> s.ExtractionOut:
        mime_type = detect_file(content, IMAGES, "uma foto em JPG ou PNG")
        file_key = self.storage.save(content)  # vira o arquivo do documento ao confirmar
        reading = m.OcrReading(
            user_id=user.id,
            status="processing",
            file_key=file_key,
            mime_type=mime_type,
            size=len(content),
        )
        # Grava antes de chamar o OCR: uma leitura que travar fica visível em "processing".
        commit(self.repo.session, lambda: self.repo.add(reading))

        result = self.reader.read(content, mime_type)

        def action() -> None:
            reading.status = "review"
            reading.source = result.source
            reading.confidence = result.data.overall_confidence
            reading.review_fields = result.review_fields
            reading.extracted = result.data.model_dump()
            self.repo.add(reading)

        commit(self.repo.session, action)
        # A confiança numérica é interna: só sai o booleano por item.
        return s.ExtractionOut(
            ocr_reading_id=reading.id,
            source=result.source,
            needs_review=result.needs_review,
            notes=result.data.notes,
            doctor=result.data.doctor,
            prescription_date=result.data.prescription_date,
            medications=[
                s.ExtractedMedicationOut(
                    **item.model_dump(exclude={"confidence"}),
                    duration_days=duration_days(item.period),
                    needs_review=item.confidence < CONFIDENCE_THRESHOLD,
                )
                for item in result.data.medications
            ],
        )

    def save(self, user: CurrentUser, data: s.PrescriptionIn) -> s.PrescriptionOut:
        """Confirma a leitura e cria receita, documento e medicamentos numa transação só."""
        self.owners.require(user.id, data.dependent_id)
        today = local_today(self.clock)

        def action() -> s.PrescriptionOut:
            reading = self._confirm(user, data.ocr_reading_id)
            document = m.Document(
                user_id=user.id,
                dependent_id=data.dependent_id,
                type="prescription",
                title=", ".join(item.name for item in data.medications),
                document_date=data.prescription_date,
                file_key=reading.file_key,
                mime_type=reading.mime_type,
                size=reading.size,
                ocr_reading_id=reading.id,
            )
            self.repo.add(document)
            prescription = m.Prescription(
                user_id=user.id,
                ocr_reading_id=reading.id,
                document_id=document.id,
                doctor=data.doctor,
                prescription_date=data.prescription_date,
            )
            self.repo.add(prescription)
            medications = [
                Medication(
                    user_id=user.id,
                    dependent_id=data.dependent_id,
                    prescription_id=prescription.id,
                    source="prescription",
                    **item.model_dump(exclude={"start_date"}),
                    start_date=item.start_date or today,
                )
                for item in data.medications
            ]
            for medication in medications:
                self.repo.add(medication)
            return s.PrescriptionOut(
                id=prescription.id,
                created_at=prescription.created_at,
                updated_at=prescription.updated_at,
                ocr_reading_id=reading.id,
                document_id=document.id,
                dependent_id=data.dependent_id,
                doctor=data.doctor,
                prescription_date=data.prescription_date,
                medications=[medication_out(med, today) for med in medications],
            )

        return commit(self.repo.session, action)

    def _confirm(self, user: CurrentUser, reading_id: UUID | None) -> m.OcrReading:
        now = utcnow()
        if reading_id is None:  # preenchimento manual, sem foto
            reading = m.OcrReading(
                user_id=user.id, status="confirmed", source="manual", confirmed_at=now
            )
            self.repo.add(reading)
            return reading
        found = self.repo.reading_in_review(user.id, reading_id)
        if found is None:
            raise ReadingUnavailable()
        found.status = "confirmed"
        found.confirmed_at = now
        self.repo.add(found)
        return found
