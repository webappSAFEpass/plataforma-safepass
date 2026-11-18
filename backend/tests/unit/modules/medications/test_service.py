from datetime import UTC, date, datetime
from unittest.mock import Mock
from uuid import UUID, uuid4

import pytest

from app.core.exceptions import NotFoundError
from app.modules.dependents.exceptions import DependentNotFound
from app.modules.medications.exceptions import MedicationNotFound, VaccineNotFound
from app.modules.medications.models import DoseIntake, Medication, Vaccine
from app.modules.medications.repository import MedicationRepository, VaccineRepository
from app.modules.medications.schemas import (
    DoseIn,
    MedicationIn,
    MedicationPatch,
    VaccineIn,
    VaccinePatch,
)
from app.modules.medications.service import MedicationService, ReminderService, VaccineService
from app.shared.identity import CurrentUser
from app.shared.roles import Role
from tests.support import FixedClock, stamp_record

# 02:00 UTC ainda é dia 14 em São Paulo: "hoje" segue o fuso local.
NOW = datetime(2026, 11, 15, 2, 0, tzinfo=UTC)
TODAY = date(2026, 11, 14)
USER = CurrentUser(id=uuid4(), role=Role.USER, email="ana@exemplo.com", full_name="Ana")
FOREIGN_DEPENDENT = uuid4()


class FakeOwners:
    def require(self, user_id: UUID, dependent_id: UUID | None) -> None:
        if dependent_id == FOREIGN_DEPENDENT:
            raise DependentNotFound()


def _repo(spec: type) -> Mock:
    repo = Mock(spec=spec)
    repo.session = Mock()
    repo.add.side_effect = stamp_record
    return repo


def _medication(**fields: object) -> Medication:
    record = Medication(
        **{
            "user_id": USER.id,
            "source": "manual",
            "name": "Losartana",
            "dose": "50mg",
            "posology": "12/12h",
            "start_date": TODAY,
            "duration_days": None,
            "first_dose": "08:00",
            "ended_on": None,
            **fields,
        }
    )
    stamp_record(record)
    return record


def _medication_service(repo: Mock) -> MedicationService:
    return MedicationService(repo, FakeOwners(), FixedClock(NOW))


def test_create_medication_defaults_to_local_today_and_schedule() -> None:
    repo = _repo(MedicationRepository)

    created = _medication_service(repo).create(
        USER, MedicationIn(name="Losartana", posology="12/12h", first_dose="21:00")
    )

    assert (created.source, created.start_date, created.active) == ("manual", TODAY, True)
    assert created.schedule == ["21:00", "09:00"]
    assert repo.add.call_args[0][0].user_id == USER.id
    repo.session.commit.assert_called_once()


def test_create_medication_for_dependent_of_other_account_raises_not_found() -> None:
    repo = _repo(MedicationRepository)

    with pytest.raises(DependentNotFound):
        _medication_service(repo).create(
            USER, MedicationIn(name="Losartana", dependent_id=FOREIGN_DEPENDENT)
        )
    repo.add.assert_not_called()


def test_update_medication_ends_and_reopens_treatment() -> None:
    repo = _repo(MedicationRepository)
    record = _medication(start_date=date(2026, 11, 1))
    repo.get.return_value = record
    service = _medication_service(repo)

    ended = service.update(USER, record.id, MedicationPatch(ended_on=TODAY))
    reopened = service.update(USER, record.id, MedicationPatch(ended_on=None))

    assert (ended.ended_on, ended.active) == (TODAY, False)
    assert (reopened.ended_on, reopened.active) == (None, True)


def test_update_medication_ignores_explicit_null_on_required_field() -> None:
    repo = _repo(MedicationRepository)
    record = _medication()
    repo.get.return_value = record

    _medication_service(repo).update(USER, record.id, MedicationPatch(name=None, dose="100mg"))

    assert (record.name, record.dose) == ("Losartana", "100mg")


def test_update_medication_of_other_user_raises_not_found() -> None:
    repo = _repo(MedicationRepository)
    repo.get.return_value = None

    with pytest.raises(MedicationNotFound):
        _medication_service(repo).update(USER, uuid4(), MedicationPatch(dose="1"))


def test_list_medications_filters_active_by_local_today() -> None:
    repo = _repo(MedicationRepository)
    repo.search.return_value = ([_medication(start_date=date(2026, 1, 1), duration_days=7)], 1)

    page = _medication_service(repo).list(USER, None, active=True, page=1, size=20)

    repo.search.assert_called_once_with(USER.id, None, TODAY, 1, 20)
    assert (page.total, page.items[0].active) == (1, False)


def test_take_dose_returns_intake_and_requires_own_medication() -> None:
    repo = _repo(MedicationRepository)
    record = _medication()
    repo.get.return_value = record
    intake = DoseIntake(medication_id=record.id, date=TODAY, time="08:00")
    stamp_record(intake)
    repo.add_dose.return_value = intake
    service = _medication_service(repo)

    dose = service.take_dose(USER, record.id, DoseIn(date=TODAY, time="08:00"))

    assert (dose.medication_id, dose.time, dose.taken_at) == (record.id, "08:00", intake.created_at)
    repo.get.return_value = None
    with pytest.raises(MedicationNotFound):
        service.undo_dose(USER, record.id, DoseIn(date=TODAY, time="08:00"))
    repo.remove_dose.assert_not_called()


def test_remove_medication_deletes_own_record() -> None:
    repo = _repo(MedicationRepository)
    record = _medication()
    repo.get.return_value = record

    _medication_service(repo).remove(USER, record.id)

    repo.delete.assert_called_once_with(record)


def test_reminders_list_today_doses_taken_last_day_and_pending_vaccines() -> None:
    meds = _repo(MedicationRepository)
    vaccines = _repo(VaccineRepository)
    antibiotic = _medication(
        name="Amoxicilina",
        posology="8/8h",
        first_dose="15:00",
        duration_days=7,
        start_date=date(2026, 11, 8),
    )
    pressure = _medication(name="Losartana", posology="1x ao dia")
    meds.active.return_value = [antibiotic, pressure]
    meds.taken_on.return_value = {(antibiotic.id, "15:00")}
    vaccine = Vaccine(
        user_id=USER.id,
        name="Hepatite B",
        dose="2ª dose",
        applied_on=date(2026, 10, 1),
        next_dose_on=date(2026, 12, 1),
    )
    stamp_record(vaccine)
    vaccines.pending.return_value = [vaccine]

    reminders = ReminderService(meds, vaccines, FakeOwners(), FixedClock(NOW)).today(USER, None)

    assert [(r.kind, r.name, r.time, r.taken, r.last_day) for r in reminders] == [
        ("medication", "Amoxicilina", "07:00", False, True),
        ("medication", "Losartana", "08:00", False, False),
        ("medication", "Amoxicilina", "15:00", True, True),
        ("medication", "Amoxicilina", "23:00", False, True),
        ("vaccine", "Hepatite B", None, False, False),
    ]
    assert reminders[-1].date == date(2026, 12, 1)
    meds.active.assert_called_once_with(USER.id, None, TODAY)


def test_reminders_for_dependent_of_other_account_raises_not_found() -> None:
    service = ReminderService(
        _repo(MedicationRepository), _repo(VaccineRepository), FakeOwners(), FixedClock(NOW)
    )

    with pytest.raises(DependentNotFound):
        service.today(USER, FOREIGN_DEPENDENT)


def _vaccine_service(repo: Mock, document: object | None = None) -> VaccineService:
    documents = Mock()
    documents.get.return_value = document
    return VaccineService(repo, FakeOwners(), documents)


def test_create_vaccine_with_document_of_other_user_raises_not_found() -> None:
    repo = _repo(VaccineRepository)

    with pytest.raises(NotFoundError):
        _vaccine_service(repo, document=None).create(
            USER, VaccineIn(name="BCG", applied_on=TODAY, document_id=uuid4())
        )
    repo.add.assert_not_called()


def test_create_and_update_vaccine() -> None:
    repo = _repo(VaccineRepository)
    service = _vaccine_service(repo, document=object())

    created = service.create(
        USER, VaccineIn(name="BCG", applied_on=TODAY, document_id=uuid4(), next_dose_on=None)
    )
    record = repo.add.call_args[0][0]
    repo.get.return_value = record
    updated = service.update(USER, created.id, VaccinePatch(shared_with_assistant=True))

    assert (created.name, created.shared_with_assistant) == ("BCG", False)
    assert updated.shared_with_assistant is True
    assert service.get(USER, created.id).id == created.id


def test_vaccine_of_other_user_raises_not_found() -> None:
    repo = _repo(VaccineRepository)
    repo.get.return_value = None
    service = _vaccine_service(repo)

    with pytest.raises(VaccineNotFound):
        service.get(USER, uuid4())
    with pytest.raises(VaccineNotFound):
        service.remove(USER, uuid4())
