import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithUser } from "../../../../tests/render";
import { CertificatesManager } from "../components/CertificatesManager";

describe("CertificatesManager", () => {
  it("lista o atestado enviado", async () => {
    const { user } = renderWithUser(<CertificatesManager />);
    const file = new File(["pdf"], "Atestado_Rita.pdf", { type: "application/pdf" });

    await user.upload(screen.getByLabelText(/Clique para enviar o arquivo/), file);

    expect(
      await screen.findByText("Arquivo enviado e aguardando organização."),
    ).toBeInTheDocument();
    expect(screen.getByText("Atestado_Rita.pdf")).toBeInTheDocument();
  });

  it("recusa arquivo grande demais", async () => {
    const { user } = renderWithUser(<CertificatesManager />);
    const file = new File(["x"], "grande.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });

    await user.upload(screen.getByLabelText(/Clique para enviar o arquivo/), file);

    expect(await screen.findByText("O arquivo passa de 10 MB.")).toBeInTheDocument();
    expect(screen.queryByText("grande.pdf")).not.toBeInTheDocument();
  });
});
