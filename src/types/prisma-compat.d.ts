import { Prisma } from "@prisma/client";

declare module "@prisma/client" {
  namespace Prisma {
    // Compat mínima usada pelos testes e pelo middleware do projeto
    interface MiddlewareParams {
      model?: string;
      action: string;
      args: any;
      dataPath?: string[];
      runInTransaction?: boolean;
    }

    type Middleware<T = any> = (
      params: MiddlewareParams,
      next: (params: MiddlewareParams) => Promise<T>
    ) => Promise<T>;
  }
}
