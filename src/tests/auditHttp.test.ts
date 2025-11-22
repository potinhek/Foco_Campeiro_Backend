jest.mock("../infra/audit", () => require("./mocks/audit")); // mesmo estilo dos seus testes

import { EventEmitter } from "events";
import { auditInfo } from "../infra/audit";
import { auditHttp } from "../middlewares/auditHttp";

class MockRes extends EventEmitter {
  statusCode = 200;
}

describe("auditHttp middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  it("chama auditInfo no 'finish'", () => {
    const req = { method: "GET", path: "/api/events" } as any;
    const res = new MockRes() as any;

    const next = jest.fn();
    auditHttp(req, res, next);

    // simula resposta finalizada
    res.emit("finish");

    expect(auditInfo).toHaveBeenCalledTimes(1);
    const [evt, payload] = (auditInfo as jest.Mock).mock.calls[0];
    expect(evt).toBe("HTTP");
    expect(payload.method).toBe("GET");
    expect(payload.path).toBe("/api/events");
    expect(payload.status).toBe(200);
    expect(payload.ms).toBeGreaterThanOrEqual(0);
  });
});
