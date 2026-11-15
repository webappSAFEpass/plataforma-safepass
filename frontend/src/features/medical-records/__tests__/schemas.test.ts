import { describe, expect, it } from "vitest";

import { documentUploadSchema, prescriptionSchema } from "../schemas";
import { documentTypeLabel, downloadName } from "../utils";

const base = { type: "exam", title: "Hemograma", document_date: "", dependent_id: "" };

describe("documentUploadSchema", () => {
  it("aceita PDF de até 10 MB", () => {
    const file = new File(["%PDF"], "exame.pdf", { type: "application/pdf" });
    expect(documentUploadSchema.safeParse({ ...base, file }).success).toBe(true);
  });

  it("recusa outro formato e arquivo grande demais", () => {
    const text = new File(["x"], "nota.txt", { type: "text/plain" });
    expect(documentUploadSchema.safeParse({ ...base, file: text }).error?.issues[0]?.message).toBe(
      "Envie JPG, PNG ou PDF.",
    );
    const big = new File(["x"], "grande.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });
    expect(documentUploadSchema.safeParse({ ...base, file: big }).error?.issues[0]?.message).toBe(
      "O arquivo passa de 10 MB.",
    );
  });
});

describe("prescriptionSchema", () => {
  const item = {
    name: "Amoxicilina",
    dose: "",
    posology: "8/8h",
    period: "",
    duration_days: "",
    continuous: false,
    start_date: "2026-11-15",
    first_dose: "15:00",
    needs_review: false,
  };

  it("pede a duração ou uso contínuo em cada medicamento", () => {
    const value = { doctor: "", prescription_date: "", dependent_id: "", medications: [item] };
    expect(prescriptionSchema.safeParse(value).success).toBe(false);
    value.medications = [{ ...item, continuous: true }];
    expect(prescriptionSchema.safeParse(value).success).toBe(true);
  });
});

it("rotula tipos e monta o nome do download", () => {
  expect(documentTypeLabel("consultation")).toBe("Consulta");
  expect(downloadName({ title: "Raio X", mime_type: "image/png" })).toBe("Raio X.png");
  expect(downloadName({ title: "Sem arquivo", mime_type: null })).toBe("Sem arquivo");
});
