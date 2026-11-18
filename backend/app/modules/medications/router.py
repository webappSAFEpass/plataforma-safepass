from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.modules.dependents.ownership import DependentOwnership
from app.modules.dependents.repository import DependentRepository
from app.modules.dependents.service import DependentService
from app.modules.documents.repository import DocumentRepository
from app.modules.medications import schemas as s
from app.modules.medications.repository import MedicationRepository, VaccineRepository
from app.modules.medications.service import MedicationService, ReminderService, VaccineService
from app.modules.points.repository import PointsRepository
from app.modules.points.service import PointsService
from app.shared.clock import SystemClock
from app.shared.schemas import Page

router = APIRouter(tags=["medications"])
User = Annotated[CurrentUser, Depends(get_current_user)]
PageNumber = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def get_ownership(db: Session = Depends(get_db)) -> DependentOwnership:
    return DependentOwnership(
        DependentService(DependentRepository(db), PointsService(PointsRepository(db)))
    )


Owners = Annotated[DependentOwnership, Depends(get_ownership)]


def get_medication_service(owners: Owners, db: Session = Depends(get_db)) -> MedicationService:
    return MedicationService(MedicationRepository(db), owners, SystemClock())


def get_vaccine_service(owners: Owners, db: Session = Depends(get_db)) -> VaccineService:
    return VaccineService(VaccineRepository(db), owners, DocumentRepository(db))


def get_reminder_service(owners: Owners, db: Session = Depends(get_db)) -> ReminderService:
    return ReminderService(MedicationRepository(db), VaccineRepository(db), owners, SystemClock())


Medications = Annotated[MedicationService, Depends(get_medication_service)]
Vaccines = Annotated[VaccineService, Depends(get_vaccine_service)]
Reminders = Annotated[ReminderService, Depends(get_reminder_service)]


@router.get("/medications", response_model=Page[s.MedicationOut], summary="Listar medicamentos")
def list_medications(
    user: User,
    service: Medications,
    dependent_id: UUID | None = None,
    active: bool = False,
    page: PageNumber = 1,
    size: PageSize = 20,
) -> Page[s.MedicationOut]:
    return service.list(user, dependent_id, active, page, size)


@router.post(
    "/medications",
    response_model=s.MedicationOut,
    status_code=201,
    summary="Cadastrar medicamento manual",
)
def create_medication(data: s.MedicationIn, user: User, service: Medications) -> s.MedicationOut:
    return service.create(user, data)


@router.patch(
    "/medications/{medication_id}",
    response_model=s.MedicationOut,
    summary="Editar, encerrar (ended_on) ou reabrir (ended_on null) medicamento",
)
def update_medication(
    medication_id: UUID, data: s.MedicationPatch, user: User, service: Medications
) -> s.MedicationOut:
    return service.update(user, medication_id, data)


@router.delete("/medications/{medication_id}", status_code=204, summary="Apagar medicamento")
def delete_medication(medication_id: UUID, user: User, service: Medications) -> Response:
    service.remove(user, medication_id)
    return Response(status_code=204)


@router.post(
    "/medications/{medication_id}/doses",
    response_model=s.DoseOut,
    status_code=201,
    summary="Marcar dose como tomada (idempotente)",
)
def take_dose(medication_id: UUID, data: s.DoseIn, user: User, service: Medications) -> s.DoseOut:
    return service.take_dose(user, medication_id, data)


@router.delete(
    "/medications/{medication_id}/doses", status_code=204, summary="Desmarcar dose tomada"
)
def undo_dose(
    medication_id: UUID,
    user: User,
    service: Medications,
    dose_date: Annotated[date, Query(alias="date")],
    time: Annotated[str, Query(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")],
) -> Response:
    service.undo_dose(user, medication_id, s.DoseIn(date=dose_date, time=time))
    return Response(status_code=204)


@router.get(
    "/reminders",
    response_model=list[s.ReminderOut],
    summary="Lembretes de hoje (doses e próximas vacinas)",
)
def list_reminders(
    user: User, service: Reminders, dependent_id: UUID | None = None
) -> list[s.ReminderOut]:
    return service.today(user, dependent_id)


@router.get("/vaccines", response_model=Page[s.VaccineOut], summary="Listar vacinas")
def list_vaccines(
    user: User,
    service: Vaccines,
    dependent_id: UUID | None = None,
    page: PageNumber = 1,
    size: PageSize = 20,
) -> Page[s.VaccineOut]:
    return service.list(user, dependent_id, page, size)


@router.post("/vaccines", response_model=s.VaccineOut, status_code=201, summary="Registrar vacina")
def create_vaccine(data: s.VaccineIn, user: User, service: Vaccines) -> s.VaccineOut:
    return service.create(user, data)


@router.get("/vaccines/{vaccine_id}", response_model=s.VaccineOut, summary="Ver vacina")
def get_vaccine(vaccine_id: UUID, user: User, service: Vaccines) -> s.VaccineOut:
    return service.get(user, vaccine_id)


@router.patch("/vaccines/{vaccine_id}", response_model=s.VaccineOut, summary="Editar vacina")
def update_vaccine(
    vaccine_id: UUID, data: s.VaccinePatch, user: User, service: Vaccines
) -> s.VaccineOut:
    return service.update(user, vaccine_id, data)


@router.delete("/vaccines/{vaccine_id}", status_code=204, summary="Apagar vacina")
def delete_vaccine(vaccine_id: UUID, user: User, service: Vaccines) -> Response:
    service.remove(user, vaccine_id)
    return Response(status_code=204)
