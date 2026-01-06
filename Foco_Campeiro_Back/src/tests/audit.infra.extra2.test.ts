// src/tests/audit.infra.extra2.test.ts
// Cobre o caminho do audit("info", msg) SEM meta (pega o fallback de ip/user)

jest.mock("../database", () => require("./mocks/prisma"));
import { prisma } from "../database";
import { audit } from "../infra/audit";

describe("infra/audit – sem meta", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any).logs = { create: jest.fn().mockResolvedValue({ ok: true }) };
  });

  it("usa defaults quando meta não é enviado", () => {
    // chamada SEM meta
    audit("info", "no meta here");

    expect((prisma as any).logs.create).toHaveBeenCalled();
    const saved = (prisma as any).logs.create.mock.calls.pop()[0];

    // payload básico
    expect(saved).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          logLevel: "info",
          message: expect.any(String),
        }),
      })
    );

    // a mensagem vem como JSON string; conferimos campos após parse
    const parsed = JSON.parse(saved.data.message as string);

    expect(parsed).toEqual(
      expect.objectContaining({
        message: "no meta here",
        // extra deve existir, mesmo sem meta
        extra: expect.any(Object),
      })
    );
  });
});
