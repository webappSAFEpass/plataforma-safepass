import { describe, expect, it } from "vitest";

import { registerSchema, resetPasswordSchema } from "@/features/auth/schemas";
import { homePathFor } from "@/features/auth/utils";

const valid = { full_name: "Ana Lima", email: "ana@exemplo.com", password: "Senha123", account_type: "user" } as const;

describe("registerSchema", () => {
  it("aceita dados válidos", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("recusa senha curta", () => {
    const result = registerSchema.safeParse({ ...valid, password: "a1" });
    expect(result.success).toBe(false);
  });

  it("recusa senha sem número", () => {
    const result = registerSchema.safeParse({ ...valid, password: "somenteletras" });
    expect(result.success).toBe(false);
  });

  it("recusa e-mail inválido", () => {
    expect(registerSchema.safeParse({ ...valid, email: "ana@" }).success).toBe(false);
  });

  it("não permite criar conta admin", () => {
    expect(registerSchema.safeParse({ ...valid, account_type: "admin" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("exige confirmação igual à senha", () => {
    const result = resetPasswordSchema.safeParse({ password: "Senha123", confirm: "Outra123" });
    expect(result.success).toBe(false);
  });
});

describe("homePathFor", () => {
  it("leva admin ao painel administrativo e demais ao painel do usuário", () => {
    expect(homePathFor("admin")).toBe("/admin");
    expect(homePathFor("user")).toBe("/painel");
    expect(homePathFor("provider")).toBe("/painel");
  });
});
