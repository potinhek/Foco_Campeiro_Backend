// src/middlewares/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../config/jwt";

type Role = "admin" | "client" | "visitor";
export interface AuthedUser {
  id: string;
  role: Role;
  email?: string;
}

// Augmenta o tipo do Express para req.user
declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

// --- Middleware que garante usuário logado ---
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Se algum middleware de teste já injetou user, não mexa.
  if (req.user) return next();

  // 🔓 Bypass **somente** se vier header explícito nos testes
  if (process.env.NODE_ENV === "test") {
    const testRole = req.header("x-test-role") as Role | undefined;
    const testId = req.header("x-test-user-id") || undefined;

    if (testRole || testId) {
      req.user = {
        id: String(testId || "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa"),
        role: (testRole || "admin") as Role,
      };
      return next();
    }
    // Sem headers → segue fluxo normal (exige Bearer)
  }

  const auth = req.header("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const token = auth.substring("Bearer ".length);
  try {
    const payload = verifyAccessToken(token) as { sub: string; role: Role };
    req.user = { id: String(payload.sub), role: payload.role };
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}

// --- Middleware de autorização por papel ---
export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    if (req.user.role !== role) {
      // ✅ Os testes esperam 403 e que NÃO chamemos next(error)
      return res.status(403).json({ message: "Acesso negado" });
    }
    return next();
  };
}
