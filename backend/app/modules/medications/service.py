from datetime import date
from typing import Any, Protocol
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BaseModel

from app.core.exceptions import NotFoundError
from app.modules.dependents.ownership import OwnershipCheck
from app.modules.medications import models as m
from app.modules.medications import schemas as s
from app.modules.medications.exceptions import MedicationNotFound, VaccineNotFound
from app.modules.medications.repository import MedicationRepository, VaccineRepository
from app.modules.medications.schedule import daily_times, is_active, is_last_day
from app.shared.clock import Clock
from app.shared.identity import CurrentUser
from app.shared.schemas import Page
from app.shared.transaction import commit

# ponytail: um fuso só para "hoje" (o público é brasileiro); vira preferência do usuário
# quando houver gente em outro fuso.
LOCAL_TZ = ZoneInfo("America/Sao_Paulo")

# Campos que aceitam null explícito no PATCH; nos outros, null é ignorado.
_NULLABLE = {"duration_days", "dependent_id", "ended_on", "next_dose_on", "document_id"}


def local_today(clock: Clock) -> date:
    return clock.now().astimezone(LOCAL_TZ).date()


def changes(patch: BaseModel) -> dict[str, Any]:
    return {
        key: value
        for key, value in patch.model_dump(exclude_unset=True).items()
        if value is not None or key in _NULLABLE
    }


def medication_out(record: m.Medication, today: date) -> s.MedicationOut:
    return s.MedicationOut.model_validate(
        {
            **{
                key: getattr(record, key)
                for key in s.MedicationOut.model_fields
                if key not in ("schedule", "active")
            },
            "schedule": daily_times(record.posology, record.first_dose),
            "active": is_active(record.start_date, record.duration_days, record.ended_on, today),
        }
    )


class DocumentLookup(Protocol):
    def get(self, user_id: UUID, document_id: UUID) -> object | None: ...


class MedicationService:
    def __init__(self, repo: MedicationRepository, owners: OwnershipCheck, clock: Clock):
        self.repo = repo
        self.owners = owners
        self.clock = clock

    def _get(self, user: CurrentUser, medication_id: UUID) -> m.Medication:
        record = self.repo.get(user.id, medication_id)
        if record is None:
            raise MedicationNotFound()
        return record

    def list(
        self, user: CurrentUser, dependent_id: UUID | None, active: bool, page: int, size: int
    ) -> Page[s.MedicationOut]:
        today = local_today(self.clock)
        active_on = today if active else None
        items, total = self.repo.search(user.id, dependent_id, active_on, page, size)
        return Page(
            items=[medication_out(i, today) for i in items], total=total, page=page, size=size
        )

    def create(self, user: CurrentUser, data: s.MedicationIn) -> s.MedicationOut:
        self.owners.require(user.id, data.dependent_id)
        today = local_today(self.clock)

        def action() -> s.MedicationOut:
            record = m.Medication(
                user_id=user.id,
                source="manual",
                **data.model_dump(exclude={"start_date"}),
                start_date=data.start_date or today,
            )
            self.repo.add(record)
            return medication_out(record, today)

        return commit(self.repo.session, action)

    def update(
        self, user: CurrentUser, medication_id: UUID, data: s.MedicationPatch
    ) -> s.MedicationOut:
        values = changes(data)
        if "dependent_id" in values:
            self.owners.require(user.id, values["dependent_id"])

        def action() -> s.MedicationOut:
            record = self._get(user, medication_id)
            for key, value in values.items():
                setattr(record, key, value)
            self.repo.add(record)
            return medication_out(record, local_today(self.clock))

        return commit(self.repo.session, action)

    def remove(self, user: CurrentUser, medication_id: UUID) -> None:
        commit(self.repo.session, lambda: self.repo.delete(self._get(user, medication_id)))

    def take_dose(self, user: CurrentUser, medication_id: UUID, data: s.DoseIn) -> s.DoseOut:
        def action() -> s.DoseOut:
            self._get(user, medication_id)
            dose = self.repo.add_dose(medication_id, data.date, data.time)
            return s.DoseOut.model_validate(dose)

        return commit(self.repo.session, action)

    def undo_dose(self, user: CurrentUser, medication_id: UUID, data: s.DoseIn) -> None:
        def action() -> None:
            self._get(user, medication_id)
            self.repo.remove_dose(medication_id, data.date, data.time)

        commit(self.repo.session, action)


class VaccineService:
    def __init__(self, repo: VaccineRepository, owners: OwnershipCheck, documents: DocumentLookup):
        self.repo = repo
        self.owners = owners
        self.documents = documents

    def _get(self, user: CurrentUser, vaccine_id: UUID) -> m.Vaccine:
        record = self.repo.get(user.id, vaccine_id)
        if record is None:
            raise VaccineNotFound()
        return record

    def _check_refs(self, user: CurrentUser, values: dict[str, Any]) -> None:
        if "dependent_id" in values:
            self.owners.require(user.id, values["dependent_id"])
        document_id = values.get("document_id")
        if document_id is not None and self.documents.get(user.id, document_id) is None:
            raise NotFoundError("Documento não encontrado.")

    def list(
        self, user: CurrentUser, dependent_id: UUID | None, page: int, size: int
    ) -> Page[s.VaccineOut]:
        items, total = self.repo.search(user.id, dependent_id, page, size)
        return Page(
            items=[s.VaccineOut.model_validate(i) for i in items],
            total=total,
            page=page,
            size=size,
        )

    def get(self, user: CurrentUser, vaccine_id: UUID) -> s.VaccineOut:
        return s.VaccineOut.model_validate(self._get(user, vaccine_id))

    def create(self, user: CurrentUser, data: s.VaccineIn) -> s.VaccineOut:
        values = data.model_dump()
        self._check_refs(user, values)

        def action() -> s.VaccineOut:
            record = m.Vaccine(user_id=user.id, **values)
            self.repo.add(record)
            return s.VaccineOut.model_validate(record)

        return commit(self.repo.session, action)

    def update(self, user: CurrentUser, vaccine_id: UUID, data: s.VaccinePatch) -> s.VaccineOut:
        values = changes(data)
        self._check_refs(user, values)

        def action() -> s.VaccineOut:
            record = self._get(user, vaccine_id)
            for key, value in values.items():
                setattr(record, key, value)
            self.repo.add(record)
            return s.VaccineOut.model_validate(record)

        return commit(self.repo.session, action)

    def remove(self, user: CurrentUser, vaccine_id: UUID) -> None:
        commit(self.repo.session, lambda: self.repo.delete(self._get(user, vaccine_id)))


class ReminderService:
    """Agenda de hoje: doses dos medicamentos ativos + próximas doses de vacina pendentes."""

    def __init__(
        self,
        medications: MedicationRepository,
        vaccines: VaccineRepository,
        owners: OwnershipCheck,
        clock: Clock,
    ):
        self.medications = medications
        self.vaccines = vaccines
        self.owners = owners
        self.clock = clock

    def today(self, user: CurrentUser, dependent_id: UUID | None) -> list[s.ReminderOut]:
        self.owners.require(user.id, dependent_id)
        today = local_today(self.clock)
        active = self.medications.active(user.id, dependent_id, today)
        taken = self.medications.taken_on([med.id for med in active], today)
        doses = [
            s.ReminderOut(
                kind="medication",
                medication_id=med.id,
                vaccine_id=None,
                name=med.name,
                dose=med.dose,
                dependent_id=med.dependent_id,
                date=today,
                time=time,
                taken=(med.id, time) in taken,
                last_day=is_last_day(med.start_date, med.duration_days, today),
            )
            for med in active
            for time in daily_times(med.posology, med.first_dose)
        ]
        vaccines = [
            s.ReminderOut(
                kind="vaccine",
                medication_id=None,
                vaccine_id=vaccine.id,
                name=vaccine.name,
                dose=vaccine.dose,
                dependent_id=vaccine.dependent_id,
                date=vaccine.next_dose_on,
                time=None,
                taken=False,
                last_day=False,
            )
            for vaccine in self.vaccines.pending(user.id, dependent_id)
            if vaccine.next_dose_on is not None
        ]
        return sorted(doses, key=lambda r: r.time or "") + vaccines
