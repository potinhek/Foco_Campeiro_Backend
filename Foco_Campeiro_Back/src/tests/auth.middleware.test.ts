import request from "supertest";
import express from "express";
import * as jwt from "jsonwebtoken";
import { requireAuth, requireRole } from "../middlewares/auth";

const app = express();
app.get("/ok", requireAuth, (_req, res) => res.json({ ok: true }));
app.get("/admin", requireAuth, requireRole("admin"), (_req, res) => res.json({ ok: true }));

const sign = (p: any) => jwt.sign(p, process.env.JWT_ACCESS_SECRET!, { expiresIn: "10m" });

it("bloqueia sem token", async () => {
  const res = await request(app).get("/ok");
  expect(res.status).toBe(401);
});

it("permite com token válido", async () => {
  const res = await request(app).get("/ok").set("Authorization", `Bearer ${sign({ sub: "u1", role: "client" })}`);
  expect(res.status).toBe(200);
});

it("bloqueia admin sem role", async () => {
  const res = await request(app).get("/admin").set("Authorization", `Bearer ${sign({ sub: "u1", role: "client" })}`);
  expect(res.status).toBe(403);
});

it("permite admin", async () => {
  const res = await request(app).get("/admin").set("Authorization", `Bearer ${sign({ sub: "u1", role: "admin" })}`);
  expect(res.status).toBe(200);
});

it("requireAuth -> 401 sem Authorization", async () => {
  const app = express();
  app.get("/private", requireAuth, (_req, res) => res.json({ ok: true }));

  const res = await request(app).get("/private");
  expect(res.status).toBe(401);
});
it("requireAuth -> 401 com Authorization malformado (sem 'Bearer ')", async () => {
  const app2 = express();
  app2.get("/p", requireAuth, (_req, res) => res.json({ ok: true }));

  const res = await request(app2).get("/p").set("Authorization", "abc123");
  expect(res.status).toBe(401);
});
it("requireAuth -> 401 com token assinado com segredo errado", async () => {
  const app2 = express();
  app2.get("/p", requireAuth, (_req, res) => res.json({ ok: true }));

  // assina com um segredo diferente do usado pelo middleware
  const wrong = jwt.sign({ sub: "u1", role: "client" }, "segredo_errado", { expiresIn: "5m" });

  const res = await request(app2).get("/p").set("Authorization", `Bearer ${wrong}`);
  expect(res.status).toBe(401);
});
it("requireAuth -> 401 quando Authorization não começa com 'Bearer '", async () => {
  const app2 = express();
  app2.get("/priv", requireAuth, (_req, res) => res.json({ ok: true }));

  const res = await request(app2).get("/priv").set("Authorization", "abc123"); // malformado
  expect(res.status).toBe(401);
});
it("requireRole('admin') nega quando user não é admin", () => {
  const req: any = { user: { id: "u", role: "client" } };
  const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  requireRole("admin")(req, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(403);
});