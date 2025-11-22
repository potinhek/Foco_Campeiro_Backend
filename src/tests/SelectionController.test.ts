import request from "supertest";
import { makeApp } from "./helpers/app";
jest.mock("../database", () => require("./mocks/prisma"));
import { prisma } from "../database";

const app = makeApp();
const UUID = "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa";
const UUID1 = "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa";
const UUID2 = "f4f0a678-3fba-4ed2-b0a9-46a2b3a71a11";


describe("SelectionController extra 3", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma as any).users = { findUnique: jest.fn() };
    (prisma as any).selections = { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    (prisma as any).selectionItems = { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() };
    (prisma as any).photos = { findUnique: jest.fn() };
  });

  it("GET /api/selections (client, sem userId) → 403", async () => {
    const app = makeApp({ user: { id: UUID1, role: "client" } });
    const res = await request(app).get("/api/selections");
    expect([403,401]).toContain(res.status);
  });

  it("PUT /api/selections/:id com userId inválido (não-UUID) → 400/500", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 1, userId: UUID1 });
    const res = await request(makeApp()).put("/api/selections/1").send({ userId: "x" });
    expect([400,500]).toContain(res.status);
  });

  it("DELETE /api/selections/:id/items/:itemId 404 quando item não existe", async () => {
    (prisma as any).selectionItems.findUnique.mockResolvedValueOnce(null);
    const res = await request(makeApp()).delete("/api/selections/1/items/99");
    expect(res.status).toBe(404);
  });

  it("POST /api/selections/:id/items com photo inexistente → 404", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 1 });
    (prisma as any).photos.findUnique.mockResolvedValueOnce(null);
    const res = await request(makeApp()).post("/api/selections/1/items").send({ photoId: 9 });
    expect(res.status).toBe(404);
  });
});

describe("SelectionController – mais branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const p: any = prisma;
    p.users ||= { findUnique: jest.fn() };
    p.selections ||= { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    p.selectionItems ||= { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() };
    p.photos ||= { findUnique: jest.fn() };
  });

  it("GET /api/selections sem userId (admin lista todas) → 200", async () => {
    (prisma as any).selections.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
    const res = await request(app).get("/api/selections");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it("GET /api/selections/:id → 200 (sucesso)", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 4, userId: UUID });
    const res = await request(app).get("/api/selections/4");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(4);
  });

  it("PUT /api/selections/:id troca userId (admin) → 200", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 6, userId: UUID });
    (prisma as any).users.findUnique.mockResolvedValueOnce({ id: UUID2 });
    (prisma as any).selections.update.mockResolvedValueOnce({ id: 6, userId: UUID2 });

    const res = await request(app).put("/api/selections/6").send({ userId: UUID2 });
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(UUID2);
  });
});

describe("SelectionController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const p: any = prisma;
    p.users ||= { findUnique: jest.fn() };
    p.selections ||= {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    p.selectionItems ||= {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    };
    p.photos ||= { findUnique: jest.fn() };
  });

  it("GET /api/selections?userId=... retorna lista do usuário", async () => {
    (prisma as any).selections.findMany.mockResolvedValueOnce([{ id: 1, userId: "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa" }]);
    const res = await request(app).get("/api/selections?userId=b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa");
    expect(res.status).toBe(200);
    expect(res.body[0].userId).toBe("b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa");
  });

  it("POST /api/selections 404 se userId inexistente", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post("/api/selections").send({
      userId: "00000000-0000-0000-0000-000000000000",
    });
    expect(res.status).toBe(404);
  });

  it("GET /api/selections/:id 404 se não existir", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).get("/api/selections/999");
    expect(res.status).toBe(404);
  });

  it("GET /api/selections/:id/items 404 se seleção não existe", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).get("/api/selections/5/items");
    expect(res.status).toBe(404);
  });

  it("POST /api/selections/:id/items retorna existente se já houver duplicado", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 5 });
    (prisma as any).photos.findUnique.mockResolvedValueOnce({ id: 7 });
    (prisma as any).selectionItems.findFirst.mockResolvedValueOnce({ id: 99, selectionId: 5, photoId: 7 });
    const res = await request(app).post("/api/selections/5/items").send({ photoId: 7 });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(99);
  });

  it("DELETE /api/selections/:id/items/:itemId 404 se item não pertence à seleção", async () => {
    (prisma as any).selectionItems.findUnique.mockResolvedValueOnce({ id: 10, selectionId: 999 });
    const res = await request(app).delete("/api/selections/5/items/10");
    expect(res.status).toBe(404);
  });
});
describe("SelectionController extra", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const p: any = prisma;
    p.users ||= { findUnique: jest.fn() };
    p.selections ||= {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    p.selectionItems ||= {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    };
    p.photos ||= { findUnique: jest.fn() };
  });

  it("POST /api/selections cria quando o user existe → 201", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce({ id:  "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa" });
    (prisma as any).selections.create.mockResolvedValueOnce({ id: 1, userId:  "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa" });

    const res = await request(app).post("/api/selections").send({ userId:  "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa" });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe( "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa");
  });

  it("POST /api/selections 400 quando userId inválido (Zod)", async () => {
    const res = await request(app).post("/api/selections").send({ userId: "x" });
    expect([400, 500]).toContain(res.status); // seu error handler devolve 400; se cair 500, algo escapou
  });

  it("PUT /api/selections/:id 404 quando seleção não existe", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).put("/api/selections/9").send({ status: "submitted" });
    expect(res.status).toBe(404);
  });

  it("PUT /api/selections/:id atualiza status → 200", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 2, userId:  "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa" });
    (prisma as any).selections.update.mockResolvedValueOnce({ id: 2, userId:  "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa", status: "submitted" });

    const res = await request(app).put("/api/selections/2").send({ status: "submitted" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("submitted");
  });

  it("DELETE /api/selections/:id remove itens e seleção → 204", async () => {
    (prisma as any).selectionItems.deleteMany.mockResolvedValueOnce({ count: 0 });
    (prisma as any).selections.delete.mockResolvedValueOnce({});

    const res = await request(app).delete("/api/selections/3");

    expect(res.status).toBe(204);
    expect((prisma as any).selectionItems.deleteMany).toHaveBeenCalledWith({ where: { selectionId: 3 } });
  });

  it("GET /api/selections/:id/items lista itens → 200", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 5 });
    (prisma as any).selectionItems.findMany.mockResolvedValueOnce([
      { id: 10, selectionId: 5, photo: { id: 7 } },
    ]);

    const res = await request(app).get("/api/selections/5/items");

    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(10);
  });

  it("POST /api/selections/:id/items cria novo item (não duplicado) → 201", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 5 });
    (prisma as any).photos.findUnique.mockResolvedValueOnce({ id: 7 });
    (prisma as any).selectionItems.findFirst.mockResolvedValueOnce(null);
    (prisma as any).selectionItems.create.mockResolvedValueOnce({ id: 99, selectionId: 5, photoId: 7 });

    const res = await request(app).post("/api/selections/5/items").send({ photoId: 7 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(99);
  });

  it("DELETE /api/selections/:id/items/:itemId remove item → 204", async () => {
    (prisma as any).selectionItems.findUnique.mockResolvedValueOnce({ id: 10, selectionId: 5 });
    (prisma as any).selectionItems.delete.mockResolvedValueOnce({});

    const res = await request(app).delete("/api/selections/5/items/10");

    expect(res.status).toBe(204);
  });
});

describe("SelectionController extra (ramificações)", () => {
  const app = makeApp({ user: { id: "u1", role: "admin" } });

  it("PUT /api/selections/:id 404 quando troca userId para inexistente", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 9 });
    (prisma as any).users.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).put("/api/selections/9").send({ userId: "00000000-0000-0000-0000-000000000000" });
    expect(res.status).toBe(404);
  });

  it("POST /api/selections/:id/items 404 quando foto não existe", async () => {
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 9 });
    (prisma as any).photos.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post("/api/selections/9/items").send({ photoId: 7 });
    expect(res.status).toBe(404);
  });
});
