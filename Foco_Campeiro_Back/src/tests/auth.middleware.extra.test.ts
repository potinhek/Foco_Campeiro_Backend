import express from "express";
import request from "supertest";
import { requireAuth, requireRole } from "../middlewares/auth";

// rota que só retorna 200 se passou pelo requireAuth
function makeApp() {
  const app = express();
  app.get("/bypass", requireAuth, (_req, res) => res.sendStatus(200));
  app.get("/keep", (req: any, res, next) => { req.user = { id: "u1", role: "client" }; next(); }, requireAuth, (req: any, res) => res.json(req.user));
  app.get("/admin", requireAuth, requireRole("admin"), (_req, res) => res.sendStatus(200));
  return app;
}

describe("auth middleware extra", () => {
  const app = makeApp();

  it("injeta usuário de teste via headers (NODE_ENV=test) → 200", async () => {
    const res = await request(app).get("/bypass")
      .set("x-test-role", "admin")
      .set("x-test-user-id", "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa");
    expect(res.status).toBe(200);
  });

  it("não sobrescreve req.user já existente (early return)", async () => {
    const res = await request(app).get("/keep");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "u1", role: "client" });
  });
});

it("requireRole → 401 quando não há req.user", async () => {
  const app = express();
  app.get("/admin", requireRole("admin"), (_req, res) => res.sendStatus(200));
  const res = await request(app).get("/admin");
  expect(res.status).toBe(401);
});
