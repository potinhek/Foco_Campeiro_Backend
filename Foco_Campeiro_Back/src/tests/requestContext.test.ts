/**
 * Garante que o ALS recebe userId, method e path.
 */
import { als } from "../infra/requestContext";
import { requestContext } from "../middlewares/requestContext";

describe("requestContext middleware", () => {
  it("salva dados básicos no ALS", (done) => {
    const req = {
      method: "POST",
      path: "/api/selections",
      headers: { "user-agent": "jest" },
      ip: "127.0.0.1",
      user: { id: "user-123" }, // simula requireAuth
    } as any;

    const res = {} as any;

    requestContext(req, res, () => {
      const store = als.getStore();
      try {
        expect(store?.userId).toBe("user-123");
        expect(store?.method).toBe("POST");
        expect(store?.path).toBe("/api/selections");
        expect(store?.userAgent).toBe("jest");
        done();
      } catch (e) { done(e); }
    });
  });
});
it("requestContext usa x-forwarded-for quando presente", (done) => {
  const req: any = { method: "GET", path: "/x", headers: { "x-forwarded-for": "1.2.3.4" }, user: { id: "u1" } };
  const res: any = {};
  requestContext(req, res, () => {
    const store = als.getStore();
    try {
      expect(store?.ip).toBe("1.2.3.4");
      done();
    } catch (e) { done(e); }
  });
});