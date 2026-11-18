from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.database import Base
from app.modules.documents.models import Document, OcrReading, Prescription
from app.modules.medications.models import Medication
from app.shared.pagination import paginate


class DocumentRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Base) -> None:
        self.session.add(record)
        self.session.flush()

    def delete(self, record: Base) -> None:
        self.session.delete(record)
        self.session.flush()

    def get(self, user_id: UUID, document_id: UUID) -> Document | None:
        return self.session.scalar(
            select(Document).where(Document.id == document_id, Document.user_id == user_id)
        )

    def list(
        self,
        user_id: UUID,
        type: str | None,
        search: str | None,
        dependent_id: UUID | None,
        page: int,
        size: int,
    ) -> tuple[list[Document], int]:
        query = select(Document).where(Document.user_id == user_id)
        if type is not None:
            query = query.where(Document.type == type)
        if search:
            query = query.where(Document.title.icontains(search, autoescape=True))
        if dependent_id is not None:
            query = query.where(Document.dependent_id == dependent_id)
        query = query.order_by(Document.created_at.desc(), Document.id)
        return paginate(self.session, query, page, size)

    def reading_in_review(self, user_id: UUID, reading_id: UUID) -> OcrReading | None:
        return self.session.scalar(
            select(OcrReading)
            .where(
                OcrReading.id == reading_id,
                OcrReading.user_id == user_id,
                OcrReading.status == "review",
            )
            .with_for_update()  # dois cliques em "Salvar" não confirmam a mesma leitura
        )

    def reassign_prescription(self, document_id: UUID, dependent_id: UUID | None) -> None:
        """Mudar o dono do documento da receita muda o dono dos medicamentos dela."""
        prescriptions = select(Prescription.id).where(Prescription.document_id == document_id)
        self.session.execute(
            update(Medication)
            .where(Medication.prescription_id.in_(prescriptions))
            .values(dependent_id=dependent_id)
        )
