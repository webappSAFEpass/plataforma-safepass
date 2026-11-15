import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addDocument, db } from "@/mocks/medical-records";

import { renderWithQuery } from "../../../../tests/render";
import { DocumentList } from "../components/DocumentList";

beforeEach(() => {
  db.dependents = [{ id: "d1", type: "person", name: "Pedro", bond: "Filho", active: true }];
  addDocument({ title: "Hemograma completo", type: "exam", document_date: "2026-10-20" });
  addDocument({ title: "Receita da Dra. Marina", type: "prescription", dependent_id: "d1" });
});
afterEach(() => vi.restoreAllMocks());

describe("DocumentList", () => {
  it("lista os documentos com dono e data", async () => {
    renderWithQuery(<DocumentList />);
    expect(await screen.findByText("2 documentos")).toBeInTheDocument();
    expect(screen.getByText(/Pedro · Sem data/)).toBeInTheDocument();
    expect(screen.getByText(/Eu · 20 de out. de 2026/)).toBeInTheDocument();
  });

  it("filtra por tipo, por dono e pela busca", async () => {
    const { user } = renderWithQuery(<DocumentList />);
    await screen.findByText("2 documentos");

    await user.click(screen.getByRole("button", { name: "Exames" }));
    expect(await screen.findByText("1 documento")).toBeInTheDocument();
    expect(screen.getByText("Hemograma completo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todos" }));
    await user.selectOptions(screen.getByLabelText("Filtrar por dono"), "d1");
    expect(await screen.findByText("Receita da Dra. Marina")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Hemograma completo")).not.toBeInTheDocument());

    await user.selectOptions(screen.getByLabelText("Filtrar por dono"), "");
    await user.type(screen.getByLabelText("Buscar pelo título"), "xyz");
    expect(await screen.findByText(/Nenhum documento encontrado/)).toBeInTheDocument();
  });

  it("liga o compartilhamento com o assistente", async () => {
    const { user } = renderWithQuery(<DocumentList />);
    const toggle = await screen.findByRole("switch", {
      name: "Compartilhar Hemograma completo com o assistente",
    });

    await user.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    expect(db.documents.find((d) => d.title === "Hemograma completo")?.shared_with_assistant).toBe(
      true,
    );
  });

  it("edita o título e o dono", async () => {
    const { user } = renderWithQuery(<DocumentList />);
    await user.click(await screen.findByRole("button", { name: "Editar Hemograma completo" }));

    const dialog = await screen.findByRole("dialog");
    const title = within(dialog).getByLabelText("Título");
    await user.clear(title);
    await user.type(title, "Hemograma de outubro");
    await user.selectOptions(within(dialog).getByLabelText("De quem é"), "d1");
    await user.click(within(dialog).getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Hemograma de outubro")).toBeInTheDocument();
    expect(db.documents.find((d) => d.title === "Hemograma de outubro")?.dependent_id).toBe("d1");
  });

  it("exclui só depois de confirmar", async () => {
    const confirm = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const { user } = renderWithQuery(<DocumentList />);
    const remove = await screen.findByRole("button", { name: "Excluir Hemograma completo" });

    await user.click(remove);
    expect(db.documents).toHaveLength(2);

    await user.click(remove);
    expect(await screen.findByText("1 documento")).toBeInTheDocument();
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("baixa o arquivo pela sessão", async () => {
    const createObjectURL = vi.fn(() => "blob:arquivo");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { user } = renderWithQuery(<DocumentList />);

    await user.click(await screen.findByRole("button", { name: "Baixar Hemograma completo" }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(createObjectURL).toHaveBeenCalled();
  });
});
