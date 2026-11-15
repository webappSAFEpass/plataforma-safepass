import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { NotificationPermission } from "../components/NotificationPermission";

afterEach(() => vi.unstubAllGlobals());

it("avisa quando o navegador não tem notificações", () => {
  renderWithUser(<NotificationPermission />);
  expect(screen.getByText(/Este navegador não mostra notificações/)).toBeInTheDocument();
});

it("pede a permissão só no clique", async () => {
  const requestPermission = vi.fn().mockResolvedValue("granted");
  vi.stubGlobal(
    "Notification",
    Object.assign(vi.fn(), { permission: "default", requestPermission }),
  );
  const { user } = renderWithUser(<NotificationPermission />);

  expect(requestPermission).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Ativar notificações" }));

  expect(await screen.findByText(/Notificações ativas/)).toBeInTheDocument();
});
