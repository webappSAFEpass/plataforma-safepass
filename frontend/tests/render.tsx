import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { Toaster } from "sonner";

/** Renderiza com o Toaster montado (para enxergar os toasts) e devolve um userEvent pronto. */
export function renderWithUser(ui: ReactElement, options?: RenderOptions) {
  return {
    user: userEvent.setup(),
    ...render(
      <>
        {ui}
        <Toaster />
      </>,
      options,
    ),
  };
}
