import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { ProfileHeader } from "../components/ProfileHeader";
import { ProviderDashboard } from "../components/ProviderDashboard";
import { ReviewsSummary } from "../components/ReviewsSummary";
import { ServiceRequestCallout } from "../components/ServiceRequestCallout";
import { TeamInviteCard } from "../components/TeamInviteCard";

describe("telas da área do prestador", () => {
  it("painel mostra indicadores, agenda e atividade", async () => {
    const { user } = renderWithUser(<ProviderDashboard />);

    expect(screen.getByRole("img", { name: "Perfil completo: 82%" })).toBeInTheDocument();
    expect(screen.getByText("1.284")).toBeInTheDocument();
    expect(screen.getByText("Consulta de psicologia")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText("BEMESTAR15 foi validado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Completar meu perfil/ })).toHaveAttribute(
      "href",
      "/prestador/perfil",
    );

    await user.click(screen.getByRole("button", { name: "Ver agenda" }));
    expect(await screen.findByText("Agenda completa em breve")).toBeInTheDocument();
  });

  it("resumo das avaliações mostra média e distribuição", () => {
    render(<ReviewsSummary />);

    expect(screen.getByText("4,9")).toBeInTheDocument();
    expect(screen.getByText(/92% das avaliações/)).toBeInTheDocument();
  });

  it("cabeçalho do perfil identifica a profissional", () => {
    render(<ProfileHeader />);

    expect(screen.getByRole("heading", { name: "Dra. Marina Duarte" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto de Dra. Marina Duarte" })).toBeInTheDocument();
  });

  it("cartão de convite explica os passos", async () => {
    const { user } = renderWithUser(
      <>
        <TeamInviteCard />
        <ServiceRequestCallout />
      </>,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: /Enviar convite/ }));
    expect(await screen.findByText("Convite preparado")).toBeInTheDocument();
  });
});
