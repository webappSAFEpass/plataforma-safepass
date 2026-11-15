// Handlers MSW do histórico médico (Squad 44) para os testes (Vitest). Seguem os tipos gerados do
// OpenAPI dos módulos documents/medications e guardam estado em memória entre as chamadas de um teste.
import { http, HttpResponse } from "msw";

import type { MedicalDocument, Prescription } from "@/features/medical-records/types";
import type { Dependent, Medication, Reminder, Vaccine } from "@/features/medications/types";

const API = "*/api/v1";
const DAY_MS = 86_400_000;

type Db = {
  documents: MedicalDocument[];
  medications: Medication[];
  vaccines: Vaccine[];
  doses: Set<string>; // `${medication_id} ${date} ${time}`
  dependents: Dependent[];
};

const today = () => new Date().toLocaleDateString("sv-SE");
const stamp = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

export const db: Db = {
  documents: [],
  medications: [],
  vaccines: [],
  doses: new Set(),
  dependents: [],
};

export function resetDb(): void {
  db.documents = [];
  db.medications = [];
  db.vaccines = [];
  db.doses = new Set();
  db.dependents = [];
}

const notFound = () =>
  HttpResponse.json({ error: { code: "not_found", message: "Não encontrado." } }, { status: 404 });

function page<T>(items: T[], url: URL) {
  const size = Number(url.searchParams.get("size") ?? 20);
  const number = Number(url.searchParams.get("page") ?? 1);
  return HttpResponse.json({
    items: items.slice((number - 1) * size, number * size),
    total: items.length,
    page: number,
    size,
  });
}

/** Horários do dia a partir da 1ª dose: "8/8h", "a cada 6 horas", "2x ao dia". */
export function schedule(posology: string | null, firstDose: string): string[] {
  const text = posology ?? "";
  const every = text.match(/(\d+)\s*\/\s*\d+\s*h|a cada\s*(\d+)\s*h/i);
  const times = text.match(/(\d+)\s*x\s*(ao|por)\s*dia/i);
  const hours = every ? Number(every[1] ?? every[2]) : times ? 24 / Number(times[1]) : 0;
  if (!hours || /necess|sos/i.test(text)) return [];
  const start = Number(firstDose.slice(0, 2)) * 60 + Number(firstDose.slice(3, 5));
  return Array.from({ length: Math.floor(24 / hours) }, (_, i) => {
    const m = (start + i * hours * 60) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  });
}

const addDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

function withDerived(m: Medication): Medication {
  const t = today();
  const active =
    m.start_date <= t &&
    (!m.ended_on || m.ended_on > t) &&
    (m.duration_days === null || t < addDays(m.start_date, m.duration_days));
  return { ...m, active, schedule: schedule(m.posology, m.first_dose) };
}

type MedicationBody = Partial<Medication> & { name: string };

export function addMedication(
  body: MedicationBody,
  prescriptionId: string | null = null,
): Medication {
  const med = withDerived({
    id: uuid(),
    source: prescriptionId ? "prescription" : "manual",
    prescription_id: prescriptionId,
    dependent_id: body.dependent_id ?? null,
    name: body.name,
    dose: body.dose ?? "",
    posology: body.posology ?? "",
    start_date: body.start_date ?? today(),
    duration_days: body.duration_days ?? null,
    first_dose: body.first_dose ?? "08:00",
    ended_on: null,
    schedule: [],
    active: true,
    created_at: stamp(),
    updated_at: stamp(),
  });
  db.medications.unshift(med);
  return med;
}

export function addDocument(body: Partial<MedicalDocument> & { title: string }): MedicalDocument {
  const doc: MedicalDocument = {
    id: uuid(),
    dependent_id: null,
    type: "exam",
    document_date: null,
    mime_type: "application/pdf",
    size: 1024,
    has_file: true,
    ocr_reading_id: null,
    shared_with_assistant: false,
    created_at: stamp(),
    updated_at: stamp(),
    ...body,
  };
  db.documents.unshift(doc);
  return doc;
}

export function addVaccine(body: Partial<Vaccine> & { name: string; applied_on: string }): Vaccine {
  const vaccine: Vaccine = {
    id: uuid(),
    dependent_id: null,
    dose: "",
    next_dose_on: null,
    document_id: null,
    shared_with_assistant: false,
    created_at: stamp(),
    updated_at: stamp(),
    ...body,
  };
  db.vaccines.unshift(vaccine);
  return vaccine;
}

function reminders(): Reminder[] {
  const t = today();
  const doses = db.medications
    .map(withDerived)
    .filter((m) => m.active)
    .flatMap((m) =>
      m.schedule.map((time) => ({
        kind: "medication" as const,
        medication_id: m.id,
        vaccine_id: null,
        name: m.name,
        dose: m.dose,
        dependent_id: m.dependent_id,
        date: t,
        time,
        taken: db.doses.has(`${m.id} ${t} ${time}`),
        last_day: m.duration_days !== null && addDays(m.start_date, m.duration_days - 1) === t,
      })),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  const vaccines = db.vaccines
    .filter((v) => v.next_dose_on)
    .sort((a, b) => a.next_dose_on!.localeCompare(b.next_dose_on!))
    .map((v) => ({
      kind: "vaccine" as const,
      medication_id: null,
      vaccine_id: v.id,
      name: v.name,
      dose: v.dose,
      dependent_id: v.dependent_id,
      date: v.next_dose_on!,
      time: null,
      taken: false,
      last_day: false,
    }));
  return [...doses, ...vaccines];
}

/** Leitura fixa do OCR: troque com server.use(...) para simular outros casos. */
export const sampleExtraction = {
  ocr_reading_id: "ocr-1",
  source: "gemini",
  needs_review: false,
  notes: null,
  doctor: "Dra. Marina Duarte",
  prescription_date: "2026-11-10",
  medications: [
    {
      name: "Amoxicilina",
      dose: "500 mg",
      posology: "8/8h",
      period: "7 dias",
      duration_days: 7,
      needs_review: false,
    },
  ],
};

export const medicalRecordsHandlers = [
  http.get(`${API}/documents`, ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    const q = url.searchParams.get("q")?.toLowerCase();
    const owner = url.searchParams.get("dependent_id");
    const items = db.documents.filter(
      (d) =>
        (!type || d.type === type) &&
        (!q || d.title.toLowerCase().includes(q)) &&
        (!owner || d.dependent_id === owner),
    );
    return page(items, url);
  }),
  http.post(`${API}/documents`, async ({ request }) => {
    const form = await request.formData();
    const file = form.get("file") as File;
    const doc = addDocument({
      type: form.get("type") as MedicalDocument["type"],
      title: String(form.get("title")),
      document_date: (form.get("document_date") as string | null) ?? null,
      dependent_id: (form.get("dependent_id") as string | null) ?? null,
      mime_type: file.type,
      size: file.size,
    });
    return HttpResponse.json(doc, { status: 201 });
  }),
  http.patch(`${API}/documents/:id`, async ({ params, request }) => {
    const doc = db.documents.find((d) => d.id === params.id);
    if (!doc) return notFound();
    Object.assign(doc, await request.json(), { updated_at: stamp() });
    return HttpResponse.json(doc);
  }),
  http.delete(`${API}/documents/:id`, ({ params }) => {
    db.documents = db.documents.filter((d) => d.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API}/documents/:id/file`, ({ params }) => {
    const doc = db.documents.find((d) => d.id === params.id);
    if (!doc?.has_file) return notFound();
    return new HttpResponse("arquivo", { headers: { "Content-Type": doc.mime_type ?? "" } });
  }),

  http.post(`${API}/prescriptions/extract`, () => HttpResponse.json(sampleExtraction)),
  http.post(`${API}/prescriptions`, async ({ request }) => {
    const body = (await request.json()) as Omit<Prescription, "id" | "medications"> & {
      medications: MedicationBody[];
    };
    const id = uuid();
    const doc = addDocument({
      type: "prescription",
      title: body.doctor ? `Receita de ${body.doctor}` : "Receita",
      document_date: body.prescription_date,
      dependent_id: body.dependent_id,
      ocr_reading_id: body.ocr_reading_id,
      has_file: Boolean(body.ocr_reading_id),
      mime_type: body.ocr_reading_id ? "image/jpeg" : null,
    });
    const medications = body.medications.map((m) =>
      addMedication({ ...m, dependent_id: body.dependent_id }, id),
    );
    return HttpResponse.json(
      { ...body, id, document_id: doc.id, medications, created_at: stamp(), updated_at: stamp() },
      { status: 201 },
    );
  }),

  http.get(`${API}/medications`, ({ request }) => {
    const url = new URL(request.url);
    const active = url.searchParams.get("active");
    const items = db.medications
      .map(withDerived)
      .filter((m) => active === null || String(m.active) === active);
    return page(items, url);
  }),
  http.post(`${API}/medications`, async ({ request }) =>
    HttpResponse.json(addMedication((await request.json()) as MedicationBody), { status: 201 }),
  ),
  http.patch(`${API}/medications/:id`, async ({ params, request }) => {
    const index = db.medications.findIndex((m) => m.id === params.id);
    if (index < 0) return notFound();
    const updated = withDerived({
      ...db.medications[index]!,
      ...((await request.json()) as Partial<Medication>),
      updated_at: stamp(),
    });
    db.medications[index] = updated;
    return HttpResponse.json(updated);
  }),
  http.post(`${API}/medications/:id/doses`, async ({ params, request }) => {
    const { date, time } = (await request.json()) as { date: string; time: string };
    db.doses.add(`${params.id} ${date} ${time}`);
    return HttpResponse.json(
      { medication_id: params.id, date, time, taken_at: stamp() },
      { status: 201 },
    );
  }),
  http.delete(`${API}/medications/:id/doses`, ({ params, request }) => {
    const url = new URL(request.url);
    db.doses.delete(`${params.id} ${url.searchParams.get("date")} ${url.searchParams.get("time")}`);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/vaccines`, ({ request }) => page(db.vaccines, new URL(request.url))),
  http.post(`${API}/vaccines`, async ({ request }) =>
    HttpResponse.json(addVaccine((await request.json()) as Vaccine), { status: 201 }),
  ),
  http.patch(`${API}/vaccines/:id`, async ({ params, request }) => {
    const vaccine = db.vaccines.find((v) => v.id === params.id);
    if (!vaccine) return notFound();
    Object.assign(vaccine, await request.json(), { updated_at: stamp() });
    return HttpResponse.json(vaccine);
  }),
  http.delete(`${API}/vaccines/:id`, ({ params }) => {
    db.vaccines = db.vaccines.filter((v) => v.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API}/reminders`, () => HttpResponse.json(reminders())),
];

/** Dependente completo no formato de DependentOut, para os testes. */
export function makeDependent(over: Partial<Dependent> & { id: string; name: string }): Dependent {
  return {
    created_at: stamp(),
    updated_at: stamp(),
    account_id: "conta-1",
    type: "person",
    birth_date: null,
    bond: null,
    species: null,
    can_redeem_coupons: false,
    linked_user_id: null,
    active: true,
    ...over,
  };
}

/** /dependentes já existe no backend (PR #6): este handler é só para os testes. */
export const dependentsHandlers = [
  http.get(`${API}/dependentes`, ({ request }) => page(db.dependents, new URL(request.url))),
];
