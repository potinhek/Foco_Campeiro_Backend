// src/tests/helpers/app.ts
import express from "express";
import cookieParser from "cookie-parser";
import { router } from "../../router";

type AppOptions = {
  /** Usuário a ser injetado em req.user. */
  user?: { id: string; role?: "admin" | "client" };
  /** Se true, não injeta req.user (útil p/ rotas públicas: login/register). */
  skipAuth?: boolean;
};

const DEFAULT_TEST_USER = {
  id: "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa",
  role: "admin" as const,
};

export function makeApp(opts: AppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // injeta um "requireAuth" fake antes do router
  app.use((req: any, _res, next) => {
    if (!opts.skipAuth) {
      req.user = opts.user ?? DEFAULT_TEST_USER;
    }
    next();
  });

  app.use("/api", router);

  // error handler simples para os testes
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err?.statusCode ?? err?.status ?? 500;
    res.status(status).json({ message: err?.message || "Erro interno" });
  });

  return app;
}
