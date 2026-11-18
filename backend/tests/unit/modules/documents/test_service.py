from datetime import UTC, date, datetime
from unittest.mock import Mock
from uuid import UUID, uuid4

import pytest

from app.integrations.prescription_ocr import ExtractedItem, Extraction, ReadResult
from app.modules.dependents.exceptions import DependentNotFound
from app.modules.documents.exceptions import (
    DocumentNotFound,
    EmptyFile,
    FileTooLarge,
    ReadingUnavailable,
    UnsupportedFile,
)
from app.modules.documents.models import Document, OcrReading
from app.modules.documents.repository import DocumentRepository
from app.modules.documents.schemas import DocumentPatch, PrescriptionIn, PrescriptionItemIn
from app.modules.documents.service import (
    MAX_UPLOAD_BYTES,
    DocumentService,
    PrescriptionService,
)
from app.modules.medications.models import Medication
from app.shared.identity import CurrentUser
from app.shared.roles import Role
from tests.support import FixedClock, stamp_record

NOW = datetime(2026, 11, 15, 12, 0, tzinfo=UTC)
TODAY = date(2026, 11, 15)
USER = CurrentUser(id=uuid4(), role=Role.USER, email="ana@exemplo.com", full_name="Ana")
FOREIGN_DEPENDENT = uuid4()
JPEG = b"\xff\xd8\xff\xe0fake-jpeg"
PDF = b"%PDF-1.7 exame"


class FakeOwners:
    def require(self, user_id: UUID, dependent_id: UUID | None) -> None:
        if dependent_id == FOREIGN_DEPENDENT:
            raise DependentNotFound()


class FakeStorage:
    def __init__(self) -> None:
        self.files: dict[str, bytes] = {}

    def save(self, content: bytes) -> str:
        key = uuid4().hex
        self.files[key] = content
        return key

    def read(self, key: str) -> bytes:
        return self.files[key]

    def delete(self, key: str) -> None:
        self.files.pop(key, None)


class FakeReader:
    def __init__(self, result: ReadResult) -> None:
        self.result = result

    def read(self, image: bytes, mime_type: str) -> ReadResult:
        return self.result


def _repo() -> Mock:
    repo = Mock(spec=DocumentRepository)
    repo.session = Mock()
    repo.add.side_effect = stamp_record
    return repo


def _documents(repo: Mock, storage: FakeStorage | None = None) -> DocumentService:
    return DocumentService(repo, FakeOwners(), storage or FakeStorage())


def test_upload_pdf_stores_file_and_detects_type_by_signature() -> None:
    repo, storage = _repo(), FakeStorage()

    created = _documents(repo, storage).upload(USER, PDF, "exam", "Hemograma", TODAY, None)

    assert (created.type, created.mime_type, created.size, created.has_file) == (
        "exam",
        "application/pdf",
        len(PDF),
        True,
    )
    assert list(storage.files.values()) == [PDF]


@pytest.mark.parametrize(
    ("content", "error"),
    [
        (b"", EmptyFile),
        (b"GIF89a", UnsupportedFile),
        (b"%PDF-" + b"0" * MAX_UPLOAD_BYTES, FileTooLarge),
    ],
)
def test_upload_rejects_invalid_files(content: bytes, error: type[Exception]) -> None:
    repo, storage = _repo(), FakeStorage()

    with pytest.raises(error):
        _documents(repo, storage).upload(USER, content, "exam", "x", None, None)
    assert storage.files == {}


def test_upload_removes_file_when_database_fails() -> None:
    repo, storage = _repo(), FakeStorage()
    repo.session.commit.side_effect = RuntimeError("banco fora")

    with pytest.raises(RuntimeError):
        _documents(repo, storage).upload(USER, PDF, "exam", "x", None, None)
    assert storage.files == {}


def test_upload_for_dependent_of_other_account_raises_not_found() -> None:
    with pytest.raises(DependentNotFound):
        _documents(_repo()).upload(USER, PDF, "exam", "x", None, FOREIGN_DEPENDENT)


def _document(**fields: object) -> Document:
    record = Document(
        **{"user_id": USER.id, "type": "exam", "title": "Hemograma", "file_key": None, **fields}
    )
    stamp_record(record)
    return record


def test_update_owner_also_moves_prescription_medications() -> None:
    repo = _repo()
    record = _document(type="prescription")
    repo.get.return_value = record
    dependent = uuid4()

    updated = _documents(repo).update(
        USER, record.id, DocumentPatch(dependent_id=dependent, shared_with_assistant=True)
    )

    assert (updated.dependent_id, updated.shared_with_assistant) == (dependent, True)
    repo.reassign_prescription.assert_called_once_with(record.id, dependent)


def test_remove_and_download_document() -> None:
    repo, storage = _repo(), FakeStorage()
    key = storage.save(JPEG)
    record = _document(file_key=key, mime_type="image/jpeg")
    repo.get.return_value = record
    service = _documents(repo, storage)

    assert service.download(USER, record.id) == (JPEG, "image/jpeg", "documento.jpg")
    service.remove(USER, record.id)

    repo.delete.assert_called_once_with(record)
    assert storage.files == {}


def test_download_document_without_file_raises_not_found() -> None:
    repo = _repo()
    repo.get.return_value = _document()

    with pytest.raises(DocumentNotFound):
        _documents(repo).download(USER, uuid4())


def test_get_document_of_other_user_raises_not_found() -> None:
    repo = _repo()
    repo.get.return_value = None

    with pytest.raises(DocumentNotFound):
        _documents(repo).get(USER, uuid4())


def _read_result(confidence: float) -> ReadResult:
    return ReadResult(
        data=Extraction(
            medications=[
                ExtractedItem(
                    name="Amoxicilina",
                    dose="500mg",
                    posology="8/8h",
                    period="7 dias",
                    confidence=confidence,
                )
            ],
            overall_confidence=confidence,
            doctor="Dra. Ana",
            prescription_date="2026-11-10",
        ),
        needs_review=confidence < 0.9,
        review_fields=[],
        source="gemini",
    )


def _prescriptions(
    repo: Mock, storage: FakeStorage, confidence: float = 0.95
) -> PrescriptionService:
    return PrescriptionService(
        repo, FakeOwners(), storage, FakeReader(_read_result(confidence)), FixedClock(NOW)
    )


def test_extract_saves_reading_in_review_and_hides_confidence() -> None:
    repo, storage = _repo(), FakeStorage()

    result = _prescriptions(repo, storage, confidence=0.5).extract(USER, JPEG)

    reading = repo.add.call_args_list[0][0][0]
    assert (reading.status, reading.source, reading.confidence) == ("review", "gemini", 0.5)
    assert result.ocr_reading_id == reading.id
    [item] = result.medications
    assert (item.duration_days, item.needs_review) == (7, True)
    assert "confidence" not in result.model_dump_json()
    assert repo.session.commit.call_count == 2  # "processing" fica gravado antes do OCR


def test_extract_rejects_pdf() -> None:
    with pytest.raises(UnsupportedFile):
        _prescriptions(_repo(), FakeStorage()).extract(USER, PDF)


def _prescription_in(**fields: object) -> PrescriptionIn:
    return PrescriptionIn(
        **{
            "doctor": "Dra. Ana",
            "medications": [
                PrescriptionItemIn(
                    name="Amoxicilina", posology="8/8h", duration_days=7, first_dose="15:00"
                ),
                PrescriptionItemIn(name="Dipirona", posology="se necessário"),
            ],
            **fields,
        }
    )


def test_save_confirms_reading_and_creates_document_and_medications() -> None:
    repo, storage = _repo(), FakeStorage()
    reading = OcrReading(
        user_id=USER.id, status="review", file_key="k", mime_type="image/jpeg", size=10
    )
    stamp_record(reading)
    repo.reading_in_review.return_value = reading

    saved = _prescriptions(repo, storage).save(USER, _prescription_in(ocr_reading_id=reading.id))

    added = [call[0][0] for call in repo.add.call_args_list]
    document = next(a for a in added if isinstance(a, Document))
    medications = [a for a in added if isinstance(a, Medication)]
    assert reading.status == "confirmed"
    assert reading.confirmed_at is not None
    assert (document.type, document.title, document.file_key) == (
        "prescription",
        "Amoxicilina, Dipirona",
        "k",
    )
    assert [m.source for m in medications] == ["prescription", "prescription"]
    assert saved.document_id == document.id
    assert [m.schedule for m in saved.medications] == [["15:00", "23:00", "07:00"], []]
    assert saved.medications[0].start_date == TODAY
    repo.session.commit.assert_called_once()


def test_save_without_reading_creates_manual_confirmed_reading() -> None:
    repo = _repo()

    saved = _prescriptions(repo, FakeStorage()).save(USER, _prescription_in())

    reading = repo.add.call_args_list[0][0][0]
    assert (reading.status, reading.source, saved.ocr_reading_id) == (
        "confirmed",
        "manual",
        reading.id,
    )


def test_save_with_reading_not_in_review_raises_conflict() -> None:
    repo = _repo()
    repo.reading_in_review.return_value = None

    with pytest.raises(ReadingUnavailable):
        _prescriptions(repo, FakeStorage()).save(USER, _prescription_in(ocr_reading_id=uuid4()))
    repo.session.rollback.assert_called_once()
