import request from "supertest";
import { makeApp } from "./helpers/app";

// usa o mesmo padrão dos seus outros testes
jest.mock("../database", () => require("./mocks/prisma"));
import { prisma } from "../database";

const app = makeApp();
const UUID = "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa";

describe("EventController – branches extras", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const p: any = prisma;
    p.users ||= { findUnique: jest.fn() };
    p.events ||= {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  it("GET /api/events/:id → 200 (sucesso)", async () => {
    (prisma as any).events.findUnique.mockResolvedValueOnce({ id: 1, name: "Expo" });
    const res = await request(app).get("/api/events/1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
  });

  it("PUT /api/events/:id sem userId (apenas name) → 200", async () => {
    (prisma as any).events.findUnique.mockResolvedValueOnce({ id: 2 });
    (prisma as any).events.update.mockResolvedValueOnce({ id: 2, name: "Novo" });

    const res = await request(app).put("/api/events/2").send({ name: "Novo" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Novo");
  });

  it("PUT /api/events/:id com userId válido → 200", async () => {
    (prisma as any).events.findUnique.mockResolvedValueOnce({ id: 3 });
    (prisma as any).users.findUnique.mockResolvedValueOnce({ id: UUID });
    (prisma as any).events.update.mockResolvedValueOnce({ id: 3, userId: UUID });

    const res = await request(app).put("/api/events/3").send({ userId: UUID });
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(UUID);
  });
});

describe("EventController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const p: any = prisma;
    p.users ||= { findUnique: jest.fn() };
    p.events ||= {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  it("GET /api/events retorna lista", async () => {
    (prisma as any).events.findMany.mockResolvedValueOnce([{ id: 1, name: "Show" }]);
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, name: "Show" }]);
  });

  it("POST /api/events 404 se usuário do evento não existir", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post("/api/events").send({
      name: "Expo",
      userId: "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa",
    });
    expect(res.status).toBe(404);
  });

  it("POST /api/events cria quando usuário existe", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce({ id: "u1" });
    (prisma as any).events.create.mockResolvedValueOnce({ id: 10, name: "Expo" });
    const res = await request(app).post("/api/events").send({
      name: "Expo",
      userId: "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa",
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(10);
  });

  it("GET /api/events/:id 404 se não encontrado", async () => {
    (prisma as any).events.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).get("/api/events/999");
    expect(res.status).toBe(404);
  });

  it("PUT /api/events/:id 404 se trocar userId pra um inexistente", async () => {
    (prisma as any).events.findUnique.mockResolvedValueOnce({ id: 1 }); // existe
    (prisma as any).users.findUnique.mockResolvedValueOnce(null); // novo user inválido
    const res = await request(app).put("/api/events/1").send({
      userId: "00000000-0000-0000-0000-000000000000",
    });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/events/:id 204", async () => {
    (prisma as any).events.delete.mockResolvedValueOnce({});
    const res = await request(app).delete("/api/events/1");
    expect(res.status).toBe(204);
  });
});

describe("EventController extra", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any).events = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    (prisma as any).users = { findUnique: jest.fn() };
  });

  it("GET /api/events/:id com id inválido (NaN) → 400/500 (cobre validação)", async () => {
    const res = await request(app).get("/api/events/abc");
    expect([400,500]).toContain(res.status);
  });

  it("PUT /api/events/:id 404 quando evento não existe", async () => {
    (prisma as any).events.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).put("/api/events/9").send({ name: "x" });
    expect(res.status).toBe(404);
  });
});