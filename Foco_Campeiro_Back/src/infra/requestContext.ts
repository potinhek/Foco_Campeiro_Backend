import { AsyncLocalStorage } from "node:async_hooks";

export type RequestContext = {
  requestId: string;
  userId?: string;      // do token
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
};

export const als = new AsyncLocalStorage<RequestContext>();
