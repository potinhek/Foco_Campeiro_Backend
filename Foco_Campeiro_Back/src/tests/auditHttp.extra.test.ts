// src/tests/auditHttp.extra.test.ts
jest.mock("../database", () => require("./mocks/prisma")); // mocka ANTES de importar
import { prisma } from "../database";

import { EventEmitter } from "events";
import * as audit from "../middlewares/auditHttp";

// pega export default ou nomeado
const auditHttp: any = (audit as any).auditHttp || (audit as any).default;

const UUID = "b05fb3d1-3d58-4c2a-9cde-7b5a8a0f0aaa";

function makeReq(overrides: any = {}) {
  return {
    method: "POST",
    originalUrl: "/api/__unit",
    headers: { "user-agent": "jest" },
    ip: "127.0.0.1",
    body: { foo: "bar" },
    user: { id: UUID, role: "admin" },
    ...overrides,
  };
}

function makeRes() {
  const res: any = new EventEmitter();
  res.statusCode = 200;
  res.setHeader = jest.fn();
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (data: any) => { res.body = data; res.emit("finish"); return res; };
  res.send = (data?: any) => { res.body = data; res.emit("finish"); return res; };
  return res;
}

describe("auditHttp extra (unitário)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // retorna Promise para não quebrar em `.catch`
    (prisma as any).logs = {
      create: jest.fn().mockResolvedValue({ ok: true }),
    };
  });

  it("loga em POST (201) no 'finish'", () => {
    const req: any = makeReq();            // POST com body
    const res: any = makeRes();
    const next = jest.fn();

    auditHttp(req, res, next);             // registra listener
    res.status(201).json({ ok: true });    // emite 'finish'

    expect((prisma as any).logs.create).toHaveBeenCalled();
  });

  it("loga em respostas 4xx (GET 400)", () => {
    const req: any = makeReq({ method: "GET", body: undefined });
    const res: any = makeRes();
    const next = jest.fn();

    auditHttp(req, res, next);
    res.status(400).json({ error: true });

    expect((prisma as any).logs.create).toHaveBeenCalled();
  });
});

it("loga quando a resposta usa res.send (204)", () => {
  const req: any = makeReq({ method: "DELETE" }); // sem body
  const res: any = makeRes();
  const next = jest.fn();

  // registra o listener do middleware
  auditHttp(req, res, next);

  // simula uma rota que responde com send()
  res.status(204).send();

  // deve ter escrito log também nesse caminho
  expect((prisma as any).logs.create).toHaveBeenCalled();
});
