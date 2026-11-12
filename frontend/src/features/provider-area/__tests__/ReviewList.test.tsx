import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { ReviewList } from "../components/ReviewList";

describe("ReviewList", () => {
  it("publica a resposta à avaliação", async () => {
    const { user } = renderWithUser(<ReviewList />);

    await user.type(
      screen.getByRole("textbox", { name: "Responder a Camila Freire" }),
      "Obrigada, Camila!",
    );
    await user.click(screen.getAllByRole("button", { name: /Responder/ })[0]!);

    expect(await screen.findByText("Obrigada, Camila!")).toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Responder a Camila Freire" }),
    ).not.toBeInTheDocument();
  });

  it("não publica resposta vazia", async () => {
    const { user } = renderWithUser(<ReviewList />);

    await user.click(screen.getAllByRole("button", { name: /Responder/ })[0]!);

    expect(await screen.findByText("Escreva uma resposta antes de enviar.")).toBeInTheDocument();
  });
});
