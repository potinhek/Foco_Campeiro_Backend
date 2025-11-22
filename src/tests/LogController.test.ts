import request from "supertest";
import { makeApp } from "./helpers/app";
jest.mock("../database", () => require("./mocks/prisma"));
import { prisma } from "../database";

const app = makeApp();
const UUID = "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa";

describe("LogController – branches extras", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const p: any = prisma;
    p.users ||= { findUnique: jest.fn() };
    p.logs ||= {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
  });

  it("GET /api/logs com filtros (userId, level) → 200", async () => {
    (prisma as any).logs.findMany.mockResolvedValueOnce([{ id: 1, logLevel: "info" }]);
    const res = await request(app).get(`/api/logs?userId=${UUID}&level=info`);
    expect(res.status).toBe(200);
    expect(res.body[0].logLevel).toBe("info");
  });

  it("POST /api/logs cria quando user existe → 201", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce({ id: UUID });
    (prisma as any).logs.create.mockResolvedValueOnce({
      id: 9, logLevel: "info", message: "ok", userId: UUID, ipAddress: "1.2.3.4"
    });

    const res = await request(app).post("/api/logs").send({
      logLevel: "info",
      message: "ok",
      userId: UUID,
      ipAddress: "1.2.3.4",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(9);
  });

  it("GET /api/logs/:id → 200 (sucesso)", async () => {
    (prisma as any).logs.findUnique.mockResolvedValueOnce({ id: 5 });
    const res = await request(app).get("/api/logs/5");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(5);
  });
});

describe("LogController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const p: any = prisma;

        // garanta que o namespace exista com os métodos usados
        p.users ||= { findUnique: jest.fn() };
        p.logs ||= {} as any;
        p.logs.findMany = jest.fn();
        p.logs.findUnique = jest.fn();
        p.logs.create = jest.fn();
        p.logs.delete = jest.fn();
    });

    it("GET /api/logs retorna lista", async () => {
        (prisma as any).logs.findMany.mockResolvedValueOnce([{ id: 1 }]);
        const res = await request(app).get("/api/logs");
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });

    it("POST /api/logs 404 quando userId não existe", async () => {
        (prisma as any).users.findUnique.mockResolvedValueOnce(null);
        const res = await request(app).post("/api/logs").send({
            userId: "00000000-0000-0000-0000-000000000000",
            logLevel: "info",
            message: "x",
            ipAddress: "1.2.3.4",
        });
        expect(res.status).toBe(404);
    });

    it("GET /api/logs/:id 404 se não existe", async () => {
        (prisma as any).logs.findUnique.mockResolvedValueOnce(null);
        const res = await request(app).get("/api/logs/99");
        expect(res.status).toBe(404);
    });

    it("DELETE /api/logs/:id 204", async () => {
        (prisma as any).logs.delete.mockResolvedValueOnce({});
        const res = await request(app).delete("/api/logs/1");
        expect(res.status).toBe(204);
    });
});

describe("LogController extra", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any).logs = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    (prisma as any).users = { findUnique: jest.fn() };
  });

  it("GET /api/logs com q, from, to (filtros extras) → 200", async () => {
    (prisma as any).logs.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const res = await request(app).get(`/api/logs?q=HTTP&from=2024-01-01&to=2024-12-31&userId=${UUID}`);
    expect(res.status).toBe(200);
  });
});