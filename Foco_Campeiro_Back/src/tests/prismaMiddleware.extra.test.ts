// cobre ramos extras do middleware do Prisma
jest.mock("../database", () => require("./mocks/prisma"));
import { prisma } from "../database";

import { auditPrismaMiddleware } from "../database/prismaMiddleware";

describe("prismaMiddleware extra", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // logs.create deve devolver uma Promise para não quebrar quando o código usa .catch()
    (prisma as any).logs = {
      create: jest.fn().mockResolvedValue({ ok: true }),
    };
  });

  it("loga operações de escrita e NÃO quebra se o log falhar (pega o .catch())", async () => {
    // força o caminho do catch do middleware
    (prisma as any).logs.create.mockRejectedValueOnce(new Error("falha ao logar"));

    const next = jest.fn().mockResolvedValue("OK");
    const params: any = {
      model: "Events",
      action: "create",
      args: { data: { name: "Expo" } },
    };

    const out = await auditPrismaMiddleware(params, next);

    expect(out).toBe("OK");
    expect(next).toHaveBeenCalledWith(params);
    expect((prisma as any).logs.create).toHaveBeenCalled();
  });

  it("NÃO loga operações de leitura (findUnique/findMany/etc.)", async () => {
    const next = jest.fn().mockResolvedValue("OK");
    const params: any = {
      model: "Events",
      action: "findUnique",
      args: { where: { id: 1 } },
    };

    await auditPrismaMiddleware(params, next);

    expect(next).toHaveBeenCalledWith(params);
    expect((prisma as any).logs.create).not.toHaveBeenCalled();
  });
});
