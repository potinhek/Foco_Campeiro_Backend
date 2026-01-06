import request from "supertest";
import * as jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { makeApp } from "./helpers/app";
import { prisma } from "./mocks/prisma";

jest.mock("../database", () => require("./mocks/prisma"));

const app = makeApp();

// gera access token ADMIN para passar no requireRole("admin")
const signAdmin = () =>
  jwt.sign({ sub: "admin1", role: "admin" }, process.env.JWT_ACCESS_SECRET || "test_access_secret", {
    expiresIn: "10m",
  });
const auth = () => ({ Authorization: `Bearer ${signAdmin()}` });

describe("UserController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- INDEX ----------
  it("GET /api/users -> remove passwordHash quando presente", async () => {
  (prisma.users.findMany as jest.Mock).mockResolvedValue([
    { id: "u1", name: "Ana", email: "a@a.com", role: "admin", passwordHash: "hash$" },
  ]);
  const res = await request(app).get("/api/users").set(auth());
  expect(res.status).toBe(200);
  expect(res.body[0]).not.toHaveProperty("passwordHash");
});

  it("GET /api/users -> 200 sem campo password", async () => {
    (prisma.users.findMany as jest.Mock).mockResolvedValue([
      { id: "u1", name: "Ana", email: "a@a.com", role: "admin", password: "hash" },
      { id: "u2", name: "Bob", email: "b@b.com", role: "client", password: "hash2" },
    ]);

    const res = await request(app).get("/api/users").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).not.toHaveProperty("password");
    expect(res.body[1]).not.toHaveProperty("password");
  });
  it("GET /api/users -> 500 quando prisma.findMany rejeita", async () => {
  (prisma.users.findMany as jest.Mock).mockRejectedValue(new Error("db down"));

  const res = await request(app).get("/api/users").set(auth());
  expect(res.status).toBe(500);
});


  // ---------- CREATE ----------
  it("POST /api/users -> 201 cria com hash de senha", async () => {
    (prisma.users.create as jest.Mock).mockImplementation(async ({ data }: any) => ({
      id: "u2",
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const res = await request(app)
      .post("/api/users")
      .set(auth())
      .send({
        name: "Bob",
        email: "b@b.com",
        cpf: "12345678901",
        phone: "47999999999",
        password: "123456",
        role: "client",
      });

    expect(res.status).toBe(201);
    // servidor salvou hash (string qualquer) e não retornou password
    expect(prisma.users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ password: expect.any(String) }),
      }),
    );
    expect(res.body).not.toHaveProperty("password");
  });

  it("PUT /api/users/:id -> 500 quando payload inválido (Zod)", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({ id: "u1" }); // existe
    const res = await request(app)
      .put("/api/users/u1")
      .set(auth())
      .send({ name: "ab", password: "123" }); // name<3 e password<6
    expect(res.status).toBe(500);
  });

  it("GET /api/users -> 200 lista vazia", async () => {
    (prisma.users.findMany as jest.Mock).mockResolvedValue([]);
    const res = await request(app).get("/api/users").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });


  it("POST /api/users -> 409 quando email duplicado (P2002)", async () => {
    (prisma.users.create as jest.Mock).mockRejectedValue({ code: "P2002", meta: { target: ["email"] } });

    const res = await request(app)
      .post("/api/users")
      .set(auth())
      .send({
        name: "Bob",
        email: "b@b.com",
        cpf: "12345678901",
        phone: "47999999999",
        password: "123456",
        role: "client",
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/E-mail já cadastrado/i);
  });

  // (Opcional) se quiser contar branch de validação Zod como 500 no seu handler:
  it("POST /api/users -> 500 quando payload inválido (Zod)", async () => {
    const res = await request(app)
      .post("/api/users")
      .set(auth())
      .send({
        name: "Bo", // < 3 chars
        email: "ruim",
        cpf: "123",
        phone: "abc",
        password: "123",
        role: "client",
      });
    expect(res.status).toBe(500); // seu error-handler devolve 500 para Zod
  });

  // ---------- READ ----------
  it("GET /api/users/:id -> 200 retorna público", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      name: "Ana",
      email: "a@a.com",
      role: "admin",
      password: "hash",
    });

    const res = await request(app).get("/api/users/u1").set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "u1", email: "a@a.com", role: "admin" });
    expect(res.body).not.toHaveProperty("password");
  });

  it("GET /api/users/:id -> 404 quando não existe", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).get("/api/users/u404").set(auth());
    expect(res.status).toBe(404);
  });

  // ---------- UPDATE ----------
  it("PUT /api/users/:id -> 500 quando payload inválido (Zod) com usuário existente", async () => {
  (prisma.users.findUnique as jest.Mock).mockResolvedValue({ id: "u1" }); // existe
  const res = await request(app)
    .put("/api/users/u1")
    .set(auth())
    .send({ name: "ab", password: "123" }); // inválido (name<3, password<6)
  expect(res.status).toBe(500);
});

  it("PUT /api/users/:id -> 200 atualiza e HASH se password enviado", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({ id: "u1" });
    (prisma.users.update as jest.Mock).mockResolvedValue({
      id: "u1",
      name: "Ana",
      email: "a@a.com",
      role: "client",
      password: await bcrypt.hash("nova123", 10),
    });

    const res = await request(app)
      .put("/api/users/u1")
      .set(auth())
      .send({ name: "Ana", password: "nova123", role: "client" });

    expect(res.status).toBe(200);
    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ password: expect.any(String) }),
      }),
    );
    expect(res.body).not.toHaveProperty("password");
  });

  it("PUT /api/users/:id -> 200 atualiza sem trocar senha (sem campo password)", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({ id: "u1" });
    (prisma.users.update as jest.Mock).mockResolvedValue({
      id: "u1",
      name: "Ana Atualizada",
      email: "a@a.com",
      role: "client",
    });

    const res = await request(app)
      .put("/api/users/u1")
      .set(auth())
      .send({ name: "Ana Atualizada", role: "client" });

    expect(res.status).toBe(200);
    // garante que não passamos password no update
    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ password: expect.anything() }),
      }),
    );
  });

  it("PUT /api/users/:id -> 404 se usuário não existe", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put("/api/users/u404")
      .set(auth())
      .send({ name: "Xxxxx", role: "client" });

    expect(res.status).toBe(404);
  });

  it("PUT /api/users/:id -> 409 quando email duplicado (P2002)", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({ id: "u1" });
    (prisma.users.update as jest.Mock).mockRejectedValue({ code: "P2002", meta: { target: ["email"] } });

    const res = await request(app)
      .put("/api/users/u1")
      .set(auth())
      .send({ email: "dup@a.com", role: "client" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/E-mail já cadastrado/i);
  });

  // ---------- DELETE ----------
  it("DELETE /api/users/:id -> 204", async () => {
    (prisma.users.delete as jest.Mock).mockResolvedValue({ id: "u1" });
    const res = await request(app).delete("/api/users/u1").set(auth());
    expect(res.status).toBe(204);
  });

  it("DELETE /api/users/:id -> 500 se prisma lançar erro", async () => {
    (prisma.users.delete as jest.Mock).mockRejectedValue(new Error("db error"));
    const res = await request(app).delete("/api/users/uX").set(auth());
    expect(res.status).toBe(500);
  });
});
