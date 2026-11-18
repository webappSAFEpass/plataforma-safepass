import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, sampleExtraction } from "@/mocks/medical-records";
import { server } from "@/mocks/node";

import { renderWithQuery } from "../../../../tests/render";
import { AddDocument } from "../components/AddDocument";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const photo = () => new File(["img"], "receita.jpg", { type: "image/jpeg" });

beforeEach(() => {
  push.mockReset();
  URL.createObjectURL = vi.fn(() => "blob:receita");
  URL.revokeObjectURL = vi.fn();
});

describe("AddDocument", () => {
  it("lê a foto da receita, revisa e salva com a 1ª dose escolhida", async () => {
    const { user } = renderWithQuery(<AddDocument />);

    await user.upload(screen.getByLabelText("Foto da receita"), photo());

    expect(await screen.findByDisplayValue("Amoxicilina")).toBeInTheDocument();
    expect(screen.getByText("Receita lida. Confira os dados antes de salvar.")).toBeInTheDocument();
    expect(screen.getByLabelText("Por quantos dias?")).toHaveValue(7);
    expect(screen.getByText("Na receita: 7 dias")).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Hora da 1ª dose"));
    await user.type(screen.getByLabelText("Hora da 1ª dose"), "15:00");
    await user.click(screen.getByRole("button", { name: "Confirmar e salvar" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/historico-medico/medicamentos"));
    expect(db.medications[0]).toMatchObject({
      name: "Amoxicilina",
      duration_days: 7,
      first_dose: "15:00",
      schedule: ["15:00", "23:00", "07:00"],
    });
    expect(db.documents[0]).toMatchObject({ type: "prescription", ocr_reading_id: "ocr-1" });
  });

  it("no fallback do OCR mostra o texto lido e pede o preenchimento", async () => {
    server.use(
      http.post("*/api/v1/prescriptions/extract", () =>
        HttpResponse.json({
          ...sampleExtraction,
          source: "tesseract",
          medications: [],
          notes: "AMOXICILINA 500MG",
        }),
      ),
    );
    const { user } = renderWithQuery(<AddDocument />);

    await user.upload(screen.getByLabelText("Foto da receita"), photo());

    expect(
      await screen.findByText(/A leitura automática não ficou disponível/),
    ).toBeInTheDocument();
    expect(screen.getByText("AMOXICILINA 500MG")).toBeInTheDocument();
    expect(screen.getByLabelText("Medicamento")).toHaveValue("");
  });

  it("foto ilegível leva ao erro e ao preenchimento manual com uso contínuo", async () => {
    server.use(
      http.post("*/api/v1/prescriptions/extract", () =>
        HttpResponse.json({ ...sampleExtraction, medications: [] }),
      ),
    );
    const { user } = renderWithQuery(<AddDocument />);

    await user.upload(screen.getByLabelText("Foto da receita"), photo());
    expect(await screen.findByText(/A foto não ficou legível/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preencher manualmente" }));
    await user.type(screen.getByLabelText("Medicamento"), "Losartana");
    await user.type(screen.getByLabelText("Posologia"), "1x ao dia");
    await user.click(screen.getByLabelText(/Uso contínuo/));
    await user.click(screen.getByRole("button", { name: "Confirmar e salvar" }));

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(db.medications[0]).toMatchObject({ name: "Losartana", duration_days: null });
  });

  it("mostra o erro da API e permite tentar de novo", async () => {
    server.use(
      http.post("*/api/v1/prescriptions/extract", () =>
        HttpResponse.json(
          { error: { code: "file_too_large", message: "A foto passa de 10 MB." } },
          { status: 413 },
        ),
      ),
    );
    const { user } = renderWithQuery(<AddDocument />);

    await user.upload(screen.getByLabelText("Foto da receita"), photo());
    expect(await screen.findByText("A foto passa de 10 MB.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(screen.getByRole("button", { name: /Digitar receita/ })).toBeInTheDocument();
  });

  it("digita uma receita com dois medicamentos e remove um", async () => {
    const { user } = renderWithQuery(<AddDocument />);

    await user.click(screen.getByRole("button", { name: /Digitar receita/ }));
    await user.click(screen.getByRole("button", { name: /Adicionar medicamento/ }));
    expect(screen.getAllByLabelText("Medicamento")).toHaveLength(2);

    await user.click(screen.getAllByRole("button", { name: "Remover" })[1]!);
    expect(screen.getAllByLabelText("Medicamento")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Confirmar e salvar" }));
    expect(await screen.findByText("Informe o medicamento.")).toBeInTheDocument();
  });

  it("envia exame com arquivo, classificação e título", async () => {
    // O FormData do jsdom não é legível pelo MSW no Node: confere os campos enviados pelo append.
    const append = vi.spyOn(FormData.prototype, "append");
    let contentType: string | null = null;
    server.use(
      http.post("*/api/v1/documents", ({ request }) => {
        contentType = request.headers.get("Content-Type");
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const { user } = renderWithQuery(<AddDocument />);

    await user.click(screen.getByRole("button", { name: /Exame, consulta, vacina ou atestado/ }));
    await user.upload(
      screen.getByLabelText(/Arquivo/),
      new File(["%PDF"], "hemograma.pdf", { type: "application/pdf" }),
    );
    await user.type(screen.getByLabelText("Título"), "Hemograma");
    await user.click(screen.getByRole("button", { name: "Salvar documento" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/historico-medico/documentos"));
    expect(contentType).not.toMatch(/application\/json/);
    const fields = Object.fromEntries(append.mock.calls.map(([key, value]) => [key, value]));
    expect(fields).toMatchObject({ type: "exam", title: "Hemograma" });
    expect(fields.file).toBeInstanceOf(File);
    expect(fields).not.toHaveProperty("dependent_id");
  });
});
