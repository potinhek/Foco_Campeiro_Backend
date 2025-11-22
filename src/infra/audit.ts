// src/infra/audit.ts
import { prisma } from "../database";
import { als } from "./requestContext";

type Level = "info" | "warn" | "error";
const SENSITIVE_KEYS = ["password", "passwordHash", "token", "cpf"]; // ajuste

function sanitize(obj: unknown) {
  try {
    const clone = JSON.parse(JSON.stringify(obj ?? {}));
    const rec = (o: any) => {
      if (!o || typeof o !== "object") return;
      for (const k of Object.keys(o)) {
        if (SENSITIVE_KEYS.includes(k)) o[k] = "***";
        else rec(o[k]);
      }
    };
    rec(clone);
    return clone;
  } catch {
    return undefined;
  }
}

export async function audit(level: Level, message: string, extra?: Record<string, any>) {
  const ctx = als.getStore();
  // Não falhe a request se der erro ao logar
  prisma.logs.create({
    data: {
      logLevel: level,
      message: JSON.stringify({ message, extra: sanitize(extra), ctx }),
      userId: ctx?.userId ?? "00000000-0000-0000-0000-000000000000",
      ipAddress: ctx?.ip ?? "unknown",
    },
  }).catch(() => {});
}

// Açúcar sintático
export const auditInfo  = (msg: string, extra?: any) => audit("info", msg, extra);
export const auditWarn  = (msg: string, extra?: any) => audit("warn", msg, extra);
export const auditError = (msg: string, extra?: any) => audit("error", msg, extra);
