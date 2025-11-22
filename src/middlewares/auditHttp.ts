import type { RequestHandler } from "express";
import { auditInfo } from "../infra/audit";

export const auditHttp: RequestHandler = (req, res, next) => {
  const t0 = Date.now();
  res.on("finish", () => {
    auditInfo("HTTP", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - t0,
    });
  });
  next();
};
