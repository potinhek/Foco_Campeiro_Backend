// src/tests/AuthController.test.ts
import request from "supertest";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { makeApp } from "./helpers/app";
import { prisma } from "./mocks/prisma";

// mocka o client de DB usado pela app
jest.mock("../database", () => require("./mocks/prisma"));

// mocka as funções de JWT do seu projeto para facilitar asserts/erros controlados
jest.mock("../config/jwt", () => {
  const real = jest.requireActual("../config/jwt");
  return {
    ...real,
    signAccessToken: jest.fn(() => "access.mocked"),
    signRefreshToken: jest.fn(() => "refresh.mocked"),
    verifyRefreshToken: jest.fn(() => ({ sub: "u1", sid: "s1" })), // default, pode ser sobrescrito no teste
  };
});
import { verifyRefreshToken } from "../config/jwt";

const app = makeApp();

describe("AuthController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test_access_secret";
  });

  // ---------- REGISTER ----------
  it("register -> 500 quando payload inválido (Zod)", async () => {
  const res = await request(app).post("/api/auth/register").send({
    name: "",                 // inválido
    email: "ruim",            // inválido
    cpf: "123",               // inválido
    phone: "abc",             // inválido
    password: "123",          // < 6
  });
  expect(res.status).toBe(500);
});

  it("register -> 500 em erro inesperado do prisma", async () => {
    (prisma.users.create as jest.Mock).mockRejectedValue(new Error("boom"));

    const res = await request(app).post("/api/auth/register").send({
      name: "Rick",
      email: "rick@a.com",
      cpf: "12345678901",
      phone: "47999999999",
      password: "123456",
    });

    expect(res.status).toBe(500);
  });

  it("register: P2002 (email duplicado) -> 409", async () => {
    (prisma.users.create as jest.Mock).mockRejectedValue({ code: "P2002", meta: { target: ["email"] } });

    const res = await request(app).post("/api/auth/register").send({
      name: "Rick",
      email: "rick@a.com",
      cpf: "12345678901",
      phone: "47999999999",
      password: "123456",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/E-mail já cadastrado/i);
  });

  it("register: cria user (role=client), cria sessão e retorna tokens", async () => {
    (prisma.users.create as jest.Mock).mockImplementation(async ({ data }) => ({
      ...data,
      id: "u1",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    (prisma.sessions.create as jest.Mock).mockResolvedValue({
      id: "s1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 30 * 864e5),
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "Rick",
      email: "rick@a.com",
      cpf: "12345678901",
      phone: "47999999999",
      password: "123456",
      role: "admin", // deve ser ignorado; controller força "client"
    });

    expect(res.status).toBe(201);
    expect(prisma.users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "client",
          password: expect.any(String),
        }),
      })
    );
    expect(prisma.sessions.create).toHaveBeenCalled();
    expect(res.body).toHaveProperty("accessToken", "access.mocked");
    expect(res.body).toHaveProperty("sessionId", "s1");
    const cookies = res.get("set-cookie");
    expect(cookies).toEqual(expect.arrayContaining([expect.stringMatching(/^rtok=/)]));
  });

  it("register: P2002 (email duplicado) -> 409 via HttpError", async () => {
    (prisma.users.create as jest.Mock).mockRejectedValue({ code: "P2002", meta: { target: ["email"] } });

    const res = await request(app).post("/api/auth/register").send({
      name: "Rick",
      email: "rick@a.com",
      cpf: "12345678901",
      phone: "47999999999",
      password: "123456",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/E-mail já cadastrado/i);
  });

  // ---------- LOGIN ----------
  it("login ok usando passwordHash (sem campo password)", async () => {
  const hash = await bcrypt.hash("123456", 10);
  (prisma.users.findUnique as jest.Mock).mockResolvedValue({
    id: "u1",
    email: "x@y.com",
    role: "user",
    passwordHash: hash,   // <-- somente passwordHash
  });
  (prisma.sessions.create as jest.Mock).mockResolvedValue({
    id: "s1",
    userId: "u1",
    expiresAt: new Date(Date.now() + 7 * 864e5),
  });

  const res = await request(app).post("/api/auth/login").send({ email: "x@y.com", password: "123456" });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("accessToken", "access.mocked");
  expect(res.body).toHaveProperty("sessionId", "s1");
});

  it("login ok -> 200, rtok cookie, accessToken e sessionId", async () => {
    const hash = await bcrypt.hash("123456", 10);
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "x@y.com",
      role: "user",
      password: hash,
    });
    (prisma.sessions.create as jest.Mock).mockResolvedValue({
      id: "s1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 7 * 864e5),
    });

    const res = await request(app).post("/api/auth/login").send({ email: "x@y.com", password: "123456" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken", "access.mocked");
    expect(res.body).toHaveProperty("sessionId", "s1");
    const cookies = res.get("set-cookie");
    expect(cookies).toEqual(expect.arrayContaining([expect.stringMatching(/^rtok=/)]));
  });

  it("login -> 401 usuário não encontrado", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).post("/api/auth/login").send({ email: "no@no.com", password: "x" });
    expect(res.status).toBe(401);
  });

  it("login -> 401 hash ausente", async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({ id: "u1", email: "x@y.com", role: "user" }); // sem password
    const res = await request(app).post("/api/auth/login").send({ email: "x@y.com", password: "123456" });
    expect(res.status).toBe(401); // seu catch devolve 401 para qualquer falha
  });

  it("login -> 401 senha incorreta", async () => {
    const hash = await bcrypt.hash("correta", 10);
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "x@y.com",
      role: "user",
      password: hash,
    });
    const res = await request(app).post("/api/auth/login").send({ email: "x@y.com", password: "errada" });
    expect(res.status).toBe(401);
  });

  // ---------- REFRESH ----------
  it("refresh -> 500 quando refresh token é inválido (verifyRefreshToken lança)", async () => {
  (verifyRefreshToken as jest.Mock).mockImplementation(() => {
    throw new Error("bad token");
  });

  const res = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", ["rtok=corrompido"]);

  expect(res.status).toBe(500);
});

  it("refresh -> 401 sem cookie", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Refresh ausente/i);
  });

  it("refresh -> 401 sessão não encontrada / inválida", async () => {
    (verifyRefreshToken as jest.Mock).mockReturnValue({ sub: "u1", sid: "s1" });
    (prisma.sessions.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await request(app).post("/api/auth/refresh").set("Cookie", ["rtok=abc"]);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/Sessão inválida/i);
  });

  it("refresh -> 401 sessão revogada", async () => {
    (verifyRefreshToken as jest.Mock).mockReturnValue({ sub: "u1", sid: "s1" });
    (prisma.sessions.findUnique as jest.Mock).mockResolvedValue({
      id: "s1",
      userId: "u1",
      isRevoked: true,
      expiresAt: new Date(Date.now() + 864e5),
    });
    const res = await request(app).post("/api/auth/refresh").set("Cookie", ["rtok=abc"]);
    expect(res.status).toBe(401);
  });

  it("refresh -> 401 sessão com userId diferente do token", async () => {
    (verifyRefreshToken as jest.Mock).mockReturnValue({ sub: "u1", sid: "s1" });
    (prisma.sessions.findUnique as jest.Mock).mockResolvedValue({
      id: "s1",
      userId: "u2", // diferente
      isRevoked: false,
      expiresAt: new Date(Date.now() + 864e5),
    });
    const res = await request(app).post("/api/auth/refresh").set("Cookie", ["rtok=abc"]);
    expect(res.status).toBe(401);
  });

  it("refresh -> 401 sessão expirada", async () => {
    (verifyRefreshToken as jest.Mock).mockReturnValue({ sub: "u1", sid: "s1" });
    (prisma.sessions.findUnique as jest.Mock).mockResolvedValue({
      id: "s1",
      userId: "u1",
      isRevoked: false,
      expiresAt: new Date(Date.now() - 1000), // expirada
    });
    const res = await request(app).post("/api/auth/refresh").set("Cookie", ["rtok=abc"]);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expirada/i);
  });

  it("refresh -> 500 se user não existe (findUniqueOrThrow)", async () => {
    (verifyRefreshToken as jest.Mock).mockReturnValue({ sub: "u1", sid: "s1" });
    (prisma.sessions.findUnique as jest.Mock).mockResolvedValue({
      id: "s1",
      userId: "u1",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 864e5),
    });
    (prisma.users.findUniqueOrThrow as jest.Mock).mockRejectedValue(new Error("not found"));
    const res = await request(app).post("/api/auth/refresh").set("Cookie", ["rtok=abc"]);
    expect(res.status).toBe(500);
  });

  it("refresh ok -> 200, rota sessão e seta novo cookie", async () => {
    (verifyRefreshToken as jest.Mock).mockReturnValue({ sub: "u1", sid: "s1" });
    (prisma.sessions.findUnique as jest.Mock).mockResolvedValue({
      id: "s1",
      userId: "u1",
      isRevoked: false,
      expiresAt: new Date(Date.now() + 864e5),
    });
    (prisma.users.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: "u1", role: "user" });
    (prisma.sessions.update as jest.Mock).mockResolvedValue({});
    (prisma.sessions.create as jest.Mock).mockResolvedValue({
      id: "s2",
      userId: "u1",
      expiresAt: new Date(Date.now() + 864e5),
    });

    const res = await request(app).post("/api/auth/refresh").set("Cookie", ["rtok=abc"]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken", "access.mocked");
    expect(res.body).toHaveProperty("sessionId", "s2");
    const cookies = res.get("set-cookie");
    expect(cookies).toEqual(expect.arrayContaining([expect.stringMatching(/^rtok=/)]));
  });

  // ---------- LOGOUT ----------
  it("logout -> 204 sem cookie (no-op)", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
  });

  it("logout -> 204 com cookie (revoga sessão atual)", async () => {
    (verifyRefreshToken as jest.Mock).mockReturnValue({ sub: "u1", sid: "s1" });
    (prisma.sessions.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    const res = await request(app).post("/api/auth/logout").set("Cookie", ["rtok=abc"]);
    expect(res.status).toBe(204);
    expect(prisma.sessions.updateMany).toHaveBeenCalledWith({
      where: { id: "s1", isRevoked: false },
      data: { isRevoked: true },
    });
  });
  it("logout -> 500 quando refresh token é inválido (verifyRefreshToken lança)", async () => {
    (verifyRefreshToken as jest.Mock).mockImplementation(() => {
      throw new Error("bad token");
    });

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", ["rtok=bad-token"]);

    expect(res.status).toBe(500);
  });

});

