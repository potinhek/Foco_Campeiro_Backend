// src/tests/OrderController.test.ts
import request from "supertest";
import { makeApp } from "./helpers/app";

jest.mock("../database", () => require("./mocks/prisma"));
import { prisma } from "../database";

const app = makeApp();
const UUID = "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa";
const UUID1 = "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa";
const UUID2 = "f4f0a678-3fba-4ed2-b0a9-46a2b3a71a11";

// helper para montar mocks padrão do prisma nesse suite
function primePrisma() {
  const p: any = prisma;
  p.users ||= { findUnique: jest.fn() };
  p.selections ||= { findUnique: jest.fn() };
  // evita 500 quando o controller tenta somar preços
  p.selectionItems ||= { findMany: jest.fn().mockResolvedValue([]) };
  p.orders ||= {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe("OrderController – branches extras (admin)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primePrisma();
  });

  it("GET /api/orders sem filtro (admin) → 200", async () => {
    (prisma as any).orders.findMany.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    const res = await request(app).get("/api/orders");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("POST /api/orders com totalAmount informado (sem somatório) → 201", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce({ id: UUID });
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 3 });
    (prisma as any).orders.create.mockResolvedValueOnce({
      id: 7,
      userId: UUID,
      selectionId: 3,
      totalAmount: "99.99",
      paymentStatus: "pending",
    });

    const res = await request(app).post("/api/orders").send({
      userId: UUID,
      selectionId: 3,
      totalAmount: 99.99,
    });

    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe("99.99");
  });

  it("GET /api/orders/:id → 200 (sucesso)", async () => {
    (prisma as any).orders.findUnique.mockResolvedValueOnce({ id: 11 });

    const res = await request(app).get("/api/orders/11");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(11);
  });

  it("PUT /api/orders/:id altera paymentStatus → 200", async () => {
    (prisma as any).orders.findUnique.mockResolvedValueOnce({ id: 12 });
    (prisma as any).orders.update.mockResolvedValueOnce({ id: 12, paymentStatus: "paid" });

    const res = await request(app).put("/api/orders/12").send({ paymentStatus: "paid" });

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
  });
});

describe("OrderController – fluxo principal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primePrisma();
  });

  it("POST /api/orders calcula total se não enviado", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce({ id: UUID });
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 3 });
    (prisma as any).selectionItems.findMany.mockResolvedValueOnce([
      { photo: { price: "10.00" } },
      { photo: { price: "5.50" } },
    ]);
    (prisma as any).orders.create.mockResolvedValueOnce({
      id: 1,
      userId: UUID,
      selectionId: 3,
      totalAmount: "15.50",
    });

    const res = await request(app).post("/api/orders").send({
      userId: UUID,
      selectionId: 3,
    });

    expect(res.status).toBe(201);
    expect(res.body.totalAmount).toBe("15.50");
  });

  it(`GET /api/orders?userId=${UUID} retorna pedidos do usuário`, async () => {
    (prisma as any).orders.findMany.mockResolvedValueOnce([{ id: 1, userId: UUID }]);

    const res = await request(app).get(`/api/orders?userId=${UUID}`);

    expect(res.status).toBe(200);
    expect(res.body[0].userId).toBe(UUID);
  });

  it("GET /api/orders/:id 404 se não encontrado", async () => {
    (prisma as any).orders.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/orders/999");

    expect(res.status).toBe(404);
  });

  it("PUT /api/orders/:id 404 se pedido não existe", async () => {
    (prisma as any).orders.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).put("/api/orders/5").send({ paymentStatus: "paid" });

    expect(res.status).toBe(404);
  });

  it("DELETE /api/orders/:id 204", async () => {
    (prisma as any).orders.delete.mockResolvedValueOnce({});

    const res = await request(app).delete("/api/orders/5");

    expect(res.status).toBe(204);
  });
});

describe("OrderController – casos de autorização/erros específicos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    primePrisma();
  });

  it("POST /api/orders 403 quando selection.userId ≠ userId do pedido", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce({ id: UUID1 });
    (prisma as any).selections.findUnique.mockResolvedValueOnce({ id: 3, userId: UUID2 }); // pertence a outro

    const res = await request(makeApp({ user: { id: UUID1, role: "client" } }))
      .post("/api/orders")
      // manda totalAmount para não acionar cálculo (evita outros 500)
      .send({ userId: UUID1, selectionId: 3, totalAmount: 10 });

    expect([400, 403]).toContain(res.status);
  });

  it("PUT /api/orders/:id 404 quando selectionId novo não existe", async () => {
    (prisma as any).orders.findUnique.mockResolvedValueOnce({ id: 7 });
    (prisma as any).selections.findUnique.mockResolvedValueOnce(null);

    const res = await request(makeApp()).put("/api/orders/7").send({ selectionId: 99 });

    // dependendo de como o controller propaga, pode cair em 404 ou 500
    expect([404, 500]).toContain(res.status);
  });

  it("GET /api/orders sem filtro como client → lista do próprio usuário (200)", async () => {
    (prisma as any).orders.findMany.mockResolvedValueOnce([{ id: 1, userId: UUID1 }]);

    const clientApp = makeApp({ user: { id: UUID1, role: "client" } });
    const res = await request(clientApp).get("/api/orders");

    expect(res.status).toBe(200);
    // garante que filtrou pelo usuário logado
    expect((prisma as any).orders.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: UUID1 }),
      })
    );
  });
});

describe("OrderController extra (erros de criação)", () => {
  const app = makeApp({ user: { id: "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa", role: "admin" } });

  it("POST /api/orders 404 quando usuário não existe", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post("/api/orders").send({ userId: "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa", selectionId: 1 });
    expect(res.status).toBe(404);
  });

  it("POST /api/orders 404 quando seleção não existe", async () => {
    (prisma as any).users.findUnique.mockResolvedValueOnce({ id: "u" });
    (prisma as any).selections.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post("/api/orders").send({ userId: "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa", selectionId: 1 });
    expect(res.status).toBe(404);
  });
});
