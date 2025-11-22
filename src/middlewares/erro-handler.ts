import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../errors/HttpsError";
import { auditError } from "../infra/audit"; // <— novo

export const errorHandlerMiddleware = (
  error: Error & { issues?: any },
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Zod
  if (error instanceof ZodError || (error.name === "ZodError" && error.issues)) {
    const fieldErrors = error.issues.reduce((acc: Record<string, string[]>, issue: any) => {
      const path = issue.path[0] as string;
      (acc[path] ||= []).push(issue.message);
      return acc;
    }, {});

    // audita, mas não exponha dados sensíveis
    auditError("ZOD_VALIDATION_ERROR", {
      path: req.path,
      method: req.method,
      fieldErrors,
    });

    return res.status(400).json({ message: "Erro de validação", errors: fieldErrors });
  }

  // HttpError
  if (error instanceof HttpError) {
    auditError("HTTP_ERROR", {
      path: req.path,
      method: req.method,
      status: error.status,
      message: error.message,
    });
    return res.status(error.status).json({ message: error.message });
  }

  // Genérico
  console.error(error);
  auditError("UNCAUGHT_ERROR", {
    path: req.path,
    method: req.method,
    name: error.name,
    message: error.message,
    stack: error.stack?.split("\n").slice(0, 5),
  });

  return res.status(500).json({ message: "Erro interno do servidor" });
};
