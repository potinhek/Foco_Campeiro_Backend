import request from "supertest";
import { makeApp } from "./helpers/app";
jest.mock("../database", () => require("./mocks/prisma"));
import { prisma } from "../database";

const app = makeApp();

describe("PhotoController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const p: any = prisma;
    p.events ||= { findUnique: jest.fn() };
    p.photos ||= {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  it("GET /api/photos?eventId=1 retorna lista", async () => {
    (prisma as any).photos.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const res = await request(app).get("/api/photos?eventId=1");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("POST /api/photos 404 se evento não existir", async () => {
    (prisma as any).events.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post("/api/photos").send({
      eventId: 1,
      price: 10,
      filePathOriginal: "a.jpg",
      filePathWatermark: "b.jpg",
    });
    expect(res.status).toBe(404);
  });

  it("PUT /api/photos/10 404 se trocar eventId pra um inexistente", async () => {
    (prisma as any).photos.findUnique.mockResolvedValueOnce({ id: 10 });
    (prisma as any).events.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).put("/api/photos/10").send({ eventId: 999 });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/photos/10 204", async () => {
    (prisma as any).photos.delete.mockResolvedValueOnce({});
    const res = await request(app).delete("/api/photos/10");
    expect(res.status).toBe(204);
  });
});
describe("PhotoController extra", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const p: any = prisma;
    p.events ||= { findUnique: jest.fn() };
    p.photos ||= {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  it("GET /api/photos sem filtro retorna todas", async () => {
    (prisma as any).photos.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const res = await request(app).get("/api/photos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("POST /api/photos cria (converte price para Decimal) → 201", async () => {
    (prisma as any).events.findUnique.mockResolvedValueOnce({ id: 1 });
    (prisma as any).photos.create.mockResolvedValueOnce({
      id: 15, eventId: 1, price: "9.90", filePathOriginal: "a", filePathWatermark: "b"
    });

    const res = await request(app).post("/api/photos").send({
      eventId: 1, price: 9.9, filePathOriginal: "a", filePathWatermark: "b"
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(15);
    expect((prisma as any).photos.create).toHaveBeenCalled();
  });

  it("PUT /api/photos/:id atualiza apenas price → 200", async () => {
    (prisma as any).photos.findUnique.mockResolvedValueOnce({ id: 77 });
    (prisma as any).photos.update.mockResolvedValueOnce({ id: 77, price: "12.34" });

    const res = await request(app).put("/api/photos/77").send({ price: 12.34 });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe("12.34");
  });

  it("PUT /api/photos/:id com eventId válido → 200", async () => {
    (prisma as any).photos.findUnique.mockResolvedValueOnce({ id: 78 });
    (prisma as any).events.findUnique.mockResolvedValueOnce({ id: 1 });
    (prisma as any).photos.update.mockResolvedValueOnce({ id: 78, eventId: 1 });

    const res = await request(app).put("/api/photos/78").send({ eventId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.eventId).toBe(1);
  });

  it("GET /api/photos/:id 404 quando não existe", async () => {
    (prisma as any).photos.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/photos/999");

    expect(res.status).toBe(404);
  });
});
describe("PhotoController extra 2", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any).events = { findUnique: jest.fn() };
    (prisma as any).photos = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  it("GET /api/photos/:id → 200", async () => {
    (prisma as any).photos.findUnique.mockResolvedValueOnce({ id: 9, eventId: 1 });
    const res = await request(app).get("/api/photos/9");
    expect(res.status).toBe(200);
  });

  it("PUT /api/photos/:id 404 quando foto não existe", async () => {
    (prisma as any).photos.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).put("/api/photos/9").send({ price: 1 });
    expect(res.status).toBe(404);
  });

  it("POST /api/photos inválido (sem price) → 400/500", async () => {
    (prisma as any).events.findUnique.mockResolvedValueOnce({ id: 1 });
    const res = await request(app).post("/api/photos").send({ eventId: 1, filePathOriginal: "a" });
    expect([400,500]).toContain(res.status);
  });
});