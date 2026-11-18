from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.integrations.prescription_ocr import GeminiPrescriptionReader, PrescriptionReader
from app.modules.documents import schemas as s
from app.modules.documents.repository import DocumentRepository
from app.modules.documents.service import MAX_UPLOAD_BYTES, DocumentService, PrescriptionService
from app.modules.documents.storage import FileStorage, LocalFileStorage
from app.modules.medications.router import Owners
from app.shared.clock import SystemClock
from app.shared.schemas import Page

router = APIRouter(tags=["documents"])
User = Annotated[CurrentUser, Depends(get_current_user)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_storage(settings: Settings = Depends(get_settings)) -> FileStorage:
    return LocalFileStorage(settings.documents_dir)


def get_prescription_reader(settings: Settings = Depends(get_settings)) -> PrescriptionReader:
    return GeminiPrescriptionReader(
        settings.google_api_key, settings.gemini_model, settings.gemini_timeout_seconds
    )


Storage = Annotated[FileStorage, Depends(get_storage)]


def get_document_service(
    owners: Owners, storage: Storage, db: Session = Depends(get_db)
) -> DocumentService:
    return DocumentService(DocumentRepository(db), owners, storage)


def get_prescription_service(
    owners: Owners,
    storage: Storage,
    reader: PrescriptionReader = Depends(get_prescription_reader),
    db: Session = Depends(get_db),
) -> PrescriptionService:
    return PrescriptionService(DocumentRepository(db), owners, storage, reader, SystemClock())


Documents = Annotated[DocumentService, Depends(get_document_service)]
Prescriptions = Annotated[PrescriptionService, Depends(get_prescription_service)]


def _read(file: UploadFile) -> bytes:
    # Lê um byte além do limite: basta para o service recusar sem carregar o resto.
    return file.file.read(MAX_UPLOAD_BYTES + 1)


@router.get("/documents", response_model=Page[s.DocumentOut], summary="Listar documentos")
def list_documents(
    user: User,
    service: Documents,
    type: s.DocumentType | None = None,
    q: Annotated[str | None, Query(max_length=100, description="Busca no título")] = None,
    dependent_id: UUID | None = None,
    page: PageNumber = 1,
    size: PageSize = 20,
) -> Page[s.DocumentOut]:
    return service.list(user, type, q, dependent_id, page, size)


@router.post(
    "/documents",
    response_model=s.DocumentOut,
    status_code=201,
    summary="Enviar documento (JPG, PNG ou PDF até 10 MB)",
)
def upload_document(
    user: User,
    service: Documents,
    file: Annotated[UploadFile, File()],
    type: Annotated[s.DocumentType, Form()],
    title: Annotated[str, Form(min_length=1, max_length=200)],
    document_date: Annotated[date | None, Form()] = None,
    dependent_id: Annotated[UUID | None, Form()] = None,
) -> s.DocumentOut:
    return service.upload(user, _read(file), type, title.strip(), document_date, dependent_id)


@router.get("/documents/{document_id}", response_model=s.DocumentOut, summary="Ver documento")
def get_document(document_id: UUID, user: User, service: Documents) -> s.DocumentOut:
    return service.get(user, document_id)


@router.patch(
    "/documents/{document_id}",
    response_model=s.DocumentOut,
    summary="Editar documento ou compartilhar com o assistente",
)
def update_document(
    document_id: UUID, data: s.DocumentPatch, user: User, service: Documents
) -> s.DocumentOut:
    return service.update(user, document_id, data)


@router.delete("/documents/{document_id}", status_code=204, summary="Apagar documento")
def delete_document(document_id: UUID, user: User, service: Documents) -> Response:
    service.remove(user, document_id)
    return Response(status_code=204)


@router.get(
    "/documents/{document_id}/file",
    response_class=Response,
    responses={200: {"content": {"application/octet-stream": {}}}},
    summary="Baixar o arquivo do documento",
)
def download_document(document_id: UUID, user: User, service: Documents) -> Response:
    content, mime_type, filename = service.download(user, document_id)
    return Response(
        content,
        media_type=mime_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/prescriptions/extract",
    response_model=s.ExtractionOut,
    summary="Ler receita por foto (OCR) para revisão",
)
def extract_prescription(
    user: User, service: Prescriptions, file: Annotated[UploadFile, File()]
) -> s.ExtractionOut:
    # `def` (não async): o FastAPI roda em threadpool, e a chamada ao Gemini é bloqueante.
    return service.extract(user, _read(file))


@router.post(
    "/prescriptions",
    response_model=s.PrescriptionOut,
    status_code=201,
    summary="Salvar receita revisada (cria documento e medicamentos)",
)
def save_prescription(
    data: s.PrescriptionIn, user: User, service: Prescriptions
) -> s.PrescriptionOut:
    return service.save(user, data)
