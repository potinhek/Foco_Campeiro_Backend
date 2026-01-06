import { Prisma } from "@prisma/client";
import { auditInfo } from "../infra/audit";

// Modelos que vamos auditar
const AUDIT_MODELS = new Set([
  "Users", "Events", "Photos", "Selections", "SelectionItems", "Orders"
]);
// Modelos ignorados para evitar loop
const IGNORE_MODELS = new Set(["Logs", "Sessions"]);

const SECRET_KEYS = new Set(["password", "passwordHash", "cpf", "token"]);

function summarizeData(data: any) {
  if (!data || typeof data !== "object") return undefined;
  const out: Record<string, any> = {};
  for (const k of Object.keys(data)) {
    if (SECRET_KEYS.has(k)) {
      out[k] = "***";
    } else if (data[k] && typeof data[k] === "object") {
      out[k] = "[object]";
    } else {
      out[k] = data[k];
    }
  }
  return out;
}

// Criamos uma extensão ao invés de um middleware
export const auditExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    name: 'audit-extension',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // 1. Se for modelo ignorado, segue sem fazer nada
          if (!model || IGNORE_MODELS.has(model)) {
            return query(args);
          }

          // 2. Só audita operações de escrita (writes)
          const isWrite =
            operation === "create" ||
            operation === "update" ||
            operation === "delete" ||
            operation === "upsert" ||
            operation === "createMany" ||
            operation === "updateMany" ||
            operation === "deleteMany";

          if (!isWrite || !AUDIT_MODELS.has(model)) {
            return query(args);
          }

          // 3. Tenta capturar o estado "antes" da alteração (opcional)
          let before: any = undefined;
          const isSingle = operation === "update" || operation === "delete" || operation === "upsert";
          
          if (isSingle && args['where']) {
             try {
                // Acessa o delegate do modelo dinamicamente (ex: client.users)
                const delegate = (client as any)[model.charAt(0).toLowerCase() + model.slice(1)];
                if (delegate && delegate.findUnique) {
                   before = await delegate.findUnique({ where: args['where'] });
                }
             } catch { /* ignora erro na busca do before */ }
          }

          // 4. Executa a operação original no banco
          const result = await query(args);

          // 5. Grava o log
          const payload = {
            model,
            action: operation,
            where: summarizeData(args['where']),
            data: summarizeData(args['data']),
            resultId: (result as any)?.id,
            before: before ? summarizeData(before) : undefined,
          };

          // Chama o serviço de audit (sem await para não travar a request)
          auditInfo("DB_WRITE", payload);

          return result;
        }
      }
    }
  });
});