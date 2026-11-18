from datetime import date
from uuid import UUID

from sqlalchemy import ColumnElement, and_, delete, exists, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, aliased

from app.core.database import Base
from app.modules.medications.models import DoseIntake, Medication, Vaccine
from app.shared.pagination import paginate


def _active_on(today: date) -> ColumnElement[bool]:
    return and_(
        Medication.start_date <= today,
        or_(Medication.ended_on.is_(None), Medication.ended_on > today),
        or_(
            Medication.duration_days.is_(None),
            Medication.start_date + Medication.duration_days > today,
        ),
    )


class MedicationRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Base) -> None:
        self.session.add(record)
        self.session.flush()

    def delete(self, record: Base) -> None:
        self.session.delete(record)
        self.session.flush()

    def get(self, user_id: UUID, medication_id: UUID) -> Medication | None:
        return self.session.scalar(
            select(Medication).where(Medication.id == medication_id, Medication.user_id == user_id)
        )

    def search(
        self,
        user_id: UUID,
        dependent_id: UUID | None,
        active_on: date | None,
        page: int,
        size: int,
    ) -> tuple[list[Medication], int]:
        query = select(Medication).where(Medication.user_id == user_id)
        if dependent_id is not None:
            query = query.where(Medication.dependent_id == dependent_id)
        if active_on is not None:
            query = query.where(_active_on(active_on))
        query = query.order_by(Medication.start_date.desc(), Medication.created_at.desc())
        return paginate(self.session, query, page, size)

    def active(self, user_id: UUID, dependent_id: UUID | None, today: date) -> list[Medication]:
        query = select(Medication).where(Medication.user_id == user_id, _active_on(today))
        if dependent_id is not None:
            query = query.where(Medication.dependent_id == dependent_id)
        return list(self.session.scalars(query.order_by(Medication.created_at)))

    def taken_on(self, medication_ids: list[UUID], day: date) -> set[tuple[UUID, str]]:
        rows = self.session.execute(
            select(DoseIntake.medication_id, DoseIntake.time).where(
                DoseIntake.medication_id.in_(medication_ids), DoseIntake.date == day
            )
        )
        return {(row.medication_id, row.time) for row in rows}

    def get_dose(self, medication_id: UUID, day: date, time: str) -> DoseIntake | None:
        return self.session.scalar(
            select(DoseIntake).where(
                DoseIntake.medication_id == medication_id,
                DoseIntake.date == day,
                DoseIntake.time == time,
            )
        )

    def add_dose(self, medication_id: UUID, day: date, time: str) -> DoseIntake:
        """Idempotente: o UNIQUE resolve dois cliques simultâneos sem erro."""
        self.session.execute(
            insert(DoseIntake)
            .values(medication_id=medication_id, date=day, time=time)
            .on_conflict_do_nothing(constraint="uq_dose_intake")
        )
        dose = self.get_dose(medication_id, day, time)
        assert dose is not None
        return dose

    def remove_dose(self, medication_id: UUID, day: date, time: str) -> None:
        self.session.execute(
            delete(DoseIntake).where(
                DoseIntake.medication_id == medication_id,
                DoseIntake.date == day,
                DoseIntake.time == time,
            )
        )


class VaccineRepository:
    def __init__(self, session: Session):
        self.session = session

    def add(self, record: Base) -> None:
        self.session.add(record)
        self.session.flush()

    def delete(self, record: Base) -> None:
        self.session.delete(record)
        self.session.flush()

    def get(self, user_id: UUID, vaccine_id: UUID) -> Vaccine | None:
        return self.session.scalar(
            select(Vaccine).where(Vaccine.id == vaccine_id, Vaccine.user_id == user_id)
        )

    def search(
        self, user_id: UUID, dependent_id: UUID | None, page: int, size: int
    ) -> tuple[list[Vaccine], int]:
        query = select(Vaccine).where(Vaccine.user_id == user_id)
        if dependent_id is not None:
            query = query.where(Vaccine.dependent_id == dependent_id)
        query = query.order_by(Vaccine.applied_on.desc(), Vaccine.created_at.desc())
        return paginate(self.session, query, page, size)

    def pending(self, user_id: UUID, dependent_id: UUID | None) -> list[Vaccine]:
        """Com próxima dose e sem registro posterior da mesma vacina para o mesmo dono."""
        later = aliased(Vaccine)
        query = select(Vaccine).where(
            Vaccine.user_id == user_id,
            Vaccine.next_dose_on.is_not(None),
            ~exists().where(
                later.user_id == Vaccine.user_id,
                later.name == Vaccine.name,
                later.dependent_id.is_not_distinct_from(Vaccine.dependent_id),
                later.applied_on > Vaccine.applied_on,
            ),
        )
        if dependent_id is not None:
            query = query.where(Vaccine.dependent_id == dependent_id)
        return list(self.session.scalars(query.order_by(Vaccine.next_dose_on)))
