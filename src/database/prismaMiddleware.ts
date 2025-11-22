import type { Prisma } from "@prisma/client";
import { auditInfo } from "../infra/audit";

// Modelos que vamos auditar (e quais vamos ignorar para evitar loop)
const AUDIT_MODELS = new Set([
  "Users", "Events", "Photos", "Selections", "SelectionItems", "Orders"
]);
const IGNORE_MODELS = new Set(["Logs", "Sessions"]); // nunca audite Logs (evita recursão)

const SECRET_KEYS = new Set(["password", "passwordHash", "cpf", "token"]);

function summarizeData(data: any) {
  // remove campos sensíveis e evita payloads gigantes
  if (!data || typeof data !== "object") return undefined;
  const out: Record<string, any> = {};
  for (const k of Object.keys(data)) {
    if (SECRET_KEYS.has(k)) {
      out[k] = "***";
    } else if (data[k] && typeof data[k] === "object") {
      // evita objetos aninhados grandes
      out[k] = "[object]";
    } else {
      out[k] = data[k];
    }
  }
  return out;
}

export const auditPrismaMiddleware: Prisma.Middleware = async (params, next) => {
  const { model, action, args } = params;

  // Ignora modelos que não queremos logar
  if (!model || IGNORE_MODELS.has(model)) {
    return next(params);
  }

  // Só audita writes
  const isWrite =
    action === "create" ||
    action === "update" ||
    action === "delete" ||
    action === "upsert" ||
    action === "createMany" ||
    action === "updateMany" ||
    action === "deleteMany";

  if (!isWrite || !AUDIT_MODELS.has(model)) {
    return next(params);
  }

  // Opcional: coletar "antes" para UPDATE/DELETE (só para registros únicos)
  let before: any = undefined;
  const isSingle =
    action === "update" ||
    action === "delete" ||
    action === "upsert";

  if (isSingle && args?.where) {
    try {
      // next() ainda não foi chamado, então podemos consultar antes
      const finder = (global as any).prisma?.[model[0].toLowerCase() + model.slice(1)];
      if (finder?.findUnique) {
        before = await finder.findUnique({ where: args.where });
      }
    } catch {
      // segue mesmo se falhar
    }
  }

  const result = await next(params);

  // Monta um resumo seguro
  const payload = {
    model,
    action,
    where: summarizeData(args?.where),
    data: summarizeData(args?.data),
    // IDs/sumário do resultado
    resultId: (result as any)?.id ?? undefined,
    count: typeof result === "object" && "count" in (result as any) ? (result as any).count : undefined,
    // Diffs simples (opcional)
    before: before ? summarizeData(before) : undefined,
    afterKeys: result ? Object.keys(result as any).slice(0, 20) : undefined,
  };

  // Grava log (usa auditInfo → Logs; Logs está em IGNORE_MODELS, logo não recursa)
  auditInfo("DB_WRITE", payload);

  return result;
};
