from app.core.exceptions import NotFoundError


class MedicationNotFound(NotFoundError):
    default_message = "Medicamento não encontrado."


class VaccineNotFound(NotFoundError):
    default_message = "Vacina não encontrada."
