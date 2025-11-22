/**
 * Testa se o auditPrismaMiddleware registra DB_WRITE em operações de escrita.
 */
import type { Prisma } from "@prisma/client";

// usa seus mocks
jest.mock("../database", () => require("./mocks/prisma"));
jest.mock("../infra/audit", () => require("./mocks/audit"));

import { auditInfo } from "../infra/audit";
import { auditPrismaMiddleware } from "../database/prismaMiddleware";

describe("auditPrismaMiddleware", () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loga DB_WRITE em create para modelos auditados", async () => {
    const params: Prisma.MiddlewareParams = {
      model: "Events",
      action: "create",
      args: { data: { name: "Show", userId: "uuid-1", location: "Arena" } },
    } as any;

    next.mockResolvedValueOnce({ id: 123, name: "Show" });

    const result = await auditPrismaMiddleware(params, next);

    expect(result).toEqual({ id: 123, name: "Show" });
    expect(auditInfo).toHaveBeenCalledTimes(1);
    const [evt, payload] = (auditInfo as jest.Mock).mock.calls[0];
    expect(evt).toBe("DB_WRITE");
    expect(payload.model).toBe("Events");
    expect(payload.action).toBe("create");
    expect(payload.resultId).toBe(123);
  });

  it("NÃO loga para Logs (evita recursão)", async () => {
    const params: Prisma.MiddlewareParams = {
      model: "Logs",
      action: "create",
      args: { data: { message: "x" } },
    } as any;

    next.mockResolvedValueOnce({ id: 1 });

    await auditPrismaMiddleware(params, next);

    expect(auditInfo).not.toHaveBeenCalled();
  });

  it("NÃO loga para leitura (findMany)", async () => {
    const params: Prisma.MiddlewareParams = {
      model: "Events",
      action: "findMany",
      args: {},
    } as any;

    next.mockResolvedValueOnce([{ id: 1 }]);

    const out = await auditPrismaMiddleware(params, next);
    expect(out).toEqual([{ id: 1 }]);
    expect(auditInfo).not.toHaveBeenCalled();
  });

  it("inclui resumo de where/data e id do resultado em update", async () => {
    const params: Prisma.MiddlewareParams = {
      model: "Photos",
      action: "update",
      args: { where: { id: 10 }, data: { price: 99.9 } },
    } as any;

    next.mockResolvedValueOnce({ id: 10, price: "99.90" });

    await auditPrismaMiddleware(params, next);

    const [, payload] = (auditInfo as jest.Mock).mock.calls[0];
    expect(payload.where).toMatchObject({ id: 10 });
    expect(payload.data).toHaveProperty("price");
    expect(payload.resultId).toBe(10);
  });
});
describe("prismaMiddleware extra", () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ignora modelo Sessions (IGNORE_MODELS)", async () => {
    const params = { model: "Sessions", action: "create", args: { data: {} } } as unknown as Prisma.MiddlewareParams;
    next.mockResolvedValueOnce({ id: "s1" });
    await auditPrismaMiddleware(params, next);
    expect(auditInfo).not.toHaveBeenCalled();
  });

  it("não audita findUnique (read)", async () => {
    const params = { model: "Events", action: "findUnique", args: { where: { id: 1 } } } as unknown as Prisma.MiddlewareParams;
    next.mockResolvedValueOnce({ id: 1 });
    await auditPrismaMiddleware(params, next);
    expect(auditInfo).not.toHaveBeenCalled();
  });
});