import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { BenefitsOverview } from "../components/BenefitsOverview";
import { CompanyDashboard } from "../components/CompanyDashboard";

describe("telas da área da empresa", () => {
  it("painel mostra adesão, engajamento e atalhos", () => {
    render(<CompanyDashboard />);

    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Engajamento mensal/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Organizar atestados/ })).toHaveAttribute(
      "href",
      "/empresa/atestados",
    );
  });

  it("programa de benefícios mostra o plano e os pilares", async () => {
    const { user } = renderWithUser(<BenefitsOverview />);

    expect(screen.getByRole("heading", { name: "SAFEpass Essencial" })).toBeInTheDocument();
    expect(screen.getByText("+2.400")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Engajamento: 64%" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Entender benefício/ })[0]!);
    expect(
      await screen.findByText("Consultas, exames e especialidades com condições exclusivas.", {
        selector: "[data-sonner-toast] *",
      }),
    ).toBeInTheDocument();
  });
});
