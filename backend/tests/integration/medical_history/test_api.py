from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from tests.integration.medical_history.conftest import register

pytestmark = pytest.mark.integration

JPEG = b"\xff\xd8\xff\xe0fake-jpeg"
PDF = b"%PDF-1.7 exame"


def _today() -> str:
    # "Hoje" da API é o de São Paulo, não o UTC.
    return datetime.now(ZoneInfo("America/Sao_Paulo")).date().isoformat()


def _dependent(client: TestClient) -> str:
    response = client.post("/api/v1/dependentes", json={"type": "person", "name": "Pedro"})
    assert response.status_code == 201, response.text
    return str(response.json()["id"])


def _upload(client: TestClient, **form: str) -> dict:  # type: ignore[type-arg]
    response = client.post(
        "/api/v1/documents",
        data={"type": "exam", "title": "Hemograma", **form},
        files={"file": ("exame.pdf", PDF, "application/pdf")},
    )
    assert response.status_code == 201, response.text
    return response.json()  # type: ignore[no-any-return]


def test_routes_require_login(app_client: TestClient) -> None:
    for path in ("/api/v1/documents", "/api/v1/medications", "/api/v1/reminders"):
        response = app_client.get(path)
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "unauthorized"


def test_upload_list_filter_download_and_delete_document(ana: TestClient) -> None:
    pedro = _dependent(ana)
    exam = _upload(ana, document_date="2026-11-01")
    _upload(ana, type="certificate", title="Atestado escolar", dependent_id=pedro)

    page = ana.get("/api/v1/documents", params={"q": "HEMO"}).json()
    assert (page["total"], page["items"][0]["id"]) == (1, exam["id"])
    by_owner = ana.get("/api/v1/documents", params={"dependent_id": pedro}).json()
    assert [d["type"] for d in by_owner["items"]] == ["certificate"]
    assert ana.get("/api/v1/documents", params={"type": "exam"}).json()["total"] == 1

    download = ana.get(f"/api/v1/documents/{exam['id']}/file")
    assert (download.content, download.headers["content-type"]) == (PDF, "application/pdf")

    shared = ana.patch(f"/api/v1/documents/{exam['id']}", json={"shared_with_assistant": True})
    assert shared.json()["shared_with_assistant"] is True

    assert ana.delete(f"/api/v1/documents/{exam['id']}").status_code == 204
    assert ana.get(f"/api/v1/documents/{exam['id']}").status_code == 404


def test_upload_rejects_unsupported_file(ana: TestClient) -> None:
    response = ana.post(
        "/api/v1/documents",
        data={"type": "exam", "title": "x"},
        files={"file": ("x.gif", b"GIF89a", "image/gif")},
    )

    assert response.status_code == 415
    assert response.json()["error"]["code"] == "unsupported_media_type"


def test_extract_then_save_prescription_creates_document_and_reminders(ana: TestClient) -> None:
    extraction = ana.post(
        "/api/v1/prescriptions/extract", files={"file": ("receita.jpg", JPEG, "image/jpeg")}
    ).json()
    assert extraction["medications"][0]["duration_days"] == 7
    assert "confidence" not in str(extraction)

    body = {
        "ocr_reading_id": extraction["ocr_reading_id"],
        "doctor": extraction["doctor"],
        "prescription_date": extraction["prescription_date"],
        "medications": [
            {"name": "Amoxicilina", "posology": "8/8h", "duration_days": 7, "first_dose": "15:00"}
        ],
    }
    saved = ana.post("/api/v1/prescriptions", json=body)
    assert saved.status_code == 201, saved.text
    [medication] = saved.json()["medications"]
    assert (medication["source"], medication["start_date"], medication["active"]) == (
        "prescription",
        _today(),
        True,
    )

    document = ana.get(f"/api/v1/documents/{saved.json()['document_id']}").json()
    assert (document["type"], document["has_file"]) == ("prescription", True)
    assert ana.get(f"/api/v1/documents/{document['id']}/file").content == JPEG

    reminders = ana.get("/api/v1/reminders").json()
    assert sorted(r["time"] for r in reminders) == ["07:00", "15:00", "23:00"]

    again = ana.post("/api/v1/prescriptions", json=body)  # a leitura já foi confirmada
    assert again.status_code == 409


def test_manual_medication_dose_taken_and_end(ana: TestClient) -> None:
    created = ana.post(
        "/api/v1/medications",
        json={"name": "Losartana", "posology": "12/12h", "first_dose": "21:00"},
    ).json()
    url = f"/api/v1/medications/{created['id']}"
    dose = {"date": _today(), "time": "21:00"}

    assert created["schedule"] == ["21:00", "09:00"]
    assert ana.post(f"{url}/doses", json=dose).status_code == 201
    assert ana.post(f"{url}/doses", json=dose).status_code == 201  # idempotente
    taken = {r["time"]: r["taken"] for r in ana.get("/api/v1/reminders").json()}
    assert taken == {"09:00": False, "21:00": True}

    assert ana.delete(f"{url}/doses", params=dose).status_code == 204
    assert not any(r["taken"] for r in ana.get("/api/v1/reminders").json())

    ended = ana.patch(url, json={"ended_on": _today()}).json()
    assert ended["active"] is False
    assert ana.get("/api/v1/reminders").json() == []
    assert ana.get("/api/v1/medications", params={"active": True}).json()["total"] == 0
    assert ana.patch(url, json={"ended_on": None}).json()["active"] is True


def test_invalid_first_dose_is_422(ana: TestClient) -> None:
    response = ana.post("/api/v1/medications", json={"name": "Losartana", "first_dose": "24:00"})

    assert response.status_code == 422


def test_vaccine_next_dose_is_reminder_until_registered(ana: TestClient) -> None:
    pedro = _dependent(ana)
    next_dose = (date.fromisoformat(_today()) + timedelta(days=5)).isoformat()
    first = ana.post(
        "/api/v1/vaccines",
        json={
            "name": "Hepatite B",
            "dose": "1ª dose",
            "applied_on": "2026-10-01",
            "next_dose_on": next_dose,
            "dependent_id": pedro,
        },
    )
    assert first.status_code == 201, first.text

    [reminder] = ana.get("/api/v1/reminders").json()
    assert (reminder["kind"], reminder["date"], reminder["dependent_id"]) == (
        "vaccine",
        next_dose,
        pedro,
    )

    ana.post(
        "/api/v1/vaccines",
        json={
            "name": "Hepatite B",
            "dose": "2ª dose",
            "applied_on": _today(),
            "dependent_id": pedro,
        },
    )
    assert ana.get("/api/v1/reminders").json() == []
    assert ana.get("/api/v1/vaccines", params={"dependent_id": pedro}).json()["total"] == 2


def test_vaccine_survives_deleting_its_document(ana: TestClient) -> None:
    document = _upload(ana, type="vaccine", title="Carteira de vacinação")
    vaccine = ana.post(
        "/api/v1/vaccines",
        json={"name": "BCG", "applied_on": "2026-01-10", "document_id": document["id"]},
    ).json()

    ana.delete(f"/api/v1/documents/{document['id']}")

    assert ana.get(f"/api/v1/vaccines/{vaccine['id']}").json()["document_id"] is None


def test_other_user_cannot_see_or_change_records(app_client: TestClient) -> None:
    ana = register(app_client, "ana@exemplo.com")
    pedro = _dependent(ana)
    document = _upload(ana)
    medication = ana.post("/api/v1/medications", json={"name": "Losartana"}).json()
    vaccine = ana.post("/api/v1/vaccines", json={"name": "BCG", "applied_on": "2026-01-10"}).json()

    bruno = register(app_client, "bruno@exemplo.com")  # a sessão agora é do Bruno

    assert bruno.get(f"/api/v1/documents/{document['id']}").status_code == 404
    assert bruno.get(f"/api/v1/documents/{document['id']}/file").status_code == 404
    assert (
        bruno.patch(f"/api/v1/medications/{medication['id']}", json={"dose": "1"}).status_code
        == 404
    )
    assert (
        bruno.post(
            f"/api/v1/medications/{medication['id']}/doses",
            json={"date": _today(), "time": "08:00"},
        ).status_code
        == 404
    )
    assert bruno.get(f"/api/v1/vaccines/{vaccine['id']}").status_code == 404
    assert bruno.get("/api/v1/documents").json()["total"] == 0
    assert (
        bruno.post(
            "/api/v1/medications", json={"name": "Losartana", "dependent_id": pedro}
        ).status_code
        == 404
    )
