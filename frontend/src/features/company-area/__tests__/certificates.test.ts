import { describe, expect, it } from "vitest";

import { addCertificate, CertificateTooLargeError } from "../certificates";
import { certificates } from "../data";

const NOW = new Date("2026-11-04T12:00:00Z");

describe("addCertificate", () => {
  it("coloca o arquivo novo no topo, em análise", () => {
    const file = new File(["pdf"], "Atestado_Rita.pdf", { type: "application/pdf" });
    const [first] = addCertificate(certificates, file, NOW);
    expect(first).toMatchObject({
      fileName: "Atestado_Rita.pdf",
      receivedAt: "2026-11-04",
      status: "review",
    });
  });

  it("recusa arquivo acima de 10 MB", () => {
    const file = new File(["x"], "grande.pdf");
    Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });
    expect(() => addCertificate(certificates, file, NOW)).toThrow(CertificateTooLargeError);
  });
});
