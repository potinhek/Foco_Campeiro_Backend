// src/tests/jwt.test.ts
import * as jsonwebtoken from "jsonwebtoken";

// ⚠️ NÃO mockar ../config/jwt neste arquivo
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../config/jwt";

describe("config/jwt helpers", () => {
  beforeAll(() => {
    // garanta segredos estáveis para o teste
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test_access_secret";
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
    process.env.JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
  });

  it("signAccessToken + verifyAccessToken (happy path)", () => {
    const token = signAccessToken({ sub: "u1", role: "admin" });
    expect(typeof token).toBe("string");

    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("u1");
    expect(payload.role).toBe("admin");

    // opcional: checar header.alg = HS256
    const decoded = jsonwebtoken.decode(token, { complete: true }) as any;
    expect(decoded.header.alg).toBe("HS256");
  });

  it("signRefreshToken + verifyRefreshToken (happy path)", () => {
    const token = signRefreshToken({ sub: "u1", sid: "s1" });
    expect(typeof token).toBe("string");

    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe("u1");
    expect(payload.sid).toBe("s1");
  });

  it("verifyAccessToken lança com token inválido", () => {
    expect(() => verifyAccessToken("token-invalido")).toThrow();
  });

  it("verifyRefreshToken lança com token inválido", () => {
    expect(() => verifyRefreshToken("token-invalido")).toThrow();
  });
});
