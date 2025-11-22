import express from "express";
import request from "supertest";
import { requireRole } from "../middlewares/auth";

describe("requireRole – falta de usuário → 401", () => {
  it("retorna 401 se req.user não existe", async () => {
    const app = express();
    app.get("/admin", requireRole("admin"), (_req, res) => res.json({ ok: true }));

    const res = await request(app).get("/admin");
    expect(res.status).toBe(401);
  });
});
