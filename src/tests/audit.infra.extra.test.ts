// src/tests/audit.infra.extra.test.ts
// Cobre ramos extras do infra/audit.ts (sucesso + catch)

jest.mock("../database", () => require("./mocks/prisma"));
import { prisma } from "../database";
import { audit } from "../infra/audit";

describe("infra/audit – caminhos extra", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registra log (info) com meta sem erro", () => {
    (prisma as any).logs = { create: jest.fn().mockResolvedValue({ ok: true }) };

    // nível primeiro, depois mensagem e meta
    audit("info", "hello world", { path: "/x", method: "GET" });

    expect((prisma as any).logs.create).toHaveBeenCalled();

    // pega o payload enviado ao prisma.logs.create
    const saved = (prisma as any).logs.create.mock.calls.pop()[0];

    // checagens leves (evita fragilidade se o schema mudar)
    expect(saved).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          logLevel: "info",
          message: expect.any(String),
        }),
      })
    );

    // a mensagem é um JSON string com { message, extra }
    const msg = saved.data.message as string;
    const parsed = JSON.parse(msg);

    expect(parsed).toEqual(
      expect.objectContaining({
        message: "hello world",
        extra: expect.objectContaining({ path: "/x", method: "GET" }),
      })
    );
  });

  it("não quebra quando prisma.logs.create rejeita (pega o catch)", () => {
    (prisma as any).logs = { create: jest.fn().mockRejectedValue(new Error("DB down")) };

    // usa string como mensagem (tipo aceito pela função)
    expect(() => audit("error", "boom", { userId: "u1" })).not.toThrow();
    expect((prisma as any).logs.create).toHaveBeenCalled();
  });
});
