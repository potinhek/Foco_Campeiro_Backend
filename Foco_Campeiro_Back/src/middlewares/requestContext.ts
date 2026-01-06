import { randomUUID } from "crypto";
import type { RequestHandler } from "express";
import { als } from "../infra/requestContext";

export const requestContext: RequestHandler = (req, _res, next) => {
  const store = {
    requestId: randomUUID(),
    userId: (req as any).user?.id,     // preenchido pelo requireAuth
    ip: req.ip || req.headers["x-forwarded-for"] as string | undefined,
    userAgent: req.headers["user-agent"],
    path: req.path,
    method: req.method,
  };
  als.run(store, next);
};
